// Proxy server-side para o endpoint de autenticação do Supabase.
// O browser chama /api/supabase-auth (mesmo domínio = sem CORS).
// O servidor Vercel chama o Supabase (server-to-server = sem CORS).

export const config = { runtime: 'edge' }

export default async function handler(req: Request): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  const { email, password } = await req.json()

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL
  const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY

  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY!,
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await res.json()
  return new Response(JSON.stringify(data), { status: res.status, headers })
}
