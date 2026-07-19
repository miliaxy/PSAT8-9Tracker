import { useState, type FormEvent } from 'react'
import { ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Target } from 'lucide-react'
import { useAuth } from './AuthContext'

export function AuthScreen() {
  const { signIn, signUp, error: authError } = useAuth()
  const [formMode, setFormMode] = useState<'sign-in' | 'create'>('sign-in')
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setMessage(null)
    try {
      if (formMode === 'sign-in') {
        await signIn(email, password)
      } else {
        const needsConfirmation = await signUp(displayName, email, password)
        if (needsConfirmation) setMessage('Check your email to confirm the account, then return here to sign in.')
      }
    } catch {
      // The context provides the user-facing error.
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-story">
        <div className="auth-brand"><span><Target size={21} /></span><strong>PSAT Pathway</strong></div>
        <div>
          <span className="auth-eyebrow"><ShieldCheck size={15} /> Private family workspace</span>
          <h1>Focused coaching.<br />Protected progress.</h1>
          <p>Plans, scores, mistakes, and next steps stay connected to the family accounts allowed to see them.</p>
        </div>
        <ul>
          <li><CheckCircle2 size={16} /> Separate parent and student access</li>
          <li><CheckCircle2 size={16} /> Private records protected in the database</li>
          <li><CheckCircle2 size={16} /> Student task completion without admin access</li>
        </ul>
      </section>

      <section className="auth-panel-wrap">
        <div className="auth-panel">
          <div className="auth-panel__icon"><LockKeyhole size={21} /></div>
          <span className="eyebrow">Secure access</span>
          <h2>{formMode === 'sign-in' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="auth-panel__intro">
            {formMode === 'sign-in'
              ? 'Sign in to open your private coaching dashboard.'
              : 'New accounts start without access to any student. A parent administrator links them safely.'}
          </p>

          <div className="auth-tabs" role="tablist" aria-label="Account action">
            <button type="button" className={formMode === 'sign-in' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => setFormMode('sign-in')}>Sign in</button>
            <button type="button" className={formMode === 'create' ? 'auth-tab auth-tab--active' : 'auth-tab'} onClick={() => setFormMode('create')}>Create account</button>
          </div>

          <form className="auth-form" onSubmit={submit}>
            {formMode === 'create' && (
              <label>Display name<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" required /></label>
            )}
            <label>Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
            <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={formMode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required /></label>
            {(authError || message) && <p className={authError ? 'auth-message auth-message--error' : 'auth-message'} role="status">{authError || message}</p>}
            <button className="auth-submit" disabled={busy}>
              {busy ? 'Please wait…' : formMode === 'sign-in' ? 'Open dashboard' : 'Create account'}
              {!busy && <ArrowRight size={16} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
