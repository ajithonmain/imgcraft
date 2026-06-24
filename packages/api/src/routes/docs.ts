export async function handleDocs(): Promise<Response> {
  const html = `<!doctype html>
<html>
<head>
  <title>imgcraft API Reference</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body>
  <div id="app"></div>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
  <script>
    Scalar.createApiReference('#app', {
      url: '/docs/openapi.json',
      theme: 'kepler',
      darkMode: true,
      metaData: {
        title: 'imgcraft API Reference',
      },
      customCss: \`
        :root {
          --scalar-color-accent: #22c55e;
          --scalar-button-1: #22c55e;
          --scalar-button-1-hover: #16a34a;
          --scalar-color-1: #fafafa;
          --scalar-background-1: #09090b;
          --scalar-background-2: #18181b;
          --scalar-background-3: #27272a;
          --scalar-border-color: #3f3f46;
        }
      \`,
      hiddenClients: [],
      defaultHttpClient: {
        targetKey: 'javascript',
        clientKey: 'fetch'
      }
    })
  </script>
</body>
</html>`
  return new Response(html, {
    headers: { 'Content-Type': 'text/html;charset=UTF-8' },
  })
}

export async function handleOpenAPIJson(spec: unknown): Promise<Response> {
  return new Response(JSON.stringify(spec, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
