import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type User = {
  id: string
  email: string
  full_name?: string
  created_at: string
  updated_at: string
}

export type IncomeSource = {
  id: string
  user_id: string
  source_name: string
  source_type: 'monthly' | 'freelance' | 'gig' | 'other'
  amount: number
  frequency: 'one-time' | 'weekly' | 'monthly' | 'quarterly'
  created_at: string
}

export type Expense = {
  id: string
  user_id: string
  category: string
  amount: number
  description?: string
  date: string
  created_at: string
}

export type Goal = {
  id: string
  user_id: string
  title: string
  target_amount: number
  current_amount: number
  deadline?: string
  created_at: string
  updated_at: string
}

export type Transaction = {
  id: string
  user_id: string
  type: 'income' | 'expense'
  amount: number
  category: string
  description?: string
  date: string
  created_at: string
}
