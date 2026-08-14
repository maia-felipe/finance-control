import { useTranslation } from 'react-i18next'
import { Globe, Coins, Tags, User } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card } from '../ui/Card'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { CurrencySelect } from '../ui/CurrencySelect'
import { CategoriesSection } from '../categories/CategoriesSection'
import { useSettings } from '../../contexts/SettingsContext'
import { useAuth } from '../../contexts/AuthContext'
import { toast } from '../../lib/toast'
import { LOCALES, LOCALE_LABELS } from '../../i18n'
import type { Locale } from '../../i18n'

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-content-2 uppercase tracking-wide mb-3">
        <Icon size={15} />
        {title}
      </h2>
      {children}
    </section>
  )
}

export function SettingsPage() {
  const { t } = useTranslation()
  const { locale, setLocale, preferredCurrency, setPreferredCurrency } = useSettings()
  const { user, resetPassword } = useAuth()

  const handleChangePassword = async () => {
    if (!user?.email) return
    const { error } = await resetPassword(user.email)
    if (error) toast.error(error)
    else toast.success(t('auth.resetLinkSent'))
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-content mb-6">{t('settings.title')}</h1>

      <Section icon={Globe} title={t('settings.languageSection')}>
        <Card>
          <Select
            value={locale}
            onChange={e => setLocale(e.target.value as Locale)}
            className="w-full md:w-80"
          >
            {LOCALES.map(code => (
              <option key={code} value={code}>{LOCALE_LABELS[code]}</option>
            ))}
          </Select>
          <p className="text-xs text-content-3 mt-2">{t('settings.languageHint')}</p>
        </Card>
      </Section>

      <Section icon={Coins} title={t('settings.currencySection')}>
        <Card>
          <CurrencySelect
            label={t('settings.preferredCurrency')}
            value={preferredCurrency}
            onChange={setPreferredCurrency}
            className="w-full md:w-80"
          />
          <p className="text-xs text-content-3 mt-2">{t('settings.currencyHint')}</p>
        </Card>
      </Section>

      <Section icon={Tags} title={t('settings.categoriesSection')}>
        <CategoriesSection />
      </Section>

      <Section icon={User} title={t('settings.accountSection')}>
        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-content-3">{t('settings.signedInAs')}</p>
              <p className="text-sm text-content truncate">{user?.email}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={handleChangePassword}>
              {t('settings.changePassword')}
            </Button>
          </div>
        </Card>
      </Section>
    </div>
  )
}
