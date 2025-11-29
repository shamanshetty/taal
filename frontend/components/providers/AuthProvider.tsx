'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { mapSupabaseUser } from '@/lib/user'
import { useUserStore } from '@/store/useUserStore'

const publicRoutes = ['/', '/login']

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const setUser = useUserStore((state) => state.setUser)
  const user = useUserStore((state) => state.user)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    let isMounted = true

    const initialiseSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      if (!isMounted) return

      if (!error) {
        const sessionUser = data.session?.user ?? null
        setUser(sessionUser ? mapSupabaseUser(sessionUser) : null)
      }
      setInitializing(false)
    }

    initialiseSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const sessionUser = session?.user ?? null
      setUser(sessionUser ? mapSupabaseUser(sessionUser) : null)
      setInitializing(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [setUser])

  useEffect(() => {
    if (initializing) return

    const isPublicRoute = publicRoutes.includes(pathname)

    if (!user && !isPublicRoute) {
      router.replace('/login')
      return
    }

    if (user && (pathname === '/login' || pathname === '/')) {
      router.replace('/dashboard')
    }
  }, [user, pathname, router, initializing])

  return <>{children}</>
}
