# Servidor de Películas Familiar

Este proyecto te permite compartir películas con tus familiares a través de una web moderna y segura. Incluye:
- Backend en Node.js con Express (autenticación, streaming y descarga de películas, subida solo para admin)
- Frontend web con Tailwind CSS
- API lista para futuras apps móviles

## Requisitos
- Node.js 18+ (https://nodejs.org/)

## Instalación y uso

1. **Instala dependencias**

    Abre una terminal en la carpeta `server` y ejecuta:
    ```sh
    npm install
    ```

2. **Crea el usuario admin**

    Lanza el servidor una vez y regístrate como `admin` desde la web. El primer usuario creado será el admin y podrá subir películas.

3. **Agrega tus películas**

    - Sube archivos `.mp4` desde la web (si eres admin) o cópialos manualmente a la carpeta `server/movies`.

4. **Inicia el servidor**

    ```sh
    npm start
    ```
    El servidor estará en http://localhost:4000

5. **Accede desde la web**

    Abre `http://localhost:4000` en tu navegador. Inicia sesión para ver y descargar películas.

## Seguridad
- Solo usuarios registrados pueden ver/descargar.
- Solo el usuario `admin` puede subir películas.

## API REST
- `/api/login` y `/api/register` para autenticación
- `/api/movies` para listar
- `/api/movies/stream/:filename` para streaming
- `/api/movies/download/:filename` para descarga
- `/api/movies/upload` para subir (solo admin)

## Personalización
- Puedes editar el frontend en la carpeta `web`.
- Puedes crear una app móvil usando la API.

---

**¡Disfruta compartiendo tus películas en familia!**
