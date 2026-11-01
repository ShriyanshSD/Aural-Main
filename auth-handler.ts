import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { BUILDER_ITEMS, PRODUCTS } from './src/data/products.js'
import { MAGAZINE_PRICES } from './src/data/magazinePricing.js'
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
  account_status?: 'active' | 'disabled'
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

class OrderValidationError extends Error {}

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

export const getSupabaseConfig = () => {
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

export const getSupabaseAuthKey = () => {
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

export const supabaseRequest = async <T>(table: string, query: URLSearchParams, init: RequestInit = {}): Promise<T> => {
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
  const account = accounts[0]
  return account?.account_status === 'disabled' ? undefined : account
}

interface MagazineUploadRecord {
  id: string
  customization_id: string
  user_id: string
  file_type: 'photo' | 'message'
  original_filename: string
  storage_path: string
  content_type: string
  file_size: number
  status: 'pending' | 'complete' | 'superseded'
  uploaded_at: string | null
}

class MagazineUploadRequestError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

const magazineUploadBucket = 'aurel-magazine-uploads'
const magazineUploadUuid = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i
const magazinePhotoTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp'
}
const magazineUploadLimits = () => {
  const readLimit = (name: string, fallback: number, maximum: number) => {
    const value = Number(process.env[name] ?? fallback)
    if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
      throw new Error(`${name} must be an integer between 1 and ${maximum}.`)
    }
    return value
  }
  const maxPhotos = readLimit('MAGAZINE_MAX_PHOTOS', 10, 20)
  const maxPhotoSizeBytes = readLimit('MAGAZINE_MAX_PHOTO_SIZE_BYTES', 8 * 1024 * 1024, 8 * 1024 * 1024)
  const maxTotalPhotoSizeBytes = readLimit('MAGAZINE_MAX_TOTAL_PHOTO_SIZE_BYTES', 40 * 1024 * 1024, 160 * 1024 * 1024)
  const maxMessageSizeBytes = readLimit('MAGAZINE_MAX_MESSAGE_SIZE_BYTES', 512 * 1024, 512 * 1024)
  return { maxPhotos, maxPhotoSizeBytes, maxTotalPhotoSizeBytes, maxMessageSizeBytes }
}

const magazineStorageRequest = async (path: string, init: RequestInit = {}): Promise<Response> => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
  return fetch(`${supabaseUrl}/storage/v1${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...init.headers
    }
  })
}

const storageObjectPath = (storagePath: string) =>
  `/object/${magazineUploadBucket}/${storagePath.split('/').map(encodeURIComponent).join('/')}`

export const fetchMagazineStorageObject = (storagePath: string) =>
  magazineStorageRequest(`/object/authenticated/${magazineUploadBucket}/${storagePath.split('/').map(encodeURIComponent).join('/')}`)

const readLimitedBody = async (response: Response, maxBytes: number): Promise<Uint8Array> => {
  const contentLength = Number(response.headers.get('content-length'))
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new MagazineUploadRequestError(413, 'The uploaded file exceeds the configured size limit.')
  }
  if (!response.body) throw new Error('Supabase Storage returned an empty file response.')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      throw new MagazineUploadRequestError(413, 'The uploaded file exceeds the configured size limit.')
    }
    chunks.push(value)
  }
  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return bytes
}

const validateMagazineUploadContent = (record: MagazineUploadRecord, bytes: Uint8Array) => {
  if (bytes.byteLength !== record.file_size) {
    throw new MagazineUploadRequestError(400, 'The uploaded file size did not match its declared size.')
  }
  const startsWith = (...values: number[]) => values.every((value, index) => bytes[index] === value)
  if (record.file_type === 'photo') {
    const valid = record.content_type === 'image/jpeg'
      ? startsWith(0xff, 0xd8, 0xff) && bytes.length >= 4 && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9
      : record.content_type === 'image/png'
        ? startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)
          && bytes.length >= 20
          && new TextDecoder().decode(bytes.slice(-8, -4)) === 'IEND'
        : record.content_type === 'image/webp'
            ? startsWith(0x52, 0x49, 0x46, 0x46)
              && new TextDecoder().decode(bytes.slice(8, 12)) === 'WEBP'
              && ['VP8 ', 'VP8L', 'VP8X'].includes(new TextDecoder().decode(bytes.slice(12, 16)))
            : false
    if (!valid) throw new MagazineUploadRequestError(400, 'The uploaded file is not a valid supported image.')
    return
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    if (text.includes('\0')) throw new Error('NUL bytes are not valid message text.')
  } catch {
    throw new MagazineUploadRequestError(400, 'The TXT attachment must contain valid UTF-8 text.')
  }
}

const readMagazineUploadFilename = (value: unknown) => {
  if (typeof value !== 'string') throw new MagazineUploadRequestError(400, 'Choose a file with a valid filename.')
  const filename = value.replace(/\\/g, '/').split('/').pop()?.replace(/[\u0000-\u001f\u007f]/g, '').trim() ?? ''
  if (!filename || filename.length > 255 || filename === '.' || filename === '..') {
    throw new MagazineUploadRequestError(400, 'The filename is invalid or too long.')
  }
  return filename
}

const isSameAccountOrigin = (req: AuthRequest) => {
  const origin = req.headers.origin
  const forwardedHost = req.headers['x-forwarded-host']
  const requestHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? req.headers.host
  if (!origin || !requestHost) return false
  try {
    return new URL(origin).host.toLowerCase() === requestHost.toLowerCase()
  } catch {
    return false
  }
}

const ensureMagazineCustomization = async (customizationId: string, userId: string) => {
  const existing = await supabaseRequest<Array<{ id: string; user_id: string; order_row_id: number | null }>>(
    'aurel_magazine_customizations',
    new URLSearchParams({ id: `eq.${customizationId}`, select: 'id,user_id,order_row_id', limit: '1' })
  )
  if (existing[0]) {
    if (existing[0].user_id !== userId) throw new MagazineUploadRequestError(403, 'This magazine customization belongs to another account.')
    if (existing[0].order_row_id !== null) throw new MagazineUploadRequestError(409, 'Files cannot be added after this magazine has been ordered.')
    await supabaseRequest('aurel_magazine_customizations', new URLSearchParams({ id: `eq.${customizationId}`, user_id: `eq.${userId}` }), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    })
    return
  }
  try {
    await supabaseRequest('aurel_magazine_customizations', new URLSearchParams(), {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id: customizationId, user_id: userId })
    })
  } catch (error) {
    if (!(error instanceof AccountServiceError) || String(error.code) !== '23505') throw error
    const raced = await supabaseRequest<Array<{ id: string; user_id: string; order_row_id: number | null }>>(
      'aurel_magazine_customizations',
      new URLSearchParams({ id: `eq.${customizationId}`, select: 'id,user_id,order_row_id', limit: '1' })
    )
    if (raced[0]?.user_id !== userId) throw new MagazineUploadRequestError(403, 'This magazine customization belongs to another account.')
    if (raced[0]?.order_row_id !== null) throw new MagazineUploadRequestError(409, 'Files cannot be added after this magazine has been ordered.')
  }
}

const cleanupExpiredMagazineDrafts = async () => {
  const retentionDays = Number(process.env.MAGAZINE_DRAFT_RETENTION_DAYS ?? 180)
  if (!Number.isSafeInteger(retentionDays) || retentionDays < 30 || retentionDays > 3650) {
    throw new Error('MAGAZINE_DRAFT_RETENTION_DAYS must be an integer between 30 and 3650.')
  }
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
  const staleDrafts = await supabaseRequest<Array<{ id: string }>>(
    'aurel_magazine_customizations',
    new URLSearchParams({
      order_row_id: 'is.null',
      last_activity_at: `lt.${cutoff}`,
      select: 'id',
      limit: '100'
    })
  )
  if (!staleDrafts.length) return
  const draftIds = staleDrafts.map(draft => draft.id)
  const uploads = await supabaseRequest<Array<{ storage_path: string }>>(
    'aurel_magazine_uploads',
    new URLSearchParams({ customization_id: `in.(${draftIds.join(',')})`, select: 'storage_path', limit: '2000' })
  )
  if (uploads.length) {
    const response = await magazineStorageRequest(`/object/${magazineUploadBucket}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: uploads.map(upload => upload.storage_path) })
    })
    if (!response.ok) throw new Error('Expired magazine uploads could not be removed from private storage.')
  }
  await supabaseRequest(
    'aurel_magazine_customizations',
    new URLSearchParams({ id: `in.(${draftIds.join(',')})`, order_row_id: 'is.null' }),
    { method: 'DELETE' }
  )
}

const readMagazineUploadRecord = async (
  uploadId: string,
  userId: string,
  customizationId?: string
) => {
  const query = new URLSearchParams({
    id: `eq.${uploadId}`,
    user_id: `eq.${userId}`,
    select: 'id,customization_id,user_id,file_type,original_filename,storage_path,content_type,file_size,status,uploaded_at',
    limit: '1'
  })
  if (customizationId) query.set('customization_id', `eq.${customizationId}`)
  const rows = await supabaseRequest<MagazineUploadRecord[]>('aurel_magazine_uploads', query)
  return rows[0]
}

const createMagazineSignedUploadUrl = async (storagePath: string) => {
  const { supabaseUrl } = getSupabaseConfig()
  const response = await magazineStorageRequest(
    `/object/upload/sign/${magazineUploadBucket}/${storagePath.split('/').map(encodeURIComponent).join('/')}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ upsert: false }) }
  )
  const result = await response.json().catch(() => ({})) as { url?: string; signedURL?: string; signedUrl?: string; token?: string }
  if (!response.ok) throw new Error('A secure upload link could not be created. Please try again.')
  const returnedUrl = result.signedURL ?? result.signedUrl ?? result.url
  if (!returnedUrl) throw new Error('Supabase Storage did not return a secure upload link.')
  const url = new URL(
    returnedUrl.startsWith('http')
      ? returnedUrl
      : returnedUrl.startsWith('/storage/v1/')
        ? returnedUrl
        : `/storage/v1${returnedUrl.startsWith('/') ? '' : '/'}${returnedUrl}`,
    supabaseUrl
  )
  if (url.origin !== new URL(supabaseUrl).origin) throw new Error('Supabase Storage returned an unsafe upload link.')
  if (result.token && !url.searchParams.has('token')) url.searchParams.set('token', result.token)
  return url.toString()
}

export const createMagazineSignedDownloadUrl = async (storagePath: string, downloadName?: string) => {
  const { supabaseUrl } = getSupabaseConfig()
  const response = await magazineStorageRequest(
    `/object/sign/${magazineUploadBucket}/${storagePath.split('/').map(encodeURIComponent).join('/')}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expiresIn: 300, ...(downloadName ? { download: downloadName } : {}) })
    }
  )
  const result = await response.json().catch(() => ({})) as { signedURL?: string; signedUrl?: string; url?: string }
  if (!response.ok) throw new Error('A temporary private download link could not be created.')
  const returnedUrl = result.signedURL ?? result.signedUrl ?? result.url
  if (!returnedUrl) throw new Error('Supabase Storage did not return a private download link.')
  const url = new URL(
    returnedUrl.startsWith('http')
      ? returnedUrl
      : returnedUrl.startsWith('/storage/v1/')
        ? returnedUrl
        : `/storage/v1${returnedUrl.startsWith('/') ? '' : '/'}${returnedUrl}`,
    supabaseUrl
  )
  if (url.origin !== new URL(supabaseUrl).origin) throw new Error('Supabase Storage returned an unsafe download link.')
  return url.toString()
}

export async function magazineUploadsHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  const method = req.method ?? 'GET'
  try {
    const limits = magazineUploadLimits()
    if (method === 'GET') {
      const url = new URL(req.url ?? '/', 'http://localhost')
      const action = url.searchParams.get('action')
      if (!action) return sendJson(res, 200, { limits })
      const account = await getSessionAccount(req)
      if (!account) return sendJson(res, 401, { error: 'Sign in to access your magazine uploads.' })
      if (action === 'list') {
        const customizationId = url.searchParams.get('customizationId') ?? ''
        if (!magazineUploadUuid.test(customizationId)) throw new MagazineUploadRequestError(400, 'The magazine customization ID is invalid.')
        const customizations = await supabaseRequest<Array<{ id: string; user_id: string }>>(
          'aurel_magazine_customizations',
          new URLSearchParams({ id: `eq.${customizationId}`, user_id: `eq.${account.id}`, select: 'id,user_id', limit: '1' })
        )
        if (!customizations[0]) return sendJson(res, 200, { photos: [], message: null })
        const rows = await supabaseRequest<MagazineUploadRecord[]>(
          'aurel_magazine_uploads',
          new URLSearchParams({
            customization_id: `eq.${customizationId}`,
            user_id: `eq.${account.id}`,
            status: 'eq.complete',
            select: 'id,customization_id,user_id,file_type,original_filename,storage_path,content_type,file_size,status,uploaded_at',
            order: 'created_at.asc',
            limit: '30'
          })
        )
        const toMetadata = (row: MagazineUploadRecord) => ({
          id: row.id,
          originalFilename: row.original_filename,
          contentType: row.content_type,
          fileSize: row.file_size,
          uploadedAt: row.uploaded_at ?? ''
        })
        const photos = await Promise.all(rows.filter(row => row.file_type === 'photo').map(async row => ({
          ...toMetadata(row),
          previewUrl: await createMagazineSignedDownloadUrl(row.storage_path)
        })))
        const message = rows.find(row => row.file_type === 'message')
        return sendJson(res, 200, {
          photos,
          message: message ? toMetadata(message) : null
        })
      }
      if (action === 'preview') {
        const uploadId = url.searchParams.get('uploadId') ?? ''
        if (!magazineUploadUuid.test(uploadId)) throw new MagazineUploadRequestError(400, 'The upload ID is invalid.')
        const row = await readMagazineUploadRecord(uploadId, account.id)
        if (!row || row.status !== 'complete') return sendJson(res, 404, { error: 'This uploaded file is no longer available.' })
        return sendJson(res, 200, { previewUrl: await createMagazineSignedDownloadUrl(row.storage_path) })
      }
      throw new MagazineUploadRequestError(400, 'Choose a valid magazine upload action.')
    }
    if (method !== 'POST') {
      res.setHeader('Allow', 'GET, POST')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }
    if (!isSameAccountOrigin(req)) return sendJson(res, 403, { error: 'The request origin could not be verified.' })
    const account = await getSessionAccount(req)
    if (!account) return sendJson(res, 401, { error: 'Sign in to upload files for your magazine.' })
    const body = readBody(req)
    const action = body.action
    if (action === 'touch') {
      const customizationIds = body.customizationIds
      if (!Array.isArray(customizationIds) || customizationIds.length > 100
        || !customizationIds.every(id => typeof id === 'string' && magazineUploadUuid.test(id))) {
        throw new MagazineUploadRequestError(400, 'The saved magazine customizations are invalid.')
      }
      const ids = [...new Set(customizationIds as string[])]
      if (ids.length) {
        await supabaseRequest('aurel_magazine_customizations', new URLSearchParams({
          id: `in.(${ids.join(',')})`,
          user_id: `eq.${account.id}`
        }), {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ last_activity_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        })
      }
      return sendJson(res, 200, { success: true })
    }
    const customizationId = typeof body.customizationId === 'string' ? body.customizationId : ''
    if (!magazineUploadUuid.test(customizationId)) throw new MagazineUploadRequestError(400, 'The magazine customization ID is invalid.')
    if (action === 'prepare') {
      const fileType = body.fileType
      const filename = readMagazineUploadFilename(body.fileName)
      const extension = filename.split('.').pop()?.toLowerCase() ?? ''
      const expectedContentType = fileType === 'photo'
        ? magazinePhotoTypes[extension]
        : fileType === 'message' && extension === 'txt'
          ? 'text/plain'
          : undefined
      const declaredContentType = body.contentType
      const fileSize = body.fileSize
      if (!expectedContentType || (declaredContentType && declaredContentType !== expectedContentType)) {
        throw new MagazineUploadRequestError(400, fileType === 'photo'
          ? 'Upload a JPG, PNG or WEBP image.'
          : 'Upload a .txt file only.')
      }
      const maxFileSize = fileType === 'photo' ? limits.maxPhotoSizeBytes : limits.maxMessageSizeBytes
      if (typeof fileSize !== 'number' || !Number.isSafeInteger(fileSize) || fileSize < 1 || fileSize > maxFileSize) {
        throw new MagazineUploadRequestError(413, `The selected file exceeds the ${fileType === 'photo' ? 'photo' : 'TXT'} size limit.`)
      }
      await ensureMagazineCustomization(customizationId, account.id)
      await cleanupExpiredMagazineDrafts()
      const currentUploads = await supabaseRequest<Pick<MagazineUploadRecord, 'id' | 'file_type' | 'file_size' | 'status'>[]>(
        'aurel_magazine_uploads',
        new URLSearchParams({
          customization_id: `eq.${customizationId}`,
          user_id: `eq.${account.id}`,
          status: 'neq.superseded',
          select: 'id,file_type,file_size,status',
          limit: '100'
        })
      )
      if (fileType === 'photo') {
        const activePhotos = currentUploads.filter(upload => upload.file_type === 'photo')
        if (activePhotos.length >= limits.maxPhotos) throw new MagazineUploadRequestError(413, `You can upload up to ${limits.maxPhotos} photos.`)
        const totalPhotoBytes = activePhotos.reduce((total, upload) => total + upload.file_size, 0)
        if (totalPhotoBytes + fileSize > limits.maxTotalPhotoSizeBytes) {
          throw new MagazineUploadRequestError(413, 'The combined photo upload size exceeds the configured limit.')
        }
      } else if (currentUploads.some(upload => upload.file_type === 'message' && upload.status === 'pending')) {
        throw new MagazineUploadRequestError(409, 'A TXT upload is already in progress. Remove it or wait for it to finish.')
      }
      const uploadId = crypto.randomUUID()
      const storagePath = `${account.id}/${customizationId}/${uploadId}.${extension}`
      const uploadUrl = await createMagazineSignedUploadUrl(storagePath)
      const created = await supabaseRequest<MagazineUploadRecord[]>(
        'aurel_magazine_uploads',
        new URLSearchParams({ select: 'id,customization_id,user_id,file_type,original_filename,storage_path,content_type,file_size,status,uploaded_at' }),
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            id: uploadId,
            customization_id: customizationId,
            user_id: account.id,
            file_type: fileType,
            original_filename: filename,
            storage_path: storagePath,
            content_type: expectedContentType,
            file_size: fileSize,
            status: 'pending'
          })
        }
      )
      if (!created[0]) throw new Error('The upload record could not be created.')
      return sendJson(res, 200, { uploadId, uploadUrl, contentType: expectedContentType })
    }
    const uploadId = typeof body.uploadId === 'string' ? body.uploadId : ''
    if (!magazineUploadUuid.test(uploadId)) throw new MagazineUploadRequestError(400, 'The upload ID is invalid.')
    const record = await readMagazineUploadRecord(uploadId, account.id, customizationId)
    if (!record) return sendJson(res, 404, { error: 'The uploaded file could not be found for this magazine.' })
    if (action === 'complete') {
      if (record.status === 'complete') return sendJson(res, 200, {
        upload: {
          id: record.id,
          originalFilename: record.original_filename,
          contentType: record.content_type,
          fileSize: record.file_size,
          uploadedAt: record.uploaded_at ?? ''
        }
      })
      if (record.status !== 'pending') throw new MagazineUploadRequestError(409, 'This upload is no longer active.')
      const file = await fetchMagazineStorageObject(record.storage_path)
      if (!file.ok) throw new MagazineUploadRequestError(400, 'The file has not finished uploading. Please retry.')
      const bytes = await readLimitedBody(file, record.file_size)
      validateMagazineUploadContent(record, bytes)
      if (record.file_type === 'message') {
        const previousMessages = await supabaseRequest<Array<{ id: string }>>(
          'aurel_magazine_uploads',
          new URLSearchParams({
            customization_id: `eq.${customizationId}`,
            user_id: `eq.${account.id}`,
            file_type: 'eq.message',
            status: 'eq.complete',
            select: 'id',
            limit: '10'
          })
        )
        for (const previous of previousMessages) {
          await supabaseRequest('aurel_magazine_uploads', new URLSearchParams({ id: `eq.${previous.id}`, user_id: `eq.${account.id}` }), {
            method: 'PATCH',
            headers: { Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'superseded' })
          })
        }
      }
      const uploadedAt = new Date().toISOString()
      const updated = await supabaseRequest<MagazineUploadRecord[]>(
        'aurel_magazine_uploads',
        new URLSearchParams({ id: `eq.${uploadId}`, user_id: `eq.${account.id}`, status: 'eq.pending', select: 'id,customization_id,user_id,file_type,original_filename,storage_path,content_type,file_size,status,uploaded_at' }),
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ status: 'complete', uploaded_at: uploadedAt })
        }
      )
      if (!updated[0]) throw new MagazineUploadRequestError(409, 'This upload could not be finalized. Please retry.')
      return sendJson(res, 200, {
        upload: {
          id: updated[0].id,
          originalFilename: updated[0].original_filename,
          contentType: updated[0].content_type,
          fileSize: updated[0].file_size,
          uploadedAt,
          ...(updated[0].file_type === 'photo'
            ? { previewUrl: await createMagazineSignedDownloadUrl(updated[0].storage_path) }
            : {})
        }
      })
    }
    if (action === 'remove') {
      const customizations = await supabaseRequest<Array<{ order_row_id: number | null }>>(
        'aurel_magazine_customizations',
        new URLSearchParams({ id: `eq.${customizationId}`, user_id: `eq.${account.id}`, select: 'order_row_id', limit: '1' })
      )
      if (!customizations[0] || customizations[0].order_row_id !== null) {
        throw new MagazineUploadRequestError(409, 'Files attached to a saved order cannot be removed.')
      }
      const removed = await magazineStorageRequest(storageObjectPath(record.storage_path), { method: 'DELETE' })
      if (!removed.ok && removed.status !== 404) throw new Error('The private upload could not be removed from storage.')
      await supabaseRequest('aurel_magazine_uploads', new URLSearchParams({ id: `eq.${uploadId}`, user_id: `eq.${account.id}` }), { method: 'DELETE' })
      return sendJson(res, 200, { success: true })
    }
    throw new MagazineUploadRequestError(400, 'Choose a valid magazine upload action.')
  } catch (error) {
    if (error instanceof MagazineUploadRequestError) return sendJson(res, error.status, { error: error.message })
    console.error('Magazine upload request failed:', error)
    handleFailure(res, error, 'Unable to process this magazine upload. Please try again.')
  }
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
  if (error instanceof OrderValidationError) {
    sendJson(res, 409, { error: error.message })
    return
  }
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
  id?: number
  order_id: string
  order_data: Record<string, unknown>
  created_at: string
  order_experience_rating?: number | null
  fulfillment_status?: string
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
  order_status?: 'pending_payment' | 'paid' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  paid_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  idempotency_key?: string | null
}

interface MagazineCustomizationData {
  customizationId: string
  recipientName: string
  printFinish: 'matte' | 'gloss'
  occasion: string
  photoUploadIds: string[]
  pageCount: 4 | 8
  dedicationMessage: string
  messageUploadId?: string
  additionalPreferences: string
}

type PersistedOrderItem = Record<string, unknown> & {
  productId: string
  price: number
  quantity: number
  magazineCustomization?: MagazineCustomizationData
}

const isMagazineCustomizationData = (value: unknown): value is MagazineCustomizationData => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const data = value as Record<string, unknown>
  return typeof data.customizationId === 'string' && magazineUploadUuid.test(data.customizationId)
    && typeof data.recipientName === 'string' && data.recipientName.trim().length <= 100
    && (data.printFinish === 'matte' || data.printFinish === 'gloss')
    && typeof data.occasion === 'string' && data.occasion.trim().length <= 80
    && Array.isArray(data.photoUploadIds) && data.photoUploadIds.length <= 20
    && data.photoUploadIds.every(id => typeof id === 'string' && magazineUploadUuid.test(id))
    && new Set(data.photoUploadIds).size === data.photoUploadIds.length
    && (data.pageCount === 4 || data.pageCount === 8)
    && typeof data.dedicationMessage === 'string' && data.dedicationMessage.length <= 10000
    && (data.messageUploadId === undefined || (typeof data.messageUploadId === 'string' && magazineUploadUuid.test(data.messageUploadId)))
    && typeof data.additionalPreferences === 'string' && data.additionalPreferences.length <= 5000
}

const validateMagazineOrderUploads = async (userId: string, items: Array<Record<string, unknown>>) => {
  const magazineItems = items
    .map(item => item.magazineCustomization)
    .filter(isMagazineCustomizationData)
  const customizationIds = magazineItems.map(item => item.customizationId)
  if (new Set(customizationIds).size !== customizationIds.length) {
    throw new OrderValidationError('Each custom magazine must have its own saved customization.')
  }
  const customizationQueryIds = [...new Set(customizationIds)]
  if (customizationQueryIds.length) {
    const records = await supabaseRequest<Array<{ id: string; user_id: string; order_row_id: number | null }>>(
      'aurel_magazine_customizations',
      new URLSearchParams({
        id: `in.(${customizationQueryIds.join(',')})`,
        select: 'id,user_id,order_row_id',
        limit: '100'
      })
    )
    const recordsById = new Map(records.map(record => [record.id, record]))
    for (const customization of magazineItems) {
      const record = recordsById.get(customization.customizationId)
      if (record && record.user_id !== userId) {
        throw new OrderValidationError('This magazine customization belongs to another account.')
      }
      if (record?.order_row_id !== null && record?.order_row_id !== undefined) {
        throw new OrderValidationError('This magazine customization is already attached to another order.')
      }
    }
  }
  const requestedUploads = magazineItems.flatMap(item => [
    ...item.photoUploadIds.map(id => ({ id, customizationId: item.customizationId, type: 'photo' })),
    ...(item.messageUploadId ? [{ id: item.messageUploadId, customizationId: item.customizationId, type: 'message' }] : [])
  ])
  if (new Set(requestedUploads.map(file => file.id)).size !== requestedUploads.length) {
    throw new OrderValidationError('An uploaded file cannot be attached to more than one magazine item.')
  }
  if (!requestedUploads.length) return
  const uploads = await supabaseRequest<Array<{
    id: string
    customization_id: string
    user_id: string
    file_type: string
    status: string
  }>>(
    'aurel_magazine_uploads',
    new URLSearchParams({
      id: `in.(${requestedUploads.map(file => file.id).join(',')})`,
      user_id: `eq.${userId}`,
      select: 'id,customization_id,user_id,file_type,status',
      limit: '100'
    })
  )
  const uploadsById = new Map(uploads.map(upload => [upload.id, upload]))
  if (requestedUploads.some(requested => {
    const upload = uploadsById.get(requested.id)
    return !upload
      || upload.customization_id !== requested.customizationId
      || upload.user_id !== userId
      || upload.file_type !== requested.type
      || upload.status !== 'complete'
  })) {
    throw new OrderValidationError('One or more magazine uploads are unavailable. Reopen the magazine form and verify your files.')
  }
}

const associateMagazineOrderItems = async (
  orderRowId: number,
  userId: string,
  orderItems: Array<Record<string, unknown>>
) => {
  const magazineItems = orderItems
    .map((item, index) => ({ customization: item.magazineCustomization, item, index }))
    .filter((entry): entry is typeof entry & { customization: MagazineCustomizationData } =>
      isMagazineCustomizationData(entry.customization)
    )
  for (const { customization, item, index } of magazineItems) {
    const existing = await supabaseRequest<Array<{ id: string; user_id: string; order_row_id: number | null }>>(
      'aurel_magazine_customizations',
      new URLSearchParams({
        id: `eq.${customization.customizationId}`,
        select: 'id,user_id,order_row_id',
        limit: '1'
      })
    )
    if (existing[0] && (existing[0].user_id !== userId
      || (existing[0].order_row_id !== null && existing[0].order_row_id !== orderRowId))) {
      throw new OrderValidationError('This magazine customization is already attached to a different account or order.')
    }
    const payload = {
      id: customization.customizationId,
      user_id: userId,
      cart_item_id: typeof item.cartId === 'string' ? item.cartId.slice(0, 120) : null,
      order_row_id: orderRowId,
      order_item_index: index,
      recipient_name: customization.recipientName,
      print_finish: customization.printFinish,
      occasion: customization.occasion,
      page_count: customization.pageCount,
      dedication_message: customization.dedicationMessage,
      additional_preferences: customization.additionalPreferences,
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    if (existing[0]) {
      const query = new URLSearchParams({
        id: `eq.${customization.customizationId}`,
        user_id: `eq.${userId}`,
        order_row_id: existing[0].order_row_id === null ? 'is.null' : `eq.${orderRowId}`
      })
      const saved = await supabaseRequest<Array<{ id: string }>>('aurel_magazine_customizations', query, {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify(payload)
      })
      if (!saved.length) throw new OrderValidationError('The magazine customization could not be linked to this order.')
    } else {
      await supabaseRequest('aurel_magazine_customizations', new URLSearchParams(), {
        method: 'POST',
        body: JSON.stringify(payload)
      })
    }
  }
}

const isSecureProofUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

export async function accountOrdersHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  try {
    const account = await getSessionAccount(req)
    if (!account) return sendJson(res, 401, { error: 'Sign in to view your orders.' })

    if (req.method === 'PATCH') {
      const origin = req.headers.origin
      const forwardedHost = req.headers['x-forwarded-host']
      const requestHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? req.headers.host
      if (!origin || !requestHost) return sendJson(res, 403, { error: 'The request origin could not be verified.' })
      try {
        if (new URL(origin).host.toLowerCase() !== requestHost.toLowerCase()) {
          return sendJson(res, 403, { error: 'The request origin could not be verified.' })
        }
      } catch {
        return sendJson(res, 403, { error: 'The request origin could not be verified.' })
      }
      const body = readBody(req)
      const orderId = body.orderId
      if (typeof orderId !== 'string' || !/^(?:AUR-\d{4}-\d{5,}|AUREL[A-Z0-9]{5,16})$/.test(orderId)) {
        return sendJson(res, 400, { error: 'Provide a valid order number.' })
      }
      const orders = await supabaseRequest<Array<{ id: number; fulfillment_status: string; order_experience_rating: number | null }>>(
        'aurel_orders',
        new URLSearchParams({ user_id: `eq.${account.id}`, order_id: `eq.${orderId}`, select: 'id,fulfillment_status,order_experience_rating', limit: '1' })
      )
      if (!orders[0]) return sendJson(res, 404, { error: 'Order not found in your account.' })
      if (body.submitForPayment === true) {
        const submission = await supabaseRequest<{ success: boolean; alreadySubmitted?: boolean; reason?: string }>(
          'rpc/aurel_submit_order_for_payment',
          new URLSearchParams(),
          {
            method: 'POST',
            body: JSON.stringify({ p_order_id: orders[0].id, p_user_id: account.id })
          }
        )
        if (submission.reason === 'not_found') return sendJson(res, 404, { error: 'Order not found in your account.' })
        if (!submission.success) return sendJson(res, 409, { error: 'This order is no longer awaiting payment. Refresh your orders before continuing.' })
        return sendJson(res, 200, { success: true, alreadySubmitted: Boolean(submission.alreadySubmitted) })
      }
      if (body.orderExperienceRating !== undefined) {
        const rating = body.orderExperienceRating
        if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
          return sendJson(res, 400, { error: 'Choose an order experience rating from 1 to 5 stars.' })
        }
        if (orders[0].fulfillment_status !== 'delivered') {
          return sendJson(res, 409, { error: 'You can rate your order after it is marked delivered.' })
        }
        if (orders[0].order_experience_rating !== null) {
          return sendJson(res, 409, { error: 'An order experience rating has already been submitted.' })
        }
        const updatedRating = await supabaseRequest<Array<{ id: number }>>(
          'aurel_orders',
          new URLSearchParams({
            id: `eq.${orders[0].id}`,
            user_id: `eq.${account.id}`,
            order_experience_rating: 'is.null',
            select: 'id'
          }),
          {
            method: 'PATCH',
            headers: { Prefer: 'return=representation' },
            body: JSON.stringify({ order_experience_rating: rating })
          }
        )
        if (!updatedRating.length) return sendJson(res, 409, { error: 'An order experience rating has already been submitted.' })
        return sendJson(res, 200, { success: true, orderExperienceRating: rating })
      }
      const operations = await supabaseRequest<Array<{ production_status: string; customer_approved_at: string | null; proof_url: string }>>(
        'aurel_order_operations',
        new URLSearchParams({ order_id: `eq.${orders[0].id}`, select: 'production_status,customer_approved_at,proof_url', limit: '1' })
      )
      const operation = operations[0]
      if (operation?.customer_approved_at) {
        return sendJson(res, 200, { success: true, alreadyApproved: true })
      }
      if (!operation || operation.production_status !== 'awaiting_customer_approval' || !isSecureProofUrl(operation.proof_url)) {
        return sendJson(res, 409, { error: 'This order does not currently have a proof awaiting your approval.' })
      }
      const approvedAt = new Date().toISOString()
      const updated = await supabaseRequest<Array<{ order_id: number }>>(
        'aurel_order_operations',
        new URLSearchParams({
          order_id: `eq.${orders[0].id}`,
          production_status: 'eq.awaiting_customer_approval',
          proof_url: `eq.${operation.proof_url}`,
          select: 'order_id'
        }),
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            customer_approved_at: approvedAt,
            customer_approved_by: account.id,
            production_status: 'approved_for_production',
            updated_at: approvedAt
          })
        }
      )
      if (!updated.length) return sendJson(res, 409, { error: 'This proof is no longer awaiting approval. Refresh your orders and try again.' })
      await supabaseRequest('aurel_order_events', new URLSearchParams(), {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          order_id: orders[0].id,
          actor_type: 'customer',
          actor_user_id: account.id,
          event_type: 'proof_approved',
          summary: 'Customer approved the submitted proof.',
          metadata: {}
        })
      })
      await supabaseRequest('aurel_admin_notifications', new URLSearchParams(), {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          notification_type: 'proof_approved',
          title: 'Customer approved a proof',
          message: `Order ${orderId} is approved to move forward in production.`,
          target_type: 'order',
          target_id: String(orders[0].id)
        })
      })
      return sendJson(res, 200, { success: true })
    }

    if (req.method === 'GET') {
      const requestedOrderId = new URL(req.url ?? '/', 'http://localhost').searchParams.get('orderId')
      if (requestedOrderId) {
        if (!/^AUR-\d{4}-\d{5,}$/.test(requestedOrderId)) {
          return sendJson(res, 400, { error: 'Provide a valid order number.' })
        }
        const rows = await supabaseRequest<StoredAccountOrder[]>(
          'aurel_orders',
          new URLSearchParams({
            user_id: `eq.${account.id}`,
            order_id: `eq.${requestedOrderId}`,
            select: 'id,order_id,order_data,created_at,fulfillment_status,payment_status,order_status,paid_at,shipped_at,delivered_at,order_experience_rating',
            limit: '1'
          })
        )
        const row = rows[0]
        if (!row) return sendJson(res, 404, { error: 'Order not found in your account.' })
        return sendJson(res, 200, {
          order: {
            ...row.order_data,
            orderId: row.order_id,
            paymentStatus: row.payment_status ?? 'pending',
            orderStatus: row.order_status ?? 'pending_payment',
            paidAt: row.paid_at ?? undefined,
            shippedAt: row.shipped_at ?? undefined,
            deliveredAt: row.delivered_at ?? undefined
          }
        })
      }
      const rows = await supabaseRequest<StoredAccountOrder[]>(
        'aurel_orders',
        new URLSearchParams({
          user_id: `eq.${account.id}`,
          whatsapp_submitted_at: 'not.is.null',
          select: 'order_id,order_data,created_at,fulfillment_status,payment_status,order_status,paid_at,shipped_at,delivered_at,order_experience_rating',
          order: 'created_at.desc',
          limit: '100'
        })
      )
      const orderIds = rows.map(row => row.order_id)
      const orderRecords = orderIds.length
        ? await supabaseRequest<Array<{ id: number; order_id: string }>>(
          'aurel_orders',
          new URLSearchParams({ user_id: `eq.${account.id}`, order_id: `in.(${orderIds.join(',')})`, select: 'id,order_id', limit: '100' })
        )
        : []
      const orderIdByOrderNumber = new Map(orderRecords.map(row => [row.order_id, row.id]))
      const databaseIds = [...orderIdByOrderNumber.values()]
      const [operations, reviews, events] = databaseIds.length
        ? await Promise.all([
          supabaseRequest<Array<{ order_id: number; production_status: string; customer_approved_at: string | null; proof_url: string }>>(
            'aurel_order_operations',
            new URLSearchParams({ order_id: `in.(${databaseIds.join(',')})`, select: 'order_id,production_status,customer_approved_at,proof_url' })
          ),
          supabaseRequest<Array<{ order_id: number; product_id: string }>>(
            'aurel_reviews',
            new URLSearchParams({ order_id: `in.(${databaseIds.join(',')})`, user_id: `eq.${account.id}`, select: 'order_id,product_id' })
          ),
          supabaseRequest<Array<{ order_id: number; event_type: string; summary: string; created_at: string }>>(
            'aurel_order_events',
            new URLSearchParams({ order_id: `in.(${databaseIds.join(',')})`, select: 'order_id,event_type,summary,created_at', order: 'created_at.desc', limit: '1000' })
          )
        ])
        : [[], [], []]
      const operationByOrderId = new Map(operations.map(operation => [operation.order_id, operation]))
      const reviewsByOrderId = new Map<number, string[]>()
      for (const review of reviews) reviewsByOrderId.set(review.order_id, [...(reviewsByOrderId.get(review.order_id) ?? []), review.product_id])
      const eventsByOrderId = new Map<number, typeof events>()
      for (const event of events) eventsByOrderId.set(event.order_id, [...(eventsByOrderId.get(event.order_id) ?? []), event])
      return sendJson(res, 200, {
        orders: rows.map(row => {
          const databaseOrderId = orderIdByOrderNumber.get(row.order_id)
          const operation = databaseOrderId ? operationByOrderId.get(databaseOrderId) : undefined
          return {
            order: {
              ...row.order_data,
              orderId: row.order_id,
              paymentStatus: row.payment_status ?? 'pending',
              orderStatus: row.order_status ?? 'pending_payment',
              paidAt: row.paid_at ?? undefined,
              shippedAt: row.shipped_at ?? undefined,
              deliveredAt: row.delivered_at ?? undefined
            },
            createdAt: row.created_at,
            paymentStatus: row.payment_status ?? 'pending',
            orderStatus: row.order_status ?? 'pending_payment',
            fulfillmentStatus: row.fulfillment_status ?? 'unfulfilled',
            orderExperienceRating: row.order_experience_rating ?? null,
            paidAt: row.paid_at ?? undefined,
            shippedAt: row.shipped_at ?? undefined,
            deliveredAt: row.delivered_at ?? undefined,
            productionStatus: operation?.production_status,
            proofApproved: Boolean(operation?.customer_approved_at),
            proofUrl: operation && isSecureProofUrl(operation.proof_url) ? operation.proof_url : undefined,
            reviewedProductIds: databaseOrderId ? reviewsByOrderId.get(databaseOrderId) ?? [] : [],
            events: databaseOrderId ? eventsByOrderId.get(databaseOrderId) ?? [] : []
          }
        })
      })
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST, PATCH')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }

    const origin = req.headers.origin
    const forwardedHost = req.headers['x-forwarded-host']
    const requestHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? req.headers.host
    if (!origin || !requestHost) return sendJson(res, 403, { error: 'The request origin could not be verified.' })
    try {
      if (new URL(origin).host.toLowerCase() !== requestHost.toLowerCase()) {
        return sendJson(res, 403, { error: 'The request origin could not be verified.' })
      }
    } catch {
      return sendJson(res, 403, { error: 'The request origin could not be verified.' })
    }

    const body = readBody(req)
    const customer = body.customer
    const items = body.items
    const idempotencyKey = body.idempotencyKey
    if (
      !customer || typeof customer !== 'object' || Array.isArray(customer)
      || typeof idempotencyKey !== 'string' || !/^[a-f0-9-]{36}$/i.test(idempotencyKey)
      || !Array.isArray(items) || items.length < 1 || items.length > 100
      || !items.every(item => item && typeof item === 'object' && !Array.isArray(item)
        && typeof item.productId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(item.productId)
        && Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99
        && (item.variantId === undefined || (typeof item.variantId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(item.variantId)))
        && (item.finish === undefined || item.finish === 'matte' || item.finish === 'gloss')
        && (item.recipientName === undefined || (typeof item.recipientName === 'string' && item.recipientName.length <= 100))
        && (item.customMessage === undefined || (typeof item.customMessage === 'string' && item.customMessage.length <= (item.magazineCustomization === undefined ? 1000 : 10000)))
        && (item.customComponents === undefined || (Array.isArray(item.customComponents) && item.customComponents.length <= 20
          && item.customComponents.every((value: unknown) => typeof value === 'string' && value.length <= 100)))
        && (item.magazineCustomization === undefined || isMagazineCustomizationData(item.magazineCustomization))
        && (item.productId !== 'custom_hamper_mix' || (Array.isArray(item.customComponents) && item.customComponents.length >= 2)))
    ) return sendJson(res, 400, { error: 'The order details are incomplete or invalid.' })

    const details = customer as Record<string, unknown>
    const customerName = typeof details.customerName === 'string' ? details.customerName.trim() : ''
    const phoneNumber = typeof details.phoneNumber === 'string' ? details.phoneNumber.trim() : ''
    const email = typeof details.email === 'string' ? details.email.trim().toLowerCase() : ''
    const address = typeof details.address === 'string' ? details.address.trim() : ''
    const city = typeof details.city === 'string' ? details.city.trim() : ''
    const state = typeof details.state === 'string' ? details.state.trim() : ''
    const postalCode = typeof details.postalCode === 'string' ? details.postalCode.trim() : ''
    const notes = typeof details.notes === 'string' ? details.notes.trim() : ''
    if (
      customerName.length < 2 || customerName.length > 120
      || !normalizeValidPhoneNumber(phoneNumber) || !isValidAccountEmail(email)
      || address.length < 5 || address.length > 240
      || city.length < 2 || city.length > 100
      || state.length > 100
      || notes.length > 500
      || !/^\d{5,8}$/.test(postalCode)
    ) return sendJson(res, 400, { error: 'Enter valid delivery contact and address details.' })

    const priorOrder = await supabaseRequest<StoredAccountOrder[]>(
      'aurel_orders',
      new URLSearchParams({
        user_id: `eq.${account.id}`,
        idempotency_key: `eq.${idempotencyKey}`,
        select: 'id,order_id,order_data,created_at,payment_status,order_status,paid_at',
        limit: '1'
      })
    )
    if (priorOrder[0]) {
      const row = priorOrder[0]
      if (typeof row.id === 'number' && Array.isArray(row.order_data.items)) {
        await associateMagazineOrderItems(row.id, account.id, row.order_data.items as Array<Record<string, unknown>>)
      }
      return sendJson(res, 200, {
        order: { ...row.order_data, orderId: row.order_id, paymentStatus: row.payment_status, orderStatus: row.order_status, paidAt: row.paid_at ?? undefined },
        createdAt: row.created_at
      })
    }

    type CheckoutProduct = {
      id: string
      name: string
      category: string
      price: number | string
      image_url: string
      variants: { id: string; name: string; price: number; stockQuantity: number | null }[]
      stock_quantity: number | null
      is_active: boolean
      is_published: boolean
      is_customizable: boolean
      available_finishes: string[]
    }
    const productIds = [...new Set((items as Array<{ productId: string }>)
      .map(item => item.productId)
      .filter(productId => productId !== 'custom_hamper_mix'))]
    const products = await supabaseRequest<CheckoutProduct[]>(
      'aurel_products',
      new URLSearchParams({
        id: `in.(${productIds.join(',')})`,
        select: 'id,name,category,price,image_url,variants,stock_quantity,is_active,is_published,is_customizable,available_finishes',
        limit: '100'
      })
    )
    const productsById = new Map(products.map(product => [product.id, product]))
    const usesBuiltInMagazine = (items as Array<Record<string, unknown>>).some(item =>
      item.productId === 'prod_magazine_legacy' && isMagazineCustomizationData(item.magazineCustomization)
    )
    const builtInMagazine = PRODUCTS.find(product => product.id === 'prod_magazine_legacy')
    if (usesBuiltInMagazine && builtInMagazine) {
      productsById.set(builtInMagazine.id, {
        id: builtInMagazine.id,
        name: builtInMagazine.name,
        category: builtInMagazine.category,
        price: builtInMagazine.price,
        image_url: builtInMagazine.imageUrl,
        variants: [],
        stock_quantity: null,
        is_active: true,
        is_published: true,
        is_customizable: true,
        available_finishes: builtInMagazine.availableFinishes ?? []
      })
    }
    if (productsById.size !== productIds.length) return sendJson(res, 409, { error: 'One or more products are no longer available. Refresh your cart and try again.' })

    await validateMagazineOrderUploads(account.id, items as Array<Record<string, unknown>>)
    const quantities = new Map<string, number>()
    const orderItems: PersistedOrderItem[] = (items as Array<Record<string, unknown>>).map(item => {
      if (item.productId === 'custom_hamper_mix') {
        const components = item.customComponents as string[]
        const selectedComponents = components.map(name => BUILDER_ITEMS.find(component => component.name === name))
        if (!selectedComponents.length || selectedComponents.some(component => !component) || selectedComponents[0]?.category !== 'box') {
          throw new OrderValidationError('The custom hamper contains an unavailable component. Update it and try again.')
        }
        const customPrice = selectedComponents.reduce((sum, component) => sum + (component?.price ?? 0), 0)
        const customName = typeof item.name === 'string' && item.name.trim() ? item.name.trim().slice(0, 160) : 'Custom Mix & Match Hamper'
        return {
          cartId: typeof item.cartId === 'string' ? item.cartId.slice(0, 120) : `custom-${randomBytes(8).toString('hex')}`,
          productId: 'custom_hamper_mix',
          name: customName,
          price: customPrice,
          quantity: Number(item.quantity),
          imageUrl: selectedComponents[0]?.imageUrl ?? '',
          ...(typeof item.recipientName === 'string' && item.recipientName.trim() ? { recipientName: item.recipientName.trim() } : {}),
          ...(typeof item.customMessage === 'string' && item.customMessage.trim() ? { customMessage: item.customMessage.trim() } : {}),
          customComponents: components
        }
      }
      const product = productsById.get(String(item.productId))
      if (!product || !product.is_active || !product.is_published) {
        throw new OrderValidationError('One or more products are no longer available. Refresh your cart and try again.')
      }
      const customComponents = Array.isArray(item.customComponents) ? item.customComponents as string[] : undefined
      const magazineCustomization = isMagazineCustomizationData(item.magazineCustomization)
        ? {
          customizationId: item.magazineCustomization.customizationId,
          recipientName: item.magazineCustomization.recipientName.trim() || 'Beloved',
          printFinish: item.magazineCustomization.printFinish,
          occasion: item.magazineCustomization.occasion.trim(),
          photoUploadIds: [...item.magazineCustomization.photoUploadIds],
          pageCount: item.magazineCustomization.pageCount,
          dedicationMessage: item.magazineCustomization.dedicationMessage.trim(),
          ...(item.magazineCustomization.messageUploadId ? { messageUploadId: item.magazineCustomization.messageUploadId } : {}),
          additionalPreferences: item.magazineCustomization.additionalPreferences.trim()
        }
        : undefined
      const legacyMagazinePageCount = customComponents?.find(component => component === '4 pages' || component === '8 pages')
      const magazinePageCount = magazineCustomization?.pageCount ?? (legacyMagazinePageCount === '8 pages' ? 8 : legacyMagazinePageCount === '4 pages' ? 4 : undefined)
      const hasMagazineDetails = Boolean(magazineCustomization) || (customComponents?.some(component =>
        /^\d+ pages$/.test(component) || component.startsWith('Sample: ') || component.startsWith('Occasion: ')
      ) ?? false)
      if (hasMagazineDetails && (
        product.category !== 'magazines'
        || !product.is_customizable
        || !magazinePageCount
      )) {
        throw new OrderValidationError('The magazine options are invalid. Please review your magazine selection and try again.')
      }
      if (magazineCustomization && item.variantId !== undefined) {
        throw new OrderValidationError('Custom magazines cannot include a separate product variant.')
      }
      const quantity = Number(item.quantity)
      const variantId = typeof item.variantId === 'string' ? item.variantId : undefined
      const variant = variantId ? product.variants?.find(candidate => candidate.id === variantId) : undefined
      if (variantId && !variant) throw new OrderValidationError(`The selected option for ${product.name} is no longer available.`)
      const availableFinishes = product.available_finishes ?? []
      if (item.finish && availableFinishes.length > 0 && !availableFinishes.includes(String(item.finish))) {
        throw new OrderValidationError(`The selected finish for ${product.name} is no longer available.`)
      }
      const price = magazinePageCount
        ? MAGAZINE_PRICES[magazinePageCount === 8 ? 8 : 4]
        : Number(variant?.price ?? product.price)
      if (!Number.isFinite(price) || price < 0) throw new OrderValidationError(`The price for ${product.name} is unavailable.`)
      const stockKey = `${product.id}:${variantId ?? ''}`
      const selectedStock = variant?.stockQuantity ?? (variant ? null : product.stock_quantity)
      if (!magazinePageCount) {
        quantities.set(stockKey, (quantities.get(stockKey) ?? 0) + quantity)
        if (selectedStock !== null && quantities.get(stockKey)! > selectedStock) {
          throw new OrderValidationError(`${product.name} does not have enough stock for the requested quantity.`)
        }
      }
      return {
        cartId: typeof item.cartId === 'string' ? item.cartId.slice(0, 120) : `${product.id}-${randomBytes(8).toString('hex')}`,
        productId: product.id,
        name: magazinePageCount
          ? `Custom Magazine (${(magazineCustomization?.recipientName ?? (typeof item.recipientName === 'string' && item.recipientName.trim() ? item.recipientName.trim() : 'Beloved')).toUpperCase()})`
          : product.name,
        price,
        quantity,
        imageUrl: product.image_url,
        ...(variant ? { variantId: variant.id, variantName: variant.name } : {}),
        ...(magazineCustomization ? { magazineCustomization } : {
          ...(typeof item.finish === 'string' && availableFinishes.includes(item.finish) ? { finish: item.finish } : {}),
          ...(typeof item.recipientName === 'string' && item.recipientName.trim() ? { recipientName: item.recipientName.trim() } : {}),
          ...(typeof item.customMessage === 'string' && item.customMessage.trim() ? { customMessage: item.customMessage.trim() } : {})
        }),
        ...(customComponents ? { customComponents } : {})
      }
    })
    if (orderItems.some(item => item.magazineCustomization && !productsById.get(String(item.productId))?.available_finishes?.includes(item.magazineCustomization.printFinish))) {
      throw new OrderValidationError('The selected magazine print finish is no longer available.')
    }
    const subtotal = Math.round(orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0) * 100) / 100
    const shipping = subtotal === 0 || subtotal >= 1500 ? 0 : 99
    const total = Math.round((subtotal + shipping) * 100) / 100
    const generatedOrderId = await supabaseRequest<string>('rpc/aurel_next_order_number', new URLSearchParams(), {
      method: 'POST',
      body: JSON.stringify({})
    })
    if (typeof generatedOrderId !== 'string' || !/^AUR-\d{4}-\d{5,}$/.test(generatedOrderId)) {
      throw new Error('A unique order number could not be generated.')
    }
    const createdAt = new Date().toISOString()
    const orderData = {
      orderId: generatedOrderId,
      customerName,
      phoneNumber,
      email,
      address,
      city,
      state,
      postalCode,
      notes,
      paymentMethod: 'upi',
      paymentTimestamp: createdAt,
      items: orderItems,
      subtotal,
      shipping,
      total,
      status: 'pending',
      paymentStatus: 'pending',
      orderStatus: 'pending_payment'
    }
    let stored: StoredAccountOrder[]
    try {
      stored = await supabaseRequest<StoredAccountOrder[]>(
        'aurel_orders',
        new URLSearchParams({ select: 'id,order_id,order_data,created_at,payment_status,order_status,paid_at' }),
        {
          method: 'POST',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({
            user_id: account.id,
            order_id: generatedOrderId,
            order_data: orderData,
            payment_method: 'upi',
            payment_status: 'pending',
            order_status: 'pending_payment',
            fulfillment_status: 'unfulfilled',
            idempotency_key: idempotencyKey
          })
        }
      )
    } catch (insertError) {
      if (!(insertError instanceof AccountServiceError) || String(insertError.code) !== '23505') throw insertError
      stored = await supabaseRequest<StoredAccountOrder[]>(
        'aurel_orders',
        new URLSearchParams({
          user_id: `eq.${account.id}`,
          idempotency_key: `eq.${idempotencyKey}`,
          select: 'id,order_id,order_data,created_at,payment_status,order_status,paid_at',
          limit: '1'
        })
      )
    }
    const row = stored[0]
    if (!row) return sendJson(res, 500, { error: 'The order could not be saved to your account.' })
    if (typeof row.id !== 'number') throw new Error('The saved order did not return its database ID.')
    await associateMagazineOrderItems(row.id, account.id, orderItems)
    return sendJson(res, 201, {
      order: { ...row.order_data, orderId: row.order_id, paymentStatus: row.payment_status, orderStatus: row.order_status },
      createdAt: row.created_at
    })
  } catch (error) {
    handleFailure(res, error, 'Unable to load or save your orders right now.')
  }
}

export async function paymentConfigHandler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'Method not allowed.' })
  }
  const upiId = process.env.AUREL_UPI_ID?.trim() || 'shriyansh.dogra2003@okicici'
  const payeeName = process.env.AUREL_UPI_PAYEE_NAME?.trim() || 'AUREL'
  const configuredNumber = (process.env.AUREL_WHATSAPP_NUMBER || '8588905927').replace(/\D/g, '')
  if (!/^[\w.-]+@[\w.-]+$/.test(upiId) || !payeeName || payeeName.length > 80 || !/^\d{10,15}$/.test(configuredNumber)) {
    console.error('Public checkout payment configuration is invalid.')
    return sendJson(res, 503, { error: 'Payment details are temporarily unavailable. Please contact AUREL.' })
  }
  const whatsappNumber = configuredNumber.startsWith('91') ? configuredNumber : `91${configuredNumber.replace(/^0+/, '')}`
  return sendJson(res, 200, { config: { upiId, payeeName, whatsappNumber } })
}

export async function accountReviewHandler(req: AuthRequest, res: ServerResponse): Promise<void> {
  try {
    const account = await getSessionAccount(req)
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return sendJson(res, 405, { error: 'Method not allowed.' })
    }
    const origin = req.headers.origin
    const forwardedHost = req.headers['x-forwarded-host']
    const requestHost = Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? req.headers.host
    if (!origin || !requestHost) return sendJson(res, 403, { error: 'The request origin could not be verified.' })
    try {
      if (new URL(origin).host.toLowerCase() !== requestHost.toLowerCase()) {
        return sendJson(res, 403, { error: 'The request origin could not be verified.' })
      }
    } catch {
      return sendJson(res, 403, { error: 'The request origin could not be verified.' })
    }
    const body = readBody(req)
    const orderId = body.orderId
    const productId = body.productId
    const rating = body.rating
    const reviewerName = typeof body.reviewerName === 'string' ? body.reviewerName.trim() : account?.name ?? ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const reviewBody = typeof body.body === 'string' ? body.body.trim() : ''
    if ((orderId !== undefined && (typeof orderId !== 'string' || !/^(?:AUR-\d{4}-\d{5,}|AUREL[A-Z0-9]{5,16})$/.test(orderId)))
      || typeof productId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(productId)
      || typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5
      || reviewerName.length > 80 || title.length > 120 || (reviewBody.length > 0 && reviewBody.length < 10) || reviewBody.length > 3000) {
      return sendJson(res, 400, { error: 'Provide a valid product, reviewer name, 1–5 star rating, and a review that is either empty or at least 10 characters.' })
    }
    let order: { id: number; order_data: Record<string, unknown>; fulfillment_status: string } | undefined
    if (typeof orderId === 'string') {
      if (!account) return sendJson(res, 401, { error: 'Sign in to submit a verified order review.' })
      const orders = await supabaseRequest<Array<{ id: number; order_data: Record<string, unknown>; fulfillment_status: string }>>(
        'aurel_orders',
        new URLSearchParams({ user_id: `eq.${account.id}`, order_id: `eq.${orderId}`, select: 'id,order_data,fulfillment_status', limit: '1' })
      )
      order = orders[0]
      if (!order) return sendJson(res, 404, { error: 'Order not found in your account.' })
      if (order.fulfillment_status !== 'delivered') {
        return sendJson(res, 409, { error: 'Verified order reviews can be submitted after delivery. You can also submit a storefront review without an order.' })
      }
      const items = Array.isArray(order.order_data.items) ? order.order_data.items as Array<Record<string, unknown>> : []
      if (!items.some(item => item.productId === productId)) return sendJson(res, 403, { error: 'You can only review a product included in this delivered order.' })
      const existing = await supabaseRequest<Array<{ id: number }>>(
        'aurel_reviews',
        new URLSearchParams({ order_id: `eq.${order.id}`, product_id: `eq.${productId}`, select: 'id', limit: '1' })
      )
      if (existing.length) return sendJson(res, 409, { error: 'A review for this product and order has already been submitted.' })
    } else {
      const products = await supabaseRequest<Array<{ id: string; name: string }>>(
        'aurel_products',
        new URLSearchParams({ id: `eq.${productId}`, is_active: 'eq.true', is_published: 'eq.true', select: 'id,name', limit: '1' })
      )
      if (!products[0]) return sendJson(res, 404, { error: 'This product is not available for review.' })
      if (account) {
        const existing = await supabaseRequest<Array<{ id: number }>>(
          'aurel_reviews',
          new URLSearchParams({ user_id: `eq.${account.id}`, order_id: 'is.null', product_id: `eq.${productId}`, select: 'id', limit: '1' })
        )
        if (existing.length) return sendJson(res, 409, { error: 'You have already submitted a storefront review for this product.' })
      }
    }
    const inserted = await supabaseRequest<Array<{ id: number }>>('aurel_reviews', new URLSearchParams(), {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        order_id: order?.id ?? null,
        user_id: account?.id ?? null,
        product_id: productId,
        rating,
        reviewer_name: reviewerName || 'Customer',
        title,
        body: reviewBody,
        moderation_status: 'pending'
      })
    })
    if (!inserted[0]) return sendJson(res, 500, { error: 'Your review could not be submitted.' })
    if (order && account) {
      await supabaseRequest('aurel_order_events', new URLSearchParams(), {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          order_id: order.id,
          actor_type: 'customer',
          actor_user_id: account.id,
          event_type: 'review_submitted',
          summary: `Customer submitted a review for ${productId}.`,
          metadata: { reviewId: inserted[0].id }
        })
      })
    }
    await supabaseRequest('aurel_admin_notifications', new URLSearchParams(), {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        notification_type: 'review_submitted',
        title: 'A product review needs moderation',
        message: `A review was submitted for product ${productId}.`,
        target_type: 'review',
        target_id: String(inserted[0].id)
      })
    })
    return sendJson(res, 201, { success: true, reviewId: inserted[0].id, moderationStatus: 'pending' })
  } catch (error) {
    handleFailure(res, error, 'Unable to submit your review right now.')
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
    if (account.account_status === 'disabled') {
      return sendJson(res, 403, { error: 'This account has been disabled. Contact support for help.' })
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
