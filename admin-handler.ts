import { createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PRODUCTS } from './src/data/products.js'
import type { Product } from './src/types/index.js'
import { getSupabaseAuthKey, getSupabaseConfig, supabaseRequest } from './auth-handler.js'
import { normalizeValidPhoneNumber } from './src/utils/accountValidation.js'

interface AdminRequest extends IncomingMessage {
  body?: unknown
  query?: Record<string, unknown>
}

interface AdminSession {
  user_id: string
  access_token: string
  refresh_token: string
  expires_at: string
}

interface DeletionAuthUser {
  id: string
  email?: string
}

class AdminAuthRequestError extends Error {
  constructor(readonly status: number) {
    super('Supabase Auth could not complete the customer deletion request.')
  }
}

interface AuthTokens {
  access_token?: string
  refresh_token?: string
  expires_in?: number
  user?: { id?: string; email?: string; email_confirmed_at?: string | null }
}

class AdminIdentityError extends Error {
  constructor(readonly status: number) {
    super('The identity provider rejected the admin session.')
  }
}

interface ProductRecord {
  id: string
  name: string
  category: string
  sub_category: string | null
  price: number | string
  rating: number | string
  reviews_count: number
  image_url: string
  image_urls: string[]
  fallback_color: string
  description: string
  tagline: string
  available_finishes: string[]
  is_customizable: boolean
  features: string[]
  stock_quantity: number | null
  is_active: boolean
  is_published: boolean
  created_at: string
  updated_at: string
}

interface StoreSettings {
  storeName: string
  tagline: string
  description: string
  contactEmail: string
  phone: string
  whatsappNumber: string
  instagramUrl: string
  facebookUrl: string
  deliveryNote: string
}

const cookieName = 'aurel_admin_session'
const sessionDurationSeconds = 60 * 60 * 8
const defaultSettings: StoreSettings = {
  storeName: 'AUREL',
  tagline: 'Made With Love For You',
  description: 'Curated luxury memory magazines, botanical bouquets, eternal single blossoms, and thoughtful keepsakes.',
  contactEmail: 'concierge@aurelgifts.com',
  phone: '',
  whatsappNumber: '',
  instagramUrl: '',
  facebookUrl: '',
  deliveryNote: 'Pan India Delivery'
}

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

const fetchAllRows = async <T,>(table: string, query: URLSearchParams, pageSize = 1000, maxRows = 20_000): Promise<T[]> => {
  const rows: T[] = []
  for (let offset = 0; offset <= maxRows; offset += pageSize) {
    const pageQuery = new URLSearchParams(query)
    pageQuery.set('limit', String(Math.min(pageSize, maxRows - offset + 1)))
    pageQuery.set('offset', String(offset))
    const page = await supabaseRequest<T[]>(table, pageQuery)
    rows.push(...page)
    if (page.length < pageSize) return rows
    if (rows.length > maxRows) {
      throw new Error(`The ${table} dashboard list exceeds the ${maxRows.toLocaleString()}-record safety limit.`)
    }
  }
  return rows
}

const parseBody = (req: AdminRequest): Record<string, unknown> =>
  req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    ? req.body as Record<string, unknown>
    : {}

const requestPath = (req: AdminRequest): string => {
  const rewrittenRoute = req.query?.route
  const route = typeof rewrittenRoute === 'string'
    ? rewrittenRoute
    : Array.isArray(rewrittenRoute) && typeof rewrittenRoute[0] === 'string'
      ? rewrittenRoute[0]
      : undefined
  return route ?? new URL(req.url ?? '/', 'http://localhost').searchParams.get('route')
    ?? new URL(req.url ?? '/', 'http://localhost').pathname
}

const getAdminEmails = (): Set<string> =>
  new Set((process.env.ADMIN_EMAILS ?? '').split(',').map(email => email.trim().toLowerCase()).filter(Boolean))

const getCookieToken = (req: AdminRequest): string | undefined => {
  const value = req.headers.cookie?.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  return value && /^[a-f0-9]{64}$/.test(value) ? value : undefined
}

const cookieHeader = (token: string, clear = false) => {
  const secure = process.env.NODE_ENV === 'production' || process.env.VERCEL ? '; Secure' : ''
  return `${cookieName}=${clear ? '' : token}; HttpOnly; SameSite=Lax; Path=/api/admin; Max-Age=${clear ? 0 : sessionDurationSeconds}${secure}`
}

const requestAuth = async <T>(path: string, body?: unknown, accessToken?: string): Promise<T> => {
  const { supabaseUrl } = getSupabaseConfig()
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      apikey: getSupabaseAuthKey(),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  })
  const payload = await response.json().catch(() => ({})) as T
  if (!response.ok) throw new AdminIdentityError(response.status)
  return payload
}

const getDeletionAuthUser = async (userId: string): Promise<DeletionAuthUser | undefined> => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
  })
  if (response.status === 404) return undefined
  if (!response.ok) throw new AdminAuthRequestError(response.status)

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new AdminAuthRequestError(response.status)
  }
  if (!payload || typeof payload !== 'object' || !('id' in payload) || payload.id !== userId) {
    throw new AdminAuthRequestError(response.status)
  }
  return {
    id: userId,
    email: 'email' in payload && typeof payload.email === 'string' ? payload.email : undefined
  }
}

const deleteAuthUser = async (userId: string): Promise<void> => {
  const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
    headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
  })
  if (!response.ok && response.status !== 404) throw new AdminAuthRequestError(response.status)
}

const upsertSession = async (tokenHash: string, userId: string, tokens: AuthTokens) => {
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expires_in) {
    throw new Error('The identity provider returned an incomplete admin session.')
  }
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  await supabaseRequest('aurel_admin_sessions', new URLSearchParams({ on_conflict: 'token_hash' }), {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      token_hash: tokenHash,
      user_id: userId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt
    })
  })
  return expiresAt
}

const requireAdmin = async (req: AdminRequest): Promise<AdminSession | undefined> => {
  const allowedEmails = getAdminEmails()
  if (!allowedEmails.size) throw new Error('ADMIN_EMAILS is not configured.')
  const token = getCookieToken(req)
  if (!token) return undefined
  const tokenHash = createHash('sha256').update(token).digest('hex')
  const sessions = await supabaseRequest<AdminSession[]>(
    'aurel_admin_sessions',
    new URLSearchParams({
      token_hash: `eq.${tokenHash}`,
      select: 'user_id,access_token,refresh_token,expires_at',
      limit: '1'
    })
  )
  let session = sessions[0]
  if (!session) return undefined
  if (Date.parse(session.expires_at) < Date.now() + 60_000) {
    try {
      const refreshed = await requestAuth<AuthTokens>('token?grant_type=refresh_token', {
        refresh_token: session.refresh_token
      })
      await upsertSession(tokenHash, session.user_id, refreshed)
      session = { ...session, access_token: refreshed.access_token!, refresh_token: refreshed.refresh_token!, expires_at: new Date(Date.now() + refreshed.expires_in! * 1000).toISOString() }
    } catch (error) {
      if (error instanceof AdminIdentityError && [400, 401, 403].includes(error.status)) {
        await supabaseRequest('aurel_admin_sessions', new URLSearchParams({ token_hash: `eq.${tokenHash}` }), { method: 'DELETE' })
        return undefined
      }
      throw error
    }
  }
  let user: AuthTokens['user']
  try {
    user = await requestAuth<AuthTokens['user']>('user', undefined, session.access_token)
  } catch (error) {
    if (error instanceof AdminIdentityError && (error.status === 401 || error.status === 403)) {
      await supabaseRequest('aurel_admin_sessions', new URLSearchParams({ token_hash: `eq.${tokenHash}` }), { method: 'DELETE' })
      return undefined
    }
    throw error
  }
  if (!user?.id || user.id !== session.user_id || !user.email || !allowedEmails.has(user.email.toLowerCase())) {
    await supabaseRequest('aurel_admin_sessions', new URLSearchParams({ token_hash: `eq.${tokenHash}` }), { method: 'DELETE' })
    return undefined
  }
  return session
}

const isSameOrigin = (req: AdminRequest): boolean => {
  const origin = req.headers.origin
  if (!origin) return false
  try {
    const originHost = new URL(origin).host.toLowerCase()
    const forwardedHost = req.headers['x-forwarded-host']
    const expectedHost = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost ?? req.headers.host)?.toLowerCase()
    return Boolean(expectedHost && originHost === expectedHost)
  } catch {
    return false
  }
}

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const productCategorySlug = (value: string) => value === 'custom_builder' ? value : slugify(value)
const validPublicUrl = (value: string) => {
  if (!value) return true
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}

const categorySeeds = () => {
  const categories = new Map<string, { slug: string; name: string }>()
  for (const product of PRODUCTS) {
    const slug = productCategorySlug(product.category)
    if (slug && !categories.has(slug)) {
      categories.set(slug, { slug, name: product.category.split('-').map(part => part[0]?.toUpperCase() + part.slice(1)).join(' ') })
    }
  }
  return [...categories.values()]
}

const toProductRecord = (product: Product): Omit<ProductRecord, 'created_at' | 'updated_at' | 'stock_quantity' | 'is_active' | 'is_published'> & {
  stock_quantity?: number | null
  is_active?: boolean
  is_published?: boolean
} => ({
  id: product.id,
  name: product.name,
  category: productCategorySlug(product.category),
  sub_category: product.subCategory ?? null,
  price: product.price,
  rating: product.rating,
  reviews_count: product.reviewsCount,
  image_url: product.imageUrl,
  image_urls: [product.imageUrl],
  fallback_color: product.fallbackColor,
  description: product.description,
  tagline: product.tagline,
  available_finishes: product.availableFinishes ?? [],
  is_customizable: product.isCustomizable ?? false,
  features: product.features,
  stock_quantity: null,
  is_active: true,
  is_published: true
})

const toPublicProduct = (record: ProductRecord): Product & { stockQuantity: number | null; isActive: boolean; isPublished: boolean } => ({
  id: record.id,
  name: record.name,
  category: record.category as Product['category'],
  subCategory: record.sub_category ?? undefined,
  price: Number(record.price),
  rating: Number(record.rating),
  reviewsCount: record.reviews_count,
  imageUrl: record.image_url,
  imageUrls: Array.isArray(record.image_urls) ? record.image_urls : [],
  fallbackColor: record.fallback_color,
  description: record.description,
  tagline: record.tagline,
  availableFinishes: record.available_finishes as Product['availableFinishes'],
  isCustomizable: record.is_customizable,
  features: record.features,
  stockQuantity: record.stock_quantity,
  isActive: record.is_active,
  isPublished: record.is_published
})

const loadPublicCatalog = async () => {
  const [productRecords, categories, settingsRows] = await Promise.all([
    fetchAllRows<ProductRecord>('aurel_products', new URLSearchParams({
      select: 'id,name,category,sub_category,price,rating,reviews_count,image_url,image_urls,fallback_color,description,tagline,available_finishes,is_customizable,features,stock_quantity,is_active,is_published,created_at,updated_at',
      order: 'created_at.desc',
      limit: '1000'
    })),
    supabaseRequest<Array<{ slug: string; name: string; description: string; image_url: string }>>(
      'aurel_categories',
      new URLSearchParams({ is_active: 'eq.true', select: 'slug,name,description,image_url', order: 'name.asc' })
    ),
    supabaseRequest<Array<{ settings: Partial<StoreSettings> & Record<string, unknown> }>>(
      'aurel_store_settings',
      new URLSearchParams({ id: 'eq.storefront', select: 'settings', limit: '1' })
    )
  ])
  const activeCategorySlugs = new Set(categories.map(category => category.slug))
  const storedSettings = settingsRows[0]?.settings ?? {}
  const catalogInitialized = storedSettings.catalogInitialized === true
  return {
    products: productRecords.length || catalogInitialized
      ? productRecords
        .filter(product => product.is_active && product.is_published && activeCategorySlugs.has(product.category))
        .map(toPublicProduct)
      : PRODUCTS,
    categories: categories.length ? categories : categorySeeds().map(category => ({ ...category, description: '', image_url: '' })),
    settings: Object.fromEntries(
      Object.keys(defaultSettings).map(key => [key, storedSettings[key as keyof StoreSettings] ?? defaultSettings[key as keyof StoreSettings]])
    )
  }
}

const markCatalogInitialized = async () => {
  const rows = await supabaseRequest<Array<{ settings: Record<string, unknown> }>>(
    'aurel_store_settings',
    new URLSearchParams({ id: 'eq.storefront', select: 'settings', limit: '1' })
  )
  await supabaseRequest('aurel_store_settings', new URLSearchParams({ on_conflict: 'id' }), {
    method: 'POST',
    body: JSON.stringify({
      id: 'storefront',
      settings: { ...(rows[0]?.settings ?? {}), catalogInitialized: true },
      updated_at: new Date().toISOString()
    }),
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
  })
}

export async function publicCatalogHandler(_req: IncomingMessage, res: ServerResponse) {
  try {
    const catalog = await loadPublicCatalog()
    sendJson(res, 200, catalog)
  } catch (error) {
    console.error('Unable to load the database catalog:', error)
    sendJson(res, 503, { error: 'The database catalog is unavailable. The storefront is retaining its bundled catalog.' })
  }
}

const adminLogin = async (req: AdminRequest, res: ServerResponse) => {
  const body = parseBody(req)
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const allowedEmails = getAdminEmails()
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return sendJson(res, 503, { error: 'The owner dashboard requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.' })
  }
  if (!allowedEmails.size) return sendJson(res, 503, { error: 'The owner dashboard is not configured. Set ADMIN_EMAILS on the server.' })
  if (!email || !password || !allowedEmails.has(email)) {
    return sendJson(res, 401, { error: 'Unable to sign in with those owner credentials.' })
  }
  try {
    const tokens = await requestAuth<AuthTokens>('token?grant_type=password', { email, password })
    if (!tokens.user?.id || !tokens.user.email || !tokens.user.email_confirmed_at
      || !allowedEmails.has(tokens.user.email.toLowerCase())) {
      return sendJson(res, 403, { error: 'The owner account must be allowlisted and have a verified email address.' })
    }
    const token = randomBytes(32).toString('hex')
    const tokenHash = createHash('sha256').update(token).digest('hex')
    await upsertSession(tokenHash, tokens.user.id, tokens)
    res.setHeader('Set-Cookie', cookieHeader(token))
    return sendJson(res, 200, { user: { id: tokens.user.id, email: tokens.user.email } })
  } catch (error) {
    console.error('Admin sign-in failed:', error)
    if (error instanceof AdminIdentityError && error.status >= 400 && error.status < 500) {
      return sendJson(res, error.status === 429 ? 429 : 401, { error: 'Unable to sign in with those owner credentials.' })
    }
    return sendJson(res, 503, { error: 'Owner sign-in is temporarily unavailable. Check the admin migration and Supabase configuration.' })
  }
}

const productPayload = (body: Record<string, unknown>, existing?: ProductRecord) => {
  const value = (key: string, previous: unknown) => body[key] === undefined ? previous : body[key]
  const id = value('id', existing?.id)
  const name = value('name', existing?.name)
  const category = value('category', existing?.category)
  const price = value('price', existing?.price)
  const rating = value('rating', existing?.rating ?? 0)
  const reviewsCount = value('reviewsCount', existing?.reviews_count ?? 0)
  const imageUrl = value('imageUrl', existing?.image_url ?? '')
  const fallbackColor = value('fallbackColor', existing?.fallback_color ?? '#F6E8E0')
  const description = value('description', existing?.description ?? '')
  const tagline = value('tagline', existing?.tagline ?? '')
  const availableFinishes = value('availableFinishes', existing?.available_finishes ?? [])
  const features = value('features', existing?.features ?? [])
  const stockQuantity = value('stockQuantity', existing?.stock_quantity ?? null)
  const isCustomizable = value('isCustomizable', existing?.is_customizable ?? false)
  const isActive = value('isActive', existing?.is_active ?? true)
  const isPublished = value('isPublished', existing?.is_published ?? true)
  const subCategory = value('subCategory', existing?.sub_category ?? null)

  if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(id)
    || typeof name !== 'string' || !name.trim() || name.length > 160
    || typeof category !== 'string' || !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(category)
    || typeof price !== 'number' || !Number.isFinite(price) || price < 0
    || typeof rating !== 'number' || !Number.isFinite(rating) || rating < 0 || rating > 5
    || typeof reviewsCount !== 'number' || !Number.isInteger(reviewsCount) || reviewsCount < 0
    || typeof imageUrl !== 'string' || imageUrl.length > 2000
    || typeof fallbackColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(fallbackColor)
    || typeof description !== 'string' || description.length > 10000
    || typeof tagline !== 'string' || tagline.length > 500
    || !Array.isArray(availableFinishes) || !availableFinishes.every(item => item === 'matte' || item === 'gloss')
    || !Array.isArray(features) || features.length > 50 || !features.every(item => typeof item === 'string' && item.length <= 300)
    || !(stockQuantity === null || (typeof stockQuantity === 'number' && Number.isInteger(stockQuantity) && stockQuantity >= 0))
    || typeof isCustomizable !== 'boolean' || typeof isActive !== 'boolean' || typeof isPublished !== 'boolean'
    || !(subCategory === null || (typeof subCategory === 'string' && subCategory.length <= 100))) return undefined

  return {
    id, name: name.trim(), category, sub_category: subCategory, price, rating, reviews_count: reviewsCount,
    image_url: imageUrl, image_urls: imageUrl ? [imageUrl] : [], fallback_color: fallbackColor,
    description, tagline, available_finishes: availableFinishes, is_customizable: isCustomizable,
    features, stock_quantity: stockQuantity, is_active: isActive, is_published: isPublished,
    updated_at: new Date().toISOString()
  }
}

const handleAdminRoute = async (req: AdminRequest, res: ServerResponse, path: string) => {
  const method = req.method ?? 'GET'
  if (path === '/api/admin/login' && method === 'POST') return adminLogin(req, res)
  if (path === '/api/admin/logout' && method === 'POST') {
    if (!isSameOrigin(req)) return sendJson(res, 403, { error: 'The request origin could not be verified.' })
    const token = getCookieToken(req)
    if (token) {
      const tokenHash = createHash('sha256').update(token).digest('hex')
      await supabaseRequest('aurel_admin_sessions', new URLSearchParams({ token_hash: `eq.${tokenHash}` }), { method: 'DELETE' })
    }
    res.setHeader('Set-Cookie', cookieHeader('', true))
    return sendJson(res, 200, { success: true })
  }
  if (path === '/api/catalog' && method === 'GET') return publicCatalogHandler(req, res)
  if (!path.startsWith('/api/admin/')) return sendJson(res, 404, { error: 'API route not found.' })

  let session: AdminSession | undefined
  try {
    session = await requireAdmin(req)
  } catch (error) {
    console.error('Admin session verification failed:', error)
    return sendJson(res, 503, { error: 'Unable to verify the owner session. Check the admin migration and server configuration.' })
  }
  if (!session) return sendJson(res, 401, { error: 'Owner sign-in required.' })
  if (!['GET', 'HEAD'].includes(method) && !isSameOrigin(req)) {
    return sendJson(res, 403, { error: 'The request origin could not be verified.' })
  }

  if (path === '/api/admin/me' && method === 'GET') {
    const user = await requestAuth<AuthTokens['user']>('user', undefined, session.access_token)
    return sendJson(res, 200, { user: { id: user?.id, email: user?.email } })
  }

  if (path === '/api/admin/overview' && method === 'GET') {
    const [orders, products, users] = await Promise.all([
      fetchAllRows<{ id: number; order_id: string; order_data: Record<string, unknown>; created_at: string; fulfillment_status: string }>(
        'aurel_orders',
        new URLSearchParams({ select: 'id,order_id,order_data,created_at,fulfillment_status', order: 'created_at.desc', limit: '500' })
      ),
      fetchAllRows<{ id: string; name: string; category: string; price: number; stock_quantity: number | null; is_active: boolean }>(
        'aurel_products',
        new URLSearchParams({ select: 'id,name,category,price,stock_quantity,is_active', limit: '1000' })
      ),
      fetchAllRows<{ id: string }>('aurel_users', new URLSearchParams({ select: 'id', limit: '1000' }))
    ])
    const paidOrders = orders.filter(order => order.order_data.status === 'paid')
    const revenue = paidOrders.reduce((total, order) => {
      const amount = Number(order.order_data.total)
      return total + (Number.isFinite(amount) ? amount : 0)
    }, 0)
    const bestsellers = new Map<string, { name: string; quantity: number }>()
    for (const order of paidOrders) {
      const items = Array.isArray(order.order_data.items) ? order.order_data.items : []
      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const row = item as { productId?: unknown; name?: unknown; quantity?: unknown }
        const key = typeof row.productId === 'string' ? row.productId : typeof row.name === 'string' ? row.name : ''
        if (!key) continue
        const current = bestsellers.get(key) ?? { name: typeof row.name === 'string' ? row.name : key, quantity: 0 }
        current.quantity += typeof row.quantity === 'number' ? row.quantity : 0
        bestsellers.set(key, current)
      }
    }
    return sendJson(res, 200, {
      metrics: {
        revenue,
        orders: orders.length,
        customers: users.length,
        products: products.length,
        lowStock: products.filter(product => product.stock_quantity !== null && product.stock_quantity <= 5).length
      },
      recentOrders: orders.slice(0, 8),
      bestsellers: [...bestsellers.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5)
    })
  }

  if (path === '/api/admin/products/import' && method === 'POST') {
    const categories = categorySeeds().map(category => ({ ...category, description: '', image_url: '', is_active: true }))
    await supabaseRequest('aurel_categories', new URLSearchParams({ on_conflict: 'slug' }), {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(categories)
    })
    const rows = PRODUCTS.map(toProductRecord)
    await supabaseRequest('aurel_products', new URLSearchParams({ on_conflict: 'id' }), {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
      body: JSON.stringify(rows)
    })
    await markCatalogInitialized()
    return sendJson(res, 200, { imported: rows.length })
  }

  if (path === '/api/admin/products/upload' && method === 'POST') {
    const body = parseBody(req)
    const contentType = body.contentType
    const base64 = body.base64
    const fileName = body.fileName
    const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
    if (typeof contentType !== 'string' || !allowedTypes.has(contentType)
      || typeof base64 !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
      || typeof fileName !== 'string' || fileName.length > 150) {
      return sendJson(res, 400, { error: 'Choose a valid JPEG, PNG, WebP, or AVIF image.' })
    }
    const image = Buffer.from(base64, 'base64')
    if (!image.length || image.length > 2.8 * 1024 * 1024) return sendJson(res, 413, { error: 'Product images must be smaller than 2.8 MB.' })
    const imageSignatures: Record<string, (value: Buffer) => boolean> = {
      'image/jpeg': value => value[0] === 0xff && value[1] === 0xd8 && value[value.length - 2] === 0xff && value[value.length - 1] === 0xd9,
      'image/png': value => value.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
      'image/webp': value => value.toString('ascii', 0, 4) === 'RIFF' && value.toString('ascii', 8, 12) === 'WEBP',
      'image/avif': value => value.toString('ascii', 4, 8) === 'ftyp' && /^(avif|avis)$/.test(value.toString('ascii', 8, 12))
    }
    if (!imageSignatures[contentType](image)) return sendJson(res, 400, { error: 'The image contents do not match the selected image type.' })
    const extension = contentType.split('/')[1].replace('jpeg', 'jpg')
    const storagePath = `${Date.now()}-${randomBytes(6).toString('hex')}.${extension}`
    const { supabaseUrl, serviceRoleKey } = getSupabaseConfig()
    const response = await fetch(`${supabaseUrl}/storage/v1/object/aurel-product-images/${storagePath}`, {
      method: 'POST',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': contentType,
        'x-upsert': 'false'
      },
      body: image
    })
    if (!response.ok) {
      console.error('Product image upload failed:', response.status, await response.text())
      return sendJson(res, 502, { error: 'The product image could not be uploaded. Check the Supabase Storage bucket and try again.' })
    }
    return sendJson(res, 201, {
      imageUrl: `${supabaseUrl}/storage/v1/object/public/aurel-product-images/${encodeURIComponent(storagePath)}`
    })
  }

  if (path === '/api/admin/products' && method === 'GET') {
    const products = await fetchAllRows<ProductRecord>(
      'aurel_products',
      new URLSearchParams({ select: '*', order: 'updated_at.desc', limit: '1000' })
    )
    return sendJson(res, 200, { products: products.map(toPublicProduct) })
  }
  if (path === '/api/admin/products' && method === 'POST') {
    const payload = productPayload(parseBody(req))
    if (!payload) return sendJson(res, 400, { error: 'Product details are incomplete or invalid.' })
    await supabaseRequest('aurel_products', new URLSearchParams(), { method: 'POST', body: JSON.stringify(payload), headers: { Prefer: 'return=minimal' } })
    await markCatalogInitialized()
    return sendJson(res, 201, { success: true })
  }
  const productMatch = path.match(/^\/api\/admin\/products\/([a-zA-Z0-9_-]+)$/)
  if (productMatch && method === 'PATCH') {
    const productId = decodeURIComponent(productMatch[1])
    const existing = await supabaseRequest<ProductRecord[]>('aurel_products', new URLSearchParams({ id: `eq.${productId}`, select: '*', limit: '1' }))
    if (!existing[0]) return sendJson(res, 404, { error: 'Product not found.' })
    const payload = productPayload(parseBody(req), existing[0])
    if (!payload) return sendJson(res, 400, { error: 'Product details are incomplete or invalid.' })
    const { id: _id, ...update } = payload
    await supabaseRequest('aurel_products', new URLSearchParams({ id: `eq.${productId}` }), { method: 'PATCH', body: JSON.stringify(update), headers: { Prefer: 'return=minimal' } })
    return sendJson(res, 200, { success: true })
  }
  if (productMatch && method === 'DELETE') {
    await supabaseRequest('aurel_products', new URLSearchParams({ id: `eq.${decodeURIComponent(productMatch[1])}` }), { method: 'DELETE' })
    await markCatalogInitialized()
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/categories' && method === 'GET') {
    const [categories, products] = await Promise.all([
      supabaseRequest<Array<Record<string, unknown>>>('aurel_categories', new URLSearchParams({ select: '*', order: 'name.asc' })),
      fetchAllRows<{ category: string }>('aurel_products', new URLSearchParams({ select: 'category', limit: '1000' }))
    ])
    const counts = new Map<string, number>()
    for (const product of products) counts.set(product.category, (counts.get(product.category) ?? 0) + 1)
    return sendJson(res, 200, { categories: categories.map(category => ({ ...category, productCount: counts.get(String(category.slug)) ?? 0 })) })
  }
  if (path === '/api/admin/categories' && method === 'POST') {
    const body = parseBody(req)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const slug = typeof body.slug === 'string' ? slugify(body.slug) : slugify(name)
    if (!name || name.length > 100 || slug.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return sendJson(res, 400, { error: 'Enter a category name and a valid category slug.' })
    }
    await supabaseRequest('aurel_categories', new URLSearchParams(), {
      method: 'POST', body: JSON.stringify({
        slug, name, description: typeof body.description === 'string' ? body.description.slice(0, 4000) : '',
        image_url: typeof body.imageUrl === 'string' ? body.imageUrl.slice(0, 2000) : '',
        is_active: typeof body.isActive === 'boolean' ? body.isActive : true
      }), headers: { Prefer: 'return=minimal' }
    })
    return sendJson(res, 201, { success: true })
  }
  const categoryMatch = path.match(/^\/api\/admin\/categories\/([a-z0-9_-]+)$/)
  if (categoryMatch && method === 'PATCH') {
    const body = parseBody(req)
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string' && body.name.trim() && body.name.length <= 100) update.name = body.name.trim()
    if (typeof body.description === 'string' && body.description.length <= 4000) update.description = body.description
    if (typeof body.imageUrl === 'string' && body.imageUrl.length <= 2000) update.image_url = body.imageUrl
    if (typeof body.isActive === 'boolean') update.is_active = body.isActive
    const existing = await supabaseRequest<Array<{ slug: string }>>(
      'aurel_categories',
      new URLSearchParams({ slug: `eq.${categoryMatch[1]}`, select: 'slug', limit: '1' })
    )
    if (!existing[0]) return sendJson(res, 404, { error: 'Category not found.' })
    await supabaseRequest('aurel_categories', new URLSearchParams({ slug: `eq.${categoryMatch[1]}` }), { method: 'PATCH', body: JSON.stringify(update), headers: { Prefer: 'return=minimal' } })
    return sendJson(res, 200, { success: true })
  }
  if (categoryMatch && method === 'DELETE') {
    const products = await supabaseRequest<Array<{ id: string }>>(
      'aurel_products',
      new URLSearchParams({ category: `eq.${categoryMatch[1]}`, select: 'id', limit: '1' })
    )
    if (products.length) return sendJson(res, 409, { error: 'Move or delete this category’s products before deleting the category.' })
    await supabaseRequest('aurel_categories', new URLSearchParams({ slug: `eq.${categoryMatch[1]}` }), { method: 'DELETE' })
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/orders' && method === 'GET') {
    const orders = await fetchAllRows<Record<string, unknown>>(
      'aurel_orders',
      new URLSearchParams({ select: 'id,user_id,order_id,order_data,created_at,fulfillment_status', order: 'created_at.desc', limit: '500' })
    )
    return sendJson(res, 200, { orders })
  }
  const orderMatch = path.match(/^\/api\/admin\/orders\/(\d+)$/)
  if (orderMatch && method === 'PATCH') {
    const body = parseBody(req)
    const fulfillmentStatus = body.fulfillmentStatus
    if (!['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'].includes(String(fulfillmentStatus))) {
      return sendJson(res, 400, { error: 'Choose a valid fulfillment status.' })
    }
    const existing = await supabaseRequest<Array<{ id: number }>>(
      'aurel_orders',
      new URLSearchParams({ id: `eq.${orderMatch[1]}`, select: 'id', limit: '1' })
    )
    if (!existing[0]) return sendJson(res, 404, { error: 'Order not found.' })
    await supabaseRequest('aurel_orders', new URLSearchParams({ id: `eq.${orderMatch[1]}` }), {
      method: 'PATCH', body: JSON.stringify({ fulfillment_status: fulfillmentStatus }),
      headers: { Prefer: 'return=minimal' }
    })
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/customers' && method === 'GET') {
    const customers = await fetchAllRows<Record<string, unknown>>(
      'aurel_users',
      new URLSearchParams({
        select: 'id,name,username,email,pending_email,phone,address,gender,date_of_birth,city,state,postal_code,email_verified,account_status,created_at',
        order: 'created_at.desc',
        limit: '1000'
      })
    )
    const authUser = await requestAuth<AuthTokens['user']>('user', undefined, session.access_token)
    if (!authUser?.email || getAdminEmails().has(authUser.email.toLowerCase())) {
      const filteredCustomers = customers.filter(customer => !getAdminEmails().has(String(customer.email).toLowerCase()))
      return sendJson(res, 200, { customers: filteredCustomers })
    }
    return sendJson(res, 200, { customers })
  }
  const customerDeleteMatch = path.match(/^\/api\/admin\/customers\/([^/]+)\/delete$/)
  if (customerDeleteMatch) {
    if (method !== 'POST') {
      res.setHeader('Allow', 'POST')
      return sendJson(res, 405, { error: 'Use POST to permanently delete a customer.' })
    }
    const customerId = customerDeleteMatch[1]
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(customerId)) {
      return sendJson(res, 400, { error: 'The customer ID is invalid.' })
    }

    let authUser: DeletionAuthUser | undefined
    try {
      authUser = await getDeletionAuthUser(customerId)
    } catch (error) {
      if (!(error instanceof AdminAuthRequestError)) throw error
      console.error('Could not verify the target customer in Supabase Auth:', error.status)
      const status = error.status === 429 ? 429 : [401, 403].includes(error.status) ? 503 : 502
      return sendJson(res, status, { error: 'The customer identity could not be verified. No account deletion was confirmed.' })
    }

    const customer = await supabaseRequest<Array<{ id: string; email: string; pending_email: string | null }>>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${customerId}`, select: 'id,email,pending_email', limit: '1' })
    )
    if (customer[0]?.id === session.user_id) {
      return sendJson(res, 403, { error: 'You cannot delete your own owner account.' })
    }
    const adminSessions = await supabaseRequest<Array<{ user_id: string }>>(
      'aurel_admin_sessions',
      new URLSearchParams({ user_id: `eq.${customerId}`, select: 'user_id', limit: '1' })
    )
    if (adminSessions.length) {
      return sendJson(res, 403, { error: 'An owner account cannot be deleted from customer management.' })
    }

    const allowedEmails = getAdminEmails()
    const targetEmails = [
      customer[0]?.email,
      customer[0]?.pending_email,
      authUser?.email
    ].filter((email): email is string => typeof email === 'string' && email.length > 0)
    if (targetEmails.some(email => allowedEmails.has(email.trim().toLowerCase()))) {
      return sendJson(res, 403, { error: 'An allowlisted owner account cannot be deleted from customer management.' })
    }

    if (!authUser && !customer[0]) {
      const [orphanSessions, orphanChats, orphanOrders] = await Promise.all([
        supabaseRequest<Array<{ token_hash: string }>>('aurel_sessions', new URLSearchParams({ user_id: `eq.${customerId}`, select: 'token_hash', limit: '1' })),
        supabaseRequest<Array<{ id: number }>>('aurel_chat_messages', new URLSearchParams({ user_id: `eq.${customerId}`, select: 'id', limit: '1' })),
        supabaseRequest<Array<{ id: number }>>('aurel_orders', new URLSearchParams({ user_id: `eq.${customerId}`, select: 'id', limit: '1' }))
      ])
      if (![orphanSessions, orphanChats, orphanOrders].some(rows => rows.length > 0)) {
        return sendJson(res, 404, { error: 'Customer was not found or has already been deleted.' })
      }
    }

    const confirmationAddress = customer[0]?.email ?? authUser?.email
    if (customer[0] || authUser) {
      const confirmationEmail = parseBody(req).confirmEmail
      if (typeof confirmationEmail !== 'string'
        || !confirmationAddress
        || confirmationEmail.trim().toLowerCase() !== confirmationAddress.trim().toLowerCase()) {
        return sendJson(res, 400, { error: 'Enter the customer’s current email address to confirm permanent deletion.' })
      }
    }

    try {
      if (authUser) {
        await deleteAuthUser(customerId)
      } else {
        await supabaseRequest('rpc/aurel_admin_cleanup_orphaned_customer', new URLSearchParams(), {
          method: 'POST',
          body: JSON.stringify({ p_user_id: customerId })
        })
      }

      const remainingAuthUser = await getDeletionAuthUser(customerId)
      if (remainingAuthUser) {
        return sendJson(res, 502, { error: 'Supabase Auth still reports this account. Deletion is incomplete; retry after checking the Auth service.' })
      }
      await supabaseRequest('rpc/aurel_admin_cleanup_orphaned_customer', new URLSearchParams(), {
        method: 'POST',
        body: JSON.stringify({ p_user_id: customerId })
      })
      const [profiles, sessions, chats, orders, adminSessionRows] = await Promise.all([
        supabaseRequest<Array<{ id: string }>>('aurel_users', new URLSearchParams({ id: `eq.${customerId}`, select: 'id', limit: '1' })),
        supabaseRequest<Array<{ token_hash: string }>>('aurel_sessions', new URLSearchParams({ user_id: `eq.${customerId}`, select: 'token_hash', limit: '1' })),
        supabaseRequest<Array<{ id: number }>>('aurel_chat_messages', new URLSearchParams({ user_id: `eq.${customerId}`, select: 'id', limit: '1' })),
        supabaseRequest<Array<{ id: number }>>('aurel_orders', new URLSearchParams({ user_id: `eq.${customerId}`, select: 'id', limit: '1' })),
        supabaseRequest<Array<{ user_id: string }>>('aurel_admin_sessions', new URLSearchParams({ user_id: `eq.${customerId}`, select: 'user_id', limit: '1' }))
      ])
      if ([profiles, sessions, chats, orders, adminSessionRows].some(rows => rows.length > 0)) {
        console.error('Customer deletion verification found linked records.')
        return sendJson(res, 500, { error: 'Deletion could not be fully verified. Do not treat this account as deleted; retry or inspect the server logs.' })
      }
      return sendJson(res, 200, { success: true, alreadyDeleted: !authUser && !customer[0] })
    } catch (error) {
      if (error instanceof AdminAuthRequestError) {
        console.error('Supabase Auth did not confirm customer deletion:', error.status)
        const status = error.status === 429 ? 429 : [401, 403].includes(error.status) ? 503 : 502
        return sendJson(res, status, {
          error: 'Supabase Auth did not confirm deletion. The request is incomplete; retry it after checking the Auth service.'
        })
      }
      console.error('Customer deletion workflow failed before completion.')
      return sendJson(res, 500, {
        error: 'Customer deletion could not be fully verified. The request is incomplete; retry it or inspect the server logs.'
      })
    }
  }

  const customerActionMatch = path.match(/^\/api\/admin\/customers\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})(?:\/(disable|enable))?$/i)
  if (customerActionMatch && method === 'PATCH' && !customerActionMatch[2]) {
    const body = parseBody(req)
    const update: Record<string, unknown> = {}
    const customer = await supabaseRequest<Array<{ id: string; email: string }>>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${customerActionMatch[1]}`, select: 'id,email', limit: '1' })
    )
    if (!customer[0] || getAdminEmails().has(customer[0].email.toLowerCase())) return sendJson(res, 404, { error: 'Customer not found.' })
    if (customer[0].id === session.user_id) return sendJson(res, 403, { error: 'Owner accounts cannot be edited from customer management.' })
    const textFields: Record<string, { column: string; max: number }> = {
      name: { column: 'name', max: 80 },
      address: { column: 'address', max: 240 },
      city: { column: 'city', max: 100 },
      state: { column: 'state', max: 100 },
      postalCode: { column: 'postal_code', max: 12 }
    }
    for (const [field, { column, max }] of Object.entries(textFields)) {
      if (typeof body[field] === 'string') {
        const value = body[field].trim()
        if (value.length > max || (field === 'name' && !value)) return sendJson(res, 400, { error: `${field} is invalid.` })
        update[column] = value
      }
    }
    if (body.username !== undefined) {
      if (typeof body.username !== 'string' || !/^[a-z0-9_]{3,24}$/.test(body.username)) return sendJson(res, 400, { error: 'Username must be 3 to 24 lowercase letters, numbers, or underscores.' })
      update.username = body.username
    }
    if (body.phone !== undefined) {
      if (typeof body.phone !== 'string') return sendJson(res, 400, { error: 'Enter a valid phone number.' })
      const phone = normalizeValidPhoneNumber(body.phone)
      if (!phone) return sendJson(res, 400, { error: 'Enter a valid phone number.' })
      update.phone = phone
    }
    if (body.gender !== undefined) {
      if (typeof body.gender !== 'string' || !['Woman', 'Man', 'Non-binary', 'Another identity', 'Prefer not to say'].includes(body.gender)) {
        return sendJson(res, 400, { error: 'Choose a valid gender option.' })
      }
      update.gender = body.gender
    }
    if (body.dateOfBirth !== undefined) {
      if (typeof body.dateOfBirth !== 'string' || (body.dateOfBirth && !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth))) {
        return sendJson(res, 400, { error: 'Enter a valid date of birth.' })
      }
      update.date_of_birth = body.dateOfBirth || null
    }
    if (!Object.keys(update).length) return sendJson(res, 400, { error: 'No valid customer profile changes were provided.' })
    await supabaseRequest('aurel_users', new URLSearchParams({ id: `eq.${customerActionMatch[1]}` }), {
      method: 'PATCH', body: JSON.stringify(update), headers: { Prefer: 'return=minimal' }
    })
    return sendJson(res, 200, { success: true })
  }
  if (customerActionMatch?.[2] === 'disable' && method === 'POST') {
    const customer = await supabaseRequest<Array<{ id: string; email: string }>>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${customerActionMatch[1]}`, select: 'id,email', limit: '1' })
    )
    if (!customer[0] || getAdminEmails().has(customer[0].email.toLowerCase())) return sendJson(res, 404, { error: 'Customer not found.' })
    if (customer[0].id === session.user_id) return sendJson(res, 403, { error: 'Owner accounts cannot be disabled from customer management.' })
    await supabaseRequest('aurel_users', new URLSearchParams({ id: `eq.${customerActionMatch[1]}` }), {
      method: 'PATCH', body: JSON.stringify({ account_status: 'disabled' }), headers: { Prefer: 'return=minimal' }
    })
    await supabaseRequest('aurel_sessions', new URLSearchParams({ user_id: `eq.${customerActionMatch[1]}` }), { method: 'DELETE' })
    return sendJson(res, 200, { success: true })
  }
  if (customerActionMatch?.[2] === 'enable' && method === 'POST') {
    const customer = await supabaseRequest<Array<{ id: string; email: string }>>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${customerActionMatch[1]}`, select: 'id,email', limit: '1' })
    )
    if (!customer[0] || getAdminEmails().has(customer[0].email.toLowerCase())) return sendJson(res, 404, { error: 'Customer not found.' })
    if (customer[0].id === session.user_id) return sendJson(res, 403, { error: 'Owner accounts cannot be enabled from customer management.' })
    await supabaseRequest('aurel_users', new URLSearchParams({ id: `eq.${customerActionMatch[1]}` }), {
      method: 'PATCH', body: JSON.stringify({ account_status: 'active' }), headers: { Prefer: 'return=minimal' }
    })
    return sendJson(res, 200, { success: true })
  }
  if (path === '/api/admin/settings' && method === 'GET') {
    const rows = await supabaseRequest<Array<{ settings: Partial<StoreSettings> }>>(
      'aurel_store_settings',
      new URLSearchParams({ id: 'eq.storefront', select: 'settings', limit: '1' })
    )
    return sendJson(res, 200, { settings: { ...defaultSettings, ...(rows[0]?.settings ?? {}) } })
  }
  if (path === '/api/admin/settings' && method === 'PATCH') {
    const body = parseBody(req)
    const settings: Partial<StoreSettings> = {}
    for (const key of Object.keys(defaultSettings) as (keyof StoreSettings)[]) {
      const value = body[key]
      if (typeof value === 'string' && value.length <= 2000) settings[key] = value.trim()
    }
    if (settings.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.contactEmail)) {
      return sendJson(res, 400, { error: 'Enter a valid store contact email address.' })
    }
    if (!validPublicUrl(settings.instagramUrl ?? '') || !validPublicUrl(settings.facebookUrl ?? '')) {
      return sendJson(res, 400, { error: 'Social profile links must use HTTP or HTTPS.' })
    }
    const currentRows = await supabaseRequest<Array<{ settings: Record<string, unknown> }>>(
      'aurel_store_settings',
      new URLSearchParams({ id: 'eq.storefront', select: 'settings', limit: '1' })
    )
    await supabaseRequest('aurel_store_settings', new URLSearchParams({ on_conflict: 'id' }), {
      method: 'POST',
      body: JSON.stringify({ id: 'storefront', settings: { ...(currentRows[0]?.settings ?? {}), ...settings }, updated_at: new Date().toISOString() }),
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
    })
    return sendJson(res, 200, { success: true })
  }

  return sendJson(res, 404, { error: 'Admin API route not found.' })
}

export async function adminApiHandler(req: AdminRequest, res: ServerResponse) {
  const path = requestPath(req).replace(/\/+$/, '') || '/'
  try {
    await handleAdminRoute(req, res, path)
  } catch (error) {
    console.error(`Admin API request failed (${req.method ?? 'unknown'} ${path}):`, error)
    sendJson(res, 500, { error: 'The owner dashboard request failed. Check the server logs and database migration.' })
  }
}
