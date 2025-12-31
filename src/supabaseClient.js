import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

// 1. 일반 클라이언트 (고객용)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 2. 관리자 클라이언트 (특수 헤더 포함)
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-admin-secret': 'p1o2m3n4'
    }
  }
})

// 3. 관리자 비밀번호 (환경변수에서 가져옴)
export const AdminPassWord = process.env.REACT_APP_ADMIN_PASSWORD