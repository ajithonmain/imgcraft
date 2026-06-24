export async function handleDocs(): Promise<Response> {
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>imgcraft API</title>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui.min.css">
  <style>
    body { margin: 0; background: #09090b; }
    .swagger-ui .topbar { background: #09090b; border-bottom: 1px solid #27272a; }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
    .swagger-ui .info .title { color: #22c55e; }
  </style>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/5.17.14/swagger-ui-bundle.min.js"></script>
<script>
SwaggerUIBundle({
  url: '/docs/openapi.json',
  dom_id: '#swagger-ui',
  presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
  layout: 'BaseLayout',
  deepLinking: true,
  defaultModelsExpandDepth: 1,
  defaultModelExpandDepth: 1
})
</script>
</body>
</html>`
  return new Response(html, { headers: { 'Content-Type': 'text/html;charset=UTF-8' } })
}

export async function handleOpenAPIJson(spec: unknown): Promise<Response> {
  return new Response(JSON.stringify(spec, null, 2), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}
