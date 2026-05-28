import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Diagnóstico — remover após confirmar que login funciona
console.log('[Supabase] URL:', url ?? '⚠️ UNDEFINED — variável VITE_SUPABASE_URL não encontrada')
console.log('[Supabase] Key:', key ? key.slice(0, 30) + '...' : '⚠️ UNDEFINED — variável VITE_SUPABASE_ANON_KEY não encontrada')

export const supabase = createClient(url, key)
