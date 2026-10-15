# Mi vitrina

Galería privada y adaptable a celulares para guardar fotos, modelos y precios de tus teléfonos. Los datos y las fotos se comparten entre dispositivos usando Supabase.

## Configuración inicial

1. Crea un proyecto gratuito en [Supabase](https://supabase.com/).
2. En el panel del proyecto, abre **SQL Editor**, pega el contenido de `supabase-setup.sql` y ejecuta el script. Esto crea la tabla de celulares, sus permisos privados y el almacenamiento de fotos.
3. En **Project Settings → API**, copia la **Project URL** y la clave **anon / publishable** del proyecto.
4. Abre `app.js` y reemplaza `PEGA_AQUI_LA_URL_DE_TU_PROYECTO` y `PEGA_AQUI_TU_CLAVE_ANON` con esos valores. La clave anon está diseñada para usarse en el navegador; el acceso queda restringido por las políticas de seguridad y el inicio de sesión.
5. Abre `index.html` en un navegador para probar la página. Crea tu cuenta con un correo y una contraseña. Si Supabase pide confirmar el correo, confirma el enlace que te envíe antes de iniciar sesión.
6. Crea un repositorio en GitHub y sube estos archivos a la rama `main`.
7. En el repositorio, abre **Settings → Pages** y selecciona **GitHub Actions** como fuente de publicación. El flujo incluido en `.github/workflows/deploy.yml` publicará la página automáticamente cada vez que subas cambios a `main`.
8. Cuando termine la publicación, GitHub mostrará la dirección de tu página en **Settings → Pages**. Ábrela desde tu celular e inicia sesión con la misma cuenta de Supabase.

## Uso

- Agrega un celular con su foto, modelo y precio.
- Busca en el catálogo por marca o modelo.
- Edita el nombre, el precio o cambia la foto; también puedes eliminar celulares.
- Las imágenes son privadas y solo la cuenta que las subió puede consultarlas.

Las fotos deben ser JPG, PNG o WEBP y pesar hasta 10 MB. No publiques la clave `service_role` de Supabase: la página solo necesita la clave `anon / publishable`.
