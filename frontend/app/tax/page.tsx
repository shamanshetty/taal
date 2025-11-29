'use client'

import { type KeyboardEvent, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Calculator,
  Calendar,
  CheckCircle2,
  Download,
  Info,
  Lightbulb,
  PiggyBank,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Bar,
  BarChart,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { useUserStore } from '@/store/useUserStore'
import type { Transaction } from '@/types'

type RegimeOption = 'new' | 'old' | 'hybrid'

interface IncomeRecord {
  month: string
  income: number
  taxable: number
}

interface DeductionCategory {
  id: string
  label: string
  cap: number
  description: string
  amount: number | null
}

interface AdvanceTaxMilestone {
  quarter: string
  dueDate: string
  targetPercent: number
  paidPercent: number
}

const PLACEHOLDER = '__'

const INITIAL_DEDUCTIONS: DeductionCategory[] = [
  {
    id: '80c',
    label: '80C investments',
    cap: 150000,
    description: 'ELSS, PPF, EPF, term insurance premiums',
    amount: null,
  },
  {
    id: '80d',
    label: '80D health cover',
    cap: 25000,
    description: 'Health insurance premium for self/family',
    amount: null,
  },
  {
    id: 'nps',
    label: 'NPS top-up',
    cap: 50000,
    description: 'Additional 80CCD(1B) contribution',
    amount: null,
  },
  {
    id: 'home',
    label: 'Home loan interest',
    cap: 200000,
    description: 'Self-occupied property interest benefit',
    amount: null,
  },
]

const ADVANCE_TAX_MILESTONES: AdvanceTaxMilestone[] = [
  { quarter: 'Q1 (Apr-Jun)', dueDate: '15 Jun', targetPercent: 15, paidPercent: 0 },
  { quarter: 'Q2 (Jul-Sep)', dueDate: '15 Sep', targetPercent: 45, paidPercent: 0 },
  { quarter: 'Q3 (Oct-Dec)', dueDate: '15 Dec', targetPercent: 75, paidPercent: 0 },
  { quarter: 'Q4 (Jan-Mar)', dueDate: '15 Mar', targetPercent: 100, paidPercent: 0 },
]

const calculateNewRegimeTax = (income: number) => {
  const slabRates = [
    { limit: 300000, rate: 0 },
    { limit: 700000, rate: 0.05 },
    { limit: 1000000, rate: 0.1 },
    { limit: 1200000, rate: 0.15 },
    { limit: 1500000, rate: 0.2 },
  ]

  let remaining = income
  let accumulated = 0
  let total = 0

  for (const slab of slabRates) {
    const taxableInSlab = Math.max(0, Math.min(remaining, slab.limit - accumulated))
    total += taxableInSlab * slab.rate
    remaining -= taxableInSlab
    accumulated = slab.limit
  }

  if (remaining > 0) {
    total += remaining * 0.3
  }

  const cess = total * 0.04
  return Math.round(total + cess)
}

const calculateOldRegimeTax = (income: number, deductions: number) => {
  const taxableIncome = Math.max(0, income - Math.min(deductions, 250000))
  const slabRates = [
    { limit: 250000, rate: 0 },
    { limit: 500000, rate: 0.05 },
    { limit: 1000000, rate: 0.2 },
  ]
  let remaining = taxableIncome
  let accumulated = 0
  let total = 0

  for (const slab of slabRates) {
    const taxableInSlab = Math.max(0, Math.min(remaining, slab.limit - accumulated))
    total += taxableInSlab * slab.rate
    remaining -= taxableInSlab
    accumulated = slab.limit
  }

  if (remaining > 0) {
    total += remaining * 0.3
  }

  const cess = total * 0.04
  return Math.round(total + cess)
}

const getTaxByRegime = (regime: RegimeOption, income: number, deductions: number) => {
  switch (regime) {
    case 'old':
      return calculateOldRegimeTax(income, deductions)
    case 'hybrid':
      return Math.min(
        calculateNewRegimeTax(income),
        calculateOldRegimeTax(income, deductions + 50000) // assume additional Section 87A benefits/planned investments
      )
    default:
      return calculateNewRegimeTax(income)
  }
}

const getScenarioLabel = (regime: RegimeOption) => {
  if (regime === 'old') return 'Old regime'
  if (regime === 'hybrid') return 'Optimised mix'
  return 'New regime'
}

const getScenarioDescription = (regime: RegimeOption) => {
  if (regime === 'old') return 'Benefit from deductions and exemptions, useful when investments are high.'
  if (regime === 'hybrid') return 'Coach picks the better regime each quarter based on deductions progress.'
  return 'Simpler slabs, best when deductions are minimal.'
}

const getMonthKey = (dateString: string) => {
  const parsed = new Date(dateString)
  if (Number.isNaN(parsed.getTime())) return dateString
  return `${parsed.getFullYear()}-${parsed.getMonth()}`
}

const buildMonthlyIncome = (transactions: Transaction[]): IncomeRecord[] => {
  const incomeMap = new Map<string, { income: number; taxable: number }>()
  transactions.forEach((tx) => {
    if (tx.type !== 'income') return
    const key = getMonthKey(tx.date)
    if (!incomeMap.has(key)) {
      incomeMap.set(key, { income: 0, taxable: 0 })
    }
    const bucket = incomeMap.get(key)!
    bucket.income += tx.amount
    bucket.taxable += tx.amount
  })

  const entries = Array.from(incomeMap.entries()).sort((a, b) => (a[0] > b[0] ? 1 : -1))
  const formatter = new Intl.DateTimeFormat('en-IN', { month: 'short' })
  return entries.map(([key, value]) => {
    const parsed = key.includes('-') ? new Date(Number(key.split('-')[0]), Number(key.split('-')[1])) : new Date(key)
    const label = Number.isNaN(parsed.getTime()) ? key : formatter.format(parsed)
    return {
      month: label,
      income: value.income,
      taxable: value.taxable,
    }
  })
}

const buildTaxMetrics = (monthlyIncome: IncomeRecord[]) => {
  const incomeYTD = monthlyIncome.reduce((sum, entry) => sum + entry.income, 0)
  const active = monthlyIncome.filter((entry) => entry.income > 0).length
  const avgActiveIncome = active ? incomeYTD / active : 0
  const runRateAnnualIncome = avgActiveIncome * 12
  return { incomeYTD, active, avgActiveIncome, runRateAnnualIncome, ready: monthlyIncome.length > 0 }
}

const sumAmounts = (transactions: Transaction[]) => transactions.reduce((sum, tx) => sum + tx.amount, 0)

export default function TaxPage() {
  const transactions = useUserStore((state) => state.transactions)
  const monthlyIncome = useMemo(() => buildMonthlyIncome(transactions), [transactions])
  const taxMetrics = useMemo(() => buildTaxMetrics(monthlyIncome), [monthlyIncome])
  const incomeTransactions = useMemo(() => transactions.filter((tx) => tx.type === 'income'), [transactions])
  const gstEligibleTransactions = useMemo(() => transactions.filter((tx) => tx.gst_eligible), [transactions])

  const [regime, setRegime] = useState<RegimeOption>('new')
  const [deductions, setDeductions] = useState<DeductionCategory[]>(INITIAL_DEDUCTIONS)

  const tdsFocusItems = useMemo(() => {
    if (!incomeTransactions.length) return []
    return incomeTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3)
      .map((tx) => {
        const payer = tx.description?.trim() || tx.source || 'Income entry'
        const status = tx.requires_follow_up
          ? tx.follow_up_reason || 'Follow-up pending'
          : tx.has_receipt
            ? 'Proof attached'
            : 'Proof missing'
        const action = tx.requires_follow_up
          ? 'Resolve follow-up'
          : tx.has_receipt
            ? 'Mark matched'
            : 'Attach proof'
        return {
          id: tx.id,
          payer,
          form: '16A candidate',
          status,
          action,
        }
      })
  }, [incomeTransactions])

  const gstInsights = useMemo(() => {
    const gstIncome = gstEligibleTransactions.filter((tx) => tx.type === 'income')
    const gstExpenses = gstEligibleTransactions.filter((tx) => tx.type === 'expense')
    const missingProof = gstEligibleTransactions.filter((tx) => !tx.has_receipt)
    return [
      {
        title: 'GST-eligible income',
        due: `${gstIncome.length} invoices`,
        state: gstIncome.length ? `${formatCurrency(sumAmounts(gstIncome))} tagged` : 'Add GST-tagged income',
      },
      {
        title: 'GST-eligible expenses',
        due: `${gstExpenses.length} bills`,
        state: gstExpenses.length ? `${formatCurrency(sumAmounts(gstExpenses))} claimable` : 'Tag GST inputs to track ITC',
      },
      {
        title: 'Proofs missing',
        due: `${missingProof.length} entries`,
        state: missingProof.length ? 'Attach receipts to unlock ITC' : 'All GST records have proofs attached',
      },
    ]
  }, [gstEligibleTransactions])

  const totalDeductions = deductions.reduce((sum, item) => sum + (item.amount ?? 0), 0)
  const totalDeductionCap = deductions.reduce((sum, item) => sum + item.cap, 0)
  const estimatedTax = useMemo(
    () => getTaxByRegime(regime, taxMetrics.runRateAnnualIncome, totalDeductions),
    [regime, totalDeductions, taxMetrics.runRateAnnualIncome],
  )
  const monthlyProvision = Math.round(estimatedTax / 12)
  const effectiveRate =
    taxMetrics.runRateAnnualIncome > 0 ? (estimatedTax / taxMetrics.runRateAnnualIncome) * 100 : 0

  const newRegimeTax = calculateNewRegimeTax(taxMetrics.runRateAnnualIncome)
  const oldRegimeTax = calculateOldRegimeTax(taxMetrics.runRateAnnualIncome, totalDeductions)

  const incomeWithProjection = useMemo(() => {
    const futureMonths = ['Jan', 'Feb', 'Mar']
    const average = taxMetrics.avgActiveIncome || 0
    const projected = futureMonths.map((month) => ({
      month,
      income: 0,
      projectedIncome: average,
    }))
    const history = monthlyIncome.length
      ? monthlyIncome.map((item) => ({
          month: item.month,
          income: item.income,
          projectedIncome: 0,
        }))
      : []
    return [...history, ...projected]
  }, [monthlyIncome, taxMetrics.avgActiveIncome])

  const nextMilestone = useMemo(() => {
    const upcoming = ADVANCE_TAX_MILESTONES.find((milestone) => milestone.paidPercent < milestone.targetPercent)
    return upcoming ?? ADVANCE_TAX_MILESTONES[ADVANCE_TAX_MILESTONES.length - 1]
  }, [])

  const runRateAnnualIncome = taxMetrics.runRateAnnualIncome
  const activeMonths = taxMetrics.active
  const hasIncomeData = taxMetrics.ready
  const avgIncomeLabel = hasIncomeData ? formatCurrency(taxMetrics.avgActiveIncome) : PLACEHOLDER
  const runRateLabel = hasIncomeData ? formatCurrency(runRateAnnualIncome) : PLACEHOLDER
  const monthlyProvisionLabel = hasIncomeData ? formatCurrency(monthlyProvision) : PLACEHOLDER
  const effectiveRateLabel = hasIncomeData ? `${effectiveRate.toFixed(1)}%` : PLACEHOLDER
  const newRegimeTaxLabel = hasIncomeData ? formatCurrency(newRegimeTax) : PLACEHOLDER
  const oldRegimeTaxLabel = hasIncomeData ? formatCurrency(oldRegimeTax) : PLACEHOLDER
  const regimeSavingsLabel = hasIncomeData
    ? formatCurrency(Math.max(0, Math.min(oldRegimeTax, newRegimeTax) - estimatedTax))
    : PLACEHOLDER

  const hasDeductionData = deductions.some((item) => (item.amount ?? 0) > 0)
  const deductionHeadroomLabel = hasDeductionData
    ? formatCurrency(Math.max(0, totalDeductionCap - totalDeductions))
    : PLACEHOLDER

  const handleDeductionInput = (id: string, value: number | null) => {
    setDeductions((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, amount: value === null ? null : Math.max(0, Math.min(item.cap, value)) }
          : item
      )
    )
  }

  const handleDeductionKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
    }
  }

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 lg:ml-[280px]">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tax insights</p>
              <h1 className="text-4xl md:text-5xl font-bold font-grotesk">
                <span className="text-gradient-green-gold">Stay ahead of advance tax</span>
              </h1>
              <p className="text-muted-foreground mt-2 max-w-2xl">
                We monitor your uneven income, suggest the right regime every quarter, and tell you exactly how much to provision so tax day feels routine.
              </p>
            </div>
            <div className="neuro-card rounded-2xl p-4 text-sm text-muted-foreground max-w-xs">
              <p className="font-medium text-foreground">Irregular income tracker</p>
              <p className="mt-2">
                {hasIncomeData ? (
                  <>
                    <span className="text-foreground font-semibold">{activeMonths}</span> active months out of {monthlyIncome.length},
                    average inflow {avgIncomeLabel} per active month.
                  </>
                ) : (
                  'Add income transactions to start tracking your irregular earnings.'
                )}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05 }}
          className="grid grid-cols-1 gap-4 md:grid-cols-4"
        >
          <div className="neuro-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="w-4 h-4 text-theme-gold" />
              <span>Projected FY income</span>
            </div>
            <p className="mt-3 text-2xl font-bold">{runRateLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {hasIncomeData ? 'Based on active month run-rate' : 'Connect income data to see projections.'}
            </p>
          </div>
          <div className="neuro-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <PiggyBank className="w-4 h-4 text-theme-green" />
              <span>Provision this month</span>
            </div>
            <p className="mt-3 text-2xl font-bold text-theme-green">{monthlyProvisionLabel}</p>
            <p className="text-xs text-muted-foreground mt-1">{getScenarioLabel(regime)} | Effective rate {effectiveRateLabel}</p>
          </div>
          <div className="neuro-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calculator className="w-4 h-4 text-theme-gold" />
              <span>New vs old regime</span>
            </div>
            <p className="mt-3 text-lg font-semibold">New: {newRegimeTaxLabel}</p>
            <p className="text-sm text-muted-foreground">Old: {oldRegimeTaxLabel}</p>
            <p className="text-xs text-theme-green mt-1">Savings {regimeSavingsLabel}</p>
          </div>
          <div className="neuro-card rounded-2xl p-5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 text-theme-gold" />
              <span>Next advance tax</span>
            </div>
            <p className="mt-3 text-2xl font-bold">{nextMilestone?.dueDate ?? PLACEHOLDER}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Target {nextMilestone.targetPercent}% paid | You are at {nextMilestone.paidPercent}%
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="neuro-card rounded-3xl p-6 space-y-6"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                <Sparkles className="w-3 h-3" />
                <span>Scenario planner</span>
              </div>
              <h2 className="text-xl font-semibold mt-1">Pick a regime for this quarter</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">{getScenarioDescription(regime)}</p>
            </div>
            <div className="flex gap-2">
              {(['new', 'old', 'hybrid'] as RegimeOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRegime(option)}
                  className={`rounded-full border px-4 py-2 text-xs transition ${
                    regime === option
                      ? 'border-theme-green bg-theme-green/15 text-theme-green'
                      : 'border-white/10 text-muted-foreground hover:border-theme-green/40 hover:text-theme-green'
                  }`}
                >
                  {getScenarioLabel(option)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[1.5fr_1fr]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Income rhythm</h3>
                <span className="text-xs text-muted-foreground">Irregular inflows vs projections</span>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={incomeWithProjection}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                  <XAxis dataKey="month" stroke="#999999" />
                  <YAxis stroke="#999999" tickFormatter={(value) => formatCurrency(value)} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#111111',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar dataKey="income" fill="#16A34A" radius={[6, 6, 0, 0]} name="Actual" />
                  <Bar dataKey="projectedIncome" fill="#F59E0B" radius={[6, 6, 0, 0]} name="Projected" />
                </BarChart>
              </ResponsiveContainer>
              {!hasIncomeData && (
                <p className="text-xs text-muted-foreground">
                  Add income transactions to replace the projection placeholders.
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/50 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-background/60 border border-white/10">
                  <Lightbulb className="w-5 h-5 text-theme-gold" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Coach insight</p>
                  <p className="text-sm">
                    {hasIncomeData
                      ? `Your income clusters every third month. Automate a ${monthlyProvisionLabel} transfer the same day the invoice clears to avoid scrambling near due dates.`
                      : 'Connect your transactions to unlock personalised tax automation tips.'}
                  </p>
                </div>
              </div>
              <div className="rounded-xl border border-theme-green/30 bg-theme-green/10 p-4 text-xs text-theme-green space-y-2">
                <p className="font-medium text-sm text-theme-green">Suggested autopilot</p>
                <ul className="space-y-1 list-disc pl-4">
                  <li>Move {monthlyProvisionLabel} to tax wallet when receipts hit.</li>
                  <li>Set a quarterly reminder 5 days before advance-tax deadlines.</li>
                  <li>Review deductible spends monthly (rent, insurance, NPS).</li>
                </ul>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="neuro-card rounded-3xl p-6 space-y-6"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Calculator className="w-3 h-3" />
            <span>Deductions tracker</span>
          </div>
          <h2 className="text-xl font-semibold">Squeeze more value from deductions</h2>
          <p className="text-sm text-muted-foreground max-w-2xl">
            {hasDeductionData
              ? `You have ${deductionHeadroomLabel} deduction headroom left. Use the quick fill buttons to capture upcoming investments.`
              : 'Add deduction entries or sync planner data to start tracking how much headroom is available.'}
          </p>
          <div className="grid gap-4 md:grid-cols-2">
            {deductions.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-background/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Max {formatCurrency(item.cap)}</p>
                    <p className="text-sm font-semibold text-theme-gold">
                      {item.amount !== null ? formatCurrency(item.amount) : PLACEHOLDER}
                    </p>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-theme-gold to-theme-green"
                    style={{ width: `${Math.min(100, ((item.amount ?? 0) / item.cap) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={item.cap}
                    value={item.amount ?? ''}
                    onChange={(event) =>
                      handleDeductionInput(item.id, event.target.value === '' ? null : Number(event.target.value))
                    }
                    onKeyDown={handleDeductionKeyDown}
                    className="w-full rounded-xl border border-white/10 bg-background/60 px-3 py-2 text-xs focus:border-theme-green/60 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleDeductionInput(item.id, item.cap)}
                    className="rounded-full border border-theme-green/40 px-3 py-2 text-[11px] text-theme-green hover:border-theme-green"
                  >
                    Max it
                  </button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="grid gap-4 xl:grid-cols-[2fr_1fr]"
        >
          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">TDS/TCS tracker</p>
                <h3 className="text-xl font-semibold">Match certificates with deposits</h3>
              </div>
              <Info className="w-4 h-4 text-theme-gold" />
            </div>
            <div className="space-y-3 text-sm">
              {tdsFocusItems.length ? (
                tdsFocusItems.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-background/40 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-medium truncate">{item.payer}</p>
                      <span className="text-xs text-muted-foreground">{item.form}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                      <span>{item.status}</span>
                      <button className="text-theme-green hover:underline">{item.action}</button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">
                  Add income transactions and tag follow-ups to monitor TDS certificates.
                </p>
              )}
            </div>
          </div>

          <div className="neuro-card rounded-3xl p-6 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">GST control center</p>
                <h3 className="text-lg font-semibold">Stay ahead of filings</h3>
              </div>
              <Sparkles className="w-4 h-4 text-theme-green" />
            </div>
            <div className="space-y-3 text-sm">
              {gstInsights.map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-background/40 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{item.title}</p>
                    <span className="text-xs text-muted-foreground">{item.due}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.state}</p>
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
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>Advance tax tracker</span>
          </div>
          <h2 className="text-xl font-semibold">Stay compliant with quarterly dues</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {ADVANCE_TAX_MILESTONES.map((milestone) => {
              const isCurrent = milestone.targetPercent === 75
              const statusTone =
                milestone.paidPercent >= milestone.targetPercent
                  ? 'text-theme-green'
                  : isCurrent
                    ? 'text-theme-gold'
                    : 'text-muted-foreground'
              return (
                <div
                  key={milestone.quarter}
                  className={`rounded-2xl border p-4 ${
                    isCurrent ? 'border-theme-gold/40 bg-theme-gold/5' : 'border-white/10 bg-background/40'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{milestone.quarter}</p>
                      <p className="text-xs text-muted-foreground">Due {milestone.dueDate}</p>
                    </div>
                    <span className={`text-xs font-medium ${statusTone}`}>
                      {milestone.paidPercent}% / {milestone.targetPercent}%
                    </span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${milestone.paidPercent >= milestone.targetPercent ? 'bg-theme-green' : 'bg-theme-gold'}`}
                      style={{ width: `${Math.min(100, (milestone.paidPercent / milestone.targetPercent) * 100)}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {milestone.paidPercent >= milestone.targetPercent
                      ? 'This instalment is fully provisioned.'
                      : `Shortfall ${formatCurrency(
                          ((milestone.targetPercent - milestone.paidPercent) / 100) * estimatedTax
                        )}. Top up before ${milestone.dueDate}.`}
                  </p>
                </div>
              )
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="neuro-card rounded-3xl p-6 space-y-4"
        >
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <Download className="w-3 h-3" />
            <span>Compliance checklist</span>
          </div>
          <h2 className="text-xl font-semibold">This month's paperwork</h2>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CheckCircle2 className="w-4 h-4 text-theme-green" />
                Record invoices
              </div>
              <p className="text-xs text-muted-foreground">
                Upload invoices worth {monthlyProvisionLabel} to stay audit-ready. Use the "Scan & Save" shortcut on mobile.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <AlertTriangle className="w-4 h-4 text-theme-gold" />
                Verify TDS credits
              </div>
              <p className="text-xs text-muted-foreground">
                Keep an eye on pending TDS credits. Confirm Form 16A receipts before the next advance-tax run.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-background/40 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Download className="w-4 h-4 text-theme-green" />
                Download Form 26AS
              </div>
              <p className="text-xs text-muted-foreground">
                Latest refresh: {hasIncomeData ? 'this quarter' : PLACEHOLDER}. Download the updated statement after the next payout hits.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
