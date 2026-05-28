// Proxy serverless para chamadas Moodle — evita CORS no browser.
// Roda no servidor Vercel, não no browser do usuário.

export default async function handler(req: Request): Promise<Response> {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders })
  }

  let body: { url?: string; token?: string; wsfunction?: string; params?: Record<string, unknown> }
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: corsHeaders })
  }

  const { url, token, wsfunction, params = {} } = body

  if (!url || !token || !wsfunction) {
    return new Response(JSON.stringify({ error: 'url, token e wsfunction são obrigatórios' }), { status: 400, headers: corsHeaders })
  }

  const formBody = new URLSearchParams({
    wstoken: token,
    wsfunction,
    moodlewsrestformat: 'json',
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  })

  try {
    const moodleRes = await fetch(`${url}/webservice/rest/server.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formBody.toString(),
    })

    if (!moodleRes.ok) {
      return new Response(
        JSON.stringify({ error: `Moodle retornou status ${moodleRes.status}` }),
        { status: 502, headers: corsHeaders }
      )
    }

    const data = await moodleRes.json()
    return new Response(JSON.stringify(data), { status: 200, headers: corsHeaders })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Não foi possível conectar ao Moodle', details: String(err) }),
      { status: 502, headers: corsHeaders }
    )
  }
}

export const config = { runtime: 'edge' }
