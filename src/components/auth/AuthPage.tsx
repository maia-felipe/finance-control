import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Wallet } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { ThemeToggle } from '../ui/ThemeToggle'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

type AuthMode = 'login' | 'signup' | 'reset'

export function AuthPage() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth()
  const { t } = useTranslation()
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    if (mode === 'reset') {
      const { error: err } = await resetPassword(email)
      setSubmitting(false)
      if (err) setError(err)
      else setInfo(t('auth.resetLinkSent'))
      return
    }
    const fn = mode === 'login' ? signInWithEmail : signUpWithEmail
    const { error: err } = await fn(email, password)
    setSubmitting(false)
    if (err) setError(err)
    else if (mode === 'signup') setInfo(t('auth.accountCreated'))
  }

  const handleGoogle = async () => {
    setError('')
    const { error: err } = await signInWithGoogle()
    if (err) setError(err)
  }

  const switchMode = (next: AuthMode) => {
    setMode(next)
    setError('')
    setInfo('')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-soft text-accent mx-auto mb-3">
            <Wallet size={24} />
          </div>
          <h1 className="text-2xl font-bold text-content tracking-tight">FinanControl</h1>
          <p className="text-sm text-content-2 mt-1">
            {mode === 'login' ? t('auth.signInTitle') : mode === 'signup' ? t('auth.signUpTitle') : t('auth.resetTitle')}
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label={t('auth.email')}
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              required
            />
            {mode !== 'reset' && (
              <Input
                label={t('auth.password')}
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                minLength={6}
                required
              />
            )}
            {error && <p className="text-sm text-danger">{error}</p>}
            {info && <p className="text-sm text-success">{info}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? t('common.wait') : mode === 'login' ? t('auth.signIn') : mode === 'signup' ? t('auth.signUp') : t('auth.sendResetLink')}
            </Button>
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => switchMode('reset')}
                className="text-sm text-content-2 hover:text-accent hover:underline cursor-pointer self-center"
              >
                {t('auth.forgotPassword')}
              </button>
            )}
          </form>

          {mode !== 'reset' && (<>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-content-3">{t('common.or')}</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2 text-sm font-medium text-content hover:bg-surface-2 transition cursor-pointer"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {t('auth.continueWithGoogle')}
          </button>
          </>)}
        </Card>

        <p className="text-center text-sm text-content-2 mt-4">
          {mode === 'login' ? t('auth.noAccount') : mode === 'signup' ? t('auth.hasAccount') : t('auth.rememberedPassword')}
          <button
            type="button"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            className="text-accent font-medium hover:underline cursor-pointer"
          >
            {mode === 'login' ? t('auth.goSignUp') : t('auth.goSignIn')}
          </button>
        </p>
      </div>
    </div>
  )
}
