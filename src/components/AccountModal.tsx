import React, { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowLeft, CalendarDays, Check, CircleHelp, Heart, LoaderCircle, Lock,
  LogOut, Mail, MapPin, Package, Pencil, Settings, ShieldCheck, Trash2, UserRound, X
} from 'lucide-react'
import type { AccountOrder, AuthUser } from '../types'
import { normalizeValidPhoneNumber } from '../utils/accountValidation'
import PasswordInput from './PasswordInput'

type AccountSection = 'profile' | 'settings' | 'orders'

interface AccountModalProps {
  isOpen: boolean
  initialSection: 'profile' | 'settings'
  user: AuthUser
  isDarkMode: boolean
  onClose: () => void
  onProfileUpdated: (user: AuthUser) => void
  onOpenWishlist: () => void
  onOpenHelp: () => void
  onLogout: () => void
  onAccountDeleted: () => void
}

const genders = ['Woman', 'Man', 'Non-binary', 'Another identity', 'Prefer not to say']

interface IndiaStateOption {
  name: string
  code: string
}

const readApiResponse = async <T,>(response: Response, action: string): Promise<T> => {
  const responseText = await response.text()
  if (!responseText.trim()) {
    throw new Error(`${action} returned an empty response (HTTP ${response.status}). Please try again. If the problem continues, contact support.`)
  }
  try {
    return JSON.parse(responseText) as T
  } catch {
    throw new Error(`${action} returned an invalid response (HTTP ${response.status}). Please try again.`)
  }
}

const uniqueOrderProducts = (items: AccountOrder['order']['items']) =>
  Array.from(new Map(items.map(item => [item.productId, item])).values())

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  initialSection,
  user,
  isDarkMode,
  onClose,
  onProfileUpdated,
  onOpenWishlist,
  onOpenHelp,
  onLogout,
  onAccountDeleted
}) => {
  const [section, setSection] = useState<AccountSection>(initialSection)
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user.name)
  const [username, setUsername] = useState(user.username)
  const [phone, setPhone] = useState(user.phone)
  const [address, setAddress] = useState(user.address)
  const [gender, setGender] = useState(user.gender)
  const [dateOfBirth, setDateOfBirth] = useState(user.dateOfBirth ?? '')
  const [city, setCity] = useState(user.city ?? '')
  const [state, setState] = useState(user.state ?? '')
  const [stateOptions, setStateOptions] = useState<IndiaStateOption[]>([])
  const [cityOptions, setCityOptions] = useState<string[]>([])
  const [isLoadingStates, setIsLoadingStates] = useState(false)
  const [isLoadingCities, setIsLoadingCities] = useState(false)
  const [postalCode, setPostalCode] = useState(user.postalCode ?? '')
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deletePhrase, setDeletePhrase] = useState('')
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingOrders, setIsLoadingOrders] = useState(false)
  const [approvingOrderId, setApprovingOrderId] = useState('')
  const [isEditingEmail, setIsEditingEmail] = useState(false)
  const [deleteStep, setDeleteStep] = useState(0)
  const [orders, setOrders] = useState<AccountOrder[]>([])
  const [reviewDrafts, setReviewDrafts] = useState<Record<string, { rating: number; title: string; body: string }>>({})
  const [submittingReviewKey, setSubmittingReviewKey] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const selectedState = useMemo(
    () => stateOptions.find(option => option.name.toLowerCase() === state.toLowerCase()),
    [stateOptions, state]
  )

  useEffect(() => {
    if (!isEditing) return
    let isCurrent = true
    setIsLoadingStates(true)
    fetch('/api/locations/states', { cache: 'no-store' })
      .then(async response => {
        const data = await readApiResponse<{ states?: IndiaStateOption[]; error?: string }>(response, 'Loading Indian states')
        if (!response.ok || !Array.isArray(data.states)) throw new Error(data.error || 'Unable to load Indian states.')
        if (isCurrent) setStateOptions(data.states)
      })
      .catch(locationError => {
        console.error('Unable to load Indian states:', locationError)
        if (isCurrent) setError(locationError instanceof Error ? locationError.message : 'Unable to load Indian states.')
      })
      .finally(() => {
        if (isCurrent) setIsLoadingStates(false)
      })
    return () => { isCurrent = false }
  }, [isEditing])

  useEffect(() => {
    if (!isEditing || !selectedState) {
      setCityOptions([])
      return
    }
    let isCurrent = true
    setCityOptions([])
    setIsLoadingCities(true)
    fetch(`/api/locations/cities?stateCode=${encodeURIComponent(selectedState.code)}`, { cache: 'no-store' })
      .then(async response => {
        const data = await readApiResponse<{ cities?: string[]; error?: string }>(response, 'Loading cities')
        if (!response.ok || !Array.isArray(data.cities)) throw new Error(data.error || 'Unable to load cities.')
        if (isCurrent) setCityOptions(data.cities)
      })
      .catch(locationError => {
        console.error('Unable to load cities:', locationError)
        if (isCurrent) setError(locationError instanceof Error ? locationError.message : 'Unable to load cities.')
      })
      .finally(() => {
        if (isCurrent) setIsLoadingCities(false)
      })
    return () => { isCurrent = false }
  }, [isEditing, selectedState])

  useEffect(() => {
    if (!isOpen) return
    setSection(initialSection)
    setIsEditing(false)
    setIsEditingEmail(false)
    setDeleteStep(0)
    setError('')
    setNotice('')
  }, [isOpen, initialSection])

  useEffect(() => {
    setName(user.name)
    setUsername(user.username)
    setPhone(user.phone)
    setAddress(user.address)
    setGender(user.gender)
    setDateOfBirth(user.dateOfBirth ?? '')
    setCity(user.city ?? '')
    setState(user.state ?? '')
    setPostalCode(user.postalCode ?? '')
  }, [user.id, user.name, user.username, user.phone, user.address, user.gender, user.dateOfBirth, user.city, user.state, user.postalCode])

  useEffect(() => {
    if (!isOpen || section !== 'orders') return
    let isCurrent = true
    setIsLoadingOrders(true)
    setError('')
    fetch('/api/auth/orders', { credentials: 'same-origin', cache: 'no-store' })
      .then(async response => {
        const data = await readApiResponse<{ orders?: AccountOrder[]; error?: string }>(response, 'Loading your orders')
        if (!response.ok || !Array.isArray(data.orders)) throw new Error(data.error || 'Unable to load your orders.')
        if (isCurrent) setOrders(data.orders)
      })
      .catch(loadError => {
        console.error('Unable to load account orders:', loadError)
        if (isCurrent) setError(loadError instanceof Error ? loadError.message : 'Unable to load your orders.')
      })
      .finally(() => {
        if (isCurrent) setIsLoadingOrders(false)
      })
    return () => { isCurrent = false }
  }, [isOpen, section])

  const surface = isDarkMode ? 'border-[#493936] bg-[#1C1817] text-[#F3EBE6]' : 'border-[#E8D4CB] bg-[#FAF6F2] text-[#2C2422]'
  const inset = isDarkMode ? 'border-[#493936] bg-[#211B19]' : 'border-[#E8D4CB] bg-[#FFFCF9]'
  const inputClass = `w-full rounded-xl border px-4 py-3 text-sm outline-none transition focus:border-[#B36D6D] focus:ring-2 focus:ring-[#B36D6D]/15 ${
    isDarkMode ? 'border-[#493936] bg-[#241D1B] text-[#F3EBE6] placeholder:text-[#8F7C76]' : 'border-[#E7D5CE] bg-white text-[#2C2422] placeholder:text-[#A18E88]'
  }`

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
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
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, phone: normalizedPhone, address, gender, dateOfBirth, city, state, postalCode })
      })
      const data = await readApiResponse<{ user?: AuthUser; error?: string }>(response, 'Saving your profile')
      if (!response.ok || !data.user) throw new Error(data.error || 'Unable to save your profile.')
      onProfileUpdated(data.user)
      setNotice('Your personal information has been saved.')
      setIsEditing(false)
    } catch (saveError) {
      console.error('Unable to save profile:', saveError)
      setError(saveError instanceof Error ? saveError.message : 'Unable to save your profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const requestEmailChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isChangingEmail) return
    setError('')
    setNotice('')
    setIsChangingEmail(true)
    try {
      const response = await fetch('/api/auth/change-email', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: emailPassword })
      })
      const data = await readApiResponse<{ message?: string; user?: AuthUser; error?: string }>(response, 'Requesting an email change')
      if (!response.ok || !data.message || !data.user) throw new Error(data.error || 'Unable to request an email change.')
      onProfileUpdated(data.user)
      setEmailPassword('')
      setNewEmail(data.user.pendingEmail || '')
      setIsEditingEmail(false)
      setNotice(data.message)
    } catch (changeError) {
      console.error('Unable to request email change:', changeError)
      setError(changeError instanceof Error ? changeError.message : 'Unable to request an email change.')
    } finally {
      setIsChangingEmail(false)
    }
  }

  const changePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isChangingPassword) return
    if (newPassword !== confirmPassword) {
      setError('The new password and confirmation do not match.')
      return
    }
    setError('')
    setNotice('')
    setIsChangingPassword(true)
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await readApiResponse<{ message?: string; error?: string }>(response, 'Changing your password')
      if (!response.ok || !data.message) throw new Error(data.error || 'Unable to change your password.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setNotice(data.message)
    } catch (changeError) {
      console.error('Unable to change password:', changeError)
      setError(changeError instanceof Error ? changeError.message : 'Unable to change your password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  const deleteAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (isDeleting) return
    if (deletePhrase !== 'DELETE') {
      setError('Type DELETE exactly to confirm account deletion.')
      return
    }
    setError('')
    setNotice('')
    setIsDeleting(true)
    try {
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: deletePassword })
      })
      const data = await readApiResponse<{ success?: boolean; error?: string }>(response, 'Deleting your account')
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to delete your account.')
      onAccountDeleted()
    } catch (deleteError) {
      console.error('Unable to delete account:', deleteError)
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete your account.')
    } finally {
      setIsDeleting(false)
    }
  }

  const approveProof = async (orderId: string) => {
    if (approvingOrderId) return
    setError('')
    setNotice('')
    setApprovingOrderId(orderId)
    try {
      const response = await fetch('/api/auth/orders', {
        method: 'PATCH',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      const data = await readApiResponse<{ success?: boolean; error?: string }>(response, 'Approving the proof')
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to approve this proof.')
      setOrders(current => current.map(item => item.order.orderId === orderId
        ? { ...item, productionStatus: 'approved_for_production', proofApproved: true }
        : item))
      setNotice('Proof approved. Your order can now move into production.')
    } catch (approvalError) {
      setError(approvalError instanceof Error ? approvalError.message : 'Unable to approve this proof.')
    } finally {
      setApprovingOrderId('')
    }
  }

  const submitReview = async (orderId: string, productId: string) => {
    const key = `${orderId}:${productId}`
    const draft = reviewDrafts[key] ?? { rating: 5, title: '', body: '' }
    if (draft.body.trim().length < 10) {
      setError('Reviews must contain at least 10 characters.')
      return
    }
    if (submittingReviewKey) return
    setError('')
    setNotice('')
    setSubmittingReviewKey(key)
    try {
      const response = await fetch('/api/auth/reviews', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, productId, rating: draft.rating, title: draft.title.trim(), body: draft.body.trim() })
      })
      const data = await readApiResponse<{ success?: boolean; error?: string }>(response, 'Submitting your review')
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to submit your review.')
      setOrders(current => current.map(accountOrder => accountOrder.order.orderId === orderId
        ? { ...accountOrder, reviewedProductIds: [...new Set([...(accountOrder.reviewedProductIds ?? []), productId])] }
        : accountOrder))
      setNotice('Review submitted. It will appear publicly after owner approval.')
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Unable to submit your review.')
    } finally {
      setSubmittingReviewKey('')
    }
  }

  const cancelProfileEdit = () => {
    setName(user.name)
    setUsername(user.username)
    setPhone(user.phone)
    setAddress(user.address)
    setGender(user.gender)
    setDateOfBirth(user.dateOfBirth ?? '')
    setCity(user.city ?? '')
    setState(user.state ?? '')
    setPostalCode(user.postalCode ?? '')
    setError('')
    setNotice('')
    setIsEditing(false)
  }

  const value = (field: string | null | undefined) => field?.trim() || 'Not added'
  const title = section === 'settings' ? 'Settings' : section === 'orders' ? 'Your orders' : 'My Profile'

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center overflow-y-auto bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="account-dialog-title"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className={`my-auto flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl ${surface}`}
          >
            <header className="flex items-center justify-between border-b border-black/5 px-5 py-4 dark:border-white/5 sm:px-7 sm:py-5">
              <div className="flex min-w-0 items-center gap-3">
                {section !== 'profile' && (
                  <button type="button" onClick={() => { setSection('profile'); setError(''); setNotice('') }} aria-label="Back to My Profile" className="rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                )}
                <span className="rounded-2xl bg-[#B36D6D]/15 p-3 text-[#B36D6D]">
                  {section === 'settings' ? <Settings className="h-5 w-5" /> : section === 'orders' ? <Package className="h-5 w-5" /> : <UserRound className="h-5 w-5" />}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#B36D6D]">Your account</p>
                  <h2 id="account-dialog-title" className="truncate font-serif-title text-xl sm:text-2xl">{title}</h2>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={onClose} aria-label="Close account menu" className="rounded-full p-2 transition-colors hover:bg-black/5 dark:hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </header>

            <div className="overflow-y-auto p-4 sm:p-7">
              {section === 'profile' && (
                <>
                  <div className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
                    <button type="button" onClick={() => { setSection('orders'); setError('') }} className={`flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center transition-colors hover:border-[#B36D6D] hover:bg-[#B36D6D]/10 sm:gap-3 sm:p-4 ${inset}`}>
                      <Package className="h-5 w-5 text-[#B36D6D] sm:h-6 sm:w-6" />
                      <span className="text-[11px] font-semibold leading-tight sm:text-sm">Your orders</span>
                    </button>
                    <button type="button" onClick={onOpenWishlist} className={`flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center transition-colors hover:border-[#B36D6D] hover:bg-[#B36D6D]/10 sm:gap-3 sm:p-4 ${inset}`}>
                      <Heart className="h-5 w-5 text-[#B36D6D] sm:h-6 sm:w-6" />
                      <span className="text-[11px] font-semibold leading-tight sm:text-sm">Your wishlist</span>
                    </button>
                    <button type="button" onClick={onOpenHelp} className={`flex aspect-square min-w-0 flex-col items-center justify-center gap-2 rounded-2xl border p-2 text-center transition-colors hover:border-[#B36D6D] hover:bg-[#B36D6D]/10 sm:gap-3 sm:p-4 ${inset}`}>
                      <CircleHelp className="h-5 w-5 text-[#B36D6D] sm:h-6 sm:w-6" />
                      <span className="text-[11px] font-semibold leading-tight sm:text-sm">Need help?</span>
                    </button>
                  </div>

                  <form onSubmit={saveProfile}>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-serif-title text-lg">Personal information</h3>
                        {!isEditing && <span className="text-[11px] text-[#8E7973] dark:text-[#A79690]">Your default delivery details</span>}
                      </div>
                      {!isEditing && (
                        <button type="button" onClick={() => { setNotice(''); setError(''); setIsEditing(true) }} className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-[#B36D6D] transition-colors hover:bg-[#B36D6D]/10">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                      )}
                    </div>
                    {isEditing ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-1.5 text-xs font-medium">Full name
                          <input className={inputClass} value={name} onChange={event => setName(event.target.value)} minLength={2} maxLength={80} autoComplete="name" required />
                        </label>
                        <label className="space-y-1.5 text-xs font-medium">Username
                          <input className={inputClass} value={username} onChange={event => setUsername(event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" autoComplete="username" required />
                        </label>
                        <label className="space-y-1.5 text-xs font-medium">Phone number
                          <input className={inputClass} type="tel" value={phone} onChange={event => setPhone(event.target.value)} autoComplete="tel" required />
                        </label>
                        <label className="space-y-1.5 text-xs font-medium">Date of birth
                          <input className={inputClass} type="date" value={dateOfBirth} onChange={event => setDateOfBirth(event.target.value)} max={new Date().toISOString().slice(0, 10)} />
                        </label>
                        <label className="space-y-1.5 text-xs font-medium">Gender
                          <select className={inputClass} value={gender} onChange={event => setGender(event.target.value)} required>
                            <option value="" disabled>Select an option</option>
                            {genders.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Full default address
                          <textarea className={`${inputClass} min-h-20 resize-y`} value={address} onChange={event => setAddress(event.target.value)} minLength={5} maxLength={240} autoComplete="street-address" required />
                        </label>
                        <label className="space-y-1.5 text-xs font-medium">State
                          <select
                            className={inputClass}
                            value={selectedState?.code ?? ''}
                            onChange={event => {
                              const nextState = stateOptions.find(option => option.code === event.target.value)
                              setState(nextState?.name ?? '')
                              setCity('')
                              setError('')
                            }}
                            autoComplete="address-level1"
                            required
                            disabled={isLoadingStates && stateOptions.length === 0}
                          >
                            <option value="" disabled>{isLoadingStates && stateOptions.length === 0 ? 'Loading states...' : 'Select a state or union territory'}</option>
                            {stateOptions.map(option => <option key={option.code} value={option.code}>{option.name}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1.5 text-xs font-medium">City
                          <select
                            className={inputClass}
                            value={city}
                            onChange={event => setCity(event.target.value)}
                            autoComplete="address-level2"
                            disabled={!selectedState || isLoadingCities}
                          >
                            <option value="">{!selectedState ? 'Select a state first' : isLoadingCities ? 'Loading cities...' : 'Select a city'}</option>
                            {city && !cityOptions.includes(city) && <option value={city}>{city}</option>}
                            {cityOptions.map(option => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                        <label className="space-y-1.5 text-xs font-medium sm:col-span-2">Pincode
                          <input className={inputClass} value={postalCode} onChange={event => setPostalCode(event.target.value)} maxLength={8} pattern="\d{5,8}" autoComplete="postal-code" />
                        </label>
                      </div>
                    ) : (
                      <>
                      <div className={`mb-4 flex items-center gap-3 rounded-2xl border p-4 sm:p-5 ${inset}`}>
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B36D6D] font-serif-title text-xl text-white shadow-sm">
                          {user.name.trim().charAt(0).toUpperCase()}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-serif-title text-lg">{user.name}</p>
                          <p className="mt-0.5 truncate text-xs text-[#8E7973] dark:text-[#A79690]">@{user.username}</p>
                        </div>
                        <span className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[10px] font-semibold ${
                          user.emailVerified
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        }`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {user.emailVerified ? 'Email verified' : 'Email unverified'}
                        </span>
                      </div>
                      <section className={`rounded-2xl border p-4 sm:p-5 ${inset}`}>
                        <div className="mb-3 flex items-center gap-2">
                          <UserRound className="h-4 w-4 text-[#B36D6D]" />
                          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E7973] dark:text-[#A79690]">Personal details</h4>
                        </div>
                        <dl className="grid gap-2.5 sm:grid-cols-2">
                          {[
                            ['Full name', user.name],
                            ['Username', `@${user.username}`],
                            ['Phone number', user.phone],
                            ['Date of birth', user.dateOfBirth && !Number.isNaN(Date.parse(`${user.dateOfBirth}T00:00:00`)) ? new Date(`${user.dateOfBirth}T00:00:00`).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Not added'],
                            ['Gender', user.gender]
                          ].map(([label, detail]) => (
                            <div key={label} className={`min-w-0 rounded-xl border px-3.5 py-3 ${isDarkMode ? 'border-[#3C302D] bg-[#1C1817]/60' : 'border-[#EFE3DD] bg-[#FAF6F2]'}`}>
                              <dt className="mb-1 text-[10px] font-medium uppercase tracking-wider text-[#9A8781]">{label}</dt>
                              <dd className="break-words text-sm font-medium">{detail}</dd>
                            </div>
                          ))}
                        </dl>
                      </section>
                      <section className={`mt-3 rounded-2xl border p-4 sm:p-5 ${inset}`}>
                        <div className="mb-3 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#B36D6D]" />
                          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8E7973] dark:text-[#A79690]">Default delivery address</h4>
                        </div>
                        <p className="break-words text-sm font-medium leading-relaxed">{user.address}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {[
                            ['State', user.state],
                            ['City', user.city],
                            ['Pincode', user.postalCode]
                          ].map(([label, detail]) => (
                            <span key={label} className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs ${isDarkMode ? 'border-[#3C302D] bg-[#1C1817]/60' : 'border-[#EFE3DD] bg-[#FAF6F2]'}`}>
                              <span className="text-[#9A8781]">{label}</span>
                              <span className="font-medium">{value(detail)}</span>
                            </span>
                          ))}
                        </div>
                      </section>
                      </>
                    )}
                    {isEditing && (
                      <div className="mt-4 flex flex-col-reverse justify-end gap-2 sm:flex-row">
                        <button type="button" onClick={cancelProfileEdit} disabled={isSaving} className={`rounded-full border px-5 py-3 text-xs font-semibold transition-colors ${isDarkMode ? 'border-[#493936] hover:bg-white/5' : 'border-[#E8D4CB] hover:bg-black/5'}`}>Cancel</button>
                        <button type="submit" disabled={isSaving} className="flex items-center justify-center gap-2 rounded-full bg-[#B36D6D] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#9E5B5B] disabled:opacity-60">
                          {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save personal information
                        </button>
                      </div>
                    )}
                  </form>
                  <div className="mt-5 flex flex-col gap-2 border-t border-black/5 pt-4 dark:border-white/10 sm:flex-row">
                    <button type="button" onClick={() => { setSection('settings'); setError(''); setNotice('') }} className={`flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold transition-colors hover:border-[#B36D6D] ${inset}`}>
                      <Settings className="h-4 w-4 text-[#B36D6D]" /> Settings
                    </button>
                    <button type="button" onClick={() => { onClose(); onLogout() }} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[#B36D6D]/30 px-4 py-3 text-xs font-semibold text-[#B36D6D] transition-colors hover:bg-[#B36D6D]/10">
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  </div>
                </>
              )}

              {section === 'orders' && (
                <div>
                  <div className="mb-4 flex items-center gap-2 text-sm text-[#8E7973] dark:text-[#A79690]">
                    <Package className="h-4 w-4 text-[#B36D6D]" /> Orders placed while signed in are saved here.
                  </div>
                  {isLoadingOrders ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-[#8E7973]"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading your orders</div>
                  ) : orders.length === 0 ? (
                    <div className={`rounded-2xl border px-5 py-10 text-center ${inset}`}>
                      <Package className="mx-auto mb-3 h-8 w-8 text-[#B36D6D]" />
                      <h3 className="font-serif-title text-lg">No orders yet</h3>
                      <p className="mt-1 text-xs text-[#8E7973] dark:text-[#A79690]">Your completed orders will appear here.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.map(({ order, createdAt, productionStatus, proofApproved, proofUrl, fulfillmentStatus, reviewedProductIds }) => (
                        <article key={`${order.orderId}-${createdAt}`} className={`rounded-2xl border p-4 sm:p-5 ${inset}`}>
                          <div className="flex flex-wrap items-start justify-between gap-2 border-b border-black/5 pb-3 dark:border-white/10">
                            <div><p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A8781]">Order</p><h3 className="font-semibold">{order.orderId}</h3></div>
                            <div className="text-right"><p className="text-sm font-semibold">₹{order.total.toLocaleString('en-IN')}</p><p className="text-[10px] text-[#8E7973] dark:text-[#A79690]">{new Date(createdAt).toLocaleDateString()}</p></div>
                          </div>
                          <ul className="mt-3 space-y-2 text-xs">
                            {order.items.map((item, index) => <li key={`${item.productId}-${index}`} className="flex justify-between gap-3"><span className="min-w-0 truncate">{item.name}{item.variantName ? ` — ${item.variantName}` : ''} × {item.quantity}</span><span className="shrink-0">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span></li>)}
                          </ul>
                          <p className="mt-3 flex items-start gap-1.5 text-[11px] text-[#8E7973] dark:text-[#A79690]"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />{[order.address, order.city, order.state, order.postalCode].filter(Boolean).join(', ')}</p>
                          {productionStatus === 'awaiting_customer_approval' && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 p-3">
                            <span className="text-xs">A proof is awaiting your review.</span>
                            {proofUrl && <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#9E5B5B] underline">Open proof</a>}
                            <button type="button" disabled={Boolean(approvingOrderId)} onClick={() => void approveProof(order.orderId)} className="rounded-lg bg-[#B36D6D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
                              {approvingOrderId === order.orderId ? 'Approving…' : 'Approve proof'}
                            </button>
                          </div>}
                          {proofApproved && <p className="mt-3 text-xs font-medium text-emerald-700">Proof approved for production</p>}
                          {fulfillmentStatus === 'delivered' && uniqueOrderProducts(order.items).some(item => !(reviewedProductIds ?? []).includes(item.productId)) && <section className="mt-4 space-y-3 border-t border-black/5 pt-4 dark:border-white/10">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-[#8E7973] dark:text-[#A79690]">Share a product review</h4>
                            {uniqueOrderProducts(order.items).filter(item => !(reviewedProductIds ?? []).includes(item.productId)).map(item => {
                              const key = `${order.orderId}:${item.productId}`
                              const draft = reviewDrafts[key] ?? { rating: 5, title: '', body: '' }
                              return <form key={key} onSubmit={event => { event.preventDefault(); void submitReview(order.orderId, item.productId) }} className={`space-y-2 rounded-xl border p-3 ${isDarkMode ? 'border-[#3C302D] bg-[#1C1817]/60' : 'border-[#EFE3DD] bg-[#FAF6F2]'}`}>
                                <p className="text-xs font-semibold">{item.name}</p>
                                <div className="grid gap-2 sm:grid-cols-[120px_1fr]">
                                  <label className="text-[10px] font-medium">Rating<select value={draft.rating} onChange={event => setReviewDrafts(current => ({ ...current, [key]: { ...draft, rating: Number(event.target.value) } }))} className={inputClass}><option value={5}>5 stars</option><option value={4}>4 stars</option><option value={3}>3 stars</option><option value={2}>2 stars</option><option value={1}>1 star</option></select></label>
                                  <label className="text-[10px] font-medium">Title (optional)<input maxLength={120} value={draft.title} onChange={event => setReviewDrafts(current => ({ ...current, [key]: { ...draft, title: event.target.value } }))} className={inputClass} /></label>
                                </div>
                                <label className="block text-[10px] font-medium">Your review<textarea required minLength={10} maxLength={3000} rows={3} value={draft.body} onChange={event => setReviewDrafts(current => ({ ...current, [key]: { ...draft, body: event.target.value } }))} className={inputClass} /></label>
                                <button type="submit" disabled={Boolean(submittingReviewKey)} className="rounded-lg bg-[#B36D6D] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{submittingReviewKey === key ? 'Submitting…' : 'Submit for moderation'}</button>
                              </form>
                            })}
                          </section>}
                          {(reviewedProductIds ?? []).length > 0 && <p className="mt-3 text-xs text-[#8E7973] dark:text-[#A79690]">Submitted reviews appear publicly only after owner approval.</p>}
                        </article>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {section === 'settings' && (
                <div className="space-y-4 sm:space-y-5">
                  <section className={`overflow-hidden rounded-3xl border shadow-sm ${inset}`}>
                    <div className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${isDarkMode ? 'bg-white/[0.025]' : 'bg-[#F7ECE7]/70'}`}>
                      <span className="rounded-xl bg-[#B36D6D]/10 p-2.5 text-[#B36D6D]"><ShieldCheck className="h-5 w-5" /></span>
                      <div><h3 className="font-serif-title text-lg">Account and security</h3><p className="text-xs text-[#8E7973] dark:text-[#A79690]">Keep your sign-in details up to date</p></div>
                    </div>
                    <div className="p-4 sm:p-5">
                      <div className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 ${isDarkMode ? 'border-[#3C302D] bg-[#1C1817]/60' : 'border-[#EFE3DD] bg-[#FAF6F2]'}`}>
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="mt-0.5 rounded-lg bg-[#B36D6D]/10 p-2 text-[#B36D6D]"><Mail className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9A8781]">Email address</p>
                            <p className="mt-1 break-all text-sm font-medium">{user.email}</p>
                            <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${user.emailVerified ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>
                              <ShieldCheck className="h-3.5 w-3.5" /> {user.emailVerified ? 'Verified email' : 'Verification needed'}
                            </span>
                            {user.pendingEmail && (
                              <div className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-3 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">New email awaiting verification</p>
                                <p className="mt-1 break-all text-xs font-medium">{user.pendingEmail}</p>
                                <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                                  <ShieldCheck className="h-3 w-3" /> Unverified
                                </span>
                                <p className="mt-1 text-[10px] leading-relaxed text-[#8E7973] dark:text-[#A79690]">Your current email remains active until you confirm this address from its verification email.</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {!isEditingEmail && (
                          <button type="button" onClick={() => { setNewEmail(user.pendingEmail || user.email); setIsEditingEmail(true); setError(''); setNotice('') }} className="rounded-xl border border-[#B36D6D]/35 px-4 py-2.5 text-xs font-semibold text-[#B36D6D] transition-colors hover:bg-[#B36D6D]/10">{user.pendingEmail ? 'Resend or change' : 'Change email'}</button>
                        )}
                      </div>
                    {isEditingEmail && (
                      <form onSubmit={requestEmailChange} className={`mt-3 space-y-3 rounded-2xl border p-4 ${isDarkMode ? 'border-[#3C302D] bg-[#1C1817]/60' : 'border-[#EFE3DD] bg-[#FAF6F2]'}`}>
                        <p className="text-xs leading-relaxed text-[#8E7973] dark:text-[#A79690]">The new address will stay marked unverified until you open its confirmation link. Your current verified email remains active until then.</p>
                        <label className="block space-y-1.5 text-xs font-medium">New email address
                          <input className={inputClass} type="email" value={newEmail} onChange={event => setNewEmail(event.target.value)} autoComplete="email" maxLength={254} required />
                        </label>
                        <div className="block space-y-1.5 text-xs font-medium">
                          <label htmlFor="change-email-password">Current password</label>
                          <PasswordInput id="change-email-password" className={inputClass} value={emailPassword} onChange={event => setEmailPassword(event.target.value)} autoComplete="current-password" minLength={8} maxLength={128} required />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => { setIsEditingEmail(false); setEmailPassword('') }} className={`rounded-full border px-4 py-2 text-xs font-semibold ${inset}`}>Cancel</button>
                          <button type="submit" disabled={isChangingEmail || newEmail.trim().toLowerCase() === user.email.toLowerCase()} className="flex items-center gap-2 rounded-full bg-[#B36D6D] px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
                            {isChangingEmail && <LoaderCircle className="h-4 w-4 animate-spin" />} {user.pendingEmail ? 'Send or resend verification link' : 'Send verification link'}
                          </button>
                        </div>
                      </form>
                    )}
                    </div>
                  </section>

                  <section className={`overflow-hidden rounded-3xl border shadow-sm ${inset}`}>
                    <div className={`flex items-center gap-3 px-4 py-4 sm:px-5 ${isDarkMode ? 'bg-white/[0.025]' : 'bg-[#F7ECE7]/70'}`}>
                      <span className="rounded-xl bg-[#B36D6D]/10 p-2.5 text-[#B36D6D]"><Lock className="h-5 w-5" /></span>
                      <div><h3 className="font-serif-title text-lg">Password</h3><p className="text-xs text-[#8E7973] dark:text-[#A79690]">Change your account password securely</p></div>
                    </div>
                    <form onSubmit={changePassword} className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                      <div className="space-y-1.5 text-xs font-medium sm:col-span-2">
                        <label htmlFor="current-password">Current password</label>
                        <PasswordInput id="current-password" className={inputClass} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} autoComplete="current-password" maxLength={128} required />
                      </div>
                      <div className="space-y-1.5 text-xs font-medium">
                        <label htmlFor="new-password">New password</label>
                        <PasswordInput id="new-password" className={inputClass} value={newPassword} onChange={event => setNewPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required />
                      </div>
                      <div className="space-y-1.5 text-xs font-medium">
                        <label htmlFor="confirm-new-password">Confirm new password</label>
                        <PasswordInput id="confirm-new-password" className={inputClass} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required />
                      </div>
                      <button type="submit" disabled={isChangingPassword} className="flex items-center justify-center gap-2 rounded-full bg-[#B36D6D] px-5 py-3 text-xs font-semibold text-white transition-colors hover:bg-[#9E5B5B] disabled:opacity-60 sm:col-span-2 sm:justify-self-end">
                        {isChangingPassword ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Update password
                      </button>
                    </form>
                  </section>

                  <section className="overflow-hidden rounded-3xl border border-red-500/25 bg-red-500/[0.035] shadow-sm">
                    <div className="flex items-center gap-3 border-b border-red-500/15 px-4 py-4 sm:px-5">
                      <span className="rounded-xl bg-red-500/10 p-2.5 text-red-700 dark:text-red-300"><Trash2 className="h-5 w-5" /></span>
                      <div><h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Delete account</h3><p className="text-xs text-[#8E7973] dark:text-[#A79690]">Permanently remove your account and saved data</p></div>
                    </div>
                    <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      {deleteStep === 0 && <button type="button" onClick={() => { setDeleteStep(1); setError(''); setNotice('') }} className="shrink-0 rounded-full border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-700 hover:bg-red-500/10 dark:text-red-300">Delete account</button>}
                    </div>
                    {deleteStep === 1 && (
                      <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                        <p className="text-sm font-semibold text-red-700 dark:text-red-300">This cannot be undone.</p>
                        <p className="mt-1 text-xs text-[#8E7973] dark:text-[#A79690]">Your profile, saved orders, and account data will be permanently deleted.</p>
                        <button type="button" onClick={() => setDeleteStep(2)} className="mt-3 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">Continue to final confirmation</button>
                        <button type="button" onClick={() => setDeleteStep(0)} className="ml-2 rounded-full border px-4 py-2 text-xs font-semibold">Cancel</button>
                      </div>
                    )}
                    {deleteStep === 2 && (
                      <form onSubmit={deleteAccount} className="mt-4 space-y-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                        <p className="text-xs font-semibold text-red-700 dark:text-red-300">Final confirmation: type DELETE and enter your current password.</p>
                        <label className="block space-y-1.5 text-xs font-medium">Type DELETE to continue
                          <input className={inputClass} value={deletePhrase} onChange={event => setDeletePhrase(event.target.value)} autoComplete="off" required />
                        </label>
                        <div className="block space-y-1.5 text-xs font-medium">
                          <label htmlFor="delete-account-password">Current password</label>
                          <PasswordInput id="delete-account-password" className={inputClass} value={deletePassword} onChange={event => setDeletePassword(event.target.value)} autoComplete="current-password" maxLength={128} required />
                        </div>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => { setDeleteStep(0); setDeletePhrase(''); setDeletePassword('') }} disabled={isDeleting} className={`rounded-full border px-4 py-2 text-xs font-semibold ${inset}`}>Cancel</button>
                          <button type="submit" disabled={isDeleting} className="flex items-center gap-2 rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                            {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Confirm permanent deletion
                          </button>
                        </div>
                      </form>
                    )}
                    </div>
                  </section>
                  <button type="button" onClick={() => { onClose(); onLogout() }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#B36D6D]/30 px-4 py-3 text-xs font-semibold text-[#B36D6D] transition-colors hover:bg-[#B36D6D]/10">
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}

              {(error || notice) && (
                <p role="status" className={`mt-4 rounded-xl px-4 py-3 text-sm ${error ? 'bg-red-500/10 text-red-700 dark:text-red-300' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'}`}>
                  {error || notice}
                </p>
              )}
            </div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  )
}
