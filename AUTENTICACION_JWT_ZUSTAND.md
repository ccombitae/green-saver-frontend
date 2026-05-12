# Autenticación JWT con Zustand en Green Saver

## 1. Objetivo

Evolucionar la aplicación móvil de una autenticación básica con sesión local a un esquema con:

- autenticación con credenciales contra backend,
- almacenamiento y recuperación de token JWT,
- estado global del usuario autenticado con Zustand,
- persistencia de sesión con AsyncStorage,
- navegación protegida por sesión y por rol,
- manejo de expiración e invalidación de sesión.

## 1.1 Estado de cumplimiento

La entrega ya quedó implementada de forma funcional tanto en la app móvil como en el backend de Azure.

- Frontend: autenticación global con Zustand, persistencia y guards.
- Backend: login, registro, refresh token, middleware de autorización y control por rol.
- Azure: despliegue activo con el último commit publicado en `main`.

## 2. Qué quedó implementado en la app móvil

### 2.1 Estado global con Zustand

Se creó un store global para la autenticación en:

- [src/store/authStore.js](src/store/authStore.js)

Ese store mantiene:

- `user`
- `token`
- `refreshToken`
- `tokenExpiresAt`
- `sessionStatus`
- `loading`

Y expone acciones para:

- `login`
- `register`
- `logout`
- `refreshSession`
- `validateSession`
- `bootstrapSession`
- `getRegisteredUsers`
- `deleteUser`
- `resetPassword`
- `syncLegacySession`

### 2.2 Persistencia de sesión

La sesión se persiste con AsyncStorage mediante Zustand persistente.

Archivo clave:

- [src/store/authStore.js](src/store/authStore.js)

La sesión guarda también compatibilidad con la lógica anterior en `currentUser`, para no romper usuarios ya registrados en versiones previas.

### 2.3 Integración del token en el cliente HTTP

El cliente HTTP ahora puede adjuntar automáticamente el token JWT en el header `Authorization: Bearer <token>`.

Archivo clave:

- [src/services/apiClient.js](src/services/apiClient.js)

Además:

- detecta respuestas `401` y `403`,
- ejecuta un handler central para invalidar la sesión,
- mantiene la compatibilidad con el resto de endpoints del backend.

### 2.4 Control de navegación y guards

Se agregaron guards por grupo de rutas en Expo Router:

- [app/(auth)/_layout.jsx](app/(auth)/_layout.jsx)
- [app/(user)/_layout.jsx](app/(user)/_layout.jsx)
- [app/(admin)/_layout.jsx](app/(admin)/_layout.jsx)

Comportamiento:

- si no hay sesión, se redirige a login,
- si el usuario ya está autenticado, no vuelve a login/register,
- si el rol no coincide, se redirige al área correcta,
- las vistas restringidas quedan protegidas antes de renderizar.

### 2.5 Compatibilidad con las pantallas existentes

Para no reescribir todas las pantallas, [src/context/AuthContext.js](src/context/AuthContext.js) quedó como capa de compatibilidad y expone el hook `useAuth` con la misma interfaz que ya usaban las pantallas.

### 2.6 Prueba en Azure

Se validó el backend desplegado en Azure con un login real y respuesta JWT.

- `POST /auth/login` responde con `access_token`, `refresh_token`, `expires_in` y `refresh_expires_in`.
- `GET /auth/me` acepta `Authorization: Bearer <token>`.
- El commit publicado que activa esta versión es `8203597`.

## 3. Flujo de autenticación implementado

### 3.1 Login

1. El usuario envía correo y contraseña.
2. La app intenta autenticarse contra el backend.
3. El backend devuelve `access_token`, `refresh_token` y tiempos de expiración.
4. El token se guarda en el store global y se adjunta automáticamente a las peticiones.
5. El usuario queda en sesión persistente y se redirige según su rol.

### 3.2 Registro

1. La app envía los datos del usuario al backend.
2. El backend registra el usuario, guarda el rol en base de datos y devuelve sesión autenticada.
3. El usuario también queda persistido localmente para compatibilidad con datos históricos.

### 3.3 Recuperación de sesión

1. Al abrir la app, el store se rehidrata desde AsyncStorage.
2. Si existe token y el token está vencido, se intenta refrescar.
3. Si el refresh falla, la sesión se cierra.
4. Si solo existe una sesión legada sin JWT, la app intenta reconectarse al backend y actualizarla.

### 3.4 Logout

1. Se limpia el estado global.
2. Se borra la sesión persistida.
3. La app vuelve a login.

## 4. Roles y permisos

La app ya contempla dos rutas principales:

- `admin`
- `user`

### 4.1 Acceso por rol

- administrador: entra al panel de administración,
- usuario normal: entra al área de consumo y cálculo,
- si el rol no coincide, se hace redirección automática.

### 4.2 Cómo se carga el rol

El rol llega desde la respuesta del backend y se almacena en el usuario autenticado.

En la base de datos del backend sale de la columna `rol` de la tabla `usuarios`.

### 4.3 Respuesta a la consulta del rol en base de datos

El rol se consulta en backend al hacer login, registro o refresh. La API lee la fila del usuario en PostgreSQL y retorna el campo `rol` como parte de la sesión autenticada. En la protección de rutas, el middleware verifica ese valor antes de permitir acceso a recursos administrativos.

## 5. Backend seguro

El backend desplegado en Azure ya quedó alineado con la autenticación JWT. Implementa:

- emisión de JWT en `/auth/login` y `/auth/register`,
- endpoint de refresh en `/auth/refresh`,
- middleware de autorización global en `app/main.py`,
- respuesta `401` para credenciales inválidas o token ausente,
- respuesta `403` para permisos insuficientes,
- protección de rutas administrativas por rol.

### 5.1 Qué protege el backend

- `/auth/me`
- `/calculos`
- `/usuarios`
- `/quotes`
- `/calculos/reporte`

### 5.2 Manejo de errores

- `401`: token ausente, inválido o credenciales incorrectas.
- `403`: usuario autenticado sin permisos para la ruta.
- `301`: no se usa como mecanismo de autenticación; en una API REST no es el código correcto para control de acceso.

## 6. Manejo de errores y seguridad

### 6.1 `401`

Se usa para credenciales inválidas o token vencido.

### 6.2 `403`

Se usa para usuario autenticado pero sin permisos sobre la ruta.

### 6.3 `301`

En una API autenticada no debería ser normal depender de redirecciones para acceso seguro. Para la entrega académica, la referencia funcional correcta es `401` y `403`.

## 7. Archivos clave para la entrega

- [src/store/authStore.js](src/store/authStore.js)
- [src/context/AuthContext.js](src/context/AuthContext.js)
- [src/services/apiClient.js](src/services/apiClient.js)
- [app/(auth)/_layout.jsx](app/(auth)/_layout.jsx)
- [app/(user)/_layout.jsx](app/(user)/_layout.jsx)
- [app/(admin)/_layout.jsx](app/(admin)/_layout.jsx)

## 8. Qué anexar en la entrega

Incluye estos anexos en el documento final o como capturas aparte:

1. Captura del login exitoso en la app móvil mostrando rol y acceso a la pantalla correcta.
2. Captura del `POST /auth/login` en Azure con respuesta `access_token` y `refresh_token`.
3. Captura de `GET /auth/me` usando `Authorization: Bearer <token>`.
4. Captura de una ruta protegida (`/usuarios` o `/quotes`) accesible solo con sesión válida.
5. Captura de una respuesta `403` al intentar entrar a un recurso de admin con rol de usuario.
6. Captura de la base de datos mostrando el campo `rol` en la tabla `usuarios`.
7. Captura del commit publicado en GitHub con hash `8203597`.
8. Captura del App Service de Azure en estado activo.

## 9. Estado actual del proyecto

### Ya implementado

- autenticación centralizada en estado global,
- persistencia de sesión,
- guards por ruta,
- soporte para token JWT,
- inyección automática de token en peticiones,
- invalidación de sesión ante `401` y `403`,
- compatibilidad con la base instalada actual,
- backend desplegado en Azure con JWT real.

### Pendiente opcional

- preparar las capturas solicitadas por el profesor,
- pegar el documento final en Word o PDF,
- si el profesor pide evidencia de pruebas, anexar las respuestas JSON.

## 10. Recomendación para la presentación

Para exponer la solución, mostrar el flujo en este orden:

1. login con credenciales,
2. recepción y persistencia del token,
3. redirección según rol,
4. acceso a vistas protegidas,
5. cierre de sesión,
6. expiración o invalidación de token,
7. manejo de error `401` / `403`.

## 11. Conclusión

La aplicación móvil y el backend ya quedaron alineados con autenticación basada en JWT, persistencia de sesión, guards por rol y protección real de rutas. Para la entrega académica, lo que falta es anexar las evidencias visuales y pegar esta estructura en el documento final.
