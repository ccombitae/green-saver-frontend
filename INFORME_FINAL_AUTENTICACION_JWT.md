# GREEN SAVER
## Informe final de implementacion de autenticacion JWT con Zustand

**Estudiante:** ________________________________

**Asignatura:** ________________________________

**Docente:** ________________________________

**Programa:** ________________________________

**Fecha:** 10 de mayo de 2026

**Proyecto:** Green Saver

---

## Resumen ejecutivo

En esta entrega se evoluciono la aplicacion movil Green Saver desde una autenticacion basica hacia un esquema completo de autenticacion y autorizacion basado en JSON Web Tokens (JWT). La solucion integra el frontend desarrollado con Expo y React Native con el backend desplegado en Azure App Service, el cual ahora emite tokens de acceso y refresco, valida sesiones y protege rutas segun el rol del usuario.

Adicionalmente, se implemento un estado global con Zustand para administrar el usuario autenticado, la persistencia de sesion con AsyncStorage, la inyeccion automatica del token en las peticiones HTTP y el control de navegacion mediante guards por rol y por estado de sesion.

---

## 1. Objetivo general

Implementar un sistema funcional de autenticacion y autorizacion en la aplicacion movil Green Saver, utilizando JWT emitidos por el backend, persistencia de sesion en el dispositivo, control de acceso por roles y proteccion de vistas restringidas.

## 2. Objetivos especificos

- Enviar credenciales al backend para autenticar usuarios.
- Recibir y almacenar tokens JWT en la aplicacion movil.
- Gestionar el estado global del usuario autenticado.
- Persistir y recuperar la sesion activa al abrir la app.
- Controlar el acceso a vistas segun el rol del usuario.
- Proteger el backend mediante middleware de autorizacion.
- Manejar correctamente respuestas `401` y `403`.

---

## 3. Desarrollo de la solucion

### 3.1 Frontend movil

La aplicacion movil fue estructurada para que el estado de autenticacion viva en un store global con Zustand. Este store administra el usuario autenticado, el token de acceso, el refresh token, el estado de la sesion y la logica de login, logout, registro, refresco de sesion y validacion de expiracion.

Archivos principales:

- [src/store/authStore.js](src/store/authStore.js)
- [src/context/AuthContext.js](src/context/AuthContext.js)
- [src/services/apiClient.js](src/services/apiClient.js)

### 3.2 Persistencia de sesion

La sesion se persiste en AsyncStorage para que el usuario no tenga que autenticarse cada vez que abre la aplicacion. Al iniciar, la app rehidrata el store, revisa si el token sigue vigente y, si es necesario, intenta renovarlo con el backend.

### 3.3 Navegacion protegida

Se implementaron guards de navegacion en Expo Router para evitar que usuarios no autenticados o con rol incorrecto accedan a rutas restringidas.

Rutas protegidas principales:

- [app/(auth)/_layout.jsx](app/(auth)/_layout.jsx)
- [app/(user)/_layout.jsx](app/(user)/_layout.jsx)
- [app/(admin)/_layout.jsx](app/(admin)/_layout.jsx)

### 3.4 Backend seguro en Azure

El backend desplegado en Azure App Service fue actualizado para trabajar con JWT reales. Ahora emite `access_token` y `refresh_token`, valida el bearer token en rutas protegidas y restringe el acceso administrativo por rol.

Archivos principales del backend:

- [app/main.py](app/main.py)
- [app/routes/auth.py](app/routes/auth.py)
- [app/services/auth_service.py](app/services/auth_service.py)
- [app/core/security.py](app/core/security.py)

### 3.5 Control por roles

El rol del usuario se obtiene desde la base de datos, a partir del campo `rol` de la tabla `usuarios`. Ese valor define si el usuario entra al area normal o al panel administrativo.

### 3.6 Manejo de errores

Se implemento el manejo correcto de errores de autenticacion:

- `401`: credenciales invalidas, token ausente o token vencido.
- `403`: usuario autenticado sin permisos suficientes.

---

## 4. Resultado funcional

La solucion deja operativos los siguientes comportamientos:

- Inicio de sesion con credenciales reales.
- Registro de nuevos usuarios con persistencia en base de datos.
- Emision de tokens JWT desde Azure.
- Recuperacion y renovacion de sesion.
- Redireccion automatica segun el rol.
- Proteccion de vistas administrativas.
- Proteccion del backend mediante middleware.

---

## 5. Evidencias tecnicas verificadas

Durante la validacion se confirmo lo siguiente:

- `POST /auth/login` responde con `access_token`, `refresh_token`, `expires_in` y `refresh_expires_in`.
- `GET /auth/me` responde correctamente usando `Authorization: Bearer <token>`.
- El backend activo en Azure corresponde al ultimo commit publicado en `main`.
- El frontend compila correctamente y pasa validacion de lint.

Commit de referencia:

- `8203597` - Add JWT auth and role guards

---

## 6. Evidencias a anexar

Para la entrega final se recomienda anexar las siguientes evidencias:

1. Captura del login exitoso en la app movil.
2. Captura de la respuesta de `POST /auth/login` en Azure.
3. Captura de `GET /auth/me` usando bearer token.
4. Captura de una ruta protegida como `/usuarios` o `/quotes`.
5. Captura de un error `403` al intentar entrar como usuario normal a una vista de admin.
6. Captura de la base de datos mostrando el campo `rol`.
7. Captura del App Service de Azure en estado activo.
8. Captura del commit publicado en GitHub.

---

## 7. Conclusiones

La aplicacion Green Saver cumple con los requerimientos de autenticacion y autorizacion solicitados para esta entrega. Se integro un flujo completo de JWT entre frontend y backend, se asegura la persistencia de sesion, se protege la navegacion por rol y se limita el acceso a rutas administrativas desde el servidor.

Con esta implementacion, la app queda preparada para una presentacion academica solida, demostrando control de acceso, seguridad de sesion y coherencia entre la interfaz movil y el backend en Azure.

---

## 8. Bibliografia breve

- FastAPI Documentation. https://fastapi.tiangolo.com/
- Expo Router Documentation. https://docs.expo.dev/router/introduction/
- Zustand Documentation. https://zustand.docs.pmnd.rs/
- Pydantic Documentation. https://docs.pydantic.dev/
- PostgreSQL Documentation. https://www.postgresql.org/docs/
- MDN Web Docs: HTTP status codes. https://developer.mozilla.org/
