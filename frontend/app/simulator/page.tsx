'use client'

import { type KeyboardEvent, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Info, Sparkles, TrendingDown } from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import type { Goal as GoalModel } from '@/types'

type ScenarioId = 'cash' | 'emi-6' | 'emi-12'

interface GoalImpact {
  goalName: string
  delayMonths: number
  delayDays: number
}

interface SimulationImpact {
  affordabilityScore: number
  savingsReduction: number
  newSavings: number
  recoveryMonths: number
  bufferRemaining: number
  burnRate: number
  goalImpacts: GoalImpact[]
}

interface ChartPoint {
  month: number
  withoutPurchase: number
  withPurchase: number
  withPurchaseLower: number
  withPurchaseUpper: number
}

interface SimulationResult {
  purchaseAmount: number
  purchaseDescription: string
  scenario: ScenarioId
  impact: SimulationImpact
  recommendation: string
  chartData: ChartPoint[]
}

interface ScenarioHistoryRow {
  name: string
  decision: string
  bufferAfter: string
}

interface ScenarioPreset {
  id: ScenarioId
  label: string
  description: string
  helper: string
  emiMonths?: number
}

const SCENARIOS: ScenarioPreset[] = [
  {
    id: 'cash',
    label: 'Pay outright',
    description: 'Deduct the entire amount from savings now.',
    helper: 'Safe if the cash buffer stays above 3 months.',
  },
  {
    id: 'emi-6',
    label: '6 month EMI',
    description: 'Split the purchase across six instalments.',
    helper: 'Monthly payments increase burn for half a year.',
    emiMonths: 6,
  },
  {
    id: 'emi-12',
    label: '12 month EMI',
    description: 'Spread the cost over one year.',
    helper: 'Lower monthly hit but longer obligation.',
    emiMonths: 12,
  },
]

const QUICK_PRESETS = [
  {
    label: 'Studio upgrade kit',
    description: 'Camera, lens, lighting bundle',
    amount: 180000,
  },
  {
    label: 'Team offsite',
    description: '3 day strategy retreat',
    amount: 120000,
  },
  {
    label: 'Phone upgrade',
    description: 'iPhone refresh + accessories',
    amount: 105000,
  },
]

const PLACEHOLDER = '__'

interface UserFinancialMetrics {
  ready: boolean
  baseSavings: number
  avgMonthlySurplus: number
  avgMonthlyExpense: number
}

const MS_IN_DAY = 1000 * 60 * 60 * 24
const MS_IN_MONTH = MS_IN_DAY * 30

const parseDeadlineValue = (deadline?: string | null) => {
  if (!deadline) return null
  const parsed = new Date(deadline)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const monthsToDeadline = (deadline?: string | null) => {
  const parsed = parseDeadlineValue(deadline)
  if (!parsed) return null
  return Math.max(1, Math.ceil((parsed.getTime() - Date.now()) / MS_IN_MONTH))
}

const generateBaselineChart = (baseSavings: number, surplus: number, hit: number, months = 12): ChartPoint[] => {
  const lowerBand = 0.9
  const upperBand = 1.1
  return Array.from({ length: months + 1 }, (_, index) => {
    const withoutPurchase = baseSavings + index * surplus
    const withPurchase = baseSavings - hit + index * surplus
    return {
      month: index,
      withoutPurchase,
      withPurchase,
      withPurchaseLower: withPurchase * lowerBand,
      withPurchaseUpper: withPurchase * upperBand,
    }
  })
}

const buildRecommendation = (score: number, buffer: number, scenario: ScenarioPreset) => {
  if (score >= 80) {
    return `Looks good. ${scenario.label} keeps your cash buffer near ${formatCurrency(buffer)}.`
  }
  if (score >= 60) {
    return 'Workable if you trim discretionary spends for two months and redirect the next bonus to savings.'
  }
  return `High risk. This leaves only ${formatCurrency(buffer)} in cash. Delay or pick a longer EMI to protect your runway.`
}

const buildSimulationResult = (
  amount: number,
  description: string,
  scenario: ScenarioPreset,
  metrics: UserFinancialMetrics,
  goals: GoalModel[],
): SimulationResult => {
  const baseSavings = metrics.baseSavings
  const monthlySurplus = metrics.avgMonthlySurplus
  const monthlyExpense = metrics.avgMonthlyExpense
  const emiMonths = scenario.emiMonths ?? 1
  const upfrontHit = scenario.id === 'cash' ? amount : Math.max(0, amount * 0.25)
  const monthlyPayment = scenario.id === 'cash' ? 0 : amount / emiMonths
  const bufferRemaining = baseSavings - upfrontHit
  const bufferTarget = monthlyExpense > 0 ? monthlyExpense * 3 : Math.abs(amount)
  const bufferRatio = bufferTarget > 0 ? bufferRemaining / bufferTarget : 0
  const affordabilityScore = Math.max(15, Math.min(95, Math.round((bufferRatio + 1) * 50)))
  const recoveryMonths = monthlySurplus > 0 ? Math.max(0, upfrontHit / monthlySurplus) : 0

  const goalImpacts = goals
    .filter((goal) => Number(goal.target_amount) > Number(goal.current_amount))
    .slice(0, 3)
    .map((goal) => {
      const target = Number(goal.target_amount) || 0
      const current = Number(goal.current_amount) || 0
      const monthsRemaining = monthsToDeadline(goal.deadline) ?? 12
      const gap = Math.max(0, target - current)
      const monthlyContribution =
        typeof goal.monthly_contribution === 'number' && !Number.isNaN(goal.monthly_contribution)
          ? goal.monthly_contribution
          : undefined
      const derivedContribution =
        monthlyContribution && monthlyContribution > 0
          ? monthlyContribution
          : monthsRemaining > 0
            ? gap / monthsRemaining
            : monthlySurplus || gap
      const delayMonths = derivedContribution > 0 ? Math.min(24, (upfrontHit / derivedContribution) * 0.1) : recoveryMonths
      return {
        goalName: goal.title || 'Goal',
        delayMonths: Number(delayMonths.toFixed(1)),
        delayDays: Math.round(delayMonths * 30),
      }
    })

  const recommendation = buildRecommendation(affordabilityScore, bufferRemaining, scenario)

  return {
    purchaseAmount: amount,
    purchaseDescription: description,
    scenario: scenario.id,
    impact: {
      affordabilityScore,
      savingsReduction: upfrontHit,
      newSavings: bufferRemaining,
      recoveryMonths,
      bufferRemaining,
      burnRate: Math.max(0, monthlyExpense + monthlyPayment),
      goalImpacts,
    },
    recommendation,
    chartData: generateBaselineChart(baseSavings, monthlySurplus, upfrontHit),
  }
}

const affordabilityPill = (score: number) => {
  if (score >= 80) return { label: 'Low impact', tone: 'bg-theme-green/15 text-theme-green border-theme-green/30' }
  if (score >= 60) return { label: 'Watchlist', tone: 'bg-theme-gold/15 text-theme-gold border-theme-gold/30' }
  return { label: 'High risk', tone: 'bg-destructive/15 text-destructive border-destructive/30' }
}

const formatMonths = (value: number) => {
  if (value < 1) {
    return `${Math.round(value * 30)} days`
  }
  return `${value.toFixed(1)} months`
}

const emptyResult: SimulationResult | null = null

export default function SimulatorPage() {
  const [purchaseAmount, setPurchaseAmount] = useState('')
  const [purchaseDescription, setPurchaseDescription] = useState('')
  const [scenario, setScenario] = useState<ScenarioId>('cash')
  const [result, setResult] = useState<SimulationResult | null>(emptyResult)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ScenarioHistoryRow[]>([])
  const transactions = useUserStore((state) => state.transactions)
  const goals = useUserStore((state) => state.goals)

  const parsedAmount = Number(purchaseAmount.replace(/,/g, '')) || 0
  const selectedScenario = useMemo(() => SCENARIOS.find((item) => item.id === scenario) ?? SCENARIOS[0], [scenario])

  const metrics = useMemo<UserFinancialMetrics>(() => {
    if (!transactions.length) {
      return { ready: false, baseSavings: 0, avgMonthlySurplus: 0, avgMonthlyExpense: 0 }
    }

    const totals = transactions.reduce(
      (acc, tx) => {
        if (tx.type === 'income') acc.income += tx.amount
        else acc.expense += tx.amount
        const parsed = new Date(tx.date)
        const key = Number.isNaN(parsed.getTime())
          ? tx.date
          : `${parsed.getFullYear()}-${parsed.getMonth()}`
        if (!acc.monthMap.has(key)) {
          acc.monthMap.set(key, { income: 0, expense: 0 })
        }
        const bucket = acc.monthMap.get(key)!
        if (tx.type === 'income') bucket.income += tx.amount
        else bucket.expense += tx.amount
        return acc
      },
      { income: 0, expense: 0, monthMap: new Map<string, { income: number; expense: number }>() },
    )

    const baseSavings = totals.income - totals.expense
    const entries = Array.from(totals.monthMap.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1))

    if (!entries.length) {
      return {
        ready: true,
        baseSavings,
        avgMonthlySurplus: 0,
        avgMonthlyExpense: totals.expense,
      }
    }

    const totalNet = entries.reduce((sum, [, value]) => sum + (value.income - value.expense), 0)
    const totalExpense = entries.reduce((sum, [, value]) => sum + value.expense, 0)
    const avgMonthlySurplus = totalNet / entries.length
    const avgMonthlyExpense = totalExpense / entries.length

    return {
      ready: true,
      baseSavings,
      avgMonthlySurplus,
      avgMonthlyExpense,
    }
  }, [transactions])

  const summary = useMemo(() => {
    if (!result) {
      return null
    }
    const pill = affordabilityPill(result.impact.affordabilityScore)
    return {
      pill,
      score: result.impact.affordabilityScore,
      buffer: formatCurrency(result.impact.bufferRemaining),
      recovery: formatMonths(result.impact.recoveryMonths),
      scenarioLabel: SCENARIOS.find((item) => item.id === result.scenario)?.label ?? 'Scenario',
    }
  }, [result])

  const handlePreset = (amount: number, description: string) => {
    setPurchaseAmount(String(amount))
    setPurchaseDescription(description)
  }

  const handleSimulate = () => {
    setError(null)
    if (!parsedAmount || parsedAmount <= 0) {
      setError('Enter a purchase amount greater than zero.')
      return
    }

    if (!metrics.ready) {
      setError('Add at least one income and expense transaction to run the simulation.')
      return
    }

    setIsLoading(true)
    try {
      const description = purchaseDescription || 'Purchase'
      const simulation = buildSimulationResult(
        parsedAmount,
        description,
        selectedScenario,
        metrics,
        goals,
      )
      setResult(simulation)
      setHistory((prev) => {
        const newRow: ScenarioHistoryRow = {
          name: description,
          decision: selectedScenario.label,
          bufferAfter: formatCurrency(simulation.impact.bufferRemaining),
        }
        return [newRow, ...prev].slice(0, 5)
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleSimulate()
    }
  }

  const chartData = result?.chartData ?? []
  const monthlySurplusLabel = metrics.ready ? formatCurrency(metrics.avgMonthlySurplus) : PLACEHOLDER

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 lg:ml-[280px]">
      <div className="max-w-5xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">What if simulator</p>
              <h1 className="text-4xl md:text-5xl font-bold font-grotesk">
                <span className="text-gradient-green-gold">Stress-test the spend</span>
              </h1>
              <p className="text-muted-foreground mt-2 max-w-xl">
                Model the purchase before you swipe. See the cash hit, recovery runway, and which goals need retuning.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (result) {
                  setPurchaseAmount(String(result.purchaseAmount))
                  setPurchaseDescription(result.purchaseDescription)
                  setScenario(result.scenario)
                }
              }}
              className="px-3 py-2 text-xs rounded-full border border-white/10 text-muted-foreground hover:border-theme-green/50"
              disabled={!result}
            >
              {result ? 'Replay last simulation' : 'Run a scenario to replay'}
            </button>
          </div>
        </motion.div>

        {summary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-4"
          >
            <div className="neuro-card rounded-2xl p-4">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs capitalize ${summary.pill.tone}`}>
                <Sparkles className="w-3 h-3" />
                {summary.pill.label}
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Affordability score</p>
              <p className="text-2xl font-semibold">{summary.score.toFixed(0)}/100</p>
            </div>
            <div className="neuro-card rounded-2xl p-4">
              <p className="text-sm text-muted-foreground">Scenario</p>
              <p className="text-lg font-semibold">{summary.scenarioLabel}</p>
              <p className="mt-2 text-xs text-muted-foreground">Buffer after purchase</p>
              <p className="text-base font-medium">{summary.buffer}</p>
            </div>
            <div className="neuro-card rounded-2xl p-4">
              <p className="text-sm text-muted-foreground">Recovery runway</p>
              <p className="text-lg font-semibold">{summary.recovery}</p>
              <p className="mt-2 text-xs text-muted-foreground">Time to rebuild savings</p>
            </div>
            <div className="neuro-card rounded-2xl p-4">
              <p className="text-sm text-muted-foreground">Amount simulated</p>
              <p className="text-lg font-semibold">{formatCurrency(result.purchaseAmount)}</p>
              <p className="mt-2 text-xs text-muted-foreground">{result.purchaseDescription}</p>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="neuro-card rounded-3xl p-6 space-y-6"
        >
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Inputs</span>
            </div>
            <h2 className="text-xl font-semibold">Set up the purchase</h2>
            <p className="text-sm text-muted-foreground">
              Choose a preset or enter a custom amount. Switch scenarios to see how financing changes the outcome.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {QUICK_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePreset(preset.amount, preset.description)}
                className="rounded-2xl border border-white/10 bg-background/40 p-4 text-left text-sm transition hover:border-theme-green hover:text-theme-green"
              >
                <p className="font-semibold">{preset.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
                <p className="mt-3 text-xs font-medium">{formatCurrency(preset.amount)}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3">
            {SCENARIOS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setScenario(item.id)}
                className={`rounded-full border px-4 py-2 text-xs transition ${
                  scenario === item.id
                    ? 'border-theme-green bg-theme-green/15 text-theme-green'
                    : 'border-white/10 text-muted-foreground hover:border-theme-green/40 hover:text-theme-green'
                }`}
              >
                <div className="font-medium">{item.label}</div>
                <div className="text-[11px] text-muted-foreground/80">{item.helper}</div>
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Purchase description</label>
                <input
                  type="text"
                  placeholder="e.g. New workstation setup"
                  value={purchaseDescription}
                  onChange={(event) => setPurchaseDescription(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-background/50 px-4 py-3 text-sm focus:border-theme-green/60 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Amount</label>
                <input
                  type="number"
                  min={0}
                  placeholder="Enter amount"
                  value={purchaseAmount}
                  onChange={(event) => setPurchaseAmount(event.target.value)}
                  onKeyDown={handleKeyDown}
                  className="w-full rounded-xl border border-white/10 bg-background/50 px-4 py-3 text-sm focus:border-theme-green/60 focus:outline-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Current surplus: {monthlySurplusLabel} per month
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleSimulate}
                disabled={isLoading}
                className="neuro-button h-full rounded-2xl px-6 py-4 text-sm font-semibold text-theme-green disabled:opacity-50"
              >
                {isLoading ? 'Crunching numbers...' : 'Simulate impact'}
              </button>
              {error && <p className="text-xs text-destructive">{error}</p>}
              <p className="text-xs text-muted-foreground">We benchmark against your latest cash flow and goals.</p>
            </div>
          </div>
        </motion.div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="space-y-6"
          >
            <div className="grid gap-4 md:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="neuro-card rounded-2xl p-6 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-theme-green/20 text-theme-green">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Affordability score</p>
                    <p className="text-2xl font-bold">{result.impact.affordabilityScore.toFixed(0)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Score above 70 means you stay within healthy guardrails.</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="neuro-card rounded-2xl p-6 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-destructive/15 text-destructive">
                    <TrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cash buffer after purchase</p>
                    <p className="text-2xl font-bold">{formatCurrency(result.impact.bufferRemaining)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Savings drop by {formatCurrency(result.impact.savingsReduction)} immediately.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="neuro-card rounded-2xl p-6 space-y-2"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-theme-gold/20 text-theme-gold">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recovery timeline</p>
                    <p className="text-2xl font-bold">{formatMonths(result.impact.recoveryMonths)}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Based on current surplus of {monthlySurplusLabel} per month.
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="neuro-card rounded-3xl p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background/60 border border-white/10">
                  <Info className="w-5 h-5 text-theme-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coach suggests</p>
                  <p className="text-base font-medium">{result.recommendation}</p>
                </div>
              </div>
            </motion.div>

            {result.impact.goalImpacts.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="neuro-card rounded-3xl p-6 space-y-4"
              >
                <div>
                  <p className="text-sm text-muted-foreground">Goal timeline shifts</p>
                  <h3 className="text-xl font-semibold">How priorities move</h3>
                </div>
                <div className="space-y-3">
                  {result.impact.goalImpacts.map((goal) => (
                    <div key={goal.goalName} className="rounded-2xl border border-white/10 bg-background/40 p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{goal.goalName}</p>
                          <p className="text-xs text-muted-foreground">
                            Delayed by {goal.delayDays} days ({goal.delayMonths.toFixed(1)} months)
                          </p>
                        </div>
                        <span className="text-theme-gold text-lg font-semibold">+{goal.delayMonths.toFixed(1)} mo</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="neuro-card rounded-3xl p-6 space-y-6"
            >
              <div>
                <p className="text-sm text-muted-foreground">Savings trajectory</p>
                <h3 className="text-xl font-semibold">With and without the purchase</h3>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="month" stroke="#999999" label={{ value: 'Months', position: 'insideBottom', offset: -5 }} />
                  <YAxis stroke="#999999" tickFormatter={(value) => formatCurrency(value)} width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1A1A1A',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="withPurchaseLower" stroke="#F59E0B" fill="#F59E0B20" name="With purchase (low)" />
                  <Area type="monotone" dataKey="withPurchaseUpper" stroke="#F59E0B" fill="#F59E0B10" name="With purchase (high)" />
                  <Line type="monotone" dataKey="withPurchase" stroke="#F59E0B" strokeWidth={2} name="With purchase (expected)" dot={false} />
                  <Line type="monotone" dataKey="withoutPurchase" stroke="#16A34A" strokeWidth={2} name="Without purchase" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="neuro-card rounded-3xl p-6 space-y-3"
        >
          <h3 className="text-lg font-semibold">Scenario history</h3>
          <div className="space-y-2 text-sm">
            {history.length ? (
              history.map((row) => (
                <div key={`${row.name}-${row.bufferAfter}`} className="rounded-2xl border border-white/10 bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium truncate">{row.name}</p>
                    <span className="text-xs text-muted-foreground">{row.bufferAfter}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{row.decision}</p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">Run a scenario to populate the history.</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}

