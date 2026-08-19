import type { Resources } from './locales/en'

// Tipa t() contra o dicionário em inglês: chave inexistente ou com erro de
// digitação vira erro de compilação, não fallback silencioso em runtime.
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: {
      translation: Resources
    }
  }
}
