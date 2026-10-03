# Cómo dejar el punto de venta funcionando

## En Supabase
1. Crea un proyecto en supabase.com.
2. Menú **SQL Editor** > New query > pega todo `supabase/1_crear_base_de_datos.sql` > **Run**.
3. Menú **Authentication** > Providers > Email: desactiva **Confirm email** y guarda.
4. Menú **Authentication** > Users > **Add user** > Create new user: escribe tu correo y contraseña (marca Auto Confirm User).
5. Vuelve al **SQL Editor**, abre `supabase/2_dejar_administrador.sql`, cambia `TU-CORREO@ejemplo.com` por ese correo > **Run**.
6. Menú **Project Settings** > **API**: copia **Project URL** y la clave **anon / publishable**.
7. Abre `src/config.js` y pega esas dos cosas en lugar de los textos de ejemplo.

Buckets: no necesitas crear ninguno (esta versión no guarda imágenes).

## En Netlify
1. Entra a app.netlify.com > Add new site > **Deploy manually**.
2. Para esto primero necesitas generar la carpeta `dist`: instala Node.js, abre la carpeta del proyecto en una terminal, ejecuta `npm install` y luego `npm run build`.
   (Alternativa sin terminal: sube el proyecto a GitHub y en Netlify elige "Import from Git"; Netlify construye solo.)
3. Arrastra la carpeta `dist` a Netlify. Listo: te da un enlace.

## Después
Entra con tu correo de administrador. En la pestaña **Usuarios** creas vendedores y administradores; en **Productos** cargas tu catálogo.
