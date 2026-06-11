import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Card } from '../ui/Card'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

// Exibida quando o usuário chega pelo link de redefinição de senha do email
// (evento PASSWORD_RECOVERY do Supabase).
export function UpdatePasswordPage() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    setSubmitting(true)
    const { error: err } = await updatePassword(password)
    setSubmitting(false)
    if (err) setError(err)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-soft text-accent mx-auto mb-3">
            <Wallet size={24} />
          </div>
          <h1 className="text-2xl font-bold text-content tracking-tight">FinanControl</h1>
          <p className="text-sm text-content-2 mt-1">Defina sua nova senha</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nova senha"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              minLength={6}
              autoFocus
              required
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              minLength={6}
              required
            />
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Aguarde...' : 'Salvar nova senha'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
