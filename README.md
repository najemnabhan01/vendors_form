# Sistema de Reportes para Vendedores

Aplicación web progresiva (PWA) para el control diario de visitas y ventas, con panel de administración, autenticación segura y base de datos en tiempo real.

## 🚀 Características

*   **Seguridad:** Login mediante correo/contraseña gestionado por Firebase Auth.
*   **Control de Acceso:** Sistema de "Lista Blanca" (Whitelist). Solo los correos autorizados por el Admin pueden registrarse.
*   **Base de Datos:** Firestore (NoSQL) para almacenamiento rápido y flexible.
*   **Formulario Inteligente:**
    *   Autocompletado de clientes existentes.
    *   Alerta de números telefónicos duplicados.
    *   Geolocalización (preparado para futura expansión).
*   **Panel Admin:**
    *   Filtrado por rangos de fecha, asesor y cliente.
    *   Exportación de reportes a CSV (Excel).
    *   Gestión de usuarios (Autorizar nuevos vendedores).

## 🛠 Configuración Inicial (Obligatorio)

### 1. Firebase Setup

1.  Crea un proyecto en [Firebase Console](https://console.firebase.google.com/).
2.  Habilita **Authentication** y activa el proveedor **Email/Password**.
3.  Habilita **Firestore Database**.
4.  Copia las Reglas de Seguridad recomendadas (ver abajo).

### 2. Crear al Primer Administrador

Como el sistema es seguro, no permite registrarse a nadie que no esté en la base de datos. Para entrar por primera vez:

1.  Ve a tu consola de Firebase > **Firestore Database**.
2.  Crea una colección llamada `users`.
3.  Crea un documento. **IMPORTANTE:** El ID del documento debe ser tu correo (ej: `admin@empresa.com`).
4.  Añade estos campos al documento:
    *   `email` (string): `admin@empresa.com`
    *   `name` (string): `Administrador`
    *   `role` (string): `admin`
5.  Ve a la aplicación web, e inicia sesión con ese correo. Inventa una contraseña nueva y el sistema te registrará automáticamente.

## 🔒 Reglas de Seguridad (Firestore)

Copia y pega esto en la pestaña "Reglas" de Firestore para blindar tu app:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permite verificar whitelist antes de login
    match /users/{userId} {
      allow get: if true;
      allow list, write: if request.auth != null;
    }
    // Protege todo lo demás
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 📖 Instrucciones de Uso

### Para el Administrador
*   **Autorizar Vendedor:** En el panel, sección "Gestión de Usuarios", escribe el correo y nombre del vendedor. Dale a "Autorizar".
*   **Ver Reportes:** Usa los filtros superiores para buscar ventas específicas.
*   **Exportar:** El botón verde descargará un archivo CSV compatible con Excel.

### Para el Vendedor
*   **Primer Acceso:** Debe ingresar el correo que el admin autorizó y crear su propia contraseña.
*   **Reportar:** Llenar el formulario diario. Si el cliente ya existe, aparecerá al escribir el nombre.

## 📦 Despliegue

Este proyecto está optimizado para **Vercel**.
1.  Instala Vercel CLI: `npm i -g vercel`
2.  Ejecuta: `vercel --prod`
