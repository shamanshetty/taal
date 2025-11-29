import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function calculateFinancialPulse(
  incomeData: number[],
  expenseData: number[]
): number {
  if (incomeData.length === 0) return 0

  const avgIncome = incomeData.reduce((a, b) => a + b, 0) / incomeData.length
  const avgExpense = expenseData.reduce((a, b) => a + b, 0) / expenseData.length
  const savingsRate = ((avgIncome - avgExpense) / avgIncome) * 100

  // Calculate volatility (standard deviation)
  const variance = incomeData.reduce((sum, income) => {
    return sum + Math.pow(income - avgIncome, 2)
  }, 0) / incomeData.length
  const volatility = Math.sqrt(variance) / avgIncome

  // Pulse score: 0-100 based on savings rate and income stability
  const stabilityScore = Math.max(0, 100 - (volatility * 100))
  const savingsScore = Math.min(100, Math.max(0, savingsRate))

  return Math.round((stabilityScore * 0.4 + savingsScore * 0.6))
}
