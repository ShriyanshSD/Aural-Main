import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { isValidAccountEmail, normalizeValidPhoneNumber } from './src/utils/accountValidation.js'

interface AuthRequest extends IncomingMessage {
  body?: unknown
}

interface StoredChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface AccountRecord {
  id: string
  name: string
  username: string
  email: string
  pending_email: string | null
  phone: string
  address: string
  gender: string
  date_of_birth: string | null
  city: string | null
  state: string | null
  postal_code: string | null
  email_verified: boolean
  created_at: string
  password_salt: string
  password_hash: string
}

interface PublicAccount {
  id: string
  name: string
  username: string
  email: string
  pendingEmail: string
  emailVerified: boolean
  phone: string
  address: string
  gender: string
  dateOfBirth: string
  city: string
  state: string
  postalCode: string
  createdAt: string
}

interface SupabaseErrorBody {
  code?: string | number
  error_code?: string
  message?: string
  msg?: string
  error?: string
}

class AccountServiceError extends Error {
  constructor(
    readonly status: number,
    readonly code?: string | number,
    readonly providerMessage?: string
  ) {
    super('Account database request failed.')
  }
}

class AccountConfigurationError extends Error {}

class AuthProviderError extends Error {
  constructor(readonly status: number, readonly code?: string | number, readonly providerMessage?: string) {
    super('Supabase Auth request failed.')
  }
}

const safeProviderMessage = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || !value.trim()) return undefined
  return value
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email]')
    .replace(/\b(?:sbp_|sb_secret_|eyJ)[A-Za-z0-9._-]{12,}\b/g, '[redacted]')
    .slice(0, 400)
}

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000
const allowedGenders = new Set(['Woman', 'Man', 'Non-binary', 'Another identity', 'Prefer not to say'])

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

const getSupabaseConfig = () => {
  const supabaseUrl = process.env.SUPABASE_URL
    ?.trim()
    .replace(/\/+$/, '')
    .replace(/\/rest\/v1$/i, '')
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new AccountConfigurationError('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.')
  }
  return { supabaseUrl, serviceRoleKey }
}

const getSupabaseAuthKey = () => {
  const { serviceRoleKey } = getSupabaseConfig()
  return process.env.SUPABASE_PUBLISHABLE_KEY?.trim()
    || process.env.SUPABASE_ANON_KEY?.trim()
    || serviceRoleKey
}

const getSupabaseAppUrl = () =>
  process.env.APP_URL?.trim().replace(/\/+$/, '')
  || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

const supabaseAuthRequest = async <T>(endpoint: string, body: unknown): Promise<T> => {
  const { supabaseUrl } = getSupabaseConfig()
  const url = new URL(`${supabaseUrl}/auth/v1/${endpoint}`)
  if (endpoint === 'signup') url.searchParams.set('redirect_to', getSupabaseAppUrl())
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      apikey: getSupabaseAuthKey(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  })
  const responseText = await response.text()
  let payload: (T & SupabaseErrorBody) | undefined
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as T & SupabaseErrorBody
    } catch {
      throw new AuthProviderError(response.status, undefined, safeProviderMessage(responseText))
    }
  }
  if (!response.ok) {
    const providerMessage = safeProviderMessage(payload?.message ?? payload?.msg ?? payload?.error)
    throw new AuthProviderError(
      response.status,
      payload?.error_code ?? payload?.code,
      providerMessage
    )
  }
  return payload as T
}

interface SupabaseAdminUser {
  id: string
  email?: string
  email_confirmed_at?: string | null
  user_metadata?: Record<string, unknown>
}

const findSupabaseAuthUserByEmail = async (email: string): Promise<SupabaseAdminUser | undefined> => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
  const url = new URL(`${supabaseUrl}/auth/v1/admin/users`)
  const perPage = 50
  url.searchParams.set('per_page', String(perPage))
  for (let page = 1; ; page += 1) {
    url.searchParams.set('page', String(page))
    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    })
    const responseText = await response.text()
    let payload: { users?: SupabaseAdminUser[] } | SupabaseErrorBody | undefined
    if (responseText) {
      try {
        payload = JSON.parse(responseText) as typeof payload
      } catch {
        throw new AuthProviderError(response.status, undefined, safeProviderMessage(responseText))
      }
    }
    if (!response.ok) {
      const errorBody = payload as SupabaseErrorBody | undefined
      throw new AuthProviderError(
        response.status,
        errorBody?.error_code ?? errorBody?.code,
        safeProviderMessage(errorBody?.message ?? errorBody?.msg ?? errorBody?.error)
      )
    }
    const users = (payload as { users?: SupabaseAdminUser[] } | undefined)?.users
    if (!Array.isArray(users)) throw new AuthProviderError(response.status)
    const matchingUser = users.find(user => user.email?.trim().toLowerCase() === email)
    if (matchingUser) return matchingUser
    if (users.length < perPage) return undefined
  }
}

const getSupabaseAuthUserById = async (userId: string): Promise<SupabaseAdminUser> => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  })
  const responseText = await response.text()
  let payload: SupabaseAdminUser | SupabaseErrorBody | undefined
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as typeof payload
    } catch {
      throw new AuthProviderError(response.status, undefined, safeProviderMessage(responseText))
    }
  }
  if (!response.ok) {
    const errorBody = payload as SupabaseErrorBody | undefined
    throw new AuthProviderError(
      response.status,
      errorBody?.error_code ?? errorBody?.code,
      safeProviderMessage(errorBody?.message ?? errorBody?.msg ?? errorBody?.error)
    )
  }
  if (!payload || !('id' in payload) || typeof payload.id !== 'string') {
    throw new AuthProviderError(response.status, undefined, 'Supabase returned an invalid user record.')
  }
  return payload as SupabaseAdminUser
}

const matchesPendingSignup = (
  user: SupabaseAdminUser,
  details: { name: string; username: string; phone: string; address: string; gender: string }
): boolean => {
  const metadata = user.user_metadata
  const normalized = (value: unknown) =>
    typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : ''
  return Boolean(
    !user.email_confirmed_at
    && metadata
    && normalized(metadata.name) === normalized(details.name)
    && normalized(metadata.username) === normalized(details.username)
    && normalizeValidPhoneNumber(String(metadata.phone ?? '')) === details.phone
    && normalized(metadata.address) === normalized(details.address)
    && normalized(metadata.gender) === normalized(details.gender)
  )
}

const supabaseRequest = async <T>(table: string, query: URLSearchParams, init: RequestInit = {}): Promise<T> => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
  const url = `${supabaseUrl}/rest/v1/${table}?${query.toString()}`
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      ...init.headers
    }
  })
  const responseText = await response.text()
  let payload: T | SupabaseErrorBody | undefined
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as T | SupabaseErrorBody
    } catch {
      throw new AccountServiceError(response.status, undefined, safeProviderMessage(responseText))
    }
  }
  if (!response.ok) {
    const errorBody = payload as SupabaseErrorBody | undefined
    throw new AccountServiceError(
      response.status,
      errorBody?.code,
      safeProviderMessage(errorBody?.message ?? errorBody?.msg ?? errorBody?.error)
    )
  }
  return payload as T
}

const derivePasswordHash = (password: string, salt: string): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    scrypt(password, salt, 64, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })

const publicAccount = (account: AccountRecord): PublicAccount => ({
  id: account.id,
  name: account.name,
  username: account.username,
  email: account.email,
  pendingEmail: account.pending_email ?? '',
  emailVerified: Boolean(account.email_verified),
  phone: account.phone,
  address: account.address,
  gender: account.gender,
  dateOfBirth: account.date_of_birth ?? '',
  city: account.city ?? '',
  state: account.state ?? '',
  postalCode: account.postal_code ?? '',
  createdAt: account.created_at
})

const reconcileEmailVerification = async (account: AccountRecord): Promise<AccountRecord> => {
  if (!account.pending_email && account.email_verified) return account
  const authUser = await getSupabaseAuthUserById(account.id)
  const authEmail = authUser.email?.trim().toLowerCase()
  if (
    account.pending_email
    && authUser.email_confirmed_at
    && authEmail === account.pending_email.trim().toLowerCase()
  ) {
    const updatedAccounts = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({
        id: `eq.${account.id}`,
        pending_email: `eq.${account.pending_email}`,
        select: '*'
      }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ email: account.pending_email, pending_email: null, email_verified: true })
      }
    )
    return updatedAccounts[0] ?? account
  }
  if (account.email_verified) return account
  if (
    !authUser.email_confirmed_at
    || authEmail !== account.email.trim().toLowerCase()
  ) {
    return account
  }
  return setAccountEmailVerified(account.id, true)
}

const getVerifiedAuthUser = async (accessToken: string) => {
  const { supabaseUrl } = getSupabaseConfig()
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: getSupabaseAuthKey(),
      Authorization: `Bearer ${accessToken}`
    }
  })
  const responseText = await response.text()
  let payload: { id?: string; email?: string; email_confirmed_at?: string | null } | SupabaseErrorBody | undefined
  if (responseText) {
    try {
      payload = JSON.parse(responseText) as typeof payload
    } catch {
      throw new AuthProviderError(response.status)
    }
  }
  if (!response.ok) {
    const errorBody = payload as SupabaseErrorBody | undefined
    throw new AuthProviderError(response.status, errorBody?.code)
  }
  return payload as { id?: string; email?: string; email_confirmed_at?: string | null }
}

const setSessionCookie = async (res: ServerResponse, userId: string) => {
  const token = randomBytes(32).toString('hex')
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString()
  await supabaseRequest('aurel_sessions', new URLSearchParams(), {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ token_hash: tokenHash, user_id: userId, expires_at: expiresAt })
  })
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : ''
  res.setHeader('Set-Cookie', `aurel_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_DURATION_MS / 1000}${secure}`)
}

const readSessionToken = (req: AuthRequest): string | undefined => {
  const cookie = req.headers.cookie?.split(';').map(part => part.trim()).find(part => part.startsWith('aurel_session='))
  const token = cookie?.slice('aurel_session='.length)
  return token && /^[a-f0-9]{64}$/.test(token) ? token : undefined
}

const getSessionAccount = async (req: AuthRequest): Promise<AccountRecord | undefined> => {
  const token = readSessionToken(req)
  if (!token) return undefined

  const tokenHash = createHash('sha256').update(token).digest('hex')
  const sessions = await supabaseRequest<Array<{ user_id: string; expires_at: string }>>(
    'aurel_sessions',
    new URLSearchParams({ token_hash: `eq.${tokenHash}`, select: 'user_id,expires_at', limit: '1' })
  )
  const session = sessions[0]
  if (!session) return undefined
  if (Date.parse(session.expires_at) <= Date.now()) {
    await supabaseRequest('aurel_sessions', new URLSearchParams({ token_hash: `eq.${tokenHash}` }), { method: 'DELETE' })
    return undefined
  }

  const accounts = await supabaseRequest<AccountRecord[]>(
    'aurel_users',
    new URLSearchParams({ id: `eq.${session.user_id}`, select: '*', limit: '1' })
  )
  return accounts[0]
}

const validEmail = (value: unknown): value is string =>
  typeof value === 'string' && isValidAccountEmail(value)

const validPassword = (value: unknown): value is string =>
  typeof value === 'string' && value.length >= 8 && value.length <= 128 && /[A-Za-z]/.test(value) && /\d/.test(value)

const createPendingAccount = async (
  userId: string,
  details: { name: string; username: string; email: string; phone: string; address: string; gender: string },
  password: string
): Promise<AccountRecord> => {
  const passwordSalt = randomBytes(16).toString('hex')
  const passwordHash = (await derivePasswordHash(password, passwordSalt)).toString('hex')
  const accounts = await supabaseRequest<AccountRecord[]>(
    'aurel_users',
    new URLSearchParams({ select: '*' }),
    {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        id: userId,
        ...details,
        password_salt: passwordSalt,
        password_hash: passwordHash,
        email_verified: false
      })
    }
  )
  if (!accounts[0]) throw new Error('Supabase did not return the pending account.')
  return accounts[0]
}

const setAccountEmailVerified = async (accountId: string, emailVerified: boolean): Promise<AccountRecord> => {
  const accounts = await supabaseRequest<AccountRecord[]>(
    'aurel_users',
    new URLSearchParams({ id: `eq.${accountId}`, select: '*' }),
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ email_verified: emailVerified })
    }
  )
  if (!accounts[0]) throw new Error('Supabase did not update the account verification state.')
  return accounts[0]
}

const sendSignupConfirmation = async (email: string): Promise<boolean> => {
  try {
    await supabaseAuthRequest('resend', { type: 'signup', email })
    return true
  } catch (error) {
    if (!(error instanceof AuthProviderError)) throw error
    console.error('Supabase confirmation email resend failed:', {
      status: error.status,
      code: error.code,
      message: error.providerMessage
    })
    return false
  }
}

const readBody = (req: AuthRequest): Record<string, unknown> =>
  req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : {}

const handleFailure = (res: ServerResponse, error: unknown, fallbackMessage: string) => {
  if (error instanceof AccountConfigurationError) {
    console.error(error.message)
    sendJson(res, 503, { error: 'Account storage is not configured. Add the Supabase server environment variables.' })
    return
  }
  if (error instanceof AccountServiceError && error.code === '23505') {
    sendJson(res, 409, { error: 'That email or username is already in use.' })
    return
  }
  if (
    error instanceof AccountServiceError
    && (error.code === 'PGRST204' || error.code === '42703')
  ) {
    console.error('Supabase account schema is out of date:', {
      status: error.status,
      code: error.code,
      message: error.providerMessage
    })
    sendJson(res, 503, {
      error: 'AUREL’s Supabase schema is missing a column required for this request. In Supabase SQL Editor, run the latest supabase/schema.sql, then run NOTIFY pgrst, \'reload schema\';.'
    })
    return
  }
  if (error instanceof AuthProviderError) {
    console.error('Supabase email verification request failed:', {
      status: error.status,
      code: error.code,
      message: error.providerMessage
    })
    if (error.status === 429) {
      sendJson(res, 429, { error: 'Too many email attempts. Wait a few minutes and try again.' })
      return
    }
    if (error.status === 400) {
      sendJson(res, 400, { error: 'The confirmation link is invalid or expired. Request a new confirmation email and try again.' })
      return
    }
    if (error.status === 422) {
      sendJson(res, 409, { error: 'This email may already have an account. Try signing in instead.' })
      return
    }
    if (error.status >= 500) {
      sendJson(res, 503, { error: 'Supabase could not send the confirmation email. Check its SMTP settings and Authentication logs, then try resending.' })
      return
    }
  }
  if (error instanceof AccountServiceError && error.status >= 400 && error.status < 500) {
    console.error('Supabase account request rejected:', {
      status: error.status,
      code: error.code,
      message: error.providerMessage
    })
  } else {
    console.error('Account request failed:', error)
  }
  sendJson(res, 500, { error: fallbackMessage })
}

export async function profileHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  try {
    let account = await getSessionAccount(req)
    if (!account) return sendJson(res, 401, { error: 'Sign in to manage your profile.' })

    if (req.method === 'GET') {
      account = await reconcileEmailVerification(account)
      return sendJson(res, 200, { user: publicAccount(account) })
    }
    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'GET, PATCH')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }

    const body = readBody(req)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
    const phone = typeof body.phone === 'string' ? normalizeValidPhoneNumber(body.phone) : null
    const address = typeof body.address === 'string' ? body.address.trim() : ''
    const gender = typeof body.gender === 'string' ? body.gender : ''
    const dateOfBirth = typeof body.dateOfBirth === 'string' ? body.dateOfBirth.trim() : ''
    const city = typeof body.city === 'string' ? body.city.trim() : ''
    const state = typeof body.state === 'string' ? body.state.trim() : ''
    const postalCode = typeof body.postalCode === 'string' ? body.postalCode.trim() : ''
    if (name.length < 2 || name.length > 80) return sendJson(res, 400, { error: 'Enter a name between 2 and 80 characters.' })
    if (!/^[a-z0-9_]{3,24}$/.test(username)) return sendJson(res, 400, { error: 'Username must be 3 to 24 letters, numbers, or underscores.' })
    if (!phone) return sendJson(res, 400, { error: 'Enter a valid phone number, including its country code if it is not an Indian number.' })
    if (address.length < 5 || address.length > 240) return sendJson(res, 400, { error: 'Address must be between 5 and 240 characters.' })
    if (!allowedGenders.has(gender)) return sendJson(res, 400, { error: 'Select a valid gender option.' })
    const parsedDateOfBirth = dateOfBirth ? new Date(`${dateOfBirth}T00:00:00.000Z`) : null
    if (dateOfBirth && (
      !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      || !parsedDateOfBirth
      || Number.isNaN(parsedDateOfBirth.getTime())
      || parsedDateOfBirth.toISOString().slice(0, 10) !== dateOfBirth
      || dateOfBirth > new Date().toISOString().slice(0, 10)
    )) {
      return sendJson(res, 400, { error: 'Enter a valid date of birth that is not in the future.' })
    }
    if (city.length > 100 || state.length > 100) return sendJson(res, 400, { error: 'City and state must be 100 characters or fewer.' })
    if (postalCode.length > 8 || (postalCode && !/^\d{5,8}$/.test(postalCode))) {
      return sendJson(res, 400, { error: 'Enter a valid postal or PIN code.' })
    }

    const updated = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${account.id}`, select: '*' }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          name,
          username,
          phone,
          address,
          gender,
          date_of_birth: dateOfBirth || null,
          city: city || null,
          state: state || null,
          postal_code: postalCode || null
        })
      }
    )
    if (!updated[0]) return sendJson(res, 404, { error: 'Your profile could not be found.' })
    return sendJson(res, 200, { user: publicAccount(updated[0]) })
  } catch (error) {
    if (error instanceof AccountServiceError && error.code === '23505') {
      return sendJson(res, 409, { error: 'That username is already in use. Choose another username.' })
    }
    handleFailure(res, error, 'Unable to update your profile right now.')
  }
}

export async function changePasswordHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  try {
    const account = await getSessionAccount(req)
    if (!account) return sendJson(res, 401, { error: 'Sign in to change your password.' })
    const body = readBody(req)
    const currentPassword = body.currentPassword
    const newPassword = body.newPassword
    if (typeof currentPassword !== 'string' || currentPassword.length === 0 || currentPassword.length > 128) {
      return sendJson(res, 400, { error: 'Enter your current password.' })
    }
    if (!validPassword(newPassword)) {
      return sendJson(res, 400, { error: 'Your new password must be 8 to 128 characters and include a letter and a number.' })
    }

    const currentHash = await derivePasswordHash(currentPassword, account.password_salt)
    const savedHash = Buffer.from(account.password_hash, 'hex')
    if (currentHash.length !== savedHash.length || !timingSafeEqual(currentHash, savedHash)) {
      return sendJson(res, 401, { error: 'Your current password is incorrect.' })
    }

    let authSession: { access_token?: string }
    try {
      authSession = await supabaseAuthRequest<{ access_token?: string }>('token?grant_type=password', {
        email: account.email,
        password: currentPassword
      })
    } catch (error) {
      if (error instanceof AuthProviderError && error.status >= 400 && error.status < 500) {
        return sendJson(res, 401, { error: 'Your current password could not be verified with Auth. Please sign in again.' })
      }
      throw error
    }
    if (!authSession.access_token) return sendJson(res, 502, { error: 'Could not verify your account with Auth. Please try again.' })

    const { supabaseUrl } = getSupabaseConfig()
    const updateResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: getSupabaseAuthKey(),
        Authorization: `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: newPassword })
    })
    if (!updateResponse.ok) {
      const responseText = await updateResponse.text()
      let providerMessage: string | undefined
      try {
        const providerError = JSON.parse(responseText) as SupabaseErrorBody
        providerMessage = safeProviderMessage(providerError.message ?? providerError.msg ?? providerError.error)
      } catch {
        providerMessage = safeProviderMessage(responseText)
      }
      console.error('Supabase rejected a password change:', { status: updateResponse.status, message: providerMessage })
      return sendJson(res, updateResponse.status === 429 ? 429 : 400, {
        error: providerMessage || 'Auth could not update your password. Please try again.'
      })
    }

    const passwordSalt = randomBytes(16).toString('hex')
    const passwordHash = (await derivePasswordHash(newPassword, passwordSalt)).toString('hex')
    try {
      const updated = await supabaseRequest<AccountRecord[]>(
        'aurel_users',
        new URLSearchParams({ id: `eq.${account.id}`, select: '*' }),
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ password_salt: passwordSalt, password_hash: passwordHash })
        }
      )
      if (!updated[0]) throw new AccountServiceError(404)
    } catch (error) {
      try {
        const rollback = await fetch(`${supabaseUrl}/auth/v1/user`, {
          method: 'PUT',
          headers: {
            apikey: getSupabaseAuthKey(),
            Authorization: `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ password: currentPassword })
        })
        if (!rollback.ok) {
          console.error('Unable to roll back the Auth password after profile storage failed.', { status: rollback.status })
        }
      } catch (rollbackError) {
        console.error('Unable to roll back the Auth password after profile storage failed.', rollbackError)
      }
      try {
        await supabaseRequest(
          'aurel_users',
          new URLSearchParams({ id: `eq.${account.id}` }),
          {
            method: 'PATCH',
            body: JSON.stringify({
              password_salt: account.password_salt,
              password_hash: account.password_hash
            })
          }
        )
      } catch (rollbackError) {
        console.error('Unable to roll back the stored password after a password change failed.', rollbackError)
      }
      throw error
    }

    return sendJson(res, 200, { success: true, message: 'Your password has been changed.' })
  } catch (error) {
    handleFailure(res, error, 'Unable to change your password right now.')
  }
}

export async function deleteAccountHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  try {
    const account = await getSessionAccount(req)
    if (!account) return sendJson(res, 401, { error: 'Sign in to delete your account.' })
    const body = readBody(req)
    const password = body.password
    if (typeof password !== 'string' || password.length === 0 || password.length > 128) {
      return sendJson(res, 400, { error: 'Enter your current password to confirm account deletion.' })
    }
    const submittedHash = await derivePasswordHash(password, account.password_salt)
    const savedHash = Buffer.from(account.password_hash, 'hex')
    if (submittedHash.length !== savedHash.length || !timingSafeEqual(submittedHash, savedHash)) {
      return sendJson(res, 401, { error: 'Your current password is incorrect.' })
    }

    try {
      await supabaseAuthRequest<{ access_token?: string }>('token?grant_type=password', {
        email: account.email,
        password
      })
    } catch (error) {
      if (error instanceof AuthProviderError && error.status >= 400 && error.status < 500) {
        return sendJson(res, 401, { error: 'Your current password could not be verified with Auth. Please sign in again.' })
      }
      throw error
    }

    const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(account.id)}`, {
      method: 'DELETE',
      headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
    })
    if (!response.ok) {
      const responseText = await response.text()
      let providerMessage: string | undefined
      try {
        const providerError = JSON.parse(responseText) as SupabaseErrorBody
        providerMessage = safeProviderMessage(providerError.message ?? providerError.msg ?? providerError.error)
      } catch {
        providerMessage = safeProviderMessage(responseText)
      }
      console.error('Supabase rejected an account deletion:', { status: response.status, message: providerMessage })
      return sendJson(res, response.status === 429 ? 429 : 502, {
        error: providerMessage || 'Auth could not delete your account. No profile data was removed.'
      })
    }

    const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : ''
    res.setHeader('Set-Cookie', `aurel_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
    return sendJson(res, 200, { success: true })
  } catch (error) {
    handleFailure(res, error, 'Unable to delete your account right now.')
  }
}

interface StoredAccountOrder {
  order_id: string
  order_data: Record<string, unknown>
  created_at: string
}

export async function accountOrdersHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  try {
    const account = await getSessionAccount(req)
    if (!account) return sendJson(res, 401, { error: 'Sign in to view your orders.' })

    if (req.method === 'GET') {
      const rows = await supabaseRequest<StoredAccountOrder[]>(
        'aurel_orders',
        new URLSearchParams({
          user_id: `eq.${account.id}`,
          select: 'order_id,order_data,created_at',
          order: 'created_at.desc',
          limit: '100'
        })
      )
      return sendJson(res, 200, {
        orders: rows.map(row => ({ order: row.order_data, createdAt: row.created_at }))
      })
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }

    const order = readBody(req).order
    if (!order || typeof order !== 'object' || Array.isArray(order)) {
      return sendJson(res, 400, { error: 'Provide a valid order.' })
    }
    const data = order as Record<string, unknown>
    const items = data.items
    if (
      typeof data.orderId !== 'string' || !/^AUREL[A-Z0-9]{5,16}$/.test(data.orderId)
      || typeof data.customerName !== 'string' || data.customerName.trim().length < 2 || data.customerName.length > 120
      || typeof data.phoneNumber !== 'string' || !normalizeValidPhoneNumber(data.phoneNumber)
      || typeof data.email !== 'string' || !isValidAccountEmail(data.email)
      || typeof data.address !== 'string' || data.address.trim().length < 5 || data.address.length > 240
      || typeof data.city !== 'string' || data.city.trim().length < 2 || data.city.length > 100
      || (data.state !== undefined && (typeof data.state !== 'string' || data.state.length > 100))
      || typeof data.postalCode !== 'string' || !/^\d{5,8}$/.test(data.postalCode)
      || typeof data.paymentMethod !== 'string' || data.paymentMethod.length > 100
      || typeof data.paymentTimestamp !== 'string' || !data.paymentTimestamp.trim() || data.paymentTimestamp.length > 120
      || !Array.isArray(items) || items.length < 1 || items.length > 100
      || !items.every(item => item && typeof item === 'object'
        && typeof item.productId === 'string' && item.productId.length <= 120
        && typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 160
        && typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0 && item.price <= 10000000
        && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99
        && typeof item.imageUrl === 'string' && item.imageUrl.length <= 2048)
      || typeof data.subtotal !== 'number' || !Number.isFinite(data.subtotal) || data.subtotal < 0
      || typeof data.shipping !== 'number' || !Number.isFinite(data.shipping) || data.shipping < 0
      || typeof data.total !== 'number' || !Number.isFinite(data.total) || data.total !== data.subtotal + data.shipping
      || data.status !== 'paid'
    ) {
      return sendJson(res, 400, { error: 'The order details are incomplete or invalid.' })
    }

    const stored = await supabaseRequest<StoredAccountOrder[]>(
      'aurel_orders',
      new URLSearchParams({ on_conflict: 'user_id,order_id', select: 'order_id,order_data,created_at' }),
      {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ user_id: account.id, order_id: data.orderId, order_data: data })
      }
    )
    if (!stored[0]) return sendJson(res, 500, { error: 'The order could not be saved to your account.' })
    return sendJson(res, 201, { order: stored[0].order_data, createdAt: stored[0].created_at })
  } catch (error) {
    handleFailure(res, error, 'Unable to load or save your orders right now.')
  }
}

export async function requestEmailChangeHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  try {
    const account = await getSessionAccount(req)
    if (!account) return sendJson(res, 401, { error: 'Sign in to change your email address.' })
    const body = readBody(req)
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = body.password
    if (!validEmail(email)) return sendJson(res, 400, { error: 'Enter a valid email address.' })
    if (email === account.email.toLowerCase()) return sendJson(res, 400, { error: 'Enter a different email address.' })
    if (typeof password !== 'string' || password.length === 0 || password.length > 128) {
      return sendJson(res, 400, { error: 'Enter your current password to verify this email change.' })
    }

    const submittedHash = await derivePasswordHash(password, account.password_salt)
    const savedHash = Buffer.from(account.password_hash, 'hex')
    if (submittedHash.length !== savedHash.length || !timingSafeEqual(submittedHash, savedHash)) {
      return sendJson(res, 401, { error: 'Your current password is incorrect.' })
    }

    const [emailConflicts, pendingEmailConflicts] = await Promise.all([
      supabaseRequest<Array<{ id: string }>>(
        'aurel_users',
        new URLSearchParams({ email: `eq.${email}`, id: `neq.${account.id}`, select: 'id', limit: '1' })
      ),
      supabaseRequest<Array<{ id: string }>>(
        'aurel_users',
        new URLSearchParams({ pending_email: `eq.${email}`, id: `neq.${account.id}`, select: 'id', limit: '1' })
      )
    ])
    if (emailConflicts.length || pendingEmailConflicts.length) {
      return sendJson(res, 409, { error: 'That email address is already connected to another account or awaiting verification.' })
    }

    let authSession: { access_token?: string }
    try {
      authSession = await supabaseAuthRequest<{ access_token?: string }>('token?grant_type=password', {
        email: account.email,
        password
      })
    } catch (error) {
      if (error instanceof AuthProviderError && error.status >= 400 && error.status < 500) {
        return sendJson(res, 401, { error: 'We could not verify your current sign-in. Please sign in again, then retry the email change.' })
      }
      throw error
    }
    if (!authSession.access_token) {
      return sendJson(res, 502, { error: 'Supabase did not start a secure email-change session. Please try again.' })
    }

    const pendingAccounts = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${account.id}`, select: '*' }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ pending_email: email })
      }
    )
    if (!pendingAccounts[0]) return sendJson(res, 404, { error: 'Your profile could not be found.' })

    const restorePendingEmail = () => supabaseRequest(
      'aurel_users',
      new URLSearchParams({ id: `eq.${account.id}` }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ pending_email: account.pending_email ?? null })
      }
    )

    const { supabaseUrl } = getSupabaseConfig()
    let response: Response
    try {
      response = await fetch(`${supabaseUrl}/auth/v1/user`, {
        method: 'PUT',
        headers: {
          apikey: getSupabaseAuthKey(),
        Authorization: `Bearer ${authSession.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })
    } catch (error) {
      await restorePendingEmail()
      throw error
    }
    if (!response.ok) {
      const responseText = await response.text()
      let providerMessage: string | undefined
      try {
        const providerError = JSON.parse(responseText) as SupabaseErrorBody
        providerMessage = safeProviderMessage(providerError.message ?? providerError.msg ?? providerError.error)
      } catch {
        providerMessage = safeProviderMessage(responseText)
      }
      console.error('Supabase rejected an email change request:', {
        status: response.status,
        message: providerMessage
      })
      await restorePendingEmail()
      return sendJson(res, response.status === 429 ? 429 : 400, {
        error: response.status === 429
          ? 'Too many email changes were requested. Wait a few minutes and try again.'
          : providerMessage || 'Supabase could not start email verification. Check the Auth email settings and try again.'
      })
    }
    return sendJson(res, 200, {
      user: publicAccount(pendingAccounts[0]),
      email,
      message: `A verification link was sent to ${email}. It will remain unverified and your current email will stay active until you confirm the new address.`
    })
  } catch (error) {
    handleFailure(res, error, 'Unable to request an email change right now.')
  }
}

export async function confirmEmailChangeHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  const body = readBody(req)
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken : ''
  const tokenHash = typeof body.tokenHash === 'string' ? body.tokenHash : ''
  if (
    (accessToken.length < 20 && !/^[A-Za-z0-9._~-]{20,1024}$/.test(tokenHash))
    || (accessToken && tokenHash)
  ) {
    return sendJson(res, 400, { error: 'Open the email change confirmation link to verify your new address.' })
  }

  try {
    const verifiedSession = tokenHash
      ? await supabaseAuthRequest<{ access_token?: string }>('verify', { token_hash: tokenHash, type: 'email_change' })
      : undefined
    const sessionAccessToken = accessToken || verifiedSession?.access_token || ''
    const verifiedUser = await getVerifiedAuthUser(sessionAccessToken)
    const email = verifiedUser.email?.trim().toLowerCase()
    if (!verifiedUser.id || !email || !verifiedUser.email_confirmed_at) {
      return sendJson(res, 400, { error: 'We could not verify the new email address. Open the latest confirmation link and try again.' })
    }

    const profiles = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${verifiedUser.id}`, select: '*', limit: '1' })
    )
    const profile = profiles[0]
    if (!profile) return sendJson(res, 404, { error: 'Your profile could not be found.' })
    if (!profile.pending_email || profile.pending_email.trim().toLowerCase() !== email) {
      return sendJson(res, 409, { error: 'This confirmation does not match the email currently awaiting verification. Request a new email change link and use the latest message.' })
    }

    const updated = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${verifiedUser.id}`, pending_email: `eq.${email}`, select: '*' }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ email, pending_email: null, email_verified: true })
      }
    )
    if (!updated[0]) return sendJson(res, 409, { error: 'Your pending email change has changed. Request a new confirmation link and use the latest message.' })
    return sendJson(res, 200, { user: publicAccount(updated[0]) })
  } catch (error) {
    if (error instanceof AccountServiceError && error.code === '23505') {
      return sendJson(res, 409, { error: 'That email address is already connected to another account.' })
    }
    handleFailure(res, error, 'Unable to confirm your email change right now.')
  }
}

export async function signupHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  const body = readBody(req)
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const phoneInput = typeof body.phone === 'string' ? body.phone.trim() : ''
  const phone = normalizeValidPhoneNumber(phoneInput)
  const address = typeof body.address === 'string' ? body.address.trim() : ''
  const gender = typeof body.gender === 'string' ? body.gender : ''
  const password = body.password

  if (name.length < 2 || name.length > 80) return sendJson(res, 400, { error: 'Enter a name between 2 and 80 characters.' })
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return sendJson(res, 400, { error: 'Username must be 3 to 24 letters, numbers, or underscores.' })
  if (!validEmail(email)) return sendJson(res, 400, { error: 'Enter a valid email address.' })
  if (!validPassword(password)) return sendJson(res, 400, { error: 'Password must be 8 to 128 characters and include a letter and a number.' })
  if (!phone) return sendJson(res, 400, { error: 'Enter a valid phone number, including its country code if it is not an Indian number.' })
  if (address.length < 5 || address.length > 240) return sendJson(res, 400, { error: 'Address must be between 5 and 240 characters.' })
  if (!allowedGenders.has(gender)) return sendJson(res, 400, { error: 'Select a valid gender option.' })

  const signupDetails = { name, username, email, phone, address, gender }
  const recoverPendingAuthUser = async (): Promise<'recovered' | 'not-found' | 'details-mismatch' | 'already-verified'> => {
    const authUser = await findSupabaseAuthUserByEmail(email)
    if (!authUser?.id) return 'not-found'
    if (authUser.email_confirmed_at) return 'already-verified'
    if (!matchesPendingSignup(authUser, signupDetails)) return 'details-mismatch'

    const existingProfiles = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${authUser.id}`, select: '*', limit: '1' })
    )
    const existingProfile = existingProfiles[0]
    if (existingProfile && (
      existingProfile.name !== name
      || existingProfile.username !== username
      || existingProfile.phone !== phone
      || existingProfile.address !== address
      || existingProfile.gender !== gender
    )) return 'details-mismatch'
    if (!existingProfile) {
      await createPendingAccount(authUser.id, signupDetails, password)
    } else if (existingProfile.email_verified) {
      await setAccountEmailVerified(existingProfile.id, false)
    }

    const emailSent = await sendSignupConfirmation(email)
    sendJson(res, 200, {
      verificationRequired: true,
      email,
      emailSent,
      message: emailSent
        ? 'A confirmation email has been sent. Check your inbox and spam folder.'
        : 'Your signup is saved and waiting for email confirmation, but Supabase could not send the email yet. Check the Supabase Auth email settings, then select Resend confirmation email.'
    })
    return 'recovered'
  }

  try {
    const existingProfiles = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ email: `eq.${email}`, select: '*', limit: '1' })
    )
    if (existingProfiles[0]) {
      const existingProfile = existingProfiles[0]
      const authUser = await findSupabaseAuthUserByEmail(email)
      if (!authUser) {
        return sendJson(res, 409, {
          error: 'Supabase has no Auth user for this email, so no confirmation email can be sent. A separate old AUREL profile still occupies the email. No account data was changed. In Supabase SQL Editor, remove only the orphaned profile for this email, then retry signup.'
        })
      } else {
        if (authUser.id !== existingProfile.id) {
          return sendJson(res, 409, { error: 'This email is associated with a different Supabase account. Please contact support before trying again.' })
        }
        if (authUser.email_confirmed_at) {
          if (!existingProfile.email_verified) {
            await setAccountEmailVerified(existingProfile.id, true)
          }
          return sendJson(res, 409, { error: 'This email already has an account. Sign in instead.' })
        }
        const matchesExistingSignup = existingProfile.name === name
          && existingProfile.username === username
          && existingProfile.phone === phone
          && existingProfile.address === address
          && existingProfile.gender === gender
        if (!matchesExistingSignup) {
          return sendJson(res, 409, { error: 'A signup for this email is already waiting for confirmation. Use the original signup details or resend its confirmation email.' })
        }
        if (existingProfile.email_verified) {
          await setAccountEmailVerified(existingProfile.id, false)
        }
        const emailSent = await sendSignupConfirmation(email)
        return sendJson(res, 200, {
          verificationRequired: true,
          email,
          emailSent,
          message: emailSent
            ? 'A confirmation email has been sent. Check your inbox and spam folder.'
            : 'Your signup is saved and waiting for email confirmation, but Supabase could not send the email yet. Check the Supabase Auth email settings, then select Resend confirmation email.'
        })
      }
    }

    const authResult = await supabaseAuthRequest<{
      id?: string
      email?: string
      identities?: unknown[]
      email_confirmed_at?: string | null
      access_token?: string
      user?: { id: string; email?: string; identities?: unknown[]; email_confirmed_at?: string | null }
      session?: unknown
    }>('signup', {
      email,
      password,
      data: { name, username, phone, address, gender }
    })

    const authUser = authResult.user ?? (authResult.id ? authResult : undefined)
    const authSession = authResult.session ?? (authResult.access_token ? authResult : undefined)
    if (authSession) {
      return sendJson(res, 503, { error: 'Email confirmation is disabled for this Supabase project. Enable email confirmations before signing up.' })
    }
    if (authUser?.id && authUser.identities?.length === 0) {
      const recovery = await recoverPendingAuthUser()
      if (recovery === 'recovered') return
      if (recovery === 'details-mismatch') {
        return sendJson(res, 409, { error: 'An unverified signup already exists for this email, but its saved details differ. Use the original signup details or contact support.' })
      }
      if (recovery === 'already-verified') {
        return sendJson(res, 409, { error: 'This email already has an account. Sign in instead.' })
      }
      return sendJson(res, 503, {
        error: 'Supabase accepted the signup request but did not return a recoverable pending account. No AUREL profile was created. Please try again shortly or check Supabase Authentication users.'
      })
    }
    if (!authUser?.id) {
      console.error('Supabase signup response did not contain a user identifier.', {
        hasUserObject: Boolean(authResult.user),
        hasTopLevelId: typeof authResult.id === 'string',
        hasIdentities: Array.isArray(authResult.identities),
        hasSession: Boolean(authSession)
      })
      return sendJson(res, 502, {
        error: 'Supabase accepted the signup request but did not return a user ID. Check Supabase Authentication → Users and Logs before retrying, so you do not create another pending signup.'
      })
    }

    await createPendingAccount(authUser.id, signupDetails, password)
    sendJson(res, 200, {
      verificationRequired: true,
      email,
      emailSent: true,
      message: 'A confirmation email has been sent. Check your inbox and spam folder.'
    })
  } catch (error) {
    if (error instanceof AuthProviderError && (error.status >= 500 || error.status === 422 || error.status === 409)) {
      console.error('Supabase signup failed:', {
        status: error.status,
        code: error.code,
        message: error.providerMessage
      })
      try {
        const recovery = await recoverPendingAuthUser()
        if (recovery === 'recovered') return
        if (recovery === 'details-mismatch') {
          return sendJson(res, 409, { error: 'An unverified signup already exists for this email, but its saved details differ. Use the original signup details or contact support.' })
        }
        if (recovery === 'already-verified') {
          return sendJson(res, 409, { error: 'This email already has an account. Sign in instead.' })
        }
      } catch (recoveryError) {
        console.error('Unable to recover the pending Supabase signup:', recoveryError)
        return sendJson(res, 503, { error: 'Supabase returned a signup error and AUREL could not check whether a pending account already exists. Please try again shortly.' })
      }
      if (error.status >= 500) {
        sendJson(res, 503, {
          error: 'Supabase could not complete signup or send the confirmation email. Check Supabase Dashboard → Authentication → Logs. If you are using Supabase’s built-in email sender, it only sends to addresses belonging to your Supabase organization team and has a very low sending limit. Add your test email to the organization team, or configure custom SMTP to send to other addresses.'
        })
        return
      }
      sendJson(res, 503, {
        error: 'Supabase rejected signup, but AUREL could not confirm whether a matching account exists. No AUREL profile was changed. Please try again shortly or contact support.'
      })
      return
    }
    handleFailure(res, error, 'Unable to create your account right now.')
  }
}

export async function verifySignupHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  const body = readBody(req)
  const accessToken = typeof body.accessToken === 'string' ? body.accessToken : ''
  const tokenHash = typeof body.tokenHash === 'string' ? body.tokenHash : ''
  if (
    (accessToken.length < 20 && !/^[A-Za-z0-9._~-]{20,1024}$/.test(tokenHash))
    || (accessToken && tokenHash)
  ) {
    return sendJson(res, 400, { error: 'Open the confirmation link from your email to verify your account.' })
  }

  try {
    const verifiedSession = tokenHash
      ? await supabaseAuthRequest<{ access_token?: string }>('verify', { token_hash: tokenHash, type: 'signup' })
      : undefined
    const sessionAccessToken = accessToken || verifiedSession?.access_token || ''
    if (sessionAccessToken.length < 20) {
      return sendJson(res, 400, { error: 'The confirmation link did not include a valid verification token.' })
    }
    const user = await getVerifiedAuthUser(sessionAccessToken)
    const verifiedEmail = user?.email?.trim().toLowerCase()
    if (!user?.id || !verifiedEmail || !user.email_confirmed_at) {
      return sendJson(res, 400, { error: 'We could not verify that email. Open the confirmation link and try again.' })
    }

    const accounts = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${user.id}`, email: `eq.${verifiedEmail}`, select: '*', limit: '1' })
    )
    const account = accounts[0]
    if (!account) return sendJson(res, 404, { error: 'Signup details were not found. Please start signup again.' })

    const verifiedAccounts = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${account.id}`, email_verified: 'eq.false', select: '*' }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ email_verified: true })
      }
    )
    const verifiedAccount = verifiedAccounts[0]
    if (!verifiedAccount) return sendJson(res, 409, { error: 'This account has already been verified. Please sign in.' })
    await setSessionCookie(res, verifiedAccount.id)
    sendJson(res, 200, { user: publicAccount(verifiedAccount) })
  } catch (error) {
    handleFailure(res, error, 'Unable to verify your email right now.')
  }
}

export async function resendSignupVerificationHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  const body = readBody(req)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  if (!validEmail(email)) return sendJson(res, 400, { error: 'Enter a valid email address.' })

  try {
    const pendingAccounts = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ email: `eq.${email}`, email_verified: 'eq.false', select: 'id', limit: '1' })
    )
    if (!pendingAccounts[0]) return sendJson(res, 404, { error: 'No pending signup was found for this email. Start signup again.' })
    const sent = await sendSignupConfirmation(email)
    if (!sent) {
      return sendJson(res, 503, { error: 'Your signup is still waiting for email verification, but Supabase could not send the confirmation email. Check its SMTP settings and try again.' })
    }
    sendJson(res, 200, { sent: true })
  } catch (error) {
    handleFailure(res, error, 'Unable to resend the verification email right now.')
  }
}

export async function loginHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  const body = readBody(req)
  const emailInput = body.email
  const password = body.password
  if (!validEmail(emailInput) || typeof password !== 'string' || password.length === 0 || password.length > 128) {
    return sendJson(res, 400, { error: 'Enter a valid email address and password.' })
  }

  try {
    const email = emailInput.trim().toLowerCase()
    const accounts = await supabaseRequest<AccountRecord[]>(
      'aurel_users',
      new URLSearchParams({ email: `eq.${email}`, select: '*', limit: '1' })
    )
    let account = accounts[0]
    if (!account) {
      const pendingAccounts = await supabaseRequest<AccountRecord[]>(
        'aurel_users',
        new URLSearchParams({ pending_email: `eq.${email}`, select: '*', limit: '1' })
      )
      const pendingAccount = pendingAccounts[0]
      if (pendingAccount) {
        const reconciledAccount = await reconcileEmailVerification(pendingAccount)
        if (reconciledAccount.email.trim().toLowerCase() === email && reconciledAccount.email_verified) {
          account = reconciledAccount
        }
      }
    }
    if (!account) {
      await derivePasswordHash(password, 'aurel-invalid-login-salt')
      return sendJson(res, 401, { error: 'Email or password is incorrect.' })
    }

    const submittedHash = await derivePasswordHash(password, account.password_salt)
    const savedHash = Buffer.from(account.password_hash, 'hex')
    if (submittedHash.length !== savedHash.length || !timingSafeEqual(submittedHash, savedHash)) {
      return sendJson(res, 401, { error: 'Email or password is incorrect.' })
    }

    const verifiedAccount = await reconcileEmailVerification(account)
    if (verifiedAccount.email.trim().toLowerCase() !== email) {
      return sendJson(res, 401, { error: 'Email or password is incorrect.' })
    }
    if (!verifiedAccount.email_verified) {
      return sendJson(res, 403, { error: 'Verify your email address before signing in. Open the confirmation link sent to your inbox.' })
    }
    await setSessionCookie(res, account.id)
    sendJson(res, 200, { user: publicAccount(verifiedAccount) })
  } catch (error) {
    handleFailure(res, error, 'Unable to sign in right now.')
  }
}

export async function sessionHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  if (!readSessionToken(req)) return sendJson(res, 401, { error: 'Not signed in.' })
  try {
    const account = await getSessionAccount(req)
    if (!account) return sendJson(res, 401, { error: 'Not signed in.' })
    const verifiedAccount = await reconcileEmailVerification(account)
    sendJson(res, 200, { user: publicAccount(verifiedAccount) })
  } catch (error) {
    handleFailure(res, error, 'Unable to load your account.')
  }
}

export async function chatHistoryHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  try {
    const account = await getSessionAccount(req)
    if (!account) return sendJson(res, 401, { error: 'Sign in to save chat history.' })

    if (req.method === 'GET') {
      const messages: StoredChatMessage[] = []
      for (let offset = 0; ; offset += 500) {
        const page = await supabaseRequest<StoredChatMessage[]>(
          'aurel_chat_messages',
          new URLSearchParams({
            user_id: `eq.${account.id}`,
            select: 'id,role,content,created_at',
            order: 'id.asc',
            limit: '500',
            offset: String(offset)
          })
        )
        messages.push(...page)
        if (page.length < 500) break
      }
      return sendJson(res, 200, { messages })
    }

    if (req.method === 'DELETE') {
      await supabaseRequest(
        'aurel_chat_messages',
        new URLSearchParams({ user_id: `eq.${account.id}` }),
        { method: 'DELETE' }
      )
      return sendJson(res, 200, { success: true })
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST, DELETE')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }

    const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
      ? req.body as { messages?: unknown }
      : {}
    const messages = body.messages
    if (
      !Array.isArray(messages)
      || messages.length !== 2
      || messages.some(message =>
        !message
        || typeof message !== 'object'
        || !['user', 'assistant'].includes((message as { role?: unknown }).role as string)
        || typeof (message as { content?: unknown }).content !== 'string'
        || !(message as { content: string }).content.trim()
        || (message as { content: string }).content.length > 4000
      )
      || (messages[0] as { role?: unknown }).role !== 'user'
      || (messages[1] as { role?: unknown }).role !== 'assistant'
    ) {
      return sendJson(res, 400, { error: 'Provide a valid user message and assistant reply.' })
    }

    const rows = messages.map(message => ({
      user_id: account.id,
      role: (message as { role: 'user' | 'assistant' }).role,
      content: (message as { content: string }).content.trim()
    }))
    const savedMessages = await supabaseRequest<StoredChatMessage[]>(
      'aurel_chat_messages',
      new URLSearchParams({ select: 'id,role,content,created_at' }),
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(rows)
      }
    )
    return sendJson(res, 201, { messages: savedMessages })
  } catch (error) {
    handleFailure(res, error, 'Unable to load or save chat history right now.')
  }
}

export async function logoutHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  const token = readSessionToken(req)
  if (token) {
    try {
      const tokenHash = createHash('sha256').update(token).digest('hex')
      await supabaseRequest('aurel_sessions', new URLSearchParams({ token_hash: `eq.${tokenHash}` }), { method: 'DELETE' })
    } catch (error) {
      return handleFailure(res, error, 'Unable to sign out right now.')
    }
  }
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : ''
  res.setHeader('Set-Cookie', `aurel_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`)
  sendJson(res, 200, { success: true })
}
