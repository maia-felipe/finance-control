import { toast } from './toast'

interface PersistResult {
  error: { message: string } | null
}

// Encapsula o padrão de gravação otimista em background dos hooks:
// se a gravação no Supabase falhar, loga, avisa o usuário com um toast e
// ressincroniza o estado local com o banco (desfazendo a mutação otimista).
export function persist(
  message: string,
  query: PromiseLike<PersistResult>,
  resync?: () => void,
) {
  query.then(({ error }) => {
    if (error) {
      console.error(message, error)
      toast.error(message)
      resync?.()
    }
  })
}
