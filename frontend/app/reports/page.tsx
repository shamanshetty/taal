'use client'

import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Download,
  Filter,
  Lightbulb,
  PieChart,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import type { Transaction } from '@/types'

type PeriodOption = 'month' | 'quarter' | 'year'
type ComparisonOption = 'previous' | 'budget' | 'target'

interface MonthRecord {
  month: string
  income: number
  expense: number
  savings: number
  budgetedExpense: number | null
  targetSavings: number | null
}

interface CategoryRecord {
  name: string
  value: number
  color: string
  planned: number | null
}

interface ScenarioCard {
  title: string
  highlight: string
  detail: string
}

const PLACEHOLDER = '__'
const CATEGORY_COLORS = ['#16A34A', '#F59E0B', '#3B82F6', '#8B5CF6', '#EF4444', '#10B981']
const MONTH_FORMATTER = new Intl.DateTimeFormat('en-IN', { month: 'short' })

const PERIOD_OPTIONS: Array<{ label: string; value: PeriodOption }> = [
  { label: 'This Month', value: 'month' },
  { label: 'This Quarter', value: 'quarter' },
  { label: 'This Year', value: 'year' },
]

const COMPARISON_OPTIONS: Array<{ label: string; value: ComparisonOption }> = [
  { label: 'vs last period', value: 'previous' },
  { label: 'vs budget', value: 'budget' },
  { label: 'vs goal', value: 'target' },
]

const getMonthKey = (dateString: string) => {
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) {
    return dateString
  }
  return `${parsed.getFullYear()}-${String(parsed.getMonth()).padStart(2, '0')}`
}

const getMonthLabel = (key: string) => {
  if (!key.includes('-')) {
    return key
  }
  const [yearString, monthString] = key.split('-')
  const year = Number(yearString)
  const month = Number(monthString)
  if (Number.isNaN(year) || Number.isNaN(month)) {
    return key
  }
  const labelDate = new Date(year, month)
  return MONTH_FORMATTER.format(labelDate)
}

const buildMonthlyRecords = (transactions: Transaction[]): MonthRecord[] => {
  if (!transactions.length) {
    return []
  }

  const monthMap = new Map<string, { income: number; expense: number }>()

  transactions.forEach((transaction) => {
    const key = getMonthKey(transaction.date)
    if (!monthMap.has(key)) {
      monthMap.set(key, { income: 0, expense: 0 })
    }
    const bucket = monthMap.get(key)!
    if (transaction.type === 'income') {
      bucket.income += transaction.amount
    } else {
      bucket.expense += transaction.amount
    }
  })

  const entries = Array.from(monthMap.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1))
  const baseRecords = entries.map(([key, value]) => {
    const income = value.income
    const expense = value.expense
    const savings = income - expense
    return {
      month: getMonthLabel(key),
      income,
      expense,
      savings,
      budgetedExpense: null as number | null,
      targetSavings: null as number | null,
    }
  })

  return baseRecords.map((record, index) => {
    if (index === 0) {
      return record
    }
    return {
      ...record,
      budgetedExpense: baseRecords[index - 1].expense,
      targetSavings: baseRecords[index - 1].savings,
    }
  })
}

const buildCategoryRecords = (transactions: Transaction[]): CategoryRecord[] => {
  if (!transactions.length) {
    return []
  }

  const categoryMap = new Map<string, number>()

  transactions.forEach((transaction) => {
    if (transaction.type !== 'expense') {
      return
    }
    const key = transaction.category || 'Uncategorized'
    categoryMap.set(key, (categoryMap.get(key) ?? 0) + transaction.amount)
  })

  const entries = Array.from(categoryMap.entries()).sort((a, b) => b[1] - a[1])

  return entries.map(([name, value], index) => ({
    name,
    value,
    color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
    planned: null,
  }))
}

const buildScenarioInsights = (months: MonthRecord[], categories: CategoryRecord[]): ScenarioCard[] => {
  if (!months.length) {
    return [
      {
        title: 'Waiting for activity',
        highlight: PLACEHOLDER,
        detail: 'Add income and expense entries to unlock trends.',
      },
      {
        title: 'Categorise spend',
        highlight: PLACEHOLDER,
        detail: 'Tag expenses with categories to see where money goes.',
      },
      {
        title: 'Savings runway',
        highlight: PLACEHOLDER,
        detail: 'Log at least two months of data to project runway.',
      },
    ]
  }

  const latest = months[months.length - 1]
  const previous = months[months.length - 2]
  const incomeDelta = previous ? latest.income - previous.income : null
  const savingsDelta = previous ? latest.savings - previous.savings : null
  const topCategory = categories[0]

  return [
    {
      title: 'Income momentum',
      highlight: formatCurrency(latest.income),
      detail:
        incomeDelta === null
          ? 'Record at least two months of income to compare pace.'
          : `${incomeDelta >= 0 ? 'Up' : 'Down'} by ${formatCurrency(Math.abs(incomeDelta))} vs ${previous.month}.`,
    },
    {
      title: topCategory ? `${topCategory.name} focus` : 'Top category',
      highlight: topCategory ? formatCurrency(topCategory.value) : PLACEHOLDER,
      detail: topCategory
        ? `${topCategory.name} forms ${latest.expense > 0 ? Math.round((topCategory.value / latest.expense) * 100) : 0}% of ${latest.month} spend.`
        : 'Add expense entries with categories to surface the biggest drivers.',
    },
    {
      title: 'Savings runway',
      highlight: formatCurrency(latest.savings),
      detail:
        savingsDelta === null
          ? 'Need more history to quantify the shift in runway.'
          : `${savingsDelta >= 0 ? 'Improved' : 'Dropped'} by ${formatCurrency(Math.abs(savingsDelta))} vs ${previous.month}.`,
    },
  ]
}

const buildIncomeQualitySummary = (transactions: Transaction[]) => {
  const incomeTransactions = transactions.filter((tx) => tx.type === 'income')
  if (!incomeTransactions.length) {
    return {
      recurringShare: null,
      oneOffShare: null,
      topClientShare: null,
      suggestion: 'Add income entries or sync invoices to surface your income mix.',
    }
  }

  const totalIncome = incomeTransactions.reduce((sum, tx) => sum + tx.amount, 0)
  const recurringIncome = incomeTransactions
    .filter((tx) => tx.is_recurring || Boolean(tx.recurrence_rule?.trim()))
    .reduce((sum, tx) => sum + tx.amount, 0)
  const recurringShare = Math.min(100, Math.max(0, Math.round((recurringIncome / totalIncome) * 100)))
  const oneOffShare = Math.max(0, 100 - recurringShare)

  const clientTotals = incomeTransactions.reduce((map, tx) => {
    const key = tx.client_id || tx.description || tx.source || 'Unassigned client'
    map.set(key, (map.get(key) ?? 0) + tx.amount)
    return map
  }, new Map<string, number>())
  const topClientAmount = Math.max(...Array.from(clientTotals.values()), 0)
  const topClientShare = Math.min(100, Math.max(0, Math.round((topClientAmount / totalIncome) * 100)))

  let suggestion = 'Income mix looks balanced. Keep tagging retainers to strengthen visibility.'
  if (topClientShare > 40) {
    suggestion = `Top client forms ${topClientShare}% of income. Add buffers or diversify retainers to reduce concentration risk.`
  } else if (recurringShare < 50) {
    suggestion = `Only ${recurringShare}% is recurring. Promote subscriptions or retainers to improve predictability.`
  }

  return { recurringShare, oneOffShare, topClientShare, suggestion }
}

const buildReceivableAging = (transactions: Transaction[]) => {
  const buckets = [
    { label: '0-15 days', min: 0, max: 15, amount: 0, detail: 'Fresh invoices' },
    { label: '16-30 days', min: 16, max: 30, amount: 0, detail: 'Follow up this week' },
    { label: '31-45 days', min: 31, max: 45, amount: 0, detail: 'Escalate with finance' },
    { label: '45+ days', min: 46, max: Infinity, amount: 0, detail: 'Consider late fee' },
  ]
  const outstanding = transactions.filter(
    (tx) => tx.type === 'income' && tx.ledger_status && tx.ledger_status !== 'cleared',
  )
  const today = Date.now()
  outstanding.forEach((tx) => {
    const parsed = new Date(tx.date)
    const ageDays = Number.isNaN(parsed.getTime()) ? 0 : Math.max(0, Math.round((today - parsed.getTime()) / MS_PER_DAY))
    const bucket = buckets.find((entry) => ageDays >= entry.min && ageDays <= entry.max) ?? buckets[buckets.length - 1]
    bucket.amount += tx.amount
  })
  return buckets
}

const buildCashCycleMetrics = (transactions: Transaction[]) => {
  const now = Date.now()
  const incomeOutstanding = transactions.filter(
    (tx) => tx.type === 'income' && tx.ledger_status && tx.ledger_status !== 'cleared',
  )
  const expenseOutstanding = transactions.filter(
    (tx) => tx.type === 'expense' && tx.ledger_status && tx.ledger_status !== 'cleared',
  )

  const averageDays = (entries: Transaction[]) => {
    if (!entries.length) return null
    const total = entries.reduce((sum, tx) => {
      const baseDate = tx.scheduled_for ? new Date(tx.scheduled_for) : new Date(tx.date)
      const days = Number.isNaN(baseDate.getTime()) ? 0 : Math.max(0, (now - baseDate.getTime()) / MS_PER_DAY)
      return sum + days
    }, 0)
    return total / entries.length
  }

  const dso = averageDays(incomeOutstanding)
  const dpo = averageDays(expenseOutstanding)
  const cashConversion = dso !== null && dpo !== null ? Math.max(0, dso - dpo) : null

  return [
    { label: 'Days Sales Outstanding', value: dso !== null ? Math.round(dso) : null, target: 25 },
    { label: 'Days Payables Outstanding', value: dpo !== null ? Math.round(dpo) : null, target: 20 },
    { label: 'Cash Conversion Cycle', value: cashConversion !== null ? Math.round(cashConversion) : null, target: 12 },
  ]
}

const MS_PER_DAY = 1000 * 60 * 60 * 24

const computeRunRate = (records: MonthRecord[]) => {
  if (!records.length) {
    return { income: 0, expense: 0, savings: 0 }
  }
  const months = records.length
  const totalIncome = records.reduce((sum, item) => sum + item.income, 0)
  const totalExpense = records.reduce((sum, item) => sum + item.expense, 0)
  const totalSavings = records.reduce((sum, item) => sum + item.savings, 0)
  return {
    income: totalIncome / months,
    expense: totalExpense / months,
    savings: totalSavings / months,
  }
}

const computeVariance = (actual: number, planned: number) => {
  const difference = actual - planned
  const percent = planned === 0 ? 0 : (difference / planned) * 100
  return { difference, percent }
}

const formatVariance = (value: number) => {
  const sign = value >= 0 ? '+' : '-'
  return `${sign}${formatCurrency(Math.abs(value))}`
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<PeriodOption>('month')
  const [comparison, setComparison] = useState<ComparisonOption>('previous')
  const [search, setSearch] = useState('')
  const transactions = useUserStore((state) => state.transactions)

  const monthlyRecords = useMemo(() => buildMonthlyRecords(transactions), [transactions])
  const filteredMonths = useMemo(() => {
    if (!search.trim()) {
      return monthlyRecords
    }
    const query = search.trim().toLowerCase()
    return monthlyRecords.filter((record) => record.month.toLowerCase().includes(query))
  }, [monthlyRecords, search])

  const filteredTransactions = useMemo(() => {
    if (!search.trim()) {
      return transactions
    }
    if (!filteredMonths.length) {
      return []
    }
    const allowedMonths = new Set(filteredMonths.map((record) => record.month.toLowerCase()))
    return transactions.filter((tx) => {
      const label = getMonthLabel(getMonthKey(tx.date)).toLowerCase()
      return allowedMonths.has(label)
    })
  }, [transactions, filteredMonths, search])

  const categoryRecords = useMemo(() => buildCategoryRecords(filteredTransactions), [filteredTransactions])
  const scenarioCards = useMemo(
    () => buildScenarioInsights(filteredMonths, categoryRecords),
    [filteredMonths, categoryRecords]
  )
  const incomeQuality = useMemo(() => buildIncomeQualitySummary(filteredTransactions), [filteredTransactions])
  const incomeQualityRingStyle = useMemo(() => {
    if (incomeQuality.recurringShare === null || incomeQuality.oneOffShare === null) {
      return null
    }
    const recurring = incomeQuality.recurringShare
    return {
      background: `conic-gradient(#16A34A 0% ${recurring}%, #FACC15 ${recurring}% 100%)`,
    }
  }, [incomeQuality])
  const receivableAging = useMemo(() => buildReceivableAging(filteredTransactions), [filteredTransactions])
  const cashCycleMetrics = useMemo(() => buildCashCycleMetrics(filteredTransactions), [filteredTransactions])

  const totals = useMemo(() => {
    const income = filteredMonths.reduce((sum, record) => sum + record.income, 0)
    const expense = filteredMonths.reduce((sum, record) => sum + record.expense, 0)
    const savings = filteredMonths.reduce((sum, record) => sum + record.savings, 0)
    return { income, expense, savings }
  }, [filteredMonths])

  const runRate = computeRunRate(filteredMonths)

  const latest = filteredMonths[filteredMonths.length - 1]
  const previous = filteredMonths[filteredMonths.length - 2]

  type MomentumKey = 'income' | 'expense' | 'savings'

  const getMomentum = (key: MomentumKey, label: string) => {
    if (!latest || !previous) {
      return { label, change: 0, direction: 'neutral' as const }
    }
    const latestValue = Number(latest[key] ?? 0)
    const previousValue = Number(previous[key] ?? 0)
    const change = latestValue - previousValue
    const direction: 'neutral' | 'up' | 'down' =
      change === 0 ? 'neutral' : change > 0 ? 'up' : 'down'
    return { label, change, direction }
  }

  const incomeMomentum = getMomentum('income', 'Income movement')
  const expenseMomentum = getMomentum('expense', 'Expense movement')
  const savingsMomentum = getMomentum('savings', 'Savings movement')

  const comparisonLabel = COMPARISON_OPTIONS.find((item) => item.value === comparison)?.label ?? ''

  const comparisonDelta = useMemo(() => {
    if (!latest) {
      return null
    }
    if (comparison === 'previous') {
      if (!previous) {
        return null
      }
      return {
        income: latest.income - previous.income,
        expense: latest.expense - previous.expense,
        savings: latest.savings - previous.savings,
      }
    }
    if (comparison === 'budget') {
      if (latest.budgetedExpense === null || latest.targetSavings === null) {
        return null
      }
      return {
        income: 0,
        expense: latest.expense - latest.budgetedExpense,
        savings: latest.savings - latest.targetSavings,
      }
    }
    if (latest.targetSavings === null) {
      return null
    }
    return {
      income: 0,
      expense: latest.expense - (latest.budgetedExpense ?? latest.expense),
      savings: latest.savings - latest.targetSavings,
    }
  }, [comparison, latest, previous])

  const categoryTotals = categoryRecords.reduce(
    (acc, category) => {
      acc.actual += category.value
      acc.planned += category.planned ?? 0
      return acc
    },
    { actual: 0, planned: 0 }
  )

  const hasCategoryPlanData = categoryRecords.some((category) => category.planned !== null)
  const hasMonthlyData = monthlyRecords.length > 0
  const latestOverall = monthlyRecords[monthlyRecords.length - 1]
  const previousOverall = monthlyRecords[monthlyRecords.length - 2]
  const topCategory = categoryRecords[0]
  const incomeSuggestion = (() => {
    if (latestOverall && previousOverall) {
      const change = latestOverall.income - previousOverall.income
      const direction = change >= 0 ? 'grew' : 'dipped'
      return `Income in ${latestOverall.month} ${direction} by ${formatCurrency(Math.abs(change))} compared to ${previousOverall.month}.`
    }
    if (latestOverall) {
      return `Income recorded for ${latestOverall.month} totals ${formatCurrency(latestOverall.income)}. Add another month to compare follow-ups.`
    }
    return 'Add income entries or connect invoices to surface pending follow-ups.'
  })()
  const expenseSuggestion = (() => {
    if (latestOverall && topCategory) {
      const share = latestOverall.expense > 0 ? Math.round((topCategory.value / latestOverall.expense) * 100) : 0
      return `${topCategory.name} accounts for ${share}% of this month's costs. Keep it under ${formatCurrency(topCategory.value)} next cycle to stay on track.`
    }
    if (categoryRecords.length) {
      return 'Log another month of expenses to benchmark category guardrails.'
    }
    return 'Categorise spend to reveal where the guardrails need to tighten.'
  })()
  const savingsSuggestion = (() => {
    if (latestOverall && previousOverall) {
      const delta = latestOverall.savings - previousOverall.savings
      const direction = delta >= 0 ? 'improved' : 'softened'
      return `Savings ${direction} by ${formatCurrency(Math.abs(delta))} month-over-month. Automate the sweep to match ${formatCurrency(latestOverall.savings)}.`
    }
    if (latestOverall) {
      return `Savings for ${latestOverall.month} sit at ${formatCurrency(latestOverall.savings)}. Track another month to set the autopilot.`
    }
    return 'Add both income and expenses so we can recommend an automatic savings sweep.'
  })()
  const hasIncomeQualityChart = Boolean(incomeQualityRingStyle)
  const recurringShareLabel = incomeQuality.recurringShare !== null ? `${incomeQuality.recurringShare}%` : PLACEHOLDER
  const oneOffShareLabel = incomeQuality.oneOffShare !== null ? `${incomeQuality.oneOffShare}%` : PLACEHOLDER
  const topClientShareLabel = incomeQuality.topClientShare !== null ? `${incomeQuality.topClientShare}%` : PLACEHOLDER
  const hasReceivableData = receivableAging.some((bucket) => bucket.amount > 0)
  const hasCashCycleData = cashCycleMetrics.some((metric) => metric.value !== null)

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 lg:ml-[280px]">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Reports</p>
            <h1 className="text-4xl md:text-5xl font-bold font-grotesk">
              <span className="text-gradient-green-gold">Your financial pulse</span>
            </h1>
            <p className="text-muted-foreground mt-2 max-w-2xl">
              Compare income, spending, and savings against your plan. Spot anomalies, keep run-rate healthy, and know exactly what needs attention.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setPeriod(option.value)}
                className={`rounded-full border px-4 py-2 text-xs transition ${
                  period === option.value
                    ? 'border-theme-green bg-theme-green/15 text-theme-green'
                    : 'border-white/10 text-muted-foreground hover:border-theme-green/40 hover:text-theme-green'
                }`}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-muted-foreground hover:border-theme-green/40 hover:text-theme-green"
            >
              <Filter className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="rounded-full border border-white/10 px-4 py-2 text-xs text-muted-foreground hover:border-theme-green/40 hover:text-theme-green"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="grid gap-4 md:grid-cols-[2fr_1fr]"
        >
          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span>Run-rate summary</span>
                </div>
                <p className="text-lg font-semibold text-foreground mt-1">
                  {formatCurrency(runRate.income)} income -- {formatCurrency(runRate.expense)} spend --{' '}
                  {formatCurrency(runRate.savings)} saved per month
                </p>
                <p className="text-xs text-muted-foreground">
                  Based on {filteredMonths.length ? filteredMonths.length : PLACEHOLDER} months | {comparisonLabel}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Search month</span>
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="e.g. Aug"
                  className="rounded-full border border-white/10 bg-background/60 px-3 py-1 text-xs focus:border-theme-green/60 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[incomeMomentum, expenseMomentum, savingsMomentum].map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-background/40 p-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {item.direction === 'up' ? (
                      <ArrowUpRight className="w-4 h-4 text-theme-green" />
                    ) : item.direction === 'down' ? (
                      <ArrowDownRight className="w-4 h-4 text-destructive" />
                    ) : (
                      <Sparkles className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span>{item.label}</span>
                  </div>
                  <p className="text-lg font-semibold">
                    {item.direction === 'neutral' ? 'No change' : `${item.direction === 'up' ? '+' : '-'}${formatCurrency(Math.abs(item.change))}`}
                  </p>
                  <p className="text-xs text-muted-foreground">Latest vs previous period</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl border border-white/10 bg-background/60 p-4 space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Takeaway</span>
                <span className="rounded-full border border-theme-green/30 bg-theme-green/10 px-2 py-1 text-[11px] text-theme-green">
                  {comparisonDelta ? formatCurrency(Math.max(0, comparisonDelta.savings)) : PLACEHOLDER}
                </span>
              </div>
              <p className="text-sm">
                {comparisonDelta ? (
                  <>
                    Savings are {comparisonDelta.savings >= 0 ? 'above' : 'below'} the {comparisonLabel} baseline by{' '}
                    {formatCurrency(Math.abs(comparisonDelta.savings))}. Rebalance discretionary spend to keep the runway target intact.
                  </>
                ) : (
                  'Add another comparable period or planned targets to see how savings stack up.'
                )}
              </p>
            </div>
          </div>

          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Snapshot</span>
              <Calendar className="w-4 h-4" />
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span>Income YTD</span>
                <span className="font-semibold text-theme-green">{formatCurrency(totals.income)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Expense YTD</span>
                <span className="font-semibold text-destructive">{formatCurrency(totals.expense)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Net savings YTD</span>
                <span className="font-semibold text-theme-gold">{formatCurrency(totals.savings)}</span>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-background/60 p-4 text-xs space-y-2">
              <p className="font-medium text-foreground">Coach nudge</p>
              <p className="text-muted-foreground">
                {hasMonthlyData
                  ? `If income stays near ${formatCurrency(runRate.income)} a month, consider channeling ${formatCurrency(
                      Math.max(0, runRate.savings * 0.2)
                    )} towards debt prepayment without hurting liquidity.`
                  : 'Add a few months of inflow and outflow data to unlock personalised nudges.'}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid gap-4 lg:grid-cols-[2fr_1fr]"
        >
          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Income vs expense</p>
                <h2 className="text-xl font-semibold">How the cash is moving</h2>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/10 px-3 py-1 text-xs text-muted-foreground hover:border-theme-green/30 hover:text-theme-green"
              >
                View details
              </button>
            </div>

            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={filteredMonths}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="month" stroke="#999999" />
                <YAxis stroke="#999999" tickFormatter={(value) => formatCurrency(value)} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Area type="monotone" dataKey="income" stroke="#16A34A" fill="#16A34A20" name="Income" />
                <Area type="monotone" dataKey="expense" stroke="#EF4444" fill="#EF444420" name="Expense" />
                <Line type="monotone" dataKey="savings" stroke="#F59E0B" strokeWidth={2} name="Savings" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Variance vs plan</p>
                <h2 className="text-lg font-semibold">Category spotlight</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                {hasCategoryPlanData
                  ? `Over by ${formatCurrency(Math.max(0, categoryTotals.actual - categoryTotals.planned))}`
                  : 'Add budgets to compare against plan'}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryRecords}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="name" stroke="#999999" hide />
                <YAxis stroke="#999999" tickFormatter={(value) => formatCurrency(value)} width={80} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend />
                <Bar dataKey="value" fill="#6366F1" radius={[6, 6, 0, 0]} name="Actual" />
                <Bar dataKey="planned" fill="#D4D4D8" radius={[6, 6, 0, 0]} name="Planned" />
              </BarChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs">
              {categoryRecords.map((category) => {
                const variance =
                  category.planned === null ? null : computeVariance(category.value, category.planned)
                return (
                  <div key={category.name} className="flex items-center justify-between">
                    <span className="text-muted-foreground">{category.name}</span>
                    {variance ? (
                      <span className={variance.difference > 0 ? 'text-destructive' : 'text-theme-green'}>
                        {formatVariance(variance.difference)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{PLACEHOLDER}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="grid gap-4 xl:grid-cols-[2fr_1fr]"
        >
          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Income quality</p>
                <h2 className="text-xl font-semibold">Recurring vs one-off inflows</h2>
              </div>
              <PieChart className="w-4 h-4 text-theme-green" />
            </div>
            {hasIncomeQualityChart ? (
              <div className="flex items-center justify-center py-4">
                <div className="relative h-40 w-40">
                  <div className="absolute inset-0 rounded-full shadow-inner" style={incomeQualityRingStyle ?? undefined} />
                  <div className="absolute inset-5 rounded-full bg-background/90 flex flex-col items-center justify-center text-center">
                    <span className="text-xs text-muted-foreground">Recurring</span>
                    <span className="text-xl font-semibold">{recurringShareLabel}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-background/40 p-4 text-sm text-muted-foreground">
                Add recurring tags or mark retainers to visualise the mix.
              </p>
            )}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <p className="text-muted-foreground">Recurring</p>
                <p className="text-2xl font-semibold">{recurringShareLabel}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <p className="text-muted-foreground">One-off</p>
                <p className="text-2xl font-semibold">{oneOffShareLabel}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">Top client concentration {topClientShareLabel}</p>
              <p className="text-xs text-muted-foreground">{incomeQuality.suggestion}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="neuro-card rounded-3xl p-6 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Receivables aging</h3>
                <Calendar className="w-4 h-4 text-theme-gold" />
              </div>
              <div className="space-y-3 text-sm">
                {hasReceivableData ? (
                  receivableAging.map((bucket) => (
                    <div key={bucket.label} className="rounded-2xl border border-white/10 bg-background/40 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{bucket.label}</p>
                        <span className="text-theme-green font-semibold">{formatCurrency(bucket.amount)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{bucket.detail}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    All invoices are cleared. Tag pending receipts to monitor the aging buckets.
                  </p>
                )}
              </div>
            </div>

            <div className="neuro-card rounded-3xl p-6 space-y-3">
              <h3 className="text-lg font-semibold">Cash cycle monitor</h3>
              <div className="space-y-2 text-sm">
                {hasCashCycleData ? (
                  cashCycleMetrics.map((metric) => (
                    <div key={metric.label} className="rounded-2xl border border-white/10 bg-background/40 p-3">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{metric.label}</p>
                        <span className="text-theme-gold font-semibold">
                          {metric.value !== null ? `${metric.value} days` : PLACEHOLDER}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">Target {metric.target} days</p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Log outstanding receivables/payables to surface DSO and DPO trends.
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid gap-4 lg:grid-cols-[1.5fr_1fr]"
        >
          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Savings trajectory</p>
                <h2 className="text-xl font-semibold">Where the runway is heading</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Latest balance {latestOverall ? formatCurrency(latestOverall.savings) : PLACEHOLDER}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyRecords}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="month" stroke="#999999" />
                <YAxis stroke="#999999" tickFormatter={(value) => formatCurrency(value)} width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#111111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Line type="monotone" dataKey="savings" stroke="#16A34A" strokeWidth={3} dot={{ r: 5 }} />
                <Line type="monotone" dataKey="targetSavings" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
            <div className="rounded-xl border border-white/10 bg-background/60 p-4 text-xs text-muted-foreground space-y-2">
              <p>
                {comparisonDelta && latestOverall
                  ? `You are ${formatCurrency(Math.max(0, comparisonDelta.savings))} ahead of the ${comparisonLabel} target. Consider increasing the investment SIP by ${formatCurrency(
                      Math.max(0, latestOverall.savings * 0.1)
                    )} next quarter to lock in the surplus.`
                  : 'Add savings targets or another month of data to project how much headroom you have for automated investments.'}
              </p>
            </div>
          </div>

          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Target className="w-3 h-3" />
              <span>Spotlight</span>
            </div>
            <h2 className="text-lg font-semibold">What changed this month</h2>
            <div className="space-y-3">
              {scenarioCards.map((scenario) => (
                <div key={scenario.title} className="rounded-2xl border border-white/10 bg-background/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground">{scenario.title}</p>
                    <span className="text-xs text-theme-gold">{scenario.highlight}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{scenario.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="neuro-card rounded-3xl p-6 space-y-4"
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-theme-gold" />
            <h2 className="text-xl font-semibold">Suggestions to keep the rhythm</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4 space-y-2">
              <p className="font-medium text-foreground">Income follow-ups</p>
              <p className="text-xs text-muted-foreground">{incomeSuggestion}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4 space-y-2">
              <p className="font-medium text-foreground">Expense guardrail</p>
              <p className="text-xs text-muted-foreground">{expenseSuggestion}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4 space-y-2">
              <p className="font-medium text-foreground">Savings autopilot</p>
              <p className="text-xs text-muted-foreground">{savingsSuggestion}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
