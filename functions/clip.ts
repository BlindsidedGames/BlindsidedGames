const headers = {
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex'
};

export const onRequestGet: PagesFunction = async () =>
  new Response(
    `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Gone</title>
  </head>
  <body>
    <p>This App Clip route has moved.</p>
  </body>
</html>`,
    {
      status: 410,
      headers
    }
  );
