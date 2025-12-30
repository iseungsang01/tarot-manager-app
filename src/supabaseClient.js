import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY
const AdminPassWord = process.env.REACT_APP_ADMIN_PASSWORD // SQL의 admin_secret과 일치해야 함

// 헤더에 비밀번호를 기본으로 포함하는 클라이언트 생성
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      'x-admin-secret': AdminPassWord,
    },
  },
})

export { supabase, AdminPassWord }