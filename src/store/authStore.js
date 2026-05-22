// `authStore` maneja el estado de sesión en la aplicación.
// Contiene: inicio de sesión remoto/local (fallback legacy), persistencia en AsyncStorage,
// refresco de tokens y lógica para decidir expiraciones y roles.
// Comentarios añadidos para facilitar la explicación durante la sustentación.
import { API_BASE_URL, apiRequest, setApiAuthTokenResolver, setApiUnauthorizedHandler } from "@/src/services/apiClient";
import { loginRemoteUser, registerRemoteAuthUser, resetRemotePassword } from "@/src/services/backend";
import {
    clearStoredCurrentUser,
    getStoredCurrentUser,
    getStoredUsers,
    removeStoredUserByEmail,
    setStoredCurrentUser,
    setStoredUsers,
    updateStoredUserPasswordByEmail,
} from "@/src/services/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Buffer } from "buffer";
import { create } from "zustand";

const { createJSONStorage, persist } = require("zustand/middleware");

const ADMIN_USER = {
  email: "admin@greensaver.com",
  password: "admin",
  role: "admin",
  name: "Administrador",
  phone: "",
};

const STORAGE_KEY = "greensaver-auth-session";
const DEFAULT_SESSION_TTL_MINUTES = 30;

const getDisplayName = (email = "") =>
  email
    .split("@")[0]
    .replace(/[._-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");

const getUtf8ByteLength = (value = "") => new TextEncoder().encode(value).length;

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const decodeJwtPayload = (token) => {
  // Decodifica la parte payload de un JWT sin verificar firma.
  // Útil para obtener claims (exp, role, email) en el cliente.
  if (!token || typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = payload.padEnd(payload.length + ((4 - (payload.length % 4)) % 4), "=");
    const decoded =
      typeof atob === "function"
        ? atob(paddedPayload)
        : Buffer.from(paddedPayload, "base64").toString("utf8");

    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const resolveTokenExpiry = (payload = {}, token = null) => {
  // Determina una fecha ISO de expiración para la sesión.
  // Intenta leer campos explícitos (tokenExpiresAt/expiresAt), luego
  // usa expires_in (segundos) si está disponible, y finalmente mira el claim `exp` del JWT.
  // Si no encuentra ningún dato, aplica un TTL por defecto.
  const explicitExpiry = payload.tokenExpiresAt || payload.expiresAt || payload.expires_at;

  if (explicitExpiry) {
    const dateValue = new Date(explicitExpiry);
    if (!Number.isNaN(dateValue.getTime())) {
      return dateValue.toISOString();
    }
  }

  const expiresIn =
    toNumber(payload.expiresIn) ||
    toNumber(payload.expires_in) ||
    toNumber(payload.tokenExpiresIn) ||
    toNumber(payload.token_expires_in);

  if (expiresIn) {
    return new Date(Date.now() + expiresIn * 1000).toISOString();
  }

  const decodedToken = decodeJwtPayload(token || payload.token || payload.access_token);
  const tokenExp = decodedToken?.exp;

  if (tokenExp) {
    return new Date(tokenExp * 1000).toISOString();
  }

  const ttlMinutes = toNumber(payload.sessionTtlMinutes) || toNumber(payload.session_ttl_minutes);

  return new Date(Date.now() + (ttlMinutes || DEFAULT_SESSION_TTL_MINUTES) * 60 * 1000).toISOString();
};

const isTokenExpired = (tokenExpiresAt) => {
  if (!tokenExpiresAt) {
    return false;
  }

  const expiresAt = new Date(tokenExpiresAt).getTime();

  if (Number.isNaN(expiresAt)) {
    return false;
  }

  return Date.now() >= expiresAt;
};

const extractAuthPayload = (payload) => {
  if (payload && typeof payload === "object" && payload.data && typeof payload.data === "object") {
    return payload.data;
  }

  if (payload && typeof payload === "object") {
    return payload;
  }

  return {};
};

const normalizeRemoteSession = (payload, fallbackEmail) => {
  // Normaliza la estructura de la respuesta del backend hacia un formato
  // uniforme usado internamente por el store: { user, token, refreshToken, tokenExpiresAt }
  const data = extractAuthPayload(payload);
  const token = data.token || data.access_token || data.accessToken || null;
  const refreshToken = data.refreshToken || data.refresh_token || null;

  const user = {
    email: normalizeText(data.email || fallbackEmail).toLowerCase(),
    role: normalizeText(data.role || data.rol) || "user",
    name: normalizeText(data.name || data.nombre) || getDisplayName(data.email || fallbackEmail),
    phone: normalizeText(data.phone || data.telefono),
  };

  return {
    user,
    token,
    refreshToken,
    tokenExpiresAt: resolveTokenExpiry(data, token),
    sessionStatus: "active",
  };
};

const buildLegacyUser = (sourceUser) => ({
  email: normalizeText(sourceUser?.email).toLowerCase(),
  role: normalizeText(sourceUser?.role) || "user",
  name: normalizeText(sourceUser?.name) || getDisplayName(sourceUser?.email),
  phone: normalizeText(sourceUser?.phone),
});

const saveSessionToStorage = async (session) => {
  if (session?.user) {
    await setStoredCurrentUser({
      ...session.user,
      token: session.token || null,
      refreshToken: session.refreshToken || null,
      tokenExpiresAt: session.tokenExpiresAt || null,
      sessionStatus: session.sessionStatus || "active",
    });
  }
};

const clearSessionStorage = async () => {
  await clearStoredCurrentUser();
};

const applySession = async (set, session) => {
  const nextSession = {
    user: session.user || null,
    token: session.token || null,
    refreshToken: session.refreshToken || null,
    tokenExpiresAt: session.tokenExpiresAt || null,
    sessionStatus: session.sessionStatus || (session.user ? "active" : "inactive"),
  };

  set({
    user: nextSession.user,
    token: nextSession.token,
    refreshToken: nextSession.refreshToken,
    tokenExpiresAt: nextSession.tokenExpiresAt,
    sessionStatus: nextSession.sessionStatus,
    loading: false,
  });

  await saveSessionToStorage(nextSession);

  return nextSession;
};

export const getRoleHomeRoute = (role) => (role === "admin" ? "/(admin)/dashboard" : "/(user)/dashboard");

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      tokenExpiresAt: null,
      sessionStatus: "inactive",
      loading: true,

      bootstrapSession: async () => {
        set({ loading: true });

        try {
          // Rehidrata el estado persistido y aplica reglas de inicio:
          // - Si estamos apuntando al backend en Render y existe un user sin token, cerramos sesión.
          // - Si el token expiró y hay refreshToken, intentamos refrescar la sesión.
          // - Si no hay sesión remota y no estamos contra Render, intentamos fallback legacy local.
          await useAuthStore.persist.rehydrate();

          const current = get();
          const isRenderBackend = typeof API_BASE_URL === "string" && API_BASE_URL.includes("onrender.com");

          if (isRenderBackend && current.user && !current.token) {
            await get().logout({ silent: true });
          }

          if (current.user && current.token && current.tokenExpiresAt && isTokenExpired(current.tokenExpiresAt)) {
            if (current.refreshToken) {
              await get().refreshSession();
            } else {
              await get().logout({ silent: true });
            }
          }

          const nextState = get();

          if (!nextState.user && !isRenderBackend) {
            const legacyUser = await getStoredCurrentUser();

            if (legacyUser) {
              if (!legacyUser.token && legacyUser.email && legacyUser.password) {
                try {
                  const remoteSession = await loginRemoteUser({
                    email: legacyUser.email,
                    password: legacyUser.password,
                  });
                  const normalizedRemote = normalizeRemoteSession(remoteSession, legacyUser.email);

                  if (normalizedRemote.user.email) {
                    await applySession(set, normalizedRemote);
                    return;
                  }
                } catch {
                  // Si el backend no responde, mantenemos la sesión heredada.
                }
              }

              const normalizedLegacyUser = buildLegacyUser(legacyUser);

              await applySession(set, {
                user: normalizedLegacyUser,
                token: legacyUser.token || null,
                refreshToken: legacyUser.refreshToken || null,
                tokenExpiresAt: legacyUser.tokenExpiresAt || null,
                sessionStatus: legacyUser.sessionStatus || "active",
              });
            }
          }
        } catch {
          // Evita bloqueo de pantalla en blanco si falla la hidratacion de sesion.
        } finally {
          set({ loading: false });
        }
      },

      login: async (email, password) => {
        const normalizedEmail = normalizeText(email).toLowerCase();
        const normalizedPassword = normalizeText(password);
        const isRenderBackend = typeof API_BASE_URL === "string" && API_BASE_URL.includes("onrender.com");

        if (!normalizedEmail || !normalizedPassword) {
          throw new Error("Correo y contraseña son obligatorios");
        }

        let remoteError = null;

        try {
          const remoteSession = await loginRemoteUser({ email: normalizedEmail, password: normalizedPassword });
          const normalizedRemote = normalizeRemoteSession(remoteSession, normalizedEmail);

          if (normalizedRemote.user.email && normalizedRemote.token) {
            await applySession(set, normalizedRemote);
            return normalizedRemote.user;
          }

          remoteError = new Error("Respuesta de login inválida del backend: no incluyó token de sesión");
        } catch (error) {
          remoteError = error;
        }

        if (!isRenderBackend) {
          // Si la autenticación remota falla en local/dev, intentamos sesión local (fallback).
          try {
            const users = await getStoredUsers();
            const foundUser = users.find(
              (storedUser) => storedUser.email?.toLowerCase() === normalizedEmail && storedUser.password === normalizedPassword
            );

            if (foundUser) {
              const legacySession = {
                user: buildLegacyUser(foundUser),
                token: null,
                refreshToken: null,
                tokenExpiresAt: null,
                sessionStatus: "active",
              };

              await applySession(set, legacySession);
              return legacySession.user;
            }
          } catch {
            // Ignoramos errores de almacenamiento al intentar fallback local.
          }

          // Fallback de administrador local (solo en entorno local)
          if (normalizedEmail === ADMIN_USER.email && normalizedPassword === ADMIN_USER.password) {
            await applySession(set, {
              user: ADMIN_USER,
              token: null,
              refreshToken: null,
              tokenExpiresAt: null,
              sessionStatus: "active",
            });
            return ADMIN_USER;
          }
        }

        // Si no hay fallback local, re-lanzamos el error remoto (si existe) o un mensaje genérico.
        throw remoteError || new Error("Credenciales incorrectas");
      },

      register: async ({ email, password, name, phone }) => {
        const normalizedEmail = normalizeText(email).toLowerCase();
        const normalizedPassword = normalizeText(password);
        const normalizedName = normalizeText(name) || getDisplayName(normalizedEmail);
        const normalizedPhone = normalizeText(phone);
        const isRenderBackend = typeof API_BASE_URL === "string" && API_BASE_URL.includes("onrender.com");

        if (!normalizedEmail || !normalizedPassword) {
          throw new Error("Correo y contraseña son obligatorios");
        }

        if (getUtf8ByteLength(normalizedPassword) > 72) {
          throw new Error("La contraseña es demasiado larga. Usa una de máximo 72 bytes (aprox. 72 caracteres simples).");
        }

        if (isRenderBackend) {
          const remoteSession = await registerRemoteAuthUser({
            name: normalizedName,
            phone: normalizedPhone,
            email: normalizedEmail,
            password: normalizedPassword,
            role: "user",
          });

          const normalizedRemote = normalizeRemoteSession(remoteSession || {}, normalizedEmail);

          if (!normalizedRemote.user.email) {
            throw new Error("No fue posible crear la sesión en el backend");
          }

          await applySession(set, {
            user: normalizedRemote.user,
            token: normalizedRemote.token,
            refreshToken: normalizedRemote.refreshToken,
            tokenExpiresAt: normalizedRemote.tokenExpiresAt,
            sessionStatus: "active",
          });

          return {
            user: normalizedRemote.user,
            warning: null,
          };
        }

        const users = await getStoredUsers();
        const exists = users.find((storedUser) => storedUser.email?.toLowerCase() === normalizedEmail);

        if (exists) {
          throw new Error("El usuario ya existe");
        }

        const newUser = {
          email: normalizedEmail,
          password: normalizedPassword,
          role: "user",
          name: normalizedName,
          phone: normalizedPhone,
        };

        await setStoredUsers([...users, newUser]);

        let syncWarning = null;

        try {
          const remoteSession = await registerRemoteAuthUser({
            name: normalizedName,
            phone: normalizedPhone,
            email: normalizedEmail,
            password: normalizedPassword,
            role: newUser.role,
          });

          const normalizedRemote = normalizeRemoteSession(remoteSession || {}, normalizedEmail);

          await applySession(set, {
            user: normalizedRemote.user.email ? normalizedRemote.user : buildLegacyUser(newUser),
            token: normalizedRemote.token,
            refreshToken: normalizedRemote.refreshToken,
            tokenExpiresAt: normalizedRemote.tokenExpiresAt,
            sessionStatus: "active",
          });
        } catch (error) {
          syncWarning = `Registro guardado localmente. El backend no respondió: ${error?.message || "verifica EXPO_PUBLIC_API_URL y conectividad"}`;
          // Aplicar sesión local inmediatamente para que el usuario quede autenticado localmente
          try {
            await applySession(set, {
              user: buildLegacyUser(newUser),
              token: null,
              refreshToken: null,
              tokenExpiresAt: null,
              sessionStatus: "active",
            });
          } catch {
            // Ignorar fallos al aplicar la sesión local
          }
        }

        return {
          user: get().user || buildLegacyUser(newUser),
          warning: syncWarning,
        };
      },

      logout: async ({ silent = false } = {}) => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          tokenExpiresAt: null,
          sessionStatus: "inactive",
          loading: false,
        });

        await clearSessionStorage();
        return !silent;
      },

      refreshSession: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          return false;
        }

        try {
          const response = await apiRequest("/auth/refresh", {
            method: "POST",
            body: { refreshToken },
          });

          const normalizedRemote = normalizeRemoteSession(response || {}, get().user?.email || "");

          if (!normalizedRemote.token) {
            throw new Error("El backend no devolvió un nuevo token");
          }

          await applySession(set, {
            user: normalizedRemote.user.email ? normalizedRemote.user : get().user,
            token: normalizedRemote.token,
            refreshToken: normalizedRemote.refreshToken || refreshToken,
            tokenExpiresAt: normalizedRemote.tokenExpiresAt,
            sessionStatus: "active",
          });

          return true;
        } catch {
          await get().logout({ silent: true });
          return false;
        }
      },

      validateSession: async () => {
        const { token, tokenExpiresAt, refreshToken, user } = get();

        if (!user) {
          return false;
        }

        if (!token) {
          return true;
        }

        if (tokenExpiresAt && isTokenExpired(tokenExpiresAt)) {
          if (refreshToken) {
            return get().refreshSession();
          }

          await get().logout({ silent: true });
          return false;
        }

        return true;
      },

      getRegisteredUsers: async () => getStoredUsers(),

      deleteUser: async (email) => {
        const nextUsers = await removeStoredUserByEmail(email);

        if (get().user?.email === email) {
          await get().logout({ silent: true });
        }

        return nextUsers;
      },

      resetPassword: async ({ email, newPassword }) => {
        const normalizedEmail = normalizeText(email).toLowerCase();
        const normalizedPassword = normalizeText(newPassword);

        if (!normalizedEmail || !normalizedPassword) {
          throw new Error("Correo y nueva contraseña son obligatorios");
        }

        if (getUtf8ByteLength(normalizedPassword) > 72) {
          throw new Error("La nueva contraseña es demasiado larga. Usa una de máximo 72 bytes (aprox. 72 caracteres simples).");
        }

        if (normalizedEmail === ADMIN_USER.email) {
          throw new Error("La contraseña del administrador fijo no se puede recuperar desde esta pantalla");
        }

        let remoteUpdated = false;

        try {
          await resetRemotePassword({
            email: normalizedEmail,
            newPassword: normalizedPassword,
          });
          remoteUpdated = true;
        } catch {
          remoteUpdated = false;
        }

        const users = await getStoredUsers();
        const exists = users.some((storedUser) => storedUser.email?.toLowerCase() === normalizedEmail);

        if (!exists && !remoteUpdated) {
          throw new Error("No existe una cuenta registrada con ese correo");
        }

        const updatedUser = exists
          ? await updateStoredUserPasswordByEmail(normalizedEmail, normalizedPassword)
          : null;

        if (get().user?.email === normalizedEmail && updatedUser) {
          await applySession(set, {
            user: {
              ...get().user,
              password: normalizedPassword,
            },
            token: get().token,
            refreshToken: get().refreshToken,
            tokenExpiresAt: get().tokenExpiresAt,
            sessionStatus: get().sessionStatus,
          });
        }

        return true;
      },

      syncLegacySession: async () => {
        const legacyUser = await getStoredCurrentUser();

        if (!legacyUser) {
          return false;
        }

        await applySession(set, {
          user: buildLegacyUser(legacyUser),
          token: legacyUser.token || null,
          refreshToken: legacyUser.refreshToken || null,
          tokenExpiresAt: legacyUser.tokenExpiresAt || null,
          sessionStatus: legacyUser.sessionStatus || "active",
        });

        return true;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        tokenExpiresAt: state.tokenExpiresAt,
        sessionStatus: state.sessionStatus,
      }),
    }
  )
);

setApiAuthTokenResolver(() => useAuthStore.getState().token);

setApiUnauthorizedHandler(async ({ status }) => {
  if ([401, 403].includes(status)) {
    await useAuthStore.getState().logout({ silent: true });
  }
});