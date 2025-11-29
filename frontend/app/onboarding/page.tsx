'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '@/store/useUserStore'
import { mapSupabaseUser } from '@/lib/user'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to TaalAI',
    description: 'Let us set up your profile in a few guided steps.',
  },
  {
    id: 'income',
    title: 'Income rhythm',
    description: 'Share the sources that power your cash flow.',
  },
  {
    id: 'expenses',
    title: 'Monthly expenses',
    description: 'Capture your essential spends to build guardrails.',
  },
  {
    id: 'goals',
    title: 'Financial goals',
    description: 'Tell us what you are working towards.',
  },
]

type IncomeSource = { name: string; type: string; amount: string }
type GoalItem = { title: string; targetAmount: string; deadline: string }
type OnboardingFormData = {
  fullName: string
  incomeSources: IncomeSource[]
  monthlyExpense: string
  expenseCategories: string
  goals: GoalItem[]
}

export default function OnboardingPage() {
  const router = useRouter()
  const user = useUserStore((state) => state.user)
  const setUser = useUserStore((state) => state.setUser)

  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [formData, setFormData] = useState<OnboardingFormData>(() => ({
    fullName: user?.full_name ?? '',
    incomeSources: [{ name: '', type: 'freelance', amount: '' }],
    monthlyExpense: '',
    expenseCategories: '',
    goals: [{ title: '', targetAmount: '', deadline: '' }],
  }))

  const nextStep = async () => {
    if (currentStep === 0 && formData.fullName.trim().length === 0) {
      setMessage('Please let us know your name to continue.')
      return
    }
    setMessage(null)
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      await handleSubmit()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      setMessage(null)

      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          full_name: formData.fullName.trim(),
          onboarding_complete: true,
          onboarding_snapshot: formData,
        },
      })

      if (updateError) {
        throw updateError
      }

      const { data, error: refreshError } = await supabase.auth.getUser()
      if (refreshError) {
        throw refreshError
      }
      if (data.user) {
        setUser(mapSupabaseUser(data.user))
      }

      router.replace('/dashboard')
    } catch (error: any) {
      setMessage(error?.message ?? 'Unable to save your details. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addIncomeSource = () => {
    setFormData((prev) => ({
      ...prev,
      incomeSources: [...prev.incomeSources, { name: '', type: 'freelance', amount: '' }],
    }))
  }

  const addGoal = () => {
    setFormData((prev) => ({
      ...prev,
      goals: [...prev.goals, { title: '', targetAmount: '', deadline: '' }],
    }))
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-orange-50 to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center space-y-4"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/70 px-4 py-2 dark:bg-gray-900/60">
            <Sparkles className="w-4 h-4 text-saffron-500" />
            <span className="text-sm font-medium text-saffron-600 dark:text-saffron-400">Getting to know you</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white">Tailor TaalAI to your money rhythm</h1>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
            Fill in a few quick details so the coach can personalise cash flow alerts, tax nudges, and goal recommendations.
          </p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            {STEPS.map((step, index) => {
              const isActive = index === currentStep
              const isCompleted = index < currentStep
              return (
                <div
                  key={step.id}
                  className={`rounded-2xl border px-4 py-3 text-sm ${
                    isActive ? 'border-theme-green bg-theme-green/10 text-theme-green' : 'border-white/10 bg-white/30 dark:bg-gray-900/30 text-muted-foreground'
                  }`}
                >
                  <p className="font-medium">{step.title}</p>
                  <p className="text-xs">{step.description}</p>
                  {isCompleted && <p className="text-[11px] text-theme-green mt-1">Done</p>}
                </div>
              )
            })}
          </div>

          <Card className="glass-card rounded-3xl">
            <CardHeader>
              <CardTitle>{STEPS[currentStep].title}</CardTitle>
              <CardDescription>{STEPS[currentStep].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={STEPS[currentStep].id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  {currentStep === 0 && (
                    <div className="space-y-3">
                      <label className="text-sm font-medium">What should we call you?</label>
                      <Input
                        placeholder="e.g. Riya Sharma"
                        value={formData.fullName}
                        onChange={(event) => setFormData((prev) => ({ ...prev, fullName: event.target.value }))}
                      />
                      <p className="text-xs text-muted-foreground">
                        We use your name to personalise nudges and summaries.
                      </p>
                    </div>
                  )}

                  {currentStep === 1 && (
                    <IncomeStep formData={formData} setFormData={setFormData} addIncomeSource={addIncomeSource} />
                  )}

                  {currentStep === 2 && (
                    <ExpenseStep formData={formData} setFormData={setFormData} />
                  )}

                  {currentStep === 3 && (
                    <GoalsStep formData={formData} setFormData={setFormData} addGoal={addGoal} />
                  )}
                </motion.div>
              </AnimatePresence>

              {message && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-400">
                  {message}
                </div>
              )}

              <div className="flex items-center justify-between">
                <Button type="button" variant="ghost" disabled={currentStep === 0 || isSubmitting} onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={nextStep}
                  disabled={isSubmitting}
                >
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
                  {currentStep !== STEPS.length - 1 && <ArrowRight className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function IncomeStep({
  formData,
  setFormData,
  addIncomeSource,
}: {
  formData: OnboardingFormData
  setFormData: Dispatch<SetStateAction<OnboardingFormData>>
  addIncomeSource: () => void
}) {
  return (
    <div className="space-y-4">
      {formData.incomeSources.map((source, index) => (
        <div key={index} className="rounded-xl border border-white/10 bg-background/60 p-4 space-y-3">
          <Input
            placeholder="Income source (e.g. Freelance design retainers)"
            value={source.name}
            onChange={(event) => {
              const nextSources = [...formData.incomeSources]
              nextSources[index].name = event.target.value
              setFormData((prev) => ({ ...prev, incomeSources: nextSources }))
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              className="rounded-lg border border-white/10 bg-background/70 px-3 py-2 text-sm"
              value={source.type}
              onChange={(event) => {
                const nextSources = [...formData.incomeSources]
                nextSources[index].type = event.target.value
                setFormData((prev) => ({ ...prev, incomeSources: nextSources }))
              }}
            >
              <option value="freelance">Freelance</option>
              <option value="gig">Gig</option>
              <option value="retainer">Retainer</option>
              <option value="salary">Monthly salary</option>
              <option value="other">Other</option>
            </select>
            <Input
              type="number"
              placeholder="Average amount (Rs)"
              value={source.amount}
              onChange={(event) => {
                const nextSources = [...formData.incomeSources]
                nextSources[index].amount = event.target.value
                setFormData((prev) => ({ ...prev, incomeSources: nextSources }))
              }}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addIncomeSource} className="w-full">
        Add another income source
      </Button>
    </div>
  )
}

function ExpenseStep({
  formData,
  setFormData,
}: {
  formData: OnboardingFormData
  setFormData: Dispatch<SetStateAction<OnboardingFormData>>
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Average monthly expense (Rs)</label>
        <Input
          type="number"
          placeholder="e.g. 30000"
          value={formData.monthlyExpense}
          onChange={(event) => setFormData((prev) => ({ ...prev, monthlyExpense: event.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium">Main expense categories</label>
        <Input
          placeholder="Rent, food, transport, subscriptions"
          value={formData.expenseCategories}
          onChange={(event) => setFormData((prev) => ({ ...prev, expenseCategories: event.target.value }))}
        />
        <p className="text-xs text-muted-foreground">Separate categories with commas.</p>
      </div>
    </div>
  )
}

function GoalsStep({
  formData,
  setFormData,
  addGoal,
}: {
  formData: OnboardingFormData
  setFormData: Dispatch<SetStateAction<OnboardingFormData>>
  addGoal: () => void
}) {
  return (
    <div className="space-y-4">
      {formData.goals.map((goal, index) => (
        <div key={index} className="rounded-xl border border-white/10 bg-background/60 p-4 space-y-3">
          <Input
            placeholder="Goal name (e.g. three month emergency fund)"
            value={goal.title}
            onChange={(event) => {
              const nextGoals = [...formData.goals]
              nextGoals[index].title = event.target.value
              setFormData((prev) => ({ ...prev, goals: nextGoals }))
            }}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              placeholder="Target amount (Rs)"
              value={goal.targetAmount}
              onChange={(event) => {
                const nextGoals = [...formData.goals]
                nextGoals[index].targetAmount = event.target.value
                setFormData((prev) => ({ ...prev, goals: nextGoals }))
              }}
            />
            <Input
              type="date"
              value={goal.deadline}
              onChange={(event) => {
                const nextGoals = [...formData.goals]
                nextGoals[index].deadline = event.target.value
                setFormData((prev) => ({ ...prev, goals: nextGoals }))
              }}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={addGoal} className="w-full">
        Add another goal
      </Button>
    </div>
  )
}
