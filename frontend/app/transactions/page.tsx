'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Tag,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  CheckCircle2,
  ClipboardCheck,
  ReceiptText,
  NotebookPen,
  LayoutList,
  LineChart,
  Save,
  Sparkles,
} from 'lucide-react'

import { createTransaction, fetchTransactions } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserStore } from '@/store/useUserStore'
import type { Transaction as AppTransaction, TransactionType } from '@/types'

const PLACEHOLDER = '__'

const SAVED_VIEWS = [
  { id: 'default', label: 'This Month' },
  { id: 'gst', label: 'GST Eligible' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'reimburse', label: 'Pending Receipts' },
]

const FILTER_RANGES = ['This Week', 'This Month', 'Last Month', 'Quarter'] as const
type RangeFilter = (typeof FILTER_RANGES)[number]

const VIEW_MODES = ['list', 'timeline'] as const
type ViewMode = (typeof VIEW_MODES)[number]

type DisplayTransaction = AppTransaction & {
  hasReceipt?: boolean
  note?: string
  tags?: string[]
}

type TransactionComposerState = {
  type: TransactionType
  amount: string
  currency: string
  description: string
  category: string
  subcategory: string
  date: string
  scheduleType: 'none' | 'scheduled'
  scheduledDate: string
  ledgerStatus: 'unreconciled' | 'pending' | 'cleared'
  gstEligible: boolean
  hasReceipt: boolean
  requiresFollowUp: boolean
  followUpReason: string
  tags: string
  notes: string
  source: string
}

const createTransactionComposerState = (): TransactionComposerState => ({
  type: 'expense',
  amount: '',
  currency: 'INR',
  description: '',
  category: '',
  subcategory: '',
  date: new Date().toISOString().split('T')[0],
  scheduleType: 'none',
  scheduledDate: '',
  ledgerStatus: 'unreconciled',
  gstEligible: false,
  hasReceipt: false,
  requiresFollowUp: false,
  followUpReason: '',
  tags: '',
  notes: '',
  source: '',
})

function groupByDate(transactions: DisplayTransaction[]) {
  const map = new Map<string, DisplayTransaction[]>()
  transactions.forEach((tx) => {
    const parsedDate = new Date(tx.date)
    const dateKey = Number.isNaN(parsedDate.getTime())
      ? tx.date
      : parsedDate.toISOString().split('T')[0]
    if (!map.has(dateKey)) {
      map.set(dateKey, [])
    }
    map.get(dateKey)!.push(tx)
  })
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => b.amount - a.amount),
    }))
}

const formatCurrencyValue = (value: number | null | undefined) =>
  value === null || value === undefined || Number.isNaN(value) ? PLACEHOLDER : formatCurrency(value)

const getRangeBounds = (range: RangeFilter) => {
  const now = new Date()
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const end = new Date(now)
  end.setHours(23, 59, 59, 999)

  switch (range) {
    case 'This Week': {
      const day = start.getDay()
      const diff = (day + 6) % 7 // convert Sunday->6, Monday->0
      start.setDate(start.getDate() - diff)
      break
    }
    case 'This Month': {
      start.setDate(1)
      break
    }
    case 'Last Month': {
      start.setMonth(start.getMonth() - 1, 1)
      end.setFullYear(start.getFullYear(), start.getMonth() + 1, 0)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'Quarter': {
      const quarterIndex = Math.floor(start.getMonth() / 3)
      start.setMonth(quarterIndex * 3, 1)
      const quarterEnd = new Date(start)
      quarterEnd.setMonth(start.getMonth() + 3, 0)
      quarterEnd.setHours(23, 59, 59, 999)
      end.setTime(quarterEnd.getTime())
      break
    }
    default:
      break
  }

  return { start, end }
}

const matchesSavedView = (transaction: DisplayTransaction, savedView: string) => {
  switch (savedView) {
    case 'gst':
      return Boolean(transaction.gst_eligible)
    case 'subscriptions': {
      const tagMatch = transaction.tags?.some((tag) => tag.toLowerCase().includes('subscription'))
      const categoryMatch =
        transaction.category?.toLowerCase().includes('subscription') ||
        transaction.subcategory?.toLowerCase().includes('subscription')
      return Boolean(tagMatch || categoryMatch)
    }
    case 'reimburse':
      return Boolean(transaction.requires_follow_up || (transaction.ledger_status && transaction.ledger_status !== 'cleared'))
    default:
      return true
  }
}

const getCleanupEntry = (transaction: DisplayTransaction) => {
  const baseTitle = transaction.description?.trim() || transaction.category || 'Transaction'
  const context = formatCurrency(transaction.amount)

  if (transaction.requires_follow_up) {
    return {
      id: `followup-${transaction.id}`,
      title: baseTitle,
      context,
      detail: transaction.follow_up_reason || 'Follow up to close the loop',
      action: 'Resolve follow-up',
      amountValue: transaction.amount,
    }
  }

  if (transaction.gst_eligible && !transaction.hasReceipt) {
    return {
      id: `gst-${transaction.id}`,
      title: baseTitle,
      context,
      detail: 'GST invoice missing',
      action: 'Upload GST invoice',
      amountValue: transaction.amount,
    }
  }

  if (!transaction.hasReceipt) {
    return {
      id: `receipt-${transaction.id}`,
      title: baseTitle,
      context,
      detail: 'Receipt not attached',
      action: 'Attach receipt',
      amountValue: transaction.amount,
    }
  }

  if (!transaction.category) {
    return {
      id: `category-${transaction.id}`,
      title: baseTitle,
      context,
      detail: 'Category missing',
      action: 'Categorise',
      amountValue: transaction.amount,
    }
  }

  if (transaction.ledger_status && transaction.ledger_status !== 'cleared') {
    return {
      id: `ledger-${transaction.id}`,
      title: baseTitle,
      context,
      detail: `Ledger status: ${transaction.ledger_status}`,
      action: 'Update ledger',
      amountValue: transaction.amount,
    }
  }

  return null
}

export default function TransactionsPage() {
  const searchParams = useSearchParams()
  const [searchTerm, setSearchTerm] = useState(() => searchParams.get('search') ?? '')
  const [filterCategory, setFilterCategory] = useState('all')
  const [selectedRange, setSelectedRange] = useState<RangeFilter>('This Month')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [savedView, setSavedView] = useState('default')
  const [isFetchingData, setIsFetchingData] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [transactionComposer, setTransactionComposer] = useState<TransactionComposerState>(
    createTransactionComposerState()
  )
  const [isSubmittingComposer, setIsSubmittingComposer] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [composerFeedback, setComposerFeedback] = useState<string | null>(null)

  const user = useUserStore((state) => state.user)
  const storeTransactions = useUserStore((state) => state.transactions)
  const setTransactions = useUserStore((state) => state.setTransactions)

  useEffect(() => {
    const nextSearch = searchParams.get('search') ?? ''
    setSearchTerm((prev) => (prev === nextSearch ? prev : nextSearch))
  }, [searchParams])

  const resetTransactionComposer = () => {
    setTransactionComposer(createTransactionComposerState())
    setComposerError(null)
    setComposerFeedback(null)
  }

  const handleComposerChange = (field: keyof TransactionComposerState, value: string | boolean) => {
    setTransactionComposer((prev) => ({ ...prev, [field]: value }))
  }

  const handleComposerSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.id) {
      setComposerError('Sign in to manage transactions.')
      return
    }

    const amountValue = Number(transactionComposer.amount)
    if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
      setComposerError('Add a valid amount greater than zero.')
      return
    }
    if (!transactionComposer.date) {
      setComposerError('Pick a booking date for this transaction.')
      return
    }

    setComposerError(null)
    setComposerFeedback(null)
    setIsSubmittingComposer(true)

    try {
      const payload = {
        type: transactionComposer.type,
        amount: amountValue,
        currency: transactionComposer.currency?.trim() || 'INR',
        description: transactionComposer.description || undefined,
        category: transactionComposer.category || undefined,
        subcategory: transactionComposer.subcategory || undefined,
        date: transactionComposer.date,
        ledger_status: transactionComposer.ledgerStatus,
        gst_eligible: transactionComposer.gstEligible,
        has_receipt: transactionComposer.hasReceipt,
        requires_follow_up: transactionComposer.requiresFollowUp,
        follow_up_reason:
          transactionComposer.requiresFollowUp && transactionComposer.followUpReason
            ? transactionComposer.followUpReason
            : undefined,
        notes: transactionComposer.notes || undefined,
        source: transactionComposer.source || undefined,
      } as Parameters<typeof createTransaction>[1]

      if (transactionComposer.scheduleType === 'scheduled' && transactionComposer.scheduledDate) {
        payload.scheduled_for = transactionComposer.scheduledDate
      }

      const preparedTags = transactionComposer.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      if (preparedTags.length) {
        payload.tags = preparedTags
      }

      const created = await createTransaction(user.id, payload)
      setTransactions([created, ...storeTransactions])
      setComposerFeedback('Transaction added successfully.')
      setIsComposerOpen(false)
      resetTransactionComposer()
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : 'Failed to add this transaction.')
    } finally {
      setIsSubmittingComposer(false)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    const controller = new AbortController()

    const loadTransactions = async () => {
      setFetchError(null)
      setIsFetchingData(true)
      try {
        const data = await fetchTransactions(user.id, { signal: controller.signal })
        setTransactions(data)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setFetchError(error instanceof Error ? error.message : 'Failed to load transactions')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingData(false)
        }
      }
    }

    loadTransactions()
    return () => controller.abort()
  }, [user?.id, setTransactions])

  const transactions = useMemo<DisplayTransaction[]>(
    () =>
      storeTransactions.map((tx) => ({
        ...tx,
        hasReceipt: Boolean((tx as any).has_receipt),
        note: (tx as any).note,
        tags: Array.isArray((tx as any).tags) ? (tx as any).tags : undefined,
      })),
    [storeTransactions]
  )

  const hasTransactions = transactions.length > 0

  const categories = useMemo(() => {
    const unique = new Set<string>()
    transactions.forEach((tx) => unique.add(tx.category || PLACEHOLDER))
    return ['all', ...Array.from(unique)]
  }, [transactions])

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const netBalance = hasTransactions ? totalIncome - totalExpense : null

  const now = new Date()
  const monthKey = `${now.getFullYear()}-${now.getMonth()}`
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${prevMonthDate.getMonth()}`

  const expenseByMonth = transactions.reduce((acc, tx) => {
    if (tx.type !== 'expense') return acc
    const parsed = new Date(tx.date)
    const key = Number.isNaN(parsed.getTime())
      ? tx.date
      : `${parsed.getFullYear()}-${parsed.getMonth()}`
    acc.set(key, (acc.get(key) || 0) + tx.amount)
    return acc
  }, new Map<string, number>())

  const currentMonthExpense = expenseByMonth.get(monthKey) ?? null
  const previousMonthExpense = expenseByMonth.get(prevMonthKey) ?? null
  const burnRateChange =
    currentMonthExpense !== null && previousMonthExpense !== null
      ? currentMonthExpense - previousMonthExpense
      : null

  const unreviewedCount = transactions.filter((t) => !t.category || !t.description).length

  const cleanupQueue = useMemo(() => {
    return transactions
      .map((tx) => getCleanupEntry(tx))
      .filter((entry): entry is NonNullable<ReturnType<typeof getCleanupEntry>> => Boolean(entry))
      .sort((a, b) => (b.amountValue ?? 0) - (a.amountValue ?? 0))
      .slice(0, 6)
      .map(({ amountValue, ...rest }) => rest)
  }, [transactions])

  const rangeBounds = useMemo(() => getRangeBounds(selectedRange), [selectedRange])

  const upcomingItems = useMemo(() => {
    const now = Date.now()
    return transactions
      .map((tx) => {
        const eventDateRaw = tx.scheduled_for || tx.date
        const parsed = new Date(eventDateRaw)
        if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= now) {
          return null
        }
        return {
          id: tx.id,
          title: tx.description || tx.category || 'Upcoming item',
          timestamp: parsed.getTime(),
          displayDate: parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
          amount: formatCurrency(tx.amount),
          type: tx.type === 'income' ? ('inflow' as const) : ('outflow' as const),
        }
      })
      .filter((item): item is {
        id: string
        title: string
        timestamp: number
        displayDate: string
        amount: string
        type: 'inflow' | 'outflow'
      } => Boolean(item))
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 3)
      .map((item) => ({
        id: item.id,
        title: item.title,
        date: item.displayDate,
        amount: item.amount,
        type: item.type,
      }))
  }, [transactions])

  const filteredTransactions = useMemo(
    () =>
      transactions.filter((t) => {
        const matchesSearch =
          (t.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (t.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        const matchesCategory = filterCategory === 'all' || t.category === filterCategory
        return matchesSearch && matchesCategory
      }),
    [transactions, searchTerm, filterCategory]
  )

  const timelineGroups = useMemo(() => groupByDate(filteredTransactions), [filteredTransactions])

  const categorySpending = transactions
    .filter((t) => t.type === 'expense')
    .reduce<Record<string, number>>((acc, t) => {
      const key = t.category || PLACEHOLDER
      acc[key] = (acc[key] || 0) + t.amount
      return acc
    }, {})
  const topCategory = Object.entries(categorySpending).sort((a, b) => b[1] - a[1])[0]

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 lg:ml-[280px]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <h1 className="text-4xl md:text-5xl font-bold font-grotesk mb-2">
            <span className="text-gradient-green-gold">Transactions</span>
          </h1>
          <p className="text-muted-foreground">Track every rupee with smart insights and actions</p>
        </motion.div>

        {fetchError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {fetchError}
          </div>
        )}

        {isFetchingData && !fetchError && (
          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
            Syncing your latest transactions...
          </div>
        )}
        {composerFeedback && (
          <div className="rounded-2xl border border-theme-green/20 bg-theme-green/10 px-4 py-2 text-sm text-theme-green">
            {composerFeedback}
          </div>
        )}

        {/* Hero Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="neuro-card rounded-2xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total Inflow</span>
              <TrendingUp className="w-4 h-4 text-theme-green" />
            </div>
            <p className="text-2xl font-semibold">{formatCurrencyValue(hasTransactions ? totalIncome : null)}</p>
            <p className="text-xs text-muted-foreground">
              {hasTransactions ? `${transactions.filter((t) => t.type === 'income').length} records` : 'Add income data'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="neuro-card rounded-2xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Total Outflow</span>
              <TrendingDown className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-2xl font-semibold">{formatCurrencyValue(hasTransactions ? totalExpense : null)}</p>
            <p className="text-xs text-muted-foreground">
              {currentMonthExpense !== null
                ? `${formatCurrencyValue(currentMonthExpense)} this month`
                : 'Add expenses to see burn rate'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="neuro-card rounded-2xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Net Cash</span>
              <DollarSign className="w-4 h-4 text-theme-green" />
            </div>
            <p className={`text-2xl font-semibold ${netBalance !== null && netBalance < 0 ? 'text-destructive' : ''}`}>
              {formatCurrencyValue(netBalance)}
            </p>
            <p className="text-xs text-muted-foreground">
              {netBalance !== null
                ? netBalance >= 0
                  ? 'Positive month so far'
                  : 'Expenses outpaced income'
                : 'Awaiting transaction data'}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="neuro-card rounded-2xl p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Needs Review</span>
              <ClipboardCheck className="w-4 h-4 text-theme-gold" />
            </div>
            <p className="text-2xl font-semibold">
              {hasTransactions ? `${unreviewedCount} items` : PLACEHOLDER}
            </p>
            <p className="text-xs text-muted-foreground">
              {hasTransactions ? 'Attach receipts or confirm categories' : 'Add transactions to show tasks'}
            </p>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="neuro-card rounded-2xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xl font-semibold">Review Suggestions</p>
              <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Quick wins to keep records clean</h2>
            </div>
            <ClipboardCheck className="w-4 h-4 text-theme-green" />
          </div>
          <div className="space-y-3">
            {cleanupQueue.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-background/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {item.title} • <span className="text-theme-green">{item.context}</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{item.detail}</p>
                  </div>
                  <button className="text-xs font-medium text-theme-gold whitespace-nowrap">{item.action}</button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="neuro-card rounded-2xl p-4"
        >
          <div className="flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              {FILTER_RANGES.map((range) => (
                <button
                  key={range}
                  onClick={() => setSelectedRange(range)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                    selectedRange === range
                      ? 'border-theme-green text-theme-green'
                      : 'border-white/10 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>

            <div className="flex flex-col md:flex-row gap-3 flex-1">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search description, category, tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-background/50 border border-white/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-theme-green/50"
                />
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 px-3 py-2 bg-background/50 border border-white/10 rounded-xl">
                  <Filter className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="bg-transparent text-sm text-foreground focus:outline-none"
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category === 'all' ? 'All categories' : category}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-background/50 border border-white/10 rounded-xl">
                  <Save className="w-4 h-4 text-muted-foreground" />
                  <select
                    value={savedView}
                    onChange={(e) => setSavedView(e.target.value)}
                    className="bg-transparent text-sm text-foreground focus:outline-none"
                  >
                    {SAVED_VIEWS.map((view) => (
                      <option key={view.id} value={view.id}>
                        {view.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 bg-background/50 border border-white/10 rounded-xl">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-white/10 text-theme-green' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LayoutList className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('timeline')}
                    className={`p-1.5 rounded-lg ${viewMode === 'timeline' ? 'bg-white/10 text-theme-green' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    <LineChart className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-start xl:justify-end">
              <Button onClick={() => setIsComposerOpen(true)} className="w-full md:w-auto">
                Add transaction
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Upcoming items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          className="neuro-card rounded-2xl p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold">Scheduled & Expected</h2>
              <p className="text-sm text-muted-foreground">Stay ahead of large inflows/outflows</p>
            </div>
            <Clock className="w-5 h-5 text-theme-green" />
          </div>
          <div className="space-y-3">
            {upcomingItems.length ? (
              upcomingItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/5 bg-background/40 p-3">
                  <div>
                    <p className="text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.date}</p>
                  </div>
                  <div className={`text-sm font-semibold ${item.type === 'inflow' ? 'text-theme-green' : 'text-destructive'}`}>
                    {item.type === 'inflow' ? '+' : '-'}
                    {item.amount}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Add future-dated transactions to see upcoming items.</p>
            )}
          </div>
        </motion.div>

        {/* Transactions list / timeline */}
        {viewMode === 'list' ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-3"
          >
            {filteredTransactions.length ? (
              filteredTransactions.map((transaction) => {
                const receiptIcon = transaction.hasReceipt ? (
                  <CheckCircle2 className="w-3 h-3 text-theme-green" />
                ) : (
                  <AlertTriangle className="w-3 h-3 text-destructive" />
                )
                const receiptLabel = transaction.hasReceipt
                  ? 'Receipt attached'
                  : 'Receipt data unavailable'
                const tags = transaction.tags && transaction.tags.length ? transaction.tags : null
                return (
                  <motion.div
                    key={transaction.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="neuro-card rounded-2xl p-4"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`
                            w-12 h-12 rounded-xl flex items-center justify-center
                            ${transaction.type === 'income'
                              ? 'bg-theme-green/15 text-theme-green'
                              : 'bg-destructive/15 text-destructive'}
                          `}
                        >
                          {transaction.type === 'income' ? (
                            <ArrowUpRight className="w-6 h-6" />
                          ) : (
                            <ArrowDownRight className="w-6 h-6" />
                          )}
                        </div>

                        <div>
                          <h3 className="font-semibold text-foreground">{transaction.description || PLACEHOLDER}</h3>
                          <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(transaction.date).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                            <span className="flex items-center gap-1">
                              <Tag className="w-3 h-3" />
                              {transaction.category || PLACEHOLDER}
                            </span>
                            <span className="flex items-center gap-1">
                              {receiptIcon}
                              {receiptLabel}
                            </span>
                            {tags ? (
                              tags.map((tag) => (
                                <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                                  #{tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">{PLACEHOLDER}</span>
                            )}
                          </div>
                          {transaction.note && (
                            <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                              <NotebookPen className="w-3 h-3" />
                              {transaction.note}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className={`text-xl font-bold ${transaction.type === 'income' ? 'text-theme-green' : 'text-destructive'}`}>
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </div>
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <div className="neuro-card rounded-2xl p-6 text-sm text-muted-foreground">
                No transactions match your filters.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="space-y-4"
          >
            {timelineGroups.length ? (
              timelineGroups.map((group) => (
                <div key={group.date} className="neuro-card rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground">
                      {new Date(group.date).toLocaleDateString('en-IN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                      })}
                    </h3>
                    <span className="text-xs text-muted-foreground">{group.items.length} transactions</span>
                  </div>
                  <div className="space-y-3">
                    {group.items.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="rounded-2xl border border-white/5 bg-background/40 p-3 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`
                              w-10 h-10 rounded-lg flex items-center justify-center
                              ${transaction.type === 'income'
                                ? 'bg-theme-green/20 text-theme-green'
                                : 'bg-destructive/20 text-destructive'}
                            `}
                          >
                            {transaction.type === 'income' ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : (
                              <ArrowDownRight className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{transaction.description || PLACEHOLDER}</p>
                            <p className="text-xs text-muted-foreground">{transaction.category || PLACEHOLDER}</p>
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${transaction.type === 'income' ? 'text-theme-green' : 'text-destructive'}`}>
                          {transaction.type === 'income' ? '+' : '-'}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="neuro-card rounded-2xl p-6 text-sm text-muted-foreground">
                Add transactions to view the timeline.
              </div>
            )}
          </motion.div>
        )}

        {/* Insights footer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.55 }}
          className="neuro-card rounded-2xl p-4"
        >
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-theme-green" />
            <div>
              <p className="text-sm font-semibold">Insight</p>
              <p className="text-sm text-muted-foreground">
                Top spending category this month is {topCategory ? `${topCategory[0]} (${formatCurrency(topCategory[1])})` : '\u2014'}.
                Consider setting a cap or routing this to your budgeting rules.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Log a transaction</h2>
                <p className="text-sm text-muted-foreground">Capture past expenses, future inflows, or anything missing from the ledger.</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setIsComposerOpen(false)}>
                Close
              </Button>
            </div>

            {composerError && (
              <div className="mb-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {composerError}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleComposerSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Amount</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={transactionComposer.amount}
                    onChange={(event) => handleComposerChange('amount', event.target.value)}
                    placeholder="Enter amount in INR"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Currency</label>
                  <Input
                    value={transactionComposer.currency}
                    onChange={(event) => handleComposerChange('currency', event.target.value.toUpperCase())}
                    placeholder="INR"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Type</label>
                  <div className="flex flex-wrap gap-2">
                    {(['expense', 'income', 'transfer'] as TransactionType[]).map((typeOption) => (
                      <button
                        key={typeOption}
                        type="button"
                        onClick={() => handleComposerChange('type', typeOption)}
                        className={`px-4 py-2 rounded-full border text-sm ${
                          transactionComposer.type === typeOption
                            ? 'border-theme-green text-theme-green'
                            : 'border-white/10 text-muted-foreground'
                        }`}
                      >
                        {typeOption.charAt(0).toUpperCase() + typeOption.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Ledger status</label>
                  <select
                    value={transactionComposer.ledgerStatus}
                    onChange={(event) => handleComposerChange('ledgerStatus', event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-green/40"
                  >
                    <option value="unreconciled">Unreconciled</option>
                    <option value="pending">Pending</option>
                    <option value="cleared">Cleared</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Description</label>
                  <Input
                    value={transactionComposer.description}
                    onChange={(event) => handleComposerChange('description', event.target.value)}
                    placeholder="Koramangala studio lease"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Category</label>
                    <Input
                      value={transactionComposer.category}
                      onChange={(event) => handleComposerChange('category', event.target.value)}
                      placeholder="Workspace"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground mb-2 block">Sub-category</label>
                    <Input
                      value={transactionComposer.subcategory}
                      onChange={(event) => handleComposerChange('subcategory', event.target.value)}
                      placeholder="Lease"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Booking date</label>
                  <Input
                    type="date"
                    value={transactionComposer.date}
                    onChange={(event) => handleComposerChange('date', event.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">When does this hit?</label>
                  <div className="space-y-2 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="scheduleType"
                        value="none"
                        checked={transactionComposer.scheduleType === 'none'}
                        onChange={() => handleComposerChange('scheduleType', 'none')}
                      />
                      Post it immediately
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="scheduleType"
                        value="scheduled"
                        checked={transactionComposer.scheduleType === 'scheduled'}
                        onChange={() => handleComposerChange('scheduleType', 'scheduled')}
                      />
                      Schedule for later
                    </label>
                  </div>
                  {transactionComposer.scheduleType === 'scheduled' && (
                    <Input
                      className="mt-2"
                      type="date"
                      value={transactionComposer.scheduledDate}
                      onChange={(event) => handleComposerChange('scheduledDate', event.target.value)}
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground block">Tags (comma separated)</label>
                  <Input
                    value={transactionComposer.tags}
                    onChange={(event) => handleComposerChange('tags', event.target.value)}
                    placeholder="subscription, gst"
                  />
                  <label className="text-sm font-medium text-muted-foreground block">Source</label>
                  <Input
                    value={transactionComposer.source}
                    onChange={(event) => handleComposerChange('source', event.target.value)}
                    placeholder="UPI / Card / Client"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground block">Notes &amp; reminders</label>
                  <textarea
                    value={transactionComposer.notes}
                    onChange={(event) => handleComposerChange('notes', event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-green/40"
                    rows={4}
                    placeholder="Add receipt link, payment instructions, or internal reminder."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                  <label className="flex items-center gap-2 font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={transactionComposer.gstEligible}
                      onChange={(event) => handleComposerChange('gstEligible', event.target.checked)}
                    />
                    GST eligible
                  </label>
                  <label className="flex items-center gap-2 font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={transactionComposer.hasReceipt}
                      onChange={(event) => handleComposerChange('hasReceipt', event.target.checked)}
                    />
                    Receipt already attached
                  </label>
                  <label className="flex items-center gap-2 font-medium text-foreground">
                    <input
                      type="checkbox"
                      checked={transactionComposer.requiresFollowUp}
                      onChange={(event) => handleComposerChange('requiresFollowUp', event.target.checked)}
                    />
                    Needs follow-up
                  </label>
                  {transactionComposer.requiresFollowUp && (
                    <Input
                      value={transactionComposer.followUpReason}
                      onChange={(event) => handleComposerChange('followUpReason', event.target.value)}
                      placeholder="Why do we need to follow up?"
                    />
                  )}
                </div>
                <div className="flex items-end gap-3">
                  <Button type="submit" disabled={isSubmittingComposer} className="flex-1">
                    {isSubmittingComposer ? 'Saving...' : 'Save transaction'}
                  </Button>
                  <Button type="button" variant="ghost" onClick={resetTransactionComposer}>
                    Clear
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
