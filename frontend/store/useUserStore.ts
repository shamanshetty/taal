import { create } from 'zustand'
import { User, Transaction, Goal, FinancialPulse } from '@/types'

interface UserState {
  user: User | null
  transactions: Transaction[]
  goals: Goal[]
  financialPulse: FinancialPulse | null
  setUser: (user: User | null) => void
  setTransactions: (transactions: Transaction[]) => void
  setGoals: (goals: Goal[]) => void
  setFinancialPulse: (pulse: FinancialPulse | null) => void
  addTransaction: (transaction: Transaction) => void
  addGoal: (goal: Goal) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  transactions: [],
  goals: [],
  financialPulse: null,
  setUser: (user) => set({ user }),
  setTransactions: (transactions) => set({ transactions }),
  setGoals: (goals) => set({ goals }),
  setFinancialPulse: (financialPulse) => set({ financialPulse }),
  addTransaction: (transaction) =>
    set((state) => ({ transactions: [...state.transactions, transaction] })),
  addGoal: (goal) => set((state) => ({ goals: [...state.goals, goal] })),
  updateGoal: (id, updates) =>
    set((state) => ({
      goals: state.goals.map((goal) =>
        goal.id === id ? { ...goal, ...updates } : goal
      ),
    })),
}))
