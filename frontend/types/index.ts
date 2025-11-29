export type IncomeSourceType = 'monthly' | 'freelance' | 'gig' | 'other'
export type FrequencyType = 'one-time' | 'weekly' | 'monthly' | 'quarterly'
export type TransactionType = 'income' | 'expense' | 'transfer'

export interface User {
  id: string
  email: string
  full_name?: string
  onboarding_complete?: boolean
  created_at: string
  updated_at: string
}

export interface IncomeSource {
  id: string
  user_id: string
  source_name: string
  source_type: IncomeSourceType
  amount: number
  frequency: FrequencyType
  created_at: string
}

export interface Expense {
  id: string
  user_id: string
  category: string
  amount: number
  description?: string
  date: string
  created_at: string
}

export interface Goal {
  id: string
  user_id: string
  title: string
  description?: string
  category?: string
  status: 'active' | 'paused' | 'achieved'
  priority: 'high' | 'medium' | 'low'
  target_amount: number
  current_amount: number
  deadline?: string
  monthly_contribution: number
  required_monthly: number
  icon_key?: string
  tags?: string[]
  notes?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  user_id: string
  type: TransactionType
  amount: number
  currency: string
  category?: string
  subcategory?: string
  description?: string
  date: string
  client_id?: string
  scheduled_for?: string
  is_recurring?: boolean
  recurrence_rule?: string
  gst_eligible?: boolean
  gst_rate?: number
  ledger_status: 'unreconciled' | 'pending' | 'cleared'
  requires_follow_up?: boolean
  follow_up_reason?: string
  has_receipt?: boolean
  tags?: string[]
  notes?: string
  source?: string
  created_at: string
  updated_at: string
}

export interface FinancialPulse {
  score: number
  trend: 'up' | 'down' | 'stable'
  volatility: number
  savingsRate: number
  insights: string[]
}

export interface ReceivableHighlight {
  id: string
  title: string
  client_name?: string
  amount: number
  currency: string
  due_date?: string
  status_label: string
}

export interface ComplianceQueueItem {
  id: string
  title: string
  task_type?: string
  due_date?: string
  status: string
  notes?: string
  urgency_label: string
}

export type ActionItemKind = 'transaction' | 'invoice' | 'compliance'

export interface ActionInboxItem {
  id: string
  title: string
  category: string
  urgency: string
  kind: ActionItemKind
  amount?: number
}

export type UpcomingEventType = 'inflow' | 'outflow' | 'task'

export interface UpcomingEventItem {
  id: string
  title: string
  date?: string
  amount?: number
  currency?: string
  type: UpcomingEventType
  source: string
}

export interface DashboardHighlights {
  receivables: ReceivableHighlight[]
  compliance_queue: ComplianceQueueItem[]
  action_inbox: ActionInboxItem[]
  upcoming_events: UpcomingEventItem[]
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  audioUrl?: string
}

export interface WhatIfScenario {
  purchaseAmount: number
  purchaseDescription: string
  impact: {
    savingsReduction: number
    goalDelay: number
    affordabilityScore: number
  }
}
