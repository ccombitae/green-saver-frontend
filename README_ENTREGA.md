# GREEN SAVER - GUIA DE ENTREGA PARA DOCENTE

Este documento explica de forma clara:

1. Que contiene el archivo ZIP entregado.
2. Que debe instalar para ejecutar el proyecto en Windows.
3. Como ejecutar la aplicacion en modo recomendado (backend publicado en internet).
4. Como ejecutar tambien el backend en local (opcional).

---

## 1) Contenido del ZIP

El ZIP de entrega debe contener esta estructura:

```text
ENTREGA_GREEN_SAVER/
├── green-saver/                  # Frontend Expo/React Native
├── green-saver-backend/          # Backend FastAPI
├── Evidencias_Visuales/          # Capturas F01..F16
├── README_ENTREGA.md             # Este documento
├── GUIA_CAPTURAS_PANTALLAS.md    # Guia de 16 funciones
├── RESUMEN_EJECUTIVO_RBAC.md     # Resumen tecnico de RBAC
└── AUTENTICACION_JWT_ZUSTAND.md  # Evidencia JWT + sesion
```

No incluir carpetas generadas automaticamente:

- node_modules/
- .expo/
- .venv/
- __pycache__/
- dist/ o build/ (si existen)

---

## 2) Requisitos previos (Windows)

Instalar:

- Git
- Node.js LTS (incluye npm)
- Python 3.11 o superior
- Expo Go (opcional para ejecutar en celular)

Verificacion rapida:

```powershell
git --version
node -v
npm -v
python --version
```

---

## 3) Ejecucion recomendada para evaluacion

La opcion recomendada para revisar funcionalidad es correr el frontend usando el backend publicado en internet.

### 3.1 Frontend con backend remoto (Render)

```powershell
Set-Location C:\ruta\donde\descomprimio\ENTREGA_GREEN_SAVER\green-saver
npm install
$env:EXPO_PUBLIC_API_URL="https://green-saver-api.onrender.com"
npm start
```

En Expo:

- Presionar w para abrir en navegador.
- O escanear QR con Expo Go para abrir en celular.

Con esta opcion no es necesario iniciar backend local.

---

## 4) Ejecucion completa local (opcional)

Usar esta opcion solo si se desea verificar tambien el backend localmente.

### 4.1 Iniciar backend local

```powershell
Set-Location C:\ruta\donde\descomprimio\ENTREGA_GREEN_SAVER\green-saver-backend
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 4.2 Iniciar frontend apuntando a backend local

En otra terminal:

```powershell
Set-Location C:\ruta\donde\descomprimio\ENTREGA_GREEN_SAVER\green-saver
npm install
$env:EXPO_PUBLIC_API_URL="http://localhost:8000"
npm start
```

---

## 5) Comprobaciones minimas sugeridas para el docente

1. Abrir login y autenticar usuario normal.
2. Verificar que usuario normal entra a modulo de usuario.
3. Iniciar sesion con admin y validar acceso a panel administrativo.
4. Revisar funcionalidades de cotizaciones e historial.
5. Confirmar consumo de backend remoto.

Documento de referencia para las 16 funciones:

- GUIA_CAPTURAS_PANTALLAS.md

---

## 6) Dependencias backend y para que se usan

Archivo: green-saver-backend/requirements.txt

- fastapi: framework principal para exponer la API REST.
- uvicorn[standard]: servidor ASGI para ejecutar FastAPI.
- gunicorn: servidor de procesos para despliegues de produccion.
- psycopg2-binary: conector Python para PostgreSQL.
- python-dotenv: carga variables de entorno desde archivo .env.
- pydantic: validacion de modelos de entrada y salida.
- python-jose[cryptography]: creacion y validacion de JWT.
- passlib[bcrypt]: hash y verificacion segura de contrasenas.
- bcrypt: algoritmo criptografico usado por passlib.

---

## 7) Solucion rapida de problemas

Si PowerShell bloquea scripts:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

Si frontend no conecta:

1. Verificar valor de EXPO_PUBLIC_API_URL.
2. En modo remoto, verificar internet.
3. En modo local, verificar backend en http://localhost:8000/docs.

Si faltan paquetes:

```powershell
# Frontend
npm install

# Backend (con venv activa)
pip install -r requirements.txt
```

---

## 8) Nota final

Para la evaluacion academica se recomienda iniciar primero en modo remoto (seccion 3), ya que reduce errores de entorno local y permite validar la app de manera estable.
