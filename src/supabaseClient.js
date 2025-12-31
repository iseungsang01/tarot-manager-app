import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
const AdminPassWord = process.env.REACT_APP_ADMIN_PASSWORD

// 일반 클라이언트 (고객용)
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 관리자 클라이언트 (RLS 우회)
const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-admin-secret': 'p1o2m3n4'
    }
  }
})

export { supabase, supabaseAdmin, AdminPassWord }