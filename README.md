# Mi vitrina

Galería pública y adaptable a celulares. Cualquiera puede consultar los teléfonos; solo la cuenta de administrador autorizada puede agregar, editar o eliminar modelos, precios y fotos.

## Activar edición desde la página

Supabase protege la cuenta de administrador y guarda los cambios. Sin configurarlo, la página muestra las fotos incluidas en `catalogo/`, pero no puede guardar cambios hechos desde el sitio.

1. Crea un proyecto en [Supabase](https://supabase.com/).
2. En **Authentication → Users**, selecciona **Add user** y crea tu cuenta con tu correo y contraseña. Confirma la cuenta desde el panel.
3. En **SQL Editor**, ejecuta todo el contenido actualizado de `supabase-setup.sql`. Si ya ejecutaste una versión anterior, vuelve a ejecutar el archivo completo para crear la tabla protegida de costos.
4. Todavía en **SQL Editor**, autoriza únicamente la cuenta que acabas de crear. Reemplaza el correo del ejemplo y ejecuta:

   ```sql
   insert into public.catalog_admins (user_id)
   select id from auth.users where email = lower('TU_CORREO')
   on conflict (user_id) do nothing;
   ```

5. En **Project Settings → API**, copia la **Project URL** y la clave **anon / publishable**. No uses ni publiques la clave `service_role`.
6. En `app.js`, reemplaza `PEGA_AQUI_LA_URL_DE_TU_PROYECTO` y `PEGA_AQUI_TU_CLAVE_ANON` por los valores de tu proyecto.
7. Sube los cambios a la rama `main`. GitHub Actions actualizará la página automáticamente. Abre `https://johannbarajas.github.io/JB_TECH/`, pulsa **Acceso administrador** e inicia sesión con la cuenta autorizada.
8. Al iniciar sesión por primera vez, la página importará las 10 fotos iniciales al catálogo. Después podrás modificar los modelos y precios, cambiar fotos, agregar celulares o eliminarlos desde la misma página.

El rol se asigna en la base de datos, no mediante un botón de registro público. Una cuenta normal no puede modificar el catálogo, aunque conozca la página. Si todavía no conectas Supabase, la galería inicial sigue visible y el botón de administración explica que falta configurarlo.

## Uso del catálogo

- Los botones de editar y eliminar aparecen al iniciar sesión como administrador.
- El costo se guarda en una tabla privada separada; la consulta pública del catálogo no puede leerlo.
- En el editor puedes acercar o alejar, arrastrar, recortar y girar la foto antes de guardarla.
- Puedes dejar un precio vacío para que se muestre como pendiente.
- Las fotos deben ser JPG, PNG o WEBP y pesar hasta 10 MB.
- El catálogo y las fotos son públicos para que tus clientes puedan consultarlos. No subas fotos que contengan información que no quieras publicar.
- Las nuevas fotos del catálogo se guardan en Supabase; no es necesario modificar archivos ni código cada vez que agregues un celular.

Para actualizar la página se suben los cambios a `main`. El flujo de publicación está en `.github/workflows/deploy.yml`.
