'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import {
  Target,
  TrendingUp,
  Calendar,
  Plus,
  DollarSign,
  PiggyBank,
  Plane,
  GraduationCap,
  Rocket,
  Sparkles,
  Save,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { createGoal, fetchGoals, updateGoal } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useUserStore } from '@/store/useUserStore'
import type { Goal as StoreGoal } from '@/types'

type GoalStatus = 'active' | 'paused' | 'achieved'

interface UiGoal {
  id: string
  title: string
  targetAmount: number
  currentAmount: number
  deadline: Date | null
  icon: LucideIcon
  category: string
  monthlyContribution: number
  status: GoalStatus
  priority: 'high' | 'medium' | 'low'
  requiredMonthly: number
  notes?: string
  tags?: string[]
}

const PLACEHOLDER = '__'

const GOAL_ICON_MAP: Record<string, LucideIcon> = {
  safety: PiggyBank,
  emergency: PiggyBank,
  growth: Rocket,
  upgrade: Rocket,
  lifestyle: Plane,
  travel: Plane,
  education: GraduationCap,
  tool: GraduationCap,
}

type GoalComposerState = {
  title: string
  category: string
  targetAmount: string
  deadline: string
  priority: 'high' | 'medium' | 'low'
  monthlyContribution: string
  notes: string
  tags: string
  status: GoalStatus
}

const createGoalComposerState = (): GoalComposerState => ({
  title: '',
  category: '',
  targetAmount: '',
  deadline: '',
  priority: 'medium',
  monthlyContribution: '',
  notes: '',
  tags: '',
  status: 'active',
})

const parseDeadline = (value?: string | null): Date | null => {
  if (!value) return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const getMonthsRemaining = (deadline: Date | null) => {
  if (!deadline) return 12
  const diff = deadline.getTime() - Date.now()
  if (diff <= 0) return 1
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24 * 30)))
}

const formatDeadlineLabel = (deadline: Date | null, options?: Intl.DateTimeFormatOptions) => {
  if (!deadline) return PLACEHOLDER
  return new Intl.DateTimeFormat('en-IN', options ?? { month: 'short', year: 'numeric' }).format(deadline)
}

const getDeadlineTime = (deadline: Date | null) => (deadline ? deadline.getTime() : Number.POSITIVE_INFINITY)

const matchesSavedGoalView = (goal: UiGoal, savedView: string) => {
  const category = goal.category.toLowerCase()
  switch (savedView) {
    case 'growth':
      return category.includes('growth') || category.includes('business')
    case 'lifestyle':
      return category.includes('lifestyle') || category.includes('travel')
    default:
      return true
  }
}

const VIEW_SCENARIOS = ['Base Plan', 'Boost Month', 'Lower Income'] as const
type Scenario = (typeof VIEW_SCENARIOS)[number]

const SAVED_VIEWS = [
  { id: 'balance', label: 'Balance First' },
  { id: 'growth', label: 'Growth Mode' },
  { id: 'lifestyle', label: 'Lifestyle Treats' },
] as const

type CategoryFilter = string

const getGoalIcon = (goal: StoreGoal): LucideIcon => {
  const iconKey = goal.icon_key?.toLowerCase()
  if (iconKey && GOAL_ICON_MAP[iconKey]) {
    return GOAL_ICON_MAP[iconKey]
  }
  const categoryKey = goal.category?.toLowerCase()
  if (categoryKey && GOAL_ICON_MAP[categoryKey]) {
    return GOAL_ICON_MAP[categoryKey]
  }
  return Target
}

const mapGoalToUi = (goal: StoreGoal): UiGoal => ({
  id: goal.id,
  title: goal.title ?? 'Untitled goal',
  targetAmount: goal.target_amount ?? 0,
  currentAmount: goal.current_amount ?? 0,
  deadline: parseDeadline(goal.deadline),
  icon: getGoalIcon(goal),
  category: goal.category ?? 'General',
  monthlyContribution: goal.monthly_contribution ?? 0,
  status: goal.status ?? 'active',
  priority: goal.priority ?? 'medium',
  requiredMonthly: goal.required_monthly ?? 0,
  notes: goal.notes ?? undefined,
  tags: goal.tags ?? undefined,
})

function PriorityFocusCard({ goal }: { goal: UiGoal }) {
  const Icon = goal.icon
  const progress = goal.targetAmount
    ? Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100))
    : 0
  const monthsRemaining = getMonthsRemaining(goal.deadline)
  const gap = Math.max(0, goal.targetAmount - goal.currentAmount)
  const suggestedMonthly = monthsRemaining > 0 ? gap / monthsRemaining : 0
  const shortfall = Math.max(0, suggestedMonthly - goal.monthlyContribution)
  const weeklyAction = shortfall > 0 ? shortfall / 4 : goal.monthlyContribution / 4
  const deadlineLabel = formatDeadlineLabel(goal.deadline)
  return (
    <div className="mt-4 grid gap-4 md:grid-cols-[2fr_1fr]">
      <div className="rounded-2xl border border-white/5 bg-background/40 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
            {Icon && <Icon className="w-5 h-5 text-theme-green" />}
          </div>
          <div>
            <p className="font-semibold">{goal.title}</p>
            <p className="text-xs text-muted-foreground">{goal.category}</p>
          </div>
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Weekly action</p>
          <p className="text-sm">
            Transfer {weeklyAction > 0 ? formatCurrency(Math.round(weeklyAction)) : PLACEHOLDER} per week to
            stay on pace for this goal.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Progress {progress}%</span>
          <span>
            Deadline{' '}
            {deadlineLabel}
          </span>
        </div>
      </div>
      <div className="rounded-2xl border border-white/5 bg-background/40 p-4 space-y-3">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Quick adjust</p>
          <p className="text-sm">
            {shortfall > 0
              ? `Increase monthly by ${formatCurrency(Math.round(shortfall))} to stay on track.`
              : 'Contribution is ahead of the required pace.'}
          </p>
        </div>
        <button className="neuro-button text-xs text-theme-green flex items-center gap-2">
          Apply suggestion
          <ChevronRight className="w-4 h-4" />
        </button>
        <button className="text-xs text-muted-foreground hover:text-foreground transition">
          Ask coach why this matters
        </button>
      </div>
    </div>
  )
}

export default function GoalsPage() {
  const user = useUserStore((state) => state.user)
  const storeGoals = useUserStore((state) => state.goals)
  const setStoreGoals = useUserStore((state) => state.setGoals)
  const [filter, setFilter] = useState<CategoryFilter>('All')
  const [scenario, setScenario] = useState<Scenario>('Base Plan')
  const [savedView, setSavedView] = useState('balance')
  const [isFetchingData, setIsFetchingData] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const updateGoalInStore = useUserStore((state) => state.updateGoal)
  const [isGoalComposerOpen, setIsGoalComposerOpen] = useState(false)
  const [goalComposer, setGoalComposer] = useState<GoalComposerState>(createGoalComposerState())
  const [isSavingGoal, setIsSavingGoal] = useState(false)
  const [goalComposerError, setGoalComposerError] = useState<string | null>(null)
  const [goalComposerFeedback, setGoalComposerFeedback] = useState<string | null>(null)
  const [goalActionBusy, setGoalActionBusy] = useState<string | null>(null)

  const resetGoalComposer = () => {
    setGoalComposer(createGoalComposerState())
    setGoalComposerError(null)
    setGoalComposerFeedback(null)
  }

  const handleGoalComposerChange = (field: keyof GoalComposerState, value: string) => {
    setGoalComposer((prev) => ({ ...prev, [field]: value }))
  }

  const handleGoalSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user?.id) {
      setGoalComposerError('Sign in to manage goals.')
      return
    }

    const amountValue = Number(goalComposer.targetAmount)
    if (!goalComposer.title.trim()) {
      setGoalComposerError('Give this goal a name so we can track it together.')
      return
    }
    if (!amountValue || Number.isNaN(amountValue) || amountValue <= 0) {
      setGoalComposerError('Target amount should be greater than zero.')
      return
    }

    setGoalComposerError(null)
    setGoalComposerFeedback(null)
    setIsSavingGoal(true)

    try {
      const parsedDeadline = goalComposer.deadline ? new Date(goalComposer.deadline) : null
      const payload = {
        title: goalComposer.title.trim(),
        category: goalComposer.category || undefined,
        status: goalComposer.status,
        priority: goalComposer.priority,
        target_amount: amountValue,
        current_amount: 0,
        deadline: goalComposer.deadline || undefined,
        monthly_contribution: goalComposer.monthlyContribution
          ? Number(goalComposer.monthlyContribution)
          : undefined,
        notes: goalComposer.notes || undefined,
      } as Parameters<typeof createGoal>[1]

      if (parsedDeadline && !goalComposer.monthlyContribution) {
        const monthsRemaining = getMonthsRemaining(parsedDeadline)
        payload.required_monthly = Math.ceil(amountValue / Math.max(monthsRemaining, 1))
      } else if (goalComposer.monthlyContribution) {
        payload.required_monthly = Number(goalComposer.monthlyContribution)
      }

      const preparedTags = goalComposer.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean)
      if (preparedTags.length) {
        payload.tags = preparedTags
      }

      const created = await createGoal(user.id, payload)
      setStoreGoals([created, ...storeGoals])
      setGoalComposerFeedback(`Goal “${created.title}” added.`)
      setIsGoalComposerOpen(false)
      resetGoalComposer()
    } catch (error) {
      setGoalComposerError(error instanceof Error ? error.message : 'Unable to save this goal.')
    } finally {
      setIsSavingGoal(false)
    }
  }

  const handleGoalStatusChange = async (goalId: string, status: GoalStatus) => {
    if (!status) return
    setGoalComposerError(null)
    setGoalActionBusy(goalId)
    try {
      const updated = await updateGoal(goalId, { status })
      updateGoalInStore(goalId, updated)
      setGoalComposerFeedback(`Goal status updated to ${status}.`)
    } catch (error) {
      setGoalComposerError(error instanceof Error ? error.message : 'Unable to update status.')
    } finally {
      setGoalActionBusy(null)
    }
  }

  useEffect(() => {
    if (!user?.id) return
    const controller = new AbortController()

    const loadGoals = async () => {
      setFetchError(null)
      setIsFetchingData(true)
      try {
        const data = await fetchGoals(user.id, { signal: controller.signal })
        setStoreGoals(data)
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setFetchError(error instanceof Error ? error.message : 'Failed to load goals')
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsFetchingData(false)
        }
      }
    }

    loadGoals()
    return () => controller.abort()
  }, [user?.id, setStoreGoals])

  const goals = useMemo<UiGoal[]>(() => storeGoals.map(mapGoalToUi), [storeGoals])

  const categoryFilters = useMemo(() => {
    const categories = new Set<string>()
    goals.forEach((goal) => {
      if (goal.category) {
        categories.add(goal.category)
      }
    })
    return ['All', ...Array.from(categories).sort()]
  }, [goals])

  useEffect(() => {
    if (!categoryFilters.includes(filter)) {
      setFilter('All')
    }
  }, [categoryFilters, filter])

  const totalTarget = goals.filter((g) => g.status !== 'achieved').reduce((sum, goal) => sum + goal.targetAmount, 0)
  const totalSaved = goals.filter((g) => g.status !== 'achieved').reduce((sum, goal) => sum + goal.currentAmount, 0)
  const totalMonthly = goals.filter((g) => g.status === 'active').reduce((sum, goal) => sum + goal.monthlyContribution, 0)
  const overallProgress = totalTarget === 0 ? 0 : Math.round((totalSaved / totalTarget) * 100)

  const {
    activeGoalsAll,
    pausedGoalsAll,
    achievedGoalsAll,
    focusGoal,
    closestDeadline,
    fundingGap,
    averageProgress,
    averageMonthsRemaining,
    requiredMonthlyTotal,
    monthlyGap,
    priorityMix,
    categoryMix,
    attentionGoals,
  } = useMemo(() => {
    const active = goals.filter((goal) => goal.status === 'active')
    const paused = goals.filter((goal) => goal.status === 'paused')
    const achieved = goals.filter((goal) => goal.status === 'achieved')
    const openGoals = goals.filter((goal) => goal.status !== 'achieved')

    const focus = active.length
      ? [...active].sort((a, b) => {
          const aLag = Math.max(0, a.targetAmount - a.currentAmount)
          const bLag = Math.max(0, b.targetAmount - b.currentAmount)
          const aMonths = getMonthsRemaining(a.deadline)
          const bMonths = getMonthsRemaining(b.deadline)
          const aGap = aMonths > 0 ? aLag / aMonths : aLag
          const bGap = bMonths > 0 ? bLag / bMonths : bLag
          return bGap - aGap
        })[0]
      : undefined

    const upcoming = openGoals.length
      ? [...openGoals].sort((a, b) => getDeadlineTime(a.deadline) - getDeadlineTime(b.deadline))[0]
      : undefined

    const progressEligible = goals.filter((goal) => goal.targetAmount > 0)
    const avgProgress = progressEligible.length
      ? Math.round(
          (progressEligible.reduce((acc, goal) => {
            return acc + Math.min(goal.currentAmount / goal.targetAmount, 1)
          }, 0) /
            progressEligible.length) *
            100
        )
      : 0

    const avgMonthsRemaining = active.length
      ? Math.round(
          active.reduce((acc, goal) => acc + getMonthsRemaining(goal.deadline), 0) / active.length
        )
      : 0

    const requiredMonthlyTotal = active.reduce((sum, goal) => {
      const monthsRemaining = getMonthsRemaining(goal.deadline)
      const gap = Math.max(0, goal.targetAmount - goal.currentAmount)
      return sum + gap / monthsRemaining
    }, 0)

    const priorityMix = active.reduce(
      (acc, goal) => {
        acc[goal.priority] += 1
        return acc
      },
      { high: 0, medium: 0, low: 0 } as Record<UiGoal['priority'], number>
    )

    const categoryTotals = openGoals.reduce((acc, goal) => {
      if (!acc[goal.category]) {
        acc[goal.category] = { current: 0, target: 0 }
      }
      acc[goal.category].current += goal.currentAmount
      acc[goal.category].target += goal.targetAmount
      return acc
    }, {} as Record<string, { current: number; target: number }>)

    const categoryMix = Object.entries(categoryTotals)
      .map(([category, values]) => ({
        category,
        current: values.current,
        target: values.target,
        progress: values.target === 0 ? 0 : Math.round((values.current / values.target) * 100),
      }))
      .sort((a, b) => b.target - a.target)

    const attentionGoals = active
      .map((goal) => {
        const monthsRemaining = getMonthsRemaining(goal.deadline)
        const requiredMonthly = Math.max(0, (goal.targetAmount - goal.currentAmount) / monthsRemaining)
        const onTrack = goal.monthlyContribution >= requiredMonthly
        return {
          goal,
          monthsRemaining,
          requiredMonthly,
          onTrack,
          shortfall: Math.max(0, requiredMonthly - goal.monthlyContribution),
        }
      })
      .filter((item) => !item.onTrack || item.goal.priority === 'high')
      .sort((a, b) => {
        if (a.onTrack === b.onTrack) {
          return a.monthsRemaining - b.monthsRemaining
        }
        return a.onTrack ? 1 : -1
      })
      .slice(0, 3)

    return {
      activeGoalsAll: active,
      pausedGoalsAll: paused,
      achievedGoalsAll: achieved,
      focusGoal: focus,
      closestDeadline: upcoming,
      fundingGap: Math.max(0, totalTarget - totalSaved),
      averageProgress: avgProgress,
      averageMonthsRemaining: avgMonthsRemaining,
      requiredMonthlyTotal,
      monthlyGap: Math.max(0, requiredMonthlyTotal - totalMonthly),
      priorityMix,
      categoryMix,
      attentionGoals,
    }
  }, [goals, totalTarget, totalSaved, totalMonthly])

  const contributionSurplus = totalMonthly - requiredMonthlyTotal

  const filteredGoals = goals.filter((goal) => {
    const matchesCategory = filter === 'All' || goal.category === filter
    const matchesView = matchesSavedGoalView(goal, savedView)
    return matchesCategory && matchesView
  })

  const visibleActiveGoals = filteredGoals.filter((goal) => goal.status === 'active')
  const visiblePausedGoals = filteredGoals.filter((goal) => goal.status === 'paused')
  const visibleAchievedGoals = filteredGoals.filter((goal) => goal.status === 'achieved')

  const scenarioMultiplier = scenario === 'Base Plan' ? 1 : scenario === 'Boost Month' ? 1.5 : 0.7

  const contributionPlan = visibleActiveGoals.map((goal) => {
    const monthsRemaining = getMonthsRemaining(goal.deadline)
    const requiredMonthly = Math.max(0, (goal.targetAmount - goal.currentAmount) / monthsRemaining)
    const scenarioContribution = Math.round(goal.monthlyContribution * scenarioMultiplier)
    const completionSpan =
      scenarioContribution > 0
        ? Math.max(0, (goal.targetAmount - goal.currentAmount) / scenarioContribution)
        : Infinity
    return {
      goal,
      requiredMonthly,
      scenarioContribution,
      completionSpan,
    }
  })

  const milestoneEvents = goals
    .filter((goal) => goal.deadline)
    .sort((a, b) => getDeadlineTime(a.deadline) - getDeadlineTime(b.deadline))
    .slice(0, 3)
    .map((goal) => ({
      goalId: goal.id,
      title: `${goal.title} checkpoint`,
      date: formatDeadlineLabel(goal.deadline, { day: '2-digit', month: 'short' }),
      detail:
        goal.monthlyContribution > 0
          ? `Continue saving ${formatCurrency(goal.monthlyContribution)} each month to stay on pace.`
          : 'Set a monthly contribution to keep this goal moving.',
    }))

  const focusMonths = focusGoal ? getMonthsRemaining(focusGoal.deadline) : null
  const focusGap = focusGoal ? Math.max(0, focusGoal.targetAmount - focusGoal.currentAmount) : null
  const focusRequired = focusGoal && focusMonths ? Math.max(0, focusGap! / focusMonths) : null

  const coachCard = focusGoal
    ? {
        headline: `Keep ${focusGoal.title} on track`,
        insight:
          focusRequired !== null
            ? `Needs around ${formatCurrency(Math.round(focusRequired))} / month. You're contributing ${formatCurrency(
                focusGoal.monthlyContribution,
              )}.`
            : 'Add a target date to unlock pacing guidance.',
        action: 'Ask coach for a re-plan',
      }
    : {
        headline: 'Add a goal to get started',
        insight: 'Create your first savings goal to unlock personalised coaching.',
        action: 'Create a goal',
      }

  const daysToClosest = closestDeadline?.deadline
    ? Math.max(0, Math.ceil((closestDeadline.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : undefined

  const priorityOrder: UiGoal['priority'][] = ['high', 'medium', 'low']
  const priorityLabels: Record<UiGoal['priority'], string> = {
    high: 'High focus',
    medium: 'Balanced',
    low: 'Nice to have',
  }
  const totalGoalsCount = goals.length
  const requiredMonthlyRounded = Math.round(requiredMonthlyTotal)
  const monthlyGapRounded = Math.max(0, Math.round(monthlyGap))
  const coveragePercent = requiredMonthlyTotal === 0 ? 100 : Math.round((totalMonthly / requiredMonthlyTotal) * 100)
  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8 lg:ml-[280px]">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold font-grotesk mb-2">
            <span className="text-gradient-green-gold">Financial Goals</span>
          </h1>
          <p className="text-muted-foreground">Design your money moves and watch them gain momentum.</p>
        </motion.div>

        {fetchError && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {fetchError}
          </div>
        )}

        {isFetchingData && !fetchError && (
          <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-sm text-muted-foreground">
            Syncing your latest goals...
          </div>
        )}
        {goalComposerFeedback && (
          <div className="rounded-2xl border border-theme-green/20 bg-theme-green/10 px-4 py-2 text-sm text-theme-green">
            {goalComposerFeedback}
          </div>
        )}

        {/* Summary Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="neuro-card rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Goals in motion</span>
              <Target className="w-4 h-4 text-theme-gold" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{activeGoalsAll.length}</span>
              <span className="text-sm text-muted-foreground">active / {totalGoalsCount}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>Paused {pausedGoalsAll.length}</span>
              <span>Achieved {achievedGoalsAll.length}</span>
            </div>
          </div>
          <div className="neuro-card rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Funding gap</span>
              <DollarSign className="w-4 h-4 text-theme-green" />
            </div>
            <span className="text-2xl font-semibold">{formatCurrency(fundingGap)}</span>
            <div className="space-y-2">
              <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-theme-gold to-theme-green"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{overallProgress}% | Avg {averageProgress}%</span>
              </div>
            </div>
          </div>
          <div className="neuro-card rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Monthly momentum</span>
              <TrendingUp className="w-4 h-4 text-theme-green" />
            </div>
            <span className="text-2xl font-semibold">{formatCurrency(totalMonthly)}</span>
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center justify-between">
                <span>Needed</span>
                <span>{formatCurrency(requiredMonthlyRounded)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Coverage</span>
                <span className={monthlyGapRounded > 0 ? 'text-destructive' : 'text-theme-green'}>
                  {formatCurrency(monthlyGapRounded)} gap | {coveragePercent}%
                </span>
              </div>
            </div>
          </div>
          <div className="neuro-card rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Next critical date</span>
              <Calendar className="w-4 h-4 text-theme-gold" />
            </div>
            <p className="text-lg font-semibold">
              {closestDeadline ? closestDeadline.title : 'No active goals'}
            </p>
            <p className="text-xs text-muted-foreground">
              {closestDeadline && daysToClosest !== undefined
                ? `${daysToClosest} days • ${
                    formatDeadlineLabel(closestDeadline.deadline, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  }`
                : 'Add a goal to track your next milestone'}
            </p>
          </div>
        </div>

        {/* Goal health snapshot */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="grid grid-cols-1 xl:grid-cols-3 gap-4"
        >
          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Goal health</h2>
                <p className="text-sm text-muted-foreground">Pace and priority balance</p>
              </div>
              <TrendingUp className="w-5 h-5 text-theme-green" />
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>Average progress</span>
                  <span>{averageProgress}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-theme-gold to-theme-green"
                    style={{ width: `${averageProgress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Avg months to finish</span>
                <span>{averageMonthsRemaining || '—'}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              {priorityOrder.map((level) => (
                <span
                  key={level}
                  className="px-2 py-1 rounded-full bg-background/50 border border-white/5 text-muted-foreground capitalize"
                >
                  {priorityLabels[level]}: {priorityMix[level]}
                </span>
              ))}
            </div>
          </div>

          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Category mix</h2>
                <p className="text-sm text-muted-foreground">Where your rupees are heading</p>
              </div>
              <Target className="w-5 h-5 text-theme-gold" />
            </div>
            <div className="space-y-3">
              {categoryMix.length > 0 ? (
                categoryMix.map((entry) => (
                  <div key={entry.category} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{entry.category}</span>
                      <span className="text-xs text-muted-foreground">{entry.progress}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-theme-green/80"
                        style={{ width: `${Math.min(entry.progress, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(entry.current)}</span>
                      <span>{formatCurrency(entry.target)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add more goals to see how your plan spreads across themes.
                </p>
              )}
            </div>
          </div>

          <div className="neuro-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Attention queue</h2>
                <p className="text-sm text-muted-foreground">We surface risky goals here</p>
              </div>
              <Sparkles className="w-5 h-5 text-theme-green" />
            </div>
            <div className="space-y-3">
              {attentionGoals.length > 0 ? (
                attentionGoals.map((item) => {
                  const shortfall = Math.max(0, Math.round(item.shortfall))
                  const requiredMonthly = Math.max(0, Math.round(item.requiredMonthly))
                  return (
                    <div key={item.goal.id} className="rounded-2xl border border-white/5 bg-background/40 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">{item.goal.title}</span>
                        <span className={`text-xs ${shortfall > 0 ? 'text-destructive' : 'text-theme-green'}`}>
                          {shortfall > 0 ? `Shortfall ${formatCurrency(shortfall)}` : 'On track'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="capitalize">{item.goal.priority} priority</span>
                        <span>{item.monthsRemaining} months left</span>
                        <span>{formatCurrency(requiredMonthly)}/mo needed</span>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  All clear. Nudges will appear here when a goal needs a tweak.
                </p>
              )}
            </div>
            <button className="text-xs font-medium text-theme-green hover:underline self-start">Review planner</button>
          </div>
        </motion.div>

        {/* Focus goal and coach highlight */}
        <div className="grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="neuro-card rounded-3xl p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Priority Focus</h2>
                <p className="text-sm text-muted-foreground">Keep this beat steady this week</p>
              </div>
              <button className="text-xs text-theme-green hover:underline">See all priorities</button>
            </div>
            {focusGoal ? (
              <PriorityFocusCard goal={focusGoal} />
            ) : (
              <p className="text-sm text-muted-foreground mt-4">
                Add a goal to see personalised focus.
              </p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="neuro-card rounded-3xl p-6 space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-theme-green" />
              </div>
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold">{coachCard.headline}</p>
                <p className="text-sm text-muted-foreground">{coachCard.insight}</p>
                <button className="inline-flex items-center gap-2 text-xs font-medium text-theme-green hover:underline transition">
                  {coachCard.action}
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="neuro-card rounded-2xl p-4 flex flex-col xl:flex-row gap-4 xl:items-center xl:justify-between"
        >
          <div className="flex flex-wrap items-center gap-2">
            {categoryFilters.map((option) => (
              <button
                key={option}
                onClick={() => setFilter(option)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                  filter === option
                    ? 'border-theme-green text-theme-green'
                    : 'border-white/10 text-muted-foreground hover:text-foreground'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
              <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as Scenario)}
                className="bg-transparent text-sm text-foreground focus:outline-none"
              >
                {VIEW_SCENARIOS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => setIsGoalComposerOpen(true)}
              className="neuro-button text-xs flex items-center gap-2 text-theme-green"
            >
              <Plus className="w-4 h-4" />
              New goal
            </button>
          </div>
        </motion.div>

        {/* Contribution Planner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="neuro-card rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Contribution Planner</h2>
              <p className="text-sm text-muted-foreground">
                How your monthly surplus flows into different goals under <span className="text-theme-green">{scenario}</span>
              </p>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              Surplus after contributions:{' '}
              <span className={contributionSurplus >= 0 ? 'text-theme-green' : 'text-destructive'}>
                {formatCurrency(contributionSurplus)}
              </span>
            </div>
          </div>
          <div className="space-y-3">
            {contributionPlan.length > 0 ? (
              contributionPlan.map((plan) => {
                const PlanIcon = plan.goal.icon
                return (
                  <div key={plan.goal.id} className="rounded-2xl border border-white/5 bg-background/40 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                          {PlanIcon && <PlanIcon className="w-4 h-4 text-theme-green" />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{plan.goal.title}</p>
                          <p className="text-xs text-muted-foreground">{plan.goal.category}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Monthly</p>
                        <p className="text-sm font-semibold">{formatCurrency(plan.scenarioContribution)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs text-muted-foreground">
                      <div>
                        <p className="mb-1">Suggested</p>
                        <p className="text-foreground font-medium">{formatCurrency(plan.requiredMonthly)}</p>
                      </div>
                      <div>
                        <p className="mb-1">Projected finish</p>
                        <p className="text-foreground font-medium">
                          {Number.isFinite(plan.completionSpan)
                            ? `${Math.max(0, Math.ceil(plan.completionSpan))} months`
                            : '--'}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1">Balance remaining</p>
                        <p className="text-foreground font-medium">
                          {formatCurrency(Math.max(0, plan.goal.targetAmount - plan.goal.currentAmount))}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1">Priority</p>
                        <p className="text-foreground font-medium capitalize">{plan.goal.priority}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                No active goals in this view. Add one or adjust filters to see the contribution plan.
              </p>
            )}
          </div>
        </motion.div>

        {/* Milestones Timeline */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="neuro-card rounded-3xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold">Milestones & Reminders</h2>
              <p className="text-sm text-muted-foreground">Key beats in the next few months</p>
            </div>
          </div>
          <div className="space-y-4">
            {milestoneEvents.length ? (
              milestoneEvents.map((event) => {
                const goal = goals.find((g) => g.id === event.goalId)
                return (
                  <div key={event.title} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-theme-green mt-2" />
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{event.title}</span>
                        <span className="text-xs text-muted-foreground">{event.date}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{event.detail}</p>
                      {goal && (
                        <p className="text-xs text-muted-foreground">
                          Linked goal: <span className="text-foreground">{goal.title}</span>
                        </p>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-sm text-muted-foreground">
                Add deadlines to your goals to see timeline reminders.
              </p>
            )}
          </div>
        </motion.div>

        {/* Goals by status */}
        {[
          { title: 'Active Goals', list: visibleActiveGoals },
          { title: 'Paused Goals', list: visiblePausedGoals },
          { title: 'Achieved Goals', list: visibleAchievedGoals },
        ].map(({ title, list }, indexGroup) =>
          list.length > 0 ? (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 + indexGroup * 0.1 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{title}</h2>
                {title === 'Active Goals' && (
                  <div className="text-xs text-muted-foreground">
                    Showing {list.length} of {filteredGoals.length} goals
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {list.map((goal, index) => {
                  const progress = goal.targetAmount === 0 ? 0 : (goal.currentAmount / goal.targetAmount) * 100
                  const monthsRemaining = getMonthsRemaining(goal.deadline)
                  const onTrack =
                    goal.status === 'achieved'
                      ? true
                      : goal.monthlyContribution * monthsRemaining >= goal.targetAmount - goal.currentAmount
                  const Icon = goal.icon
                  return (
                    <motion.div
                      key={goal.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      className={`neuro-card rounded-3xl p-6 space-y-4 ${
                        goal.status === 'achieved' ? 'border border-theme-green/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                            <Icon className="w-7 h-7 text-theme-green" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold">{goal.title}</h3>
                            <p className="text-sm text-muted-foreground">{goal.category}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2">
                              {goal.tags?.map((tag) => (
                                <span
                                  key={tag}
                                  className="px-2 py-0.5 text-xs rounded-full bg-white/5 border border-white/10"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              goal.status === 'achieved'
                                ? 'bg-theme-green/20 text-theme-green'
                                : onTrack
                                  ? 'bg-theme-gold/20 text-theme-gold'
                                  : 'bg-destructive/20 text-destructive'
                            }`}
                          >
                            {goal.status === 'achieved'
                              ? 'Achieved'
                              : onTrack
                                ? 'On Track'
                                : 'At Risk'}
                          </div>
                          <select
                            value={goal.status}
                            onChange={(event) =>
                              handleGoalStatusChange(goal.id, event.target.value as GoalStatus)
                            }
                            disabled={goalActionBusy === goal.id}
                            className="text-xs rounded-full border border-white/10 bg-transparent px-3 py-1 focus:outline-none focus:ring-2 focus:ring-theme-green/40"
                          >
                            <option value="active">Mark active</option>
                            <option value="paused">Pause</option>
                            <option value="achieved">Mark achieved</option>
                          </select>
                        </div>
                      </div>

                      {/* Progress Bar and Amounts */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-baseline">
                          <span className="text-2xl font-semibold">
                            {formatCurrency(goal.currentAmount)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Target: {formatCurrency(goal.targetAmount)}
                          </span>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-theme-gold to-theme-green"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Details */}
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          {goal.status === 'active'
                            ? `${formatCurrency(goal.monthlyContribution)} / month`
                            : 'Contribution paused'}
                        </span>
                        <span>
                          {goal.status !== 'achieved' ? `${monthsRemaining} months left` : 'Completed'}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ) : null
        )}
      </div>
      {isGoalComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/10 bg-background p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Create a goal</h2>
                <p className="text-sm text-muted-foreground">Track a future purchase, buffer, or business upgrade.</p>
              </div>
              <Button type="button" variant="ghost" onClick={() => setIsGoalComposerOpen(false)}>
                Close
              </Button>
            </div>

            {goalComposerError && (
              <div className="mb-4 rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-300">
                {goalComposerError}
              </div>
            )}

            <form className="space-y-6" onSubmit={handleGoalSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Goal title</label>
                  <Input
                    value={goalComposer.title}
                    onChange={(event) => handleGoalComposerChange('title', event.target.value)}
                    placeholder="Gift fund, iPad upgrade, tax buffer"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Category / theme</label>
                  <Input
                    value={goalComposer.category}
                    onChange={(event) => handleGoalComposerChange('category', event.target.value)}
                    placeholder="Lifestyle, business, emergency"
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
                    value={goalComposer.targetAmount}
                    onChange={(event) => handleGoalComposerChange('targetAmount', event.target.value)}
                    placeholder="600000"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Target date</label>
                  <Input
                    type="date"
                    value={goalComposer.deadline}
                    onChange={(event) => handleGoalComposerChange('deadline', event.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Priority</label>
                  <select
                    value={goalComposer.priority}
                    onChange={(event) => handleGoalComposerChange('priority', event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-green/40"
                  >
                    <option value="high">High focus</option>
                    <option value="medium">Balanced</option>
                    <option value="low">Nice to have</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Status</label>
                  <select
                    value={goalComposer.status}
                    onChange={(event) => handleGoalComposerChange('status', event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-green/40"
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                    <option value="achieved">Achieved</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Monthly contribution</label>
                  <Input
                    type="number"
                    min="0"
                    step="500"
                    value={goalComposer.monthlyContribution}
                    onChange={(event) => handleGoalComposerChange('monthlyContribution', event.target.value)}
                    placeholder="15000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Tags (comma separated)</label>
                  <Input
                    value={goalComposer.tags}
                    onChange={(event) => handleGoalComposerChange('tags', event.target.value)}
                    placeholder="vacation, family, upgrade"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Notes</label>
                  <textarea
                    value={goalComposer.notes}
                    onChange={(event) => handleGoalComposerChange('notes', event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-theme-green/40"
                    rows={3}
                    placeholder="Add context for the coach, e.g., why this goal matters."
                  />
                </div>
              </div>

              <div className="flex flex-col md:flex-row md:items-center md:justify-end gap-3">
                <Button type="submit" disabled={isSavingGoal} className="flex-1 md:flex-none">
                  {isSavingGoal ? 'Saving...' : 'Save goal'}
                </Button>
                <Button type="button" variant="ghost" onClick={resetGoalComposer}>
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





