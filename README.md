# Mi vitrina

Galería privada y adaptable a celulares para guardar fotos, modelos y precios de tus teléfonos. Los datos y las fotos se comparten entre dispositivos usando Supabase.

## Galería pública de fotos

La galería inicial muestra las fotos incluidas en `catalogo/` y los precios/modelos legibles. Las fotos y la página son públicas: cualquier persona con el enlace puede verlas.

Para agregar más fotos a la galería publicada, ponlas en `catalogo/`, agrega sus nombres, precios y rutas en `STARTER_CATALOG` dentro de `app.js` y sube los cambios a la rama `main`. GitHub Actions actualizará la página automáticamente.

## Guardar fotos desde la página y sincronizar dispositivos

La carga y edición de fotos desde la página, con sincronización privada entre dispositivos, también se puede activar conectando Supabase:

1. Crea un proyecto gratuito en [Supabase](https://supabase.com/).
2. En el panel del proyecto, abre **SQL Editor**, pega el contenido de `supabase-setup.sql` y ejecuta el script. Esto crea la tabla de celulares, sus permisos privados y el almacenamiento de fotos.
3. En **Project Settings → API**, copia la **Project URL** y la clave **anon / publishable** del proyecto.
4. Abre `app.js` y reemplaza `PEGA_AQUI_LA_URL_DE_TU_PROYECTO` y `PEGA_AQUI_TU_CLAVE_ANON` con esos valores. La clave anon está diseñada para usarse en el navegador; el acceso queda restringido por las políticas de seguridad y el inicio de sesión.
5. Abre `index.html` en un navegador para probar la página. Crea tu cuenta con un correo y una contraseña. Si Supabase pide confirmar el correo, confirma el enlace que te envíe antes de iniciar sesión.
6. Para que la página use ese catálogo privado, reemplaza los valores de configuración en `app.js` y sube los cambios a `main`.
7. Entra a `https://johannbarajas.github.io/JB_TECH/` desde tu celular e inicia sesión con la cuenta de Supabase.

## Uso

- Agrega un celular con su foto, modelo y precio.
- Busca en el catálogo por marca o modelo.
- Edita el nombre, el precio o cambia la foto; también puedes eliminar celulares.
- Las imágenes guardadas en Supabase son privadas y solo la cuenta que las subió puede consultarlas.

Las fotos deben ser JPG, PNG o WEBP y pesar hasta 10 MB. No publiques la clave `service_role` de Supabase: la página solo necesita la clave `anon / publishable`.
