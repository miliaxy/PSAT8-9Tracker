import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AccountProfile {
  displayName: string
  role: 'parent_admin' | 'student'
}

interface AuthContextValue {
  mode: 'demo' | 'private'
  status: 'loading' | 'anonymous' | 'authenticated'
  session: Session | null
  user: User | null
  profile: AccountProfile | null
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (displayName: string, email: string, password: string) => Promise<boolean>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function friendlyAuthError(message: string) {
  if (message.toLowerCase().includes('invalid login')) return 'The email or password did not match.'
  return message
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue['status']>(isSupabaseConfigured ? 'loading' : 'authenticated')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const authClient = supabase
    if (!authClient) return

    let active = true

    const applySession = async (nextSession: Session | null) => {
      if (!active) return
      setSession(nextSession)
      setError(null)

      if (!nextSession) {
        setProfile(null)
        setStatus('anonymous')
        return
      }

      const { data, error: profileError } = await authClient
        .from('profiles')
        .select('display_name, role')
        .eq('id', nextSession.user.id)
        .single()

      if (!active) return
      if (profileError) {
        setError('Your account is signed in, but its private profile could not be loaded.')
        setProfile(null)
      } else {
        setProfile({
          displayName: String(data.display_name || nextSession.user.email || 'Account'),
          role: data.role === 'parent_admin' ? 'parent_admin' : 'student',
        })
      }
      setStatus('authenticated')
    }

    void authClient.auth.getSession().then(({ data, error: sessionError }) => {
      if (sessionError) {
        setError(friendlyAuthError(sessionError.message))
        setStatus('anonymous')
        return
      }
      void applySession(data.session)
    })

    const { data: listener } = authClient.auth.onAuthStateChange((_event, nextSession) => {
      window.setTimeout(() => void applySession(nextSession), 0)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    mode: isSupabaseConfigured ? 'private' : 'demo',
    status,
    session,
    user: session?.user ?? null,
    profile,
    error,
    signIn: async (email, password) => {
      if (!supabase) return
      setError(null)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        const message = friendlyAuthError(signInError.message)
        setError(message)
        throw new Error(message)
      }
    },
    signUp: async (displayName, email, password) => {
      if (!supabase) return false
      setError(null)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      })
      if (signUpError) {
        const message = friendlyAuthError(signUpError.message)
        setError(message)
        throw new Error(message)
      }
      return !data.session
    },
    signOut: async () => {
      if (!supabase) return
      const { error: signOutError } = await supabase.auth.signOut()
      if (signOutError) throw signOutError
    },
  }), [error, profile, session, status])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Kept beside the provider so the auth contract remains defined in one place.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
