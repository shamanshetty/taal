'use client'

import { useEffect, useRef } from 'react'
import { syncUserProfile } from '@/lib/api'
import { useUserStore } from '@/store/useUserStore'

export const useEnsureUserProfile = () => {
  const user = useUserStore((state) => state.user)
  const syncedIdsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!user?.id || !user.email) {
      return
    }
    if (syncedIdsRef.current.has(user.id)) {
      return
    }

    syncedIdsRef.current.add(user.id)
    let cancelled = false
    let completed = false
    const run = async () => {
      try {
        await syncUserProfile({
          id: user.id,
          email: user.email,
          full_name: user.full_name,
        })
        completed = true
      } catch (error) {
        console.warn('Failed to sync user profile', user.id, error)
        if (!cancelled) {
          syncedIdsRef.current.delete(user.id)
        }
      }
    }

    run()

    return () => {
      cancelled = true
      if (!completed) {
        syncedIdsRef.current.delete(user.id)
      }
    }
  }, [user])
}
