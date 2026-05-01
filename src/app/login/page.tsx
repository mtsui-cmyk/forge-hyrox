"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { Loader2, Flame } from 'lucide-react'
import { useTranslation, LanguageToggle } from '@/components/I18nProvider'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    setIsLoading(false)

    if (res?.error) {
      setError(t("auth.loginError"))
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center p-6 sm:p-12 font-sans relative">
      <div className="absolute top-6 right-6 z-20">
        <LanguageToggle />
      </div>

      <div className="w-full max-w-md bg-surface-container-low rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden group">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors duration-1000"></div>
        
        <div className="relative z-10 space-y-8">
          <div className="text-center space-y-2">
            <Flame className="w-10 h-10 text-primary fill-primary mx-auto mb-4" />
            <h1 className="text-4xl font-black italic tracking-tighter text-on-surface font-display uppercase">
              {t("auth.loginTitle")}
            </h1>
            <p className="text-on-surface/50 font-medium text-sm tracking-wide">
              {t("auth.loginSubtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface/40 uppercase tracking-wider">{t("auth.email")}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface text-on-surface rounded-xl p-4 focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium placeholder:text-on-surface/30"
                  placeholder="athlete@hyrox.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-on-surface/40 uppercase tracking-wider">{t("auth.password")}</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface text-on-surface rounded-xl p-4 focus:outline-none focus:ring-1 focus:ring-primary transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 text-red-500 text-sm font-medium border border-red-500/20 text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-b from-[#FFE84D] to-[#FFDE00] text-on-primary font-black italic text-lg tracking-wider uppercase py-4 rounded-2xl shadow-[0_0_20px_rgba(255,222,0,0.3)] hover:shadow-[0_0_30px_rgba(255,222,0,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : t("auth.loginButton")}
            </button>
          </form>
          
          <div className="text-center pt-4">
            <p className="text-on-surface/50 text-sm">
              {t("auth.noAccount")}{' '}
              <button onClick={() => router.push('/register')} className="text-primary font-bold hover:underline">
                {t("auth.goRegister")}
              </button>
            </p>
            <button
              onClick={() => router.push('/demo')}
              className="mt-4 text-[10px] font-display font-black uppercase tracking-widest text-tertiary hover:text-primary"
            >
              {t("landing.tryDemo")}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
