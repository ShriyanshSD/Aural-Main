import React, { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, LoaderCircle, Mail, Pencil, ShieldCheck, UserRound, X } from 'lucide-react'
import type { AuthUser } from '../types'
import { normalizeValidPhoneNumber } from '../utils/accountValidation'

interface ProfileModalProps {
  isOpen: boolean
  user: AuthUser
  isDarkMode: boolean
  onClose: () => void
  onProfileUpdated: (user: AuthUser) => void
}

const genders = ['Woman', 'Man', 'Non-binary', 'Another identity', 'Prefer not to say']

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  user,
  isDarkMode,
  onClose,
  onProfileUpdated
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [phone, setPhone] = useState(user.phone)
  const [address, setAddress] = useState(user.address)
  const [gender, setGender] = useState(user.gender)
  const [email, setEmail] = useState(user.email)
  const [currentPassword, setCurrentPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRequestingEmailChange, setIsRequestingEmailChange] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const emailInputRef = useRef<HTMLInputElement>(null)
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setName(user.name)
    setUsername(user.username)
    setPhone(user.phone)
    setAddress(user.address)
    setGender(user.gender)
  }, [user.id, user.name, user.username, user.phone, user.address, user.gender])

  useEffect(() => {
    setEmail(user.email)
  }, [user.email])

  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#B36D6D] focus:ring-2 focus:ring-[#B36D6D]/15 ${
    isDarkMode
      ? 'border-[#493936] bg-[#241D1B] text-[#F3EBE6] placeholder:text-[#8F7C76]'
      : 'border-[#E7D5CE] bg-white text-[#2C2422] placeholder:text-[#A18E88]'
  }`

  const handleSaveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isSaving) return
    setError('')
    setNotice('')
    const normalizedPhone = normalizeValidPhoneNumber(phone)
    if (!normalizedPhone) {
      setError('Enter a valid phone number, including its country code if it is not an Indian number.')
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, phone: normalizedPhone, address, gender })
      })
      const data = await response.json() as { user?: AuthUser; error?: string }
      if (!response.ok || !data.user) throw new Error(data.error || 'Unable to save your profile.')
      onProfileUpdated(data.user)
      setPhone(data.user.phone)
      setName(data.user.name)
      setUsername(data.user.username)
      setAddress(data.user.address)
      setGender(data.user.gender)
      setNotice('Your personal information has been saved.')
      setIsEditing(false)
    } catch (requestError) {
      console.error('Unable to save profile:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to save your profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRequestEmailChange = async () => {
    if (isRequestingEmailChange) return
    if (!emailInputRef.current?.reportValidity() || !passwordInputRef.current?.reportValidity()) return
    setError('')
    setNotice('')
    setIsRequestingEmailChange(true)
    try {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: currentPassword })
      })
      const data = await response.json() as { message?: string; error?: string }
      if (!response.ok || !data.message) throw new Error(data.error || 'Unable to request an email change.')
      setCurrentPassword('')
      setNotice(data.message)
    } catch (requestError) {
      console.error('Unable to request email change:', requestError)
      setError(requestError instanceof Error ? requestError.message : 'Unable to request an email change. Please try again.')
    } finally {
      setIsRequestingEmailChange(false)
    }
  }

  const cancelEditing = () => {
    setName(user.name)
    setUsername(user.username)
    setPhone(user.phone)
    setAddress(user.address)
    setGender(user.gender)
    setEmail(user.email)
    setError('')
    setNotice('')
    setIsEditing(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-dialog-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={`my-auto flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl ${
              isDarkMode
                ? 'border-[#493936] bg-[#1C1817] text-[#F3EBE6]'
                : 'border-[#E8D4CB] bg-[#FAF6F2] text-[#2C2422]'
            }`}
          >
            <header className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/5 sm:px-7 sm:py-5">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-[#B36D6D]/15 p-3 text-[#B36D6D]">
                  <UserRound className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B36D6D]">Your account</p>
                  <h2 id="profile-dialog-title" className="font-serif-title text-xl sm:text-2xl">My Profile</h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => { setNotice(''); setError(''); setIsEditing(true) }}
                    className="flex items-center gap-2 rounded-full border border-[#B36D6D]/40 px-3 py-2 text-xs font-semibold text-[#B36D6D] transition-colors hover:bg-[#B36D6D]/10 sm:px-4"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
                <button onClick={onClose} aria-label="Close profile" className="rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="overflow-y-auto p-5 sm:p-7">
              <div className={`mb-6 flex items-center gap-4 rounded-2xl border p-4 sm:p-5 ${
                isDarkMode ? 'border-[#493936] bg-[#241D1B]' : 'border-[#E8D4CB] bg-[#F7ECE7]'
              }`}>
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#B36D6D] font-serif-title text-xl text-white">
                  {user.name.trim().charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-serif-title text-lg">{user.name}</p>
                  <p className="truncate text-xs text-[#8E7973] dark:text-[#A79690]">@{user.username}</p>
                </div>
                <span className="ml-auto flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified account
                </span>
              </div>

              <form onSubmit={handleSaveProfile}>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-serif-title text-lg">Personal information</h3>
                  {!isEditing && <span className="text-[11px] text-[#8E7973] dark:text-[#A79690]">Your details for a personal experience</span>}
                </div>

                {isEditing ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-1.5 text-xs font-medium">
                      Full name
                      <input className={inputClass} value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      Username
                      <input className={inputClass} value={username} onChange={event => setUsername(event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="username" required />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      Phone
                      <input className={inputClass} type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" required />
                    </label>
                    <label className="space-y-1.5 text-xs font-medium">
                      Gender
                      <select className={inputClass} value={gender} onChange={event => setGender(event.target.value)} required>
                        <option value="" disabled>Select an option</option>
                        {genders.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1.5 text-xs font-medium sm:col-span-2">
                      Address
                      <textarea className={`${inputClass} min-h-24 resize-y`} value={address} onChange={event => setAddress(event.target.value)} minLength={5} maxLength={240} autoComplete="street-address" required />
                    </label>
                  </div>
                ) : (
                  <dl className={`grid gap-px overflow-hidden rounded-2xl border ${
                    isDarkMode ? 'border-[#493936] bg-[#493936]' : 'border-[#E8D4CB] bg-[#E8D4CB]'
                  } sm:grid-cols-2`}>
                    {[
                      ['Full name', user.name],
                      ['Username', `@${user.username}`],
                      ['Phone', user.phone],
                      ['Gender', user.gender],
                      ['Email address', user.email],
                      ['Address', user.address]
                    ].map(([label, value]) => (
                      <div key={label} className={`min-w-0 p-4 ${isDarkMode ? 'bg-[#211B19]' : 'bg-[#FFFCF9]'} ${label === 'Address' ? 'sm:col-span-2' : ''}`}>
                        <dt className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-[#9A8781]">{label}</dt>
                        <dd className={`break-words text-sm ${label === 'Address' ? 'whitespace-pre-wrap' : ''}`}>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}

                {isEditing && (
                  <div className={`mt-6 rounded-2xl border p-4 sm:p-5 ${
                    isDarkMode ? 'border-[#493936] bg-[#211B19]' : 'border-[#E8D4CB] bg-[#FFFCF9]'
                  }`}>
                    <div className="mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#B36D6D]" />
                      <h4 className="text-sm font-semibold">Email address</h4>
                    </div>
                    <p className="mb-3 text-xs leading-relaxed text-[#8E7973] dark:text-[#A79690]">
                      Confirm your current password. Your new email is not saved until you verify it from the confirmation email.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <input ref={emailInputRef} className={`${inputClass} min-w-0`} type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={254} aria-label="New email address" required={email.trim().toLowerCase() !== user.email.toLowerCase()} />
                      <input ref={passwordInputRef} className={`${inputClass} min-w-0`} type="password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" aria-label="Current password" placeholder="Current password" required={email.trim().toLowerCase() !== user.email.toLowerCase()} />
                      <button
                        type="button"
                        onClick={() => { void handleRequestEmailChange() }}
                        disabled={isRequestingEmailChange || email.trim().toLowerCase() === user.email.toLowerCase()}
                        className="flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#B36D6D] px-4 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#9E5B5B] disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 sm:justify-self-end"
                      >
                        {isRequestingEmailChange ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                        Verify new email
                      </button>
                    </div>
                  </div>
                )}

                {(error || notice) && (
                  <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                    error ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                  }`}>{error || notice}</p>
                )}

                {isEditing && (
                  <div className="mt-5 flex flex-col-reverse justify-end gap-2 sm:flex-row">
                    <button type="button" onClick={cancelEditing} disabled={isSaving} className={`rounded-full border px-5 py-3 text-xs font-semibold transition-colors ${
                      isDarkMode ? 'border-[#493936] hover:bg-white/5' : 'border-[#E8D4CB] hover:bg-black/5'
                    }`}>Cancel</button>
                    <button type="submit" disabled={isSaving} className="flex items-center justify-center gap-2 rounded-full bg-[#B36D6D] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#9E5B5B] disabled:opacity-60">
                      {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Save personal information
                    </button>
                  </div>
                )}
              </form>
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  )
}
