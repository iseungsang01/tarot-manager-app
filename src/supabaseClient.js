import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY

const AdminPassWord = process.env.REACT_APP_ADMIN_PASSWORD

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export {supabase, AdminPassWord}