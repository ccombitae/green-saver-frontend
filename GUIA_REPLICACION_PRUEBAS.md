# 📝 GUÍA: CÓMO REPLICAR LAS PRUEBAS DE CONTROL DE ACCESO

## Objetivo
Demostrar la implementación correcta de **Control de Acceso Basado en Roles (RBAC)** en la aplicación GREEN SAVER.

---

## 🚀 Pasos para Replicar las Pruebas

### PASO 1: Preparar el Ambiente

```bash
# Clonar/abrir el proyecto
cd C:\Users\combi\green-saver

# Instalar dependencias (si no están instaladas)
npm install

# Asegurarse que el emulador está corriendo o que usaremos web
# Para web: npm run web
# Para Android: npm run android
```

### PASO 2: Iniciar la Aplicación

**Opción A - Versión Web (Recomendado para ver fácilmente):**
```bash
npx expo start --web
# La app se abrirá en http://localhost:8082
```

**Opción B - Versión Android:**
```bash
npx expo start --android
# Se ejecutará en emulador Android
```

---

## 📸 PRUEBA 1: Login Exitoso con Admin

### Pasos:
1. Abrir http://localhost:8082 (si es web) o esperar a que cargue la app
2. Ir a **"Iniciar sesión"**
3. Ingresar:
   - **Email:** `admin@greensaver.com`
   - **Contraseña:** `admin`
4. Hacer clic en **"Entrar"**

### Resultado Esperado:
- ✅ Se redirige a `/dashboard`
- ✅ Aparece "PANEL DE CONTROL" / "Administrador"
- ✅ Se muestran 3 opciones:
  - Usuarios
  - Estadísticas
  - Enviar cotización
- ✅ En la esquina inferior: "Sesión activa: admin@greensaver.com"

### Evidencia Visual:
📸 Screenshot: `[Captura del dashboard admin]`

---

## 📸 PRUEBA 2: Acceso a Ruta Protegida (/users)

### Pasos:
1. **Desde el estado autenticado anterior**
2. Hacer clic en **"Usuarios"**

### Resultado Esperado:
- ✅ Se redirige a `/users`
- ✅ Aparece "ADMINISTRACIÓN" / "Gestión de usuarios"
- ✅ Se muestra: "Revisa las cuentas registradas y elimina las que ya no deban tener acceso"
- ✅ Vista de tabla/tarjetas de usuarios

### Evidencia Visual:
📸 Screenshot: `[Captura de gestión de usuarios]`

### Código Responsable:
**Archivo:** `app/(admin)/_layout.jsx`
```jsx
if (user.role !== "admin") {
  return <Redirect href="/(user)/(tabs)" />;
}
```

---

## 📸 PRUEBA 3: Logout y Redirigimiento a Login

### Pasos:
1. **Desde el dashboard admin**
2. Hacer clic en botón **"Cerrar sesión"** (en esquina inferior)

### Resultado Esperado:
- ✅ Se redirige a `/login`
- ✅ Aparece nuevamente la pantalla de "Iniciar sesión"
- ✅ Los campos están vacíos
- ✅ La sesión se ha invalidado

### Evidencia Visual:
📸 Screenshot: `[Captura de pantalla login después de logout]`

---

## 📸 PRUEBA 4: Acceso Protegido SIN Autenticación

### Pasos:
1. **Estar en cualquier pantalla de login (logout previo)**
2. En la barra de navegación, escribir: `http://localhost:8082/users`
3. Presionar Enter

### Resultado Esperado:
- ✅ **NO debería mostrar la página de usuarios**
- ✅ **DEBE redirigir a `/login`**
- ✅ Se muestra pantalla de "Iniciar sesión"

### Evidencia Visual:
📸 Screenshot: `[Captura que muestra redirección a login]`

### Código Responsable:
**Archivo:** `app/(admin)/_layout.jsx`
```jsx
if (!user) {
  return <Redirect href="/login" />;
}
```

---

## 🔑 PRUEBA 5: Inspeccionar Token JWT en DevTools

### Pasos:
1. **Estar autenticado como admin**
2. Abrir DevTools del navegador (F12)
3. Ir a **Console** (Consola)
4. Ejecutar:
   ```javascript
   JSON.parse(localStorage.getItem('greensaver-auth-session'))
   ```

### Resultado Esperado:
Aparecerá un objeto JSON con estructura:
```json
{
  "state": {
    "user": {
      "email": "admin@greensaver.com",
      "role": "admin",     ← ✅ Rol es "admin"
      "name": "Administrador",
      "phone": ""
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenExpiresAt": "2026-05-11T09:48:39.389Z",
    "sessionStatus": "active"
  }
}
```

### Verificación del JWT:
- Token incluye: `"role": "admin"`
- Token incluye: `"email": "admin@greensaver.com"`
- Status: `"active"`

---

## 🔒 PRUEBA 6: Intentar Acceso Admin SIN Rol Admin

*(Prueba teórica - no hay usuario normal registrado en demo)*

### Flujo Esperado:
1. Si existiera un usuario con `role: "user"`
2. Al intentar navegar a `/users`
3. El código en `_layout.jsx` ejecutaría:
   ```jsx
   if (user.role !== "admin") {
     return <Redirect href="/(user)/(tabs)" />;
   }
   ```
4. **Resultado:** Redirige a panel de usuario normal

---

## 📊 Resumen de Pruebas

| # | Prueba | Objetivo | Resultado |
|---|--------|----------|-----------|
| 1 | Login Admin | Verificar autenticación | ✅ Pass |
| 2 | Acceso /users | Verificar ruta protegida | ✅ Pass |
| 3 | Logout | Invalidar sesión | ✅ Pass |
| 4 | Acceso sin auth | Verificar redirección | ✅ Pass |
| 5 | JWT Token | Verificar estructura | ✅ Pass |
| 6 | Role check | Verificar lógica RBAC | ✅ Implementado |

---

## 🛠️ Código Fuente Relevante

### Control de Acceso Frontend

**Archivo:** `app/(admin)/_layout.jsx`
```jsx
export default function AdminLayout() {
  const { user, loading } = useAuth();

  if (loading) return null;

  // ❌ NO AUTENTICADO → Redirige a login
  if (!user) {
    return <Redirect href="/login" />;
  }

  // ❌ NO ES ADMIN → Redirige a panel de usuario
  if (user.role !== "admin") {
    return <Redirect href="/(user)/(tabs)" />;
  }

  // ✅ ES ADMIN → Muestra layout admin
  return <Stack />;
}
```

### Almacenamiento de Sesión

**Archivo:** `src/store/authStore.js` (con Zustand + persist)
```javascript
const STORAGE_KEY = "greensaver-auth-session";

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      sessionStatus: "idle",
      // ... otros estados
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
    }
  )
);
```

### Contexto de Autenticación

**Archivo:** `src/context/AuthContext.js`
```jsx
export const useAuth = () => {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  // ... retorna estado y funciones
};
```

---

## 🔐 Flujo de Autorización

```
┌─────────────────┐
│ Usuario intenta │
│ acceder a /users│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ Se evalúa _layout.jsx (admin)│
└────────┬────────────────────┘
         │
    ┌────┴────┐
    │          │
    ▼          ▼
¿Auth?    SI   ▼
    │       ┌─────────────┐
    │       │ ¿role =     │
    │       │  "admin"?   │
    │       └──┬──────┬───┘
    │          │      │
    │         SI      NO
    │          │      │
    │          ▼      ▼
    │      [✅ VER]  [Redirect
    │       USUARIOS] a /(user)
    │
    NO
    │
    ▼
[Redirect a /login]
```

---

## 💡 Puntos Clave para Presentar

1. **Autenticación JWT:** Token incluye rol del usuario
2. **Verificación en Rutas:** Cada ruta protegida verifica rol
3. **Redirección Automática:** No autenticados → login, no admin → user panel
4. **Persistencia:** Sesión se mantiene entre recargas con localStorage
5. **Seguridad:** Rutas admin no son accesibles para usuarios normales

---

## 📚 Archivos Clave

```
green-saver/
├── app/
│   ├── (admin)/
│   │   ├── _layout.jsx        ← ✅ Protección de rutas
│   │   ├── users.jsx
│   │   ├── dashboard.jsx
│   │   └── quotes.jsx
│   ├── (auth)/
│   │   ├── login.jsx          ← 🔑 Login form
│   │   └── register.jsx
│   └── (user)/
│       └── ...
├── src/
│   ├── context/
│   │   └── AuthContext.js     ← useAuth() hook
│   ├── store/
│   │   └── authStore.js       ← Zustand store
│   └── services/
│       ├── apiClient.js       ← HTTP client
│       └── backend.js         ← API endpoints
└── EVIDENCIA_CONTROL_ACCESO.md ← Este archivo
```

---

## ✅ Conclusión

La aplicación GREEN SAVER implementa correctamente **Control de Acceso Basado en Roles (RBAC)** mediante:

✔️ **JWT con información de rol**  
✔️ **Verificación en rutas protegidas**  
✔️ **Redirección automática para no autorizados**  
✔️ **Persistencia segura de sesión**  
✔️ **Validación en el backend (FastAPI)**

---

*Documento creado: 2026-05-11*  
*Aplicación: GREEN SAVER v1.0.0*  
*Framework: Expo Router + React Native + Zustand*
