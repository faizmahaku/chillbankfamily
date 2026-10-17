import { createClient } from '@supabase/supabase-js'

let rawUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || ''
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || ''

// Otomatis bersihkan jika ada prefix dobel https:https://
if (rawUrl.startsWith('https:https://')) {
  rawUrl = rawUrl.replace('https:https://', 'https://')
} else if (rawUrl.startsWith('http:http://')) {
  rawUrl = rawUrl.replace('http:http://', 'http://')
}

export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('YOUR_PROJECT_ID') &&
  !rawKey.includes('YOUR_SUPABASE')
)

export const supabase = isSupabaseConfigured
  ? createClient(rawUrl, rawKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
