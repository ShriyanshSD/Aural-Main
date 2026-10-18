import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X, UserRound, ShieldCheck, MailCheck } from 'lucide-react'
import { AuthUser } from '../types'
import { isValidAccountEmail, normalizeValidPhoneNumber } from '../utils/accountValidation'

export type AuthMode = 'login' | 'signup'

interface AuthModalProps {
  isOpen: boolean
  mode: AuthMode
  isDarkMode: boolean
  onClose: () => void
  onModeChange: (mode: AuthMode) => void
  onAuthenticated: (user: AuthUser) => void
  onSignupPending: () => void
  notice?: string
}

const fieldClass = (isDarkMode: boolean) =>
  `w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#B36D6D] focus:ring-2 focus:ring-[#B36D6D]/15 ${
    isDarkMode
      ? 'border-[#493936] bg-[#241D1B] text-[#F3EBE6] placeholder:text-[#8F7C76]'
      : 'border-[#E7D5CE] bg-white text-[#2C2422] placeholder:text-[#A18E88]'
  }`

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  mode,
  isDarkMode,
  onClose,
  onModeChange,
  onAuthenticated,
  onSignupPending,
  notice
}) => {
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [gender, setGender] = useState('')
  const [error, setError] = useState('')
  const [confirmationMessage, setConfirmationMessage] = useState('')
  const [confirmationEmailSent, setConfirmationEmailSent] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendWaitSeconds, setResendWaitSeconds] = useState(0)
  const [verificationPending, setVerificationPending] = useState(false)
  const [emailTouched, setEmailTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const submissionInProgress = useRef(false)

  const isSignup = mode === 'signup'
  const emailIsValid = isValidAccountEmail(email)
  const normalizedPhone = normalizeValidPhoneNumber(phone)

  useEffect(() => {
    if (resendWaitSeconds <= 0) return
    const timer = window.setTimeout(() => {
      setResendWaitSeconds(seconds => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearTimeout(timer)
  }, [resendWaitSeconds])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (submissionInProgress.current) return
    setError('')

    if (isSignup && !isValidAccountEmail(email)) {
      setError('Enter a valid email address that can receive messages. Temporary email addresses are not accepted.')
      return
    }
    if (isSignup && !normalizedPhone) {
      setError('Enter a valid phone number. Indian numbers can be entered with or without +91.')
      return
    }
    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    submissionInProgress.current = true
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isSignup
            ? { name, username, email, password, phone: normalizedPhone, address, gender }
            : { email, password }
        )
      })
      const responseText = await response.text()
      let data: {
        error?: string
        user?: AuthUser
        verificationRequired?: boolean
        emailSent?: boolean
        message?: string
      }
      try {
        data = JSON.parse(responseText) as typeof data
      } catch {
        throw new Error(`Account service returned an invalid response (HTTP ${response.status}). Please try again or contact support.`)
      }

      if (!response.ok) {
        setError(data.error || `Unable to authenticate (HTTP ${response.status}). Please try again.`)
        return
      }
      if (isSignup && data.verificationRequired) {
        onSignupPending()
        setVerificationPending(true)
        setConfirmationEmailSent(data.emailSent === true)
        setConfirmationMessage(data.message || (data.emailSent
          ? 'A confirmation email has been sent.'
          : 'Supabase accepted the signup, but could not send the confirmation email. Check the email service settings, then try resending.'))
        setResendWaitSeconds(data.emailSent ? 60 : 0)
        return
      }
      if (!data.user) {
        throw new Error('Authentication response did not include a user profile.')
      }

      onAuthenticated(data.user)
    } catch (requestError) {
      console.error('Account authentication failed:', requestError)
      setError(requestError instanceof Error
        ? requestError.message
        : 'Unable to reach the account service. Please try again.')
    } finally {
      submissionInProgress.current = false
      setIsSubmitting(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (isResending || resendWaitSeconds > 0) return
    setError('')
    setIsResending(true)
    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await response.json() as { error?: string }
      if (!response.ok) {
        setError(data.error || 'Unable to send a new confirmation email. Please try again.')
        return
      }
      setError('A new confirmation email has been sent.')
      setConfirmationEmailSent(true)
      setConfirmationMessage('A new confirmation email has been sent.')
      setResendWaitSeconds(60)
    } catch (requestError) {
      console.error('Confirmation email resend failed:', requestError)
      setError('Unable to reach the verification service. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-dialog-title"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            className={`my-auto w-full max-w-xl overflow-hidden rounded-3xl border shadow-2xl ${
              isDarkMode
                ? 'border-[#493936] bg-[#1C1817] text-[#F3EBE6]'
                : 'border-[#E8D4CB] bg-[#FAF6F2] text-[#2C2422]'
            }`}
          >
            <header className="flex items-center justify-between border-b border-black/5 p-6 dark:border-white/5">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-[#B36D6D]/15 p-2.5 text-[#B36D6D]">
                  {verificationPending ? <MailCheck className="h-5 w-5" /> : isSignup ? <UserRound className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
                </span>
                <div>
                  <h2 id="account-dialog-title" className="font-serif-title text-xl">
                    {verificationPending ? 'Waiting for email verification' : isSignup ? 'Create your AUREL account' : 'Welcome back'}
                  </h2>
                  <p className="mt-1 text-xs text-[#8E7973] dark:text-[#A79690]">
                    {verificationPending ? `Open the confirmation link sent to ${email} to finish creating your account.` : isSignup ? 'A few details to make every order personal.' : 'Sign in to continue to your account and checkout.'}
                  </p>
                </div>
              </div>
              <button onClick={onClose} aria-label="Close account form" className="rounded-full p-2 hover:bg-black/5 dark:hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </header>

            {verificationPending ? (
              <div className="space-y-5 p-6">
                <p role="status" className={`rounded-xl px-4 py-3 text-sm ${
                  confirmationEmailSent
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                }`}>
                  <strong>{confirmationEmailSent
                    ? 'Waiting for email verification. Check your inbox.'
                    : 'Signup is saved, but the confirmation email could not be sent.'}</strong>
                </p>
                <p className="text-xs text-[#8E7973] dark:text-[#A79690]">
                  Confirmation email address: <strong>{email}</strong>. Open the email and click its confirmation link to complete signup. Your account is not verified yet. After verification, AUREL will return you to the page you were using.
                </p>
                {confirmationMessage && <p role="status" className={`rounded-xl px-4 py-3 text-sm ${
                  confirmationEmailSent
                    ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
                }`}>{confirmationMessage}</p>}
                {error && <p role="alert" className={`rounded-xl px-4 py-3 text-sm ${error.startsWith('A new') ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-red-500/10 text-red-600 dark:text-red-300'}`}>{error}</p>}
                <button type="button" disabled={isResending || resendWaitSeconds > 0} className="w-full rounded-full bg-[#B36D6D] py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#9E5B5B] disabled:cursor-wait disabled:opacity-60" onClick={() => { void handleResendConfirmation() }}>
                  {isResending ? 'Sending…' : resendWaitSeconds > 0 ? `Resend confirmation email in ${resendWaitSeconds}s` : 'Resend confirmation email'}
                </button>
                <button type="button" className="w-full rounded-full border border-[#B36D6D]/40 py-3 text-xs font-semibold text-[#B36D6D] transition hover:bg-[#B36D6D]/10" onClick={() => {
                  setVerificationPending(false)
                  setConfirmationEmailSent(null)
                  setConfirmationMessage('')
                  setError('')
                  setResendWaitSeconds(0)
                  setEmailTouched(false)
                }}>
                  Change email
                </button>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="max-h-[75vh] space-y-4 overflow-y-auto p-6">
              {notice && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{notice}</p>}
              {isSignup && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-medium">
                      Full name
                      <input className={fieldClass(isDarkMode)} value={name} onChange={event => setName(event.target.value)} autoComplete="name" minLength={2} maxLength={80} required />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      Username
                      <input className={fieldClass(isDarkMode)} value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" title="Use 3 to 24 letters, numbers, or underscores." required />
                    </label>
                  </div>
                </>
              )}

              <label className="block space-y-1.5 text-xs font-medium">
                Email address
                <input
                  className={fieldClass(isDarkMode)}
                  type="email"
                  value={email}
                  onChange={event => setEmail(event.target.value)}
                  onBlur={() => setEmailTouched(true)}
                  autoComplete="email"
                  maxLength={254}
                  aria-invalid={isSignup && emailTouched && !emailIsValid}
                  required
                />
                {isSignup && emailTouched && !emailIsValid
                  ? <span className="block text-[11px] font-normal text-red-600 dark:text-red-300">Enter a valid email address. Temporary email services are not accepted.</span>
                  : isSignup && <span className="block text-[11px] font-normal text-[#8E7973] dark:text-[#A79690]">We’ll send a confirmation link to this inbox. Temporary email services aren’t accepted.</span>}
              </label>

              <div className={isSignup ? 'grid gap-4 sm:grid-cols-2' : ''}>
                <label className="block space-y-1.5 text-xs font-medium">
                  Password
                  <input className={fieldClass(isDarkMode)} type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={isSignup ? 'new-password' : 'current-password'} minLength={8} maxLength={128} required />
                </label>
                {isSignup && (
                  <label className="mt-4 block space-y-1.5 text-xs font-medium sm:mt-0">
                    Confirm password
                    <input className={fieldClass(isDarkMode)} type="password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required />
                  </label>
                )}
              </div>

              {isSignup && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-medium">
                      Phone number
                      <input
                        className={fieldClass(isDarkMode)}
                        type="tel"
                        value={phone}
                        onChange={event => setPhone(event.target.value)}
                        onBlur={() => setPhoneTouched(true)}
                        autoComplete="tel"
                        inputMode="tel"
                        maxLength={24}
                        placeholder="+91 98765 43210"
                        title="Enter a real phone number. Indian numbers can be entered with or without +91."
                        aria-invalid={phoneTouched && !normalizedPhone}
                        required
                      />
                      {phoneTouched && !normalizedPhone
                        ? <span className="block text-[11px] font-normal text-red-600 dark:text-red-300">Enter a valid phone number. Include the country code for non-Indian numbers.</span>
                        : <span className="block text-[11px] font-normal text-[#8E7973] dark:text-[#A79690]">Enter a valid Indian number or include the country code.</span>}
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      Gender
                      <select className={fieldClass(isDarkMode)} value={gender} onChange={event => setGender(event.target.value)} required>
                        <option value="">Select an option</option>
                        <option value="Woman">Woman</option>
                        <option value="Man">Man</option>
                        <option value="Non-binary">Non-binary</option>
                        <option value="Another identity">Another identity</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                    </label>
                  </div>
                  <label className="block space-y-1.5 text-xs font-medium">
                    Address
                    <textarea className={`${fieldClass(isDarkMode)} min-h-20 resize-y`} value={address} onChange={event => setAddress(event.target.value)} autoComplete="street-address" minLength={5} maxLength={240} required />
                  </label>
                  <p className="text-[11px] text-[#8E7973] dark:text-[#A79690]">
                    Passwords must be at least 8 characters and include a letter and a number.
                  </p>
                </>
              )}

              {error && <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">{error}</p>}

              <button type="submit" disabled={isSubmitting} className="w-full rounded-full bg-[#B36D6D] py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#9E5B5B] disabled:cursor-wait disabled:opacity-60">
                {isSubmitting ? 'Please wait…' : isSignup ? 'Continue to email verification' : 'Sign in'}
              </button>

              <p className="text-center text-sm text-[#786660] dark:text-[#B6A6A0]">
                {isSignup ? 'Already have an account?' : 'New to AUREL?'}{' '}
                <button type="button" className="font-semibold text-[#B36D6D] hover:underline" onClick={() => { setError(''); onModeChange(isSignup ? 'login' : 'signup') }}>
                  {isSignup ? 'Sign in' : 'Create an account'}
                </button>
              </p>
            </form>
            )}
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  )
}
