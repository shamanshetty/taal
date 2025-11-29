'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { mapSupabaseUser } from '@/lib/user'
import { useUserStore } from '@/store/useUserStore'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

type AuthMode = 'login' | 'signup'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const setUser = useUserStore((state) => state.setUser)
  const [mode, setMode] = useState<AuthMode>(() =>
    (searchParams?.get('mode') === 'signup' ? 'signup' : 'login')
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageVariant, setMessageVariant] = useState<'default' | 'error'>('default')

  const handleAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage(null)

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }

        if (data.user) {
          setUser(mapSupabaseUser(data.user))
        } else {
          const { data: userResponse } = await supabase.auth.getUser()
          if (userResponse.user) {
            setUser(mapSupabaseUser(userResponse.user))
          }
        }

        router.replace('/dashboard')
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
            },
          },
        })

        if (error) {
          throw error
        }

        if (!data.session) {
          setMessageVariant('default')
          setMessage(
            'We sent you a confirmation email. Verify your email to continue.'
          )
          return
        }

        if (data.user) {
          setUser(mapSupabaseUser(data.user))
        }

        router.replace('/dashboard')
      }
    } catch (error: any) {
      setMessageVariant('error')
      setMessage(error?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-white via-orange-50 to-green-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md glass-card rounded-3xl p-8 space-y-8"
      >
        <div className="space-y-2 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-primary text-white text-2xl font-bold">
            T
          </div>
          <h1 className="text-2xl font-semibold">Welcome to TaalAI</h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'login'
              ? 'Sign in to access your financial coach.'
              : 'Create an account to start your journey.'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          {mode === 'signup' && (
            <div className="space-y-2">
              <label htmlFor="full-name" className="text-sm font-medium">
                Full name
              </label>
              <Input
                id="full-name"
                placeholder="e.g. Riya Sharma"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Enter a strong password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={6}
            />
          </div>

          <Button
            type="submit"
            className="w-full mt-6"
            disabled={isSubmitting || (mode === 'signup' && fullName.trim().length === 0)}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {message && (
          <div
            className={`text-sm rounded-xl px-4 py-3 ${
              messageVariant === 'error'
                ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                : 'bg-saffron-500/10 text-saffron-500 border border-saffron-500/30'
            }`}
          >
            {message}
          </div>
        )}

        <div className="text-center text-sm text-muted-foreground">
          {mode === 'login' ? (
            <>
              New to TaalAI?{' '}
              <button
                type="button"
                className="text-saffron-600 dark:text-saffron-400 font-semibold hover:underline"
                onClick={() => setMode('signup')}
              >
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                className="text-saffron-600 dark:text-saffron-400 font-semibold hover:underline"
                onClick={() => setMode('login')}
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <div className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:underline">
            Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}
