'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileSpreadsheet,
  Mail,
  PiggyBank,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { HeartbeatPulse } from '@/components/dashboard/HeartbeatPulse'
import {
  createGoal,
  createTransaction,
  fetchDashboardHighlights,
  fetchFinancialPulse,
  fetchGoals,
  fetchTransactions,
} from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import type { ActionItemKind, DashboardHighlights, TransactionType } from '@/types'

const PLACEHOLDER = '__'
const SAVINGS_GOAL = 30000

type MonthlySeriesPoint = {
  month: string
  income: number
  expense: number
}

type DashboardTransactionForm = {
  type: TransactionType
  amount: string
  description: string
  category: string
  date: string
  ledgerStatus: 'unreconciled' | 'pending' | 'cleared'
  scheduled: boolean
  scheduledDate: string
}

type DashboardGoalForm = {
  title: string
  targetAmount: string
  deadline: string
  category: string
  priority: 'high' | 'medium' | 'low'
  notes: string
}

const fallbackGoalSnapshots = [
  { name: 'Add your first goal', target: 0, current: 0, due: PLACEHOLDER, icon: ShieldCheck },
  { name: 'Sync tax savings goal', target: 0, current: 0, due: PLACEHOLDER, icon: Sparkles },
  { name: 'Track a priority purchase', target: 0, current: 0, due: PLACEHOLDER, icon: FileSpreadsheet },
]

const formatCurrencyValue = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return PLACEHOLDER
  }
  return formatCurrency(value)
}

const formatPercentValue = (value: number | null | undefined, digits = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return PLACEHOLDER
  }
  return `${value.toFixed(digits)}%`
}

const formatChangeValue = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return PLACEHOLDER
  }
  const absValue = Math.abs(value)
  const prefix = value >= 0 ? '+' : '-'
  return `${prefix}${formatCurrency(absValue)}`
}

const createDefaultTransactionForm = (): DashboardTransactionForm => ({
  type: 'expense',
  amount: '',
  description: '',
  category: '',
  date: new Date().toISOString().split('T')[0],
  ledgerStatus: 'unreconciled',
  scheduled: false,
  scheduledDate: '',
})

const createDefaultGoalForm = (): DashboardGoalForm => ({
  title: '',
  targetAmount: '',
  deadline: '',
  category: '',
  priority: 'medium',
  notes: '',
})

export default function DashboardPage() {
  const [greeting, setGreeting] = useState('Hello')
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [isFetchingData, setIsFetchingData] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [habits, setHabits] = useState([
    { id: 1, name: "Log today's expenses", icon: ReceiptText, completed: true, streak: 9 },
    { id: 2, name: 'Review wallet balance', icon: Wallet, completed: true, streak: 11 },
    { id: 3, name: 'Set aside savings', icon: PiggyBank, completed: false, streak: 18 },
    { id: 4, name: 'Follow up on invoices', icon: Mail, completed: true, streak: 6 },
    { id: 5, name: 'Update tax tracker', icon: FileSpreadsheet, completed: false, streak: 4 },
    { id: 6, name: 'Check goal progress', icon: Target, completed: false, streak: 13 },
  ])
  const [dashboardHighlights, setDashboardHighlights] = useState<DashboardHighlights | null>(null)
  const router = useRouter()
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionForm, setTransactionForm] = useState<DashboardTransactionForm>(createDefaultTransactionForm())
  const [transactionSaving, setTransactionSaving] = useState(false)
  const [transactionError, setTransactionError] = useState<string | null>(null)
  const [showGoalModal, setShowGoalModal] = useState(false)
  const [goalForm, setGoalForm] = useState<DashboardGoalForm>(createDefaultGoalForm())
  const [goalSaving, setGoalSaving] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)

  const user = useUserStore((state) => state.user)
  const transactions = useUserStore((state) => state.transactions)
  const setTransactions = useUserStore((state) => state.setTransactions)
  const goals = useUserStore((state) => state.goals)
  const setGoals = useUserStore((state) => state.setGoals)
  const financialPulse = useUserStore((state) => state.financialPulse)
  const setFinancialPulse = useUserStore((state) => state.setFinancialPulse)
  const addTransactionToStore = useUserStore((state) => state.addTransaction)
  const addGoalToStore = useUserStore((state) => state.addGoal)
  const actionIconMap: Record<ActionItemKind, typeof ReceiptText> = {
    transaction: ReceiptText,
    invoice: FileSpreadsheet,
    compliance: ClipboardCheck,
  }

  const needsOnboarding = Boolean(user && user.onboarding_complete === false)

  const userName =
    user?.full_name && user.full_name.trim().length > 0
      ? user.full_name.trim().split(' ')[0]
      : user?.email
        ? user.email.split('@')[0]
        : 'there'

  useEffect(() => {
    setHasHydrated(true)
    const now = new Date()
    const hour = now.getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 17) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')

    setCurrentTime(now)
  }, [])

  const loadDashboardData = useCallback(
    async (options?: { signal?: AbortSignal }) => {
      if (!user?.id) return
      setFetchError(null)
      setIsFetchingData(true)
      try {
        const [txnData, pulseData, goalData, highlightData] = await Promise.all([
          fetchTransactions(user.id, { signal: options?.signal }),
          fetchFinancialPulse(user.id, { signal: options?.signal }),
          fetchGoals(user.id, { signal: options?.signal }),
          fetchDashboardHighlights(user.id, { signal: options?.signal }),
        ])
        setTransactions(txnData)
        setFinancialPulse(pulseData)
        setGoals(goalData)
        setDashboardHighlights(highlightData)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setFetchError(error instanceof Error ? error.message : 'Failed to load dashboard data')
        }
      } finally {
        if (!options?.signal || !options.signal.aborted) {
          setIsFetchingData(false)
        }
      }
    },
    [user?.id, setTransactions, setFinancialPulse, setGoals, setDashboardHighlights],
  )

  useEffect(() => {
    if (!user?.id) return
    const controller = new AbortController()
    loadDashboardData({ signal: controller.signal })
    return () => controller.abort()
  }, [user?.id, loadDashboardData])

  const handleTransactionFormChange = (field: keyof DashboardTransactionForm, value: string | boolean) => {
    setTransactionForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleTransactionSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.id) {
      setTransactionError('Sign in to log cashflow.')
      return
    }
    const amountValue = Number(transactionForm.amount)
    if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
      setTransactionError('Enter a valid amount.')
      return
    }
    if (!transactionForm.date) {
      setTransactionError('Pick a booking date.')
      return
    }

    setTransactionError(null)
    setTransactionSaving(true)
    try {
      const payload: Parameters<typeof createTransaction>[1] = {
        type: transactionForm.type,
        amount: amountValue,
        description: transactionForm.description || undefined,
        category: transactionForm.category || undefined,
        date: transactionForm.date,
        ledger_status: transactionForm.ledgerStatus,
      }
      if (transactionForm.scheduled && transactionForm.scheduledDate) {
        payload.scheduled_for = transactionForm.scheduledDate
      }
      const created = await createTransaction(user.id, payload)
      addTransactionToStore(created)
      await loadDashboardData()
      setShowTransactionModal(false)
      setTransactionForm(createDefaultTransactionForm())
    } catch (error) {
      setTransactionError(error instanceof Error ? error.message : 'Unable to log transaction.')
    } finally {
      setTransactionSaving(false)
    }
  }

  const handleGoalFormChange = (field: keyof DashboardGoalForm, value: string) => {
    setGoalForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleGoalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.id) {
      setGoalError('Sign in to add a goal.')
      return
    }
    const amountValue = Number(goalForm.targetAmount)
    if (!goalForm.title.trim()) {
      setGoalError('Name the goal first.')
      return
    }
    if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
      setGoalError('Target amount must be greater than zero.')
      return
    }

    setGoalError(null)
    setGoalSaving(true)
    try {
      const payload: Parameters<typeof createGoal>[1] = {
        title: goalForm.title.trim(),
        target_amount: amountValue,
        deadline: goalForm.deadline || undefined,
        category: goalForm.category || undefined,
        priority: goalForm.priority,
        notes: goalForm.notes || undefined,
      }
      const created = await createGoal(user.id, payload)
      addGoalToStore(created)
      await loadDashboardData()
      setShowGoalModal(false)
      setGoalForm(createDefaultGoalForm())
    } catch (error) {
      setGoalError(error instanceof Error ? error.message : 'Unable to create goal.')
    } finally {
      setGoalSaving(false)
    }
  }

  const financialTransactions = useMemo(() => transactions.filter((txn) => txn.type !== 'transfer'), [transactions])

  const monthlyBuckets = useMemo(() => {
    const buckets = new Map<
      string,
      { income: number; expense: number; label: string; date: Date }
    >()

    financialTransactions.forEach((txn) => {
      const parsedDate = new Date(txn.date)
      if (Number.isNaN(parsedDate.getTime())) return
      const key = `${parsedDate.getFullYear()}-${parsedDate.getMonth()}`
      if (!buckets.has(key)) {
        buckets.set(key, {
          income: 0,
          expense: 0,
          label: parsedDate.toLocaleString('default', { month: 'short' }),
          date: parsedDate,
        })
      }
      const bucket = buckets.get(key)!
      if (txn.type === 'income') bucket.income += txn.amount
      else if (txn.type === 'expense') bucket.expense += txn.amount
    })

    return Array.from(buckets.values()).sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [financialTransactions])

  const incomeData = useMemo<MonthlySeriesPoint[]>(() => {
    return monthlyBuckets
      .slice(-6)
      .map((bucket) => ({ month: bucket.label, income: bucket.income, expense: bucket.expense }))
  }, [monthlyBuckets])

  const hasMonthlyData = incomeData.length > 0
  const currentMonthPoint = hasMonthlyData ? incomeData[incomeData.length - 1] : null
  const previousMonthPoint = hasMonthlyData && incomeData.length > 1 ? incomeData[incomeData.length - 2] : null

  const monthlySavings = currentMonthPoint ? currentMonthPoint.income - currentMonthPoint.expense : null
  const previousSavings = previousMonthPoint ? previousMonthPoint.income - previousMonthPoint.expense : null
  const savingsChange =
    monthlySavings !== null && previousSavings !== null ? monthlySavings - previousSavings : null

  const averageIncome = hasMonthlyData
    ? incomeData.reduce((sum, item) => sum + item.income, 0) / incomeData.length
    : null
  const averageExpense = hasMonthlyData
    ? incomeData.reduce((sum, item) => sum + item.expense, 0) / incomeData.length
    : null

  const volatilityPercent =
    hasMonthlyData && incomeData.length > 1 && averageIncome && averageIncome !== 0
      ? Math.round(
          Math.min(
            100,
            Math.max(
              0,
              (Math.sqrt(
                incomeData.reduce((sum, item) => sum + Math.pow(item.income - averageIncome, 2), 0) /
                  incomeData.length,
              ) /
                averageIncome) *
                100,
            ),
          ),
        )
      : null

  const computedSavingsRate =
    averageIncome && averageIncome !== 0 && averageExpense !== null
      ? Math.round(
          Math.min(100, Math.max(0, ((averageIncome - averageExpense) / averageIncome) * 100))
        )
      : null
  const savingsRate = financialPulse?.savingsRate ?? computedSavingsRate

  const totals = useMemo(
    () =>
      financialTransactions.reduce(
        (acc, txn) => {
          if (txn.type === 'income') acc.income += txn.amount
          else if (txn.type === 'expense') acc.expense += txn.amount
          return acc
        },
        { income: 0, expense: 0 },
      ),
    [financialTransactions],
  )

  const hasTransactions = financialTransactions.length > 0
  const currentBalance = hasTransactions ? totals.income - totals.expense : null
  const mtdIncome = currentMonthPoint?.income ?? null
  const mtdExpenses = currentMonthPoint?.expense ?? null
  const cashRunway =
    currentBalance !== null && averageExpense && averageExpense > 0
      ? currentBalance / averageExpense
      : null

  const heroStats = useMemo(() => [
    {
      label: 'Cash on Hand',
      value: formatCurrencyValue(currentBalance),
      helper: cashRunway !== null ? `Runway ${cashRunway.toFixed(1)} mo` : 'Need income & expense data',
      change: formatChangeValue(savingsChange),
      positive: savingsChange !== null ? savingsChange >= 0 : null,
      icon: Wallet,
    },
    {
      label: 'Month-to-date Income',
      value: formatCurrencyValue(mtdIncome),
      helper: mtdExpenses !== null ? `Spent ${formatCurrency(mtdExpenses)}` : 'No expenses this month yet',
      change: financialTransactions.length ? `${financialTransactions.length} records` : PLACEHOLDER,
      positive: null,
      icon: TrendingUp,
    },
    {
      label: 'Savings Rate',
      value: formatPercentValue(savingsRate),
      helper: financialPulse ? 'From latest pulse' : hasMonthlyData ? 'Based on averages' : 'Need more history',
      change: formatChangeValue(savingsChange),
      positive: savingsRate !== null ? savingsRate >= 30 : null,
      icon: PiggyBank,
    },
    {
      label: 'Tax Set Aside',
      value: PLACEHOLDER,
      helper: 'Next due: Oct 31',
      change: '(done) Ready',
      positive: null,
      icon: FileSpreadsheet,
    },
  ], [
    currentBalance,
    cashRunway,
    savingsChange,
    mtdIncome,
    mtdExpenses,
    financialTransactions.length,
    financialPulse,
    savingsRate,
    hasMonthlyData,
  ])

  const pulseMetrics = useMemo(() => [
    {
      label: 'Avg Monthly Income',
      value: formatCurrencyValue(averageIncome),
      helper: hasMonthlyData ? `Across ${incomeData.length} months` : 'Need at least one month',
      positive: averageIncome !== null,
    },
    {
      label: 'Avg Monthly Expense',
      value: formatCurrencyValue(averageExpense),
      helper: hasMonthlyData ? `Across ${incomeData.length} months` : 'Need at least one month',
      positive: averageExpense !== null,
    },
    {
      label: 'Income Volatility',
      value: formatPercentValue(volatilityPercent),
      helper: volatilityPercent !== null ? 'Lower is steadier' : 'Need data from 2 months',
      positive: volatilityPercent !== null ? volatilityPercent < 25 : false,
    },
    {
      label: 'Cash Runway',
      value: cashRunway !== null ? `${cashRunway.toFixed(1)} mo` : PLACEHOLDER,
      helper: cashRunway !== null ? 'Based on avg spend' : 'Need income & expense data',
      positive: cashRunway !== null ? cashRunway >= 3 : false,
    },
  ], [averageIncome, averageExpense, volatilityPercent, cashRunway, hasMonthlyData, incomeData])

  const goalSnapshots = useMemo(() => {
    if (!goals.length) {
      return fallbackGoalSnapshots
    }
    const iconPool = [ShieldCheck, Sparkles, FileSpreadsheet, Target, PiggyBank]
    return goals
      .map((goal) => ({
        name: goal.title,
        target: goal.target_amount,
        current: goal.current_amount,
        due: goal.deadline
          ? new Date(goal.deadline).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
          : 'No deadline',
      }))
      .sort((a, b) => (b.current / (b.target || 1)) - (a.current / (a.target || 1)))
      .slice(0, 3)
      .map((goal, index) => ({
        ...goal,
        icon: iconPool[index % iconPool.length],
      }))
  }, [goals])

  const toggleHabit = (id: number) => {
    setHabits((prev) => prev.map((habit) => (habit.id === id ? { ...habit, completed: !habit.completed } : habit)))
  }

  const completedToday = habits.filter((habit) => habit.completed).length
  const totalHabits = habits.length
  const habitProgress = totalHabits ? (completedToday / totalHabits) * 100 : 0

  const receivableSpotlight = dashboardHighlights?.receivables ?? []
  const complianceReminders = dashboardHighlights?.compliance_queue ?? []
  const actionItems = dashboardHighlights?.action_inbox ?? []
  const upcomingEvents = dashboardHighlights?.upcoming_events ?? []

  const coachHighlight = useMemo(() => {
    if (financialPulse?.insights?.length) {
      return {
        headline: 'Latest pulse insight',
        message: financialPulse.insights[0],
        action: 'Review pulse',
      }
    }
    return {
      headline: 'Add financial data to see insights',
      message: 'Complete your profile and sync income/expenses to unlock personalized coaching.',
      action: 'Complete profile',
    }
  }, [financialPulse])

  const emergencyGoal = useMemo(() => {
    if (!goals.length) return null
    return (
      goals.find((goal) => {
        const title = goal.title?.toLowerCase?.() ?? ''
        const tags = Array.isArray(goal.tags) ? goal.tags.map((tag) => tag.toLowerCase()) : []
        return (
          goal.category?.toLowerCase() === 'emergency' ||
          title.includes('emergency') ||
          title.includes('buffer') ||
          tags.includes('emergency')
        )
      }) ?? null
    )
  }, [goals])

  const emergencyStatus = useMemo(() => {
    const targetMonths =
      averageExpense && averageExpense > 0 && emergencyGoal
        ? Math.max(1, emergencyGoal.target_amount / averageExpense)
        : 3
    const coverageMonths =
      averageExpense && averageExpense > 0
        ? emergencyGoal
          ? emergencyGoal.current_amount / averageExpense
          : cashRunway
        : null
    const nextTopUp = emergencyGoal && emergencyGoal.monthly_contribution > 0 ? emergencyGoal.monthly_contribution : null
    return {
      coverageMonths,
      targetMonths,
      nextTopUp,
    }
  }, [averageExpense, emergencyGoal, cashRunway])

  const emergencyCoverageLabel =
    emergencyStatus.coverageMonths !== null
      ? `${emergencyStatus.coverageMonths.toFixed(1)} / ${emergencyStatus.targetMonths.toFixed(1)} months`
      : 'Add savings data'
  const emergencyProgressPercent =
    emergencyStatus.coverageMonths !== null && emergencyStatus.targetMonths > 0
      ? Math.min(100, (emergencyStatus.coverageMonths / emergencyStatus.targetMonths) * 100)
      : 0
  const emergencyNextTopUpLabel =
    emergencyStatus.nextTopUp !== null ? formatCurrency(emergencyStatus.nextTopUp) : 'Add savings data'

  return (
    <div className="relative">
      <div className="min-h-screen p-4 md:p-6 lg:ml-[280px] lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-bold font-grotesk">
                <span className="text-gradient-green-gold">{greeting}, {userName}!</span>
              </h1>
              <p className="text-muted-foreground mt-2" suppressHydrationWarning>
                {hasHydrated && currentTime
                  ? new Intl.DateTimeFormat('en-IN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    }).format(currentTime)
                  : PLACEHOLDER}
              </p>
            </div>
          </div>
        </motion.div>

        {fetchError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {fetchError}
          </div>
        )}

        {isFetchingData && !fetchError && (
          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
            Syncing your latest transactions and goals...
          </div>
        )}

        <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {heroStats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="neuro-card rounded-2xl p-4 flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                      <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-theme-green" />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{stat.helper}</span>
                    {stat.change && stat.change !== PLACEHOLDER ? (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium ${
                          stat.positive === null
                            ? 'text-muted-foreground'
                            : stat.positive
                              ? 'text-theme-green'
                              : 'text-destructive'
                        }`}
                      >
                        {stat.positive === null ? null : stat.positive ? (
                          <ArrowUpRight className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {stat.change}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">{PLACEHOLDER}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
          <div className="space-y-6">
            {needsOnboarding && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="neuro-card rounded-3xl p-6 border border-theme-green/30 bg-theme-green/10"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-theme-green">Complete your profile</p>
                    <p className="text-xs text-muted-foreground max-w-xl">
                      Answer a few quick questions so TaalAI can personalise tax nudges, cash-flow alerts, and goal plans.
                    </p>
                  </div>
                  <Link
                    href="/onboarding"
                    className="inline-flex items-center gap-2 rounded-full border border-theme-green/40 bg-theme-green/20 px-4 py-2 text-xs font-semibold text-theme-green hover:border-theme-green/60 hover:bg-theme-green/30 transition-colors"
                  >
                    Finish setup
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}

            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
              <div className="relative">
                <HeartbeatPulse data={incomeData} />
                {!hasMonthlyData && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-3xl bg-background/80 text-sm text-muted-foreground">
                    Add income and expense transactions to see your financial rhythm.
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="neuro-card rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Financial Pulse</h3>
                  <p className="text-sm text-muted-foreground">A quick scan of your money rhythm</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {hasMonthlyData ? `Based on ${incomeData.length} months` : 'Need transaction history'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {pulseMetrics.map((metric) => (
                  <div key={metric.label} className="rounded-2xl border border-white/5 bg-background/40 p-4 flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">{metric.label}</span>
                    <span className="text-xl font-semibold">{metric.value}</span>
                    <span className="text-xs text-muted-foreground">{metric.helper}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.18 }}
              className="grid gap-4 lg:grid-cols-2"
            >
              <div className="neuro-card rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Receivables spotlight</h3>
                  <Calendar className="w-4 h-4 text-theme-gold" />
                </div>
                <p className="text-sm text-muted-foreground">Top follow-ups across overdue and upcoming invoices.</p>
                <div className="space-y-3">
                  {receivableSpotlight.length ? (
                    receivableSpotlight.map((item) => {
                      const dueLabel = item.due_date
                        ? new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : PLACEHOLDER
                      return (
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-background/40 p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{item.title}</p>
                              {item.client_name && (
                                <p className="text-xs text-muted-foreground">{item.client_name}</p>
                              )}
                            </div>
                            <span className="text-theme-green font-semibold">{formatCurrency(item.amount)}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                            <span>{dueLabel}</span>
                            <span>{item.status_label}</span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-background/20 p-4 text-sm text-muted-foreground">
                      Sync your invoices to surface overdue client payments here.
                    </div>
                  )}
                </div>
              </div>

              <div className="neuro-card rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Compliance queue</h3>
                  <ClipboardCheck className="w-4 h-4 text-theme-green" />
                </div>
                <p className="text-sm text-muted-foreground">Daily reminders curated from GST, tax, and bookkeeping tasks.</p>
                <div className="space-y-3 text-sm">
                  {complianceReminders.length ? (
                    complianceReminders.map((item) => {
                      const dueLabel = item.due_date
                        ? new Date(item.due_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                        : PLACEHOLDER
                      return (
                        <div key={item.id} className="rounded-2xl border border-white/10 bg-background/30 p-3">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{item.title}</p>
                            <span className="text-xs text-muted-foreground">{dueLabel}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{item.urgency_label}</p>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-background/20 p-4 text-xs text-muted-foreground">
                      Once you add GST, tax, or bookkeeping tasks we will queue the most urgent ones here.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="neuro-card rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Monthly Savings</h3>
                  <p className="text-sm text-muted-foreground">Goal: {formatCurrency(SAVINGS_GOAL)}</p>
                </div>
                {monthlySavings !== null ? (
                  <div className="text-right">
                    <div className="text-2xl font-bold font-grotesk text-gradient-turquoise">
                      {formatCurrency(monthlySavings)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {Math.min(100, Math.max(0, (monthlySavings / SAVINGS_GOAL) * 100)).toFixed(0)}% achieved
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">Add monthly data to unlock savings tracking.</div>
                )}
              </div>
              {monthlySavings !== null && currentMonthPoint ? (
                <>
                  <div className="progress-neuro">
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, (monthlySavings / SAVINGS_GOAL) * 100))}%` }}
                      transition={{ duration: 0.8 }}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mt-4">
                    <div className="p-3 rounded-xl bg-background/40 border border-white/5">
                      <p className="text-muted-foreground">Income</p>
                      <p className="font-semibold">{formatCurrency(currentMonthPoint.income)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-background/40 border border-white/5">
                      <p className="text-muted-foreground">Expenses</p>
                      <p className="font-semibold">{formatCurrency(currentMonthPoint.expense)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-background/40 border border-white/5">
                      <p className="text-muted-foreground">Goal Pace</p>
                      <p className="font-semibold">
                        {monthlySavings >= SAVINGS_GOAL ? 'Goal reached' : `${formatCurrency(SAVINGS_GOAL - monthlySavings)} left`}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-sm">
                    {monthlySavings >= SAVINGS_GOAL ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-theme-green" />
                        <span className="text-theme-green font-medium">Goal achieved! (celebrate)</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-theme-gold" />
                        <span className="text-muted-foreground">
                          {formatCurrency(SAVINGS_GOAL - monthlySavings)} more to reach your goal
                        </span>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add at least one income and one expense transaction to start tracking monthly savings.
                </p>
              )}
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="neuro-card rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Goals Snapshot</h3>
                  <p className="text-sm text-muted-foreground">The goals closest to completion</p>
                </div>
                <Link href="/goals" className="text-xs text-muted-foreground hover:text-foreground transition">
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {goalSnapshots.map((goal) => {
                  const Icon = goal.icon
                  const progress = goal.target === 0 ? 0 : Math.min(100, Math.round((goal.current / goal.target) * 100))
                  const hasGoalData = goal.target > 0 || goal.current > 0
                  const goalTargetLabel = goal.target > 0 ? formatCurrency(goal.target) : PLACEHOLDER
                  const savedLabel = goal.current > 0 ? formatCurrency(goal.current) : PLACEHOLDER
                  const progressLabel = goal.target > 0 ? `${progress}%` : PLACEHOLDER
                  const dueLabel = goal.due && goal.due !== 'No deadline' ? goal.due : PLACEHOLDER
                  return (
                    <div key={goal.name} className="rounded-2xl border border-white/5 bg-background/40 p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-theme-green" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate">{goal.name}</p>
                          <p className="text-xs text-muted-foreground">Goal {goalTargetLabel}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span>{progressLabel}</span>
                          <span className="text-muted-foreground">{dueLabel}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                          <div className="h-full rounded-full bg-theme-green" style={{ width: `${progress}%` }} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Saved {savedLabel}
                      </p>
                    </div>
                  )
                })}
              </div>
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="neuro-card rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Action Inbox</h3>
                  <p className="text-sm text-muted-foreground">Clear these to stay on pace</p>
                </div>
                <ClipboardCheck className="w-5 h-5 text-theme-green" />
              </div>
              <div className="space-y-3">
                {actionItems.length ? (
                  actionItems.map((item) => {
                    const Icon = actionIconMap[item.kind] ?? ReceiptText
                    return (
                      <div key={item.id} className="rounded-2xl border border-white/5 bg-background/40 p-3 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                          <Icon className="w-4 h-4 text-theme-green" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{item.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{item.category}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs block text-muted-foreground">{item.urgency || PLACEHOLDER}</span>
                          {item.amount != null && (
                            <span className="text-xs font-medium text-theme-green">{formatCurrency(item.amount)}</span>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-background/20 p-4 text-sm text-muted-foreground">
                    All clear for now. We will surface new nudges as soon as your data needs attention.
                  </div>
                )}
              </div>
            </motion.div>


            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="neuro-card rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-4 gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Next 2 Weeks</h3>
                  <p className="text-sm text-muted-foreground">Cash-ins & obligations coming up</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowTransactionModal(true)}>
                    Log cash event
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-theme-green" />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                {upcomingEvents.length ? (
                  upcomingEvents.map((event) => {
                    const dateLabel = event.date
                      ? new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
                      : PLACEHOLDER
                    const amountLabel = event.amount != null ? formatCurrency(event.amount) : PLACEHOLDER
                    const icon =
                      event.type === 'inflow' ? (
                        <TrendingUp className="w-3 h-3 text-theme-green" />
                      ) : event.type === 'outflow' ? (
                        <TrendingDown className="w-3 h-3 text-destructive" />
                      ) : (
                        <ClipboardCheck className="w-3 h-3 text-theme-gold" />
                      )
                    return (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className="w-2 h-2 rounded-full bg-theme-green mt-2" />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium">{event.title}</span>
                            <span className="text-xs text-muted-foreground">{dateLabel}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {icon}
                            <span>{amountLabel}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-background/20 p-4 text-sm text-muted-foreground">
                    Add future-dated transactions, invoices, or compliance tasks to see your upcoming cash rhythm.
                  </div>
                )}
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="neuro-card rounded-3xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Emergency Buffer</h3>
                  <p className="text-sm text-muted-foreground">
                    Coverage target: {emergencyStatus.targetMonths} months
                  </p>
                </div>
                <ShieldCheck className="w-5 h-5 text-theme-green" />
              </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Coverage</span>
                    <span className="font-semibold">{emergencyCoverageLabel}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-theme-green"
                      style={{
                        width: `${emergencyProgressPercent}%`,
                      }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {emergencyStatus.nextTopUp !== null
                      ? `Transfer ${emergencyNextTopUpLabel} this week to reach the target by December.`
                      : 'Add savings data to unlock top-up guidance.'}
                  </div>
                </div>
              </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="neuro-card rounded-3xl p-6"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-theme-green" />
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <p className="text-sm font-semibold">{coachHighlight.headline}</p>
                    <p className="text-sm text-muted-foreground mt-1">{coachHighlight.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push('/chat')}
                    className="inline-flex items-center gap-2 text-xs font-medium text-theme-green hover:underline transition"
                  >
                    {coachHighlight.action}
                    <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="neuro-card rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Daily Money Habits</h3>
              <p className="text-sm text-muted-foreground">
                Keep momentum with small financial check-ins
              </p>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold font-grotesk text-gradient-purple">
                {completedToday}/{totalHabits}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Today's Progress</span>
              <span className="font-medium">{habitProgress.toFixed(0)}%</span>
            </div>
            <div className="progress-neuro">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${habitProgress}%` }}
                transition={{ duration: 0.8, delay: 0.6 }}
                style={{
                  background: 'linear-gradient(90deg, #9D4EDD 0%, #C77DFF 100%)',
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {habits.map((habit, index) => {
              const Icon = habit.icon
              return (
                <motion.button
                  key={habit.id}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.7 + index * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => toggleHabit(habit.id)}
                  className={`
                    neuro-card-hover rounded-2xl p-4 text-left transition-all
                    ${habit.completed ? 'border-white/10 bg-white/5' : 'border-transparent'}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`
                        w-12 h-12 rounded-xl flex items-center justify-center transition-colors
                        ${habit.completed ? 'bg-white/10 text-theme-green' : 'bg-muted/20 text-muted-foreground'}
                      `}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium text-sm ${habit.completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {habit.name}
                        </h4>
                        {habit.completed && <CheckCircle2 className="w-4 h-4 text-theme-green" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">(fire) {habit.streak} day streak</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>

          {habitProgress === 100 && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-6 p-4 rounded-2xl bg-white/5 border border-white/10"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-theme-green" />
                <div>
                  <h4 className="font-semibold text-theme-green">Perfect Day!</h4>
                  <p className="text-sm text-muted-foreground">
                    You've completed all your habits today. Keep it up!
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
    {showTransactionModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Log a transaction</h2>
              <p className="text-sm text-muted-foreground">Add a missing cash event or schedule an upcoming one.</p>
            </div>
            <Button type="button" variant="ghost" onClick={() => setShowTransactionModal(false)}>
              Close
            </Button>
          </div>
          {transactionError && (
            <div className="mb-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {transactionError}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleTransactionSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Amount</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={transactionForm.amount}
                  onChange={(event) => handleTransactionFormChange('amount', event.target.value)}
                  placeholder="Enter amount in INR"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Type</label>
                <div className="flex gap-2 flex-wrap">
                  {(['expense', 'income', 'transfer'] as TransactionType[]).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleTransactionFormChange('type', type)}
                      className={`px-4 py-2 rounded-full border text-xs ${
                        transactionForm.type === type
                          ? 'border-theme-green text-theme-green'
                          : 'border-white/10 text-muted-foreground'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Description</label>
                <Input
                  value={transactionForm.description}
                  onChange={(event) => handleTransactionFormChange('description', event.target.value)}
                  placeholder="Client retainer or rent"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Category</label>
                <Input
                  value={transactionForm.category}
                  onChange={(event) => handleTransactionFormChange('category', event.target.value)}
                  placeholder="Workspace, subscription..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Booking date</label>
                <Input
                  type="date"
                  value={transactionForm.date}
                  onChange={(event) => handleTransactionFormChange('date', event.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Ledger status</label>
                <select
                  value={transactionForm.ledgerStatus}
                  onChange={(event) => handleTransactionFormChange('ledgerStatus', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-green/40"
                >
                  <option value="unreconciled">Unreconciled</option>
                  <option value="pending">Pending</option>
                  <option value="cleared">Cleared</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-3 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={transactionForm.scheduled}
                  onChange={(event) => handleTransactionFormChange('scheduled', event.target.checked)}
                />
                Future-dated?
              </label>
              {transactionForm.scheduled && (
                <Input
                  type="date"
                  value={transactionForm.scheduledDate}
                  onChange={(event) => handleTransactionFormChange('scheduledDate', event.target.value)}
                  required
                />
              )}
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3">
              <Button type="submit" disabled={transactionSaving} className="flex-1 md:flex-none">
                {transactionSaving ? 'Saving...' : 'Save transaction'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setTransactionForm(createDefaultTransactionForm())}>
                Clear
              </Button>
            </div>
          </form>
        </div>
      </div>
    )}
    {showGoalModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Create a goal</h2>
              <p className="text-sm text-muted-foreground">Track a new milestone without leaving the dashboard.</p>
            </div>
            <Button type="button" variant="ghost" onClick={() => setShowGoalModal(false)}>
              Close
            </Button>
          </div>
          {goalError && (
            <div className="mb-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
              {goalError}
            </div>
          )}
          <form className="space-y-6" onSubmit={handleGoalSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Goal title</label>
                <Input
                  value={goalForm.title}
                  onChange={(event) => handleGoalFormChange('title', event.target.value)}
                  placeholder="Emergency buffer, upgrade, tax reserve..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Category</label>
                <Input
                  value={goalForm.category}
                  onChange={(event) => handleGoalFormChange('category', event.target.value)}
                  placeholder="Lifestyle, business, safety"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Target amount (INR)</label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  value={goalForm.targetAmount}
                  onChange={(event) => handleGoalFormChange('targetAmount', event.target.value)}
                  placeholder="600000"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Target date</label>
                <Input
                  type="date"
                  value={goalForm.deadline}
                  onChange={(event) => handleGoalFormChange('deadline', event.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Priority</label>
                <select
                  value={goalForm.priority}
                  onChange={(event) => handleGoalFormChange('priority', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-green/40"
                >
                  <option value="high">High focus</option>
                  <option value="medium">Balanced</option>
                  <option value="low">Nice to have</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Notes</label>
                <textarea
                  value={goalForm.notes}
                  onChange={(event) => handleGoalFormChange('notes', event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-green/40"
                  rows={3}
                  placeholder="Add reminders or reasoning for future you."
                />
              </div>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3">
              <Button type="submit" disabled={goalSaving} className="flex-1 md:flex-none">
                {goalSaving ? 'Saving...' : 'Save goal'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setGoalForm(createDefaultGoalForm())}>
                Clear
              </Button>
            </div>
          </form>
        </div>
      </div>
    )}
    </div>
  )
}
