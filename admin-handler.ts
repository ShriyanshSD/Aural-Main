import { createHash, randomBytes } from 'node:crypto'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PRODUCTS } from './src/data/products.js'
import type { Product, StorefrontContent } from './src/types/index.js'
import { getSupabaseAuthKey, getSupabaseConfig, supabaseRequest } from './auth-handler.js'
import { normalizeValidPhoneNumber } from './src/utils/accountValidation.js'

interface AdminRequest extends IncomingMessage {
  body?: unknown
  query?: Record<string, unknown>
}
const validPublicPhone = (value: string) => {
  if (!value) return true
  const digits = value.match(/\d/g)?.length ?? 0
  return /^[+0-9\s().-]+$/.test(value) && digits >= 7 && digits <= 15
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
  variants: ProductVariantRecord[]
  fallback_color: string
  description: string
  tagline: string
  available_finishes: string[]
  is_customizable: boolean
  features: string[]
  stock_quantity: number | null
  low_stock_threshold: number
  is_active: boolean
  is_published: boolean
  created_at: string
  updated_at: string
}
interface ProductVariantRecord {
  id: string
  name: string
  sku: string
  price: number
  stockQuantity: number | null
}

interface AdminInventoryMovement {
  id: number
  product_id: string | null
  product_name: string
  actor_user_id: string | null
  quantity_change: number
  previous_quantity: number
  new_quantity: number
  reason: string
  created_at: string
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

interface AdminAuditEntry {
  id: number
  actor_user_id: string | null
  action: string
  target_type: string
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

interface OrderOperation {
  order_id: number
  production_status: string
  customer_approved_at: string | null
  proof_sent_at: string | null
  proof_url: string
  expected_delivery_date: string | null
  courier: string
  tracking_number: string
  owner_notes: string
  checklist: { id: string; label: string; complete: boolean }[]
  updated_at: string
}

const defaultStorefrontContent: StorefrontContent = {
  heroEyebrow: 'A memory becomes a gift becomes a keepsake',
  heroTitle: 'Make moments worth keeping.',
  heroSubtitle: 'Thoughtful gifts, made personal.',
  heroDescription: 'From custom magazines and beautiful bouquets to curated hampers and thoughtful keepsakes, AUREL helps you turn your favourite moments into something unforgettable.',
  heroCtaLabel: 'Explore AUREL',
  secondaryCtaLabel: 'Create a Memory',
  heroImageUrl: '/hero-image.png',
  announcement: '',
  aboutText: 'At AUREL, we believe the best gifts are thought about, personalized, and given with meaning.',
  deliveryPolicy: '',
  returnsPolicy: ''
}

const productionStatuses = [
  'awaiting_details', 'ready_for_design', 'design_in_progress', 'proof_sent',
  'awaiting_customer_approval', 'approved_for_production', 'in_production',
  'quality_check', 'packed', 'ready_to_dispatch', 'completed', 'on_hold', 'cancelled'
] as const

const cookieName = 'aurel_admin_session'
const sessionDurationSeconds = 60 * 60 * 8
const defaultSettings: StoreSettings = {
  storeName: 'AUREL',
  tagline: 'Made With Love For You',
  description: 'Curated luxury memory magazines, botanical bouquets, eternal single blossoms, and thoughtful keepsakes.',
  contactEmail: 'aruelstudio22@gmail.com',
  phone: '',
  whatsappNumber: '919999200913',
  instagramUrl: 'https://www.instagram.com/_.aurelstudio._?psln=YnRvcGt3dTNyM2V3',
  facebookUrl: '',
  deliveryNote: 'Pan India Delivery'
}

const sendJson = (res: ServerResponse, status: number, payload: unknown) => {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(payload))
}

const resolveStoreSettings = (stored: Partial<StoreSettings> = {}): StoreSettings => {
  const settings = { ...defaultSettings, ...stored }
  const previousWhatsappNumbers = new Set(['919876543210', '8588905927'])

  if (!settings.contactEmail || settings.contactEmail === 'concierge@aurelgifts.com') {
    settings.contactEmail = defaultSettings.contactEmail
  }
  if (!settings.whatsappNumber || previousWhatsappNumbers.has(settings.whatsappNumber)) {
    settings.whatsappNumber = defaultSettings.whatsappNumber
  }
  if (!settings.instagramUrl) settings.instagramUrl = defaultSettings.instagramUrl
  return settings
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
const validContentImageUrl = (value: string) => value.startsWith('/')
  ? !value.startsWith('//') && !value.includes('..')
  : validPublicUrl(value)

const logAdminAction = async (
  session: AdminSession,
  action: string,
  targetType: string,
  targetId: string | number | null,
  metadata: Record<string, unknown> = {}
) => {
  try {
    await supabaseRequest('aurel_admin_audit_log', new URLSearchParams(), {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        actor_user_id: session.user_id,
        action,
        target_type: targetType,
        target_id: targetId === null ? null : String(targetId),
        metadata
      })
    })
  } catch (error) {
    console.error(`Admin audit log write failed (${action}, ${targetType}):`, error)
    throw new Error('The change could not be fully audited. Refresh before attempting it again.')
  }
}

const createOrderEvent = async (
  orderId: number,
  actorType: 'owner' | 'customer' | 'system',
  actorUserId: string | null,
  eventType: string,
  summary: string,
  metadata: Record<string, unknown> = {}
) => {
  await supabaseRequest('aurel_order_events', new URLSearchParams(), {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({ order_id: orderId, actor_type: actorType, actor_user_id: actorUserId, event_type: eventType, summary, metadata })
  })
}

const createAdminNotification = async (
  notificationType: string,
  title: string,
  message: string,
  targetType: string,
  targetId: string | number | null
) => {
  await supabaseRequest('aurel_admin_notifications', new URLSearchParams(), {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify({
      notification_type: notificationType,
      title,
      message,
      target_type: targetType,
      target_id: targetId === null ? null : String(targetId)
    })
  })
}

const readPublishedStoreContent = async (): Promise<StorefrontContent> => {
  const rows = await supabaseRequest<Array<{ published: Partial<StorefrontContent> }>>(
    'aurel_store_content',
    new URLSearchParams({ id: 'eq.storefront', select: 'published', limit: '1' })
  )
  return { ...defaultStorefrontContent, ...(rows[0]?.published ?? {}) }
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
  image_urls: product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [],
  variants: product.variants ?? [],
  fallback_color: product.fallbackColor,
  description: product.description,
  tagline: product.tagline,
  available_finishes: product.availableFinishes ?? [],
  is_customizable: product.isCustomizable ?? false,
  features: product.features,
  stock_quantity: null,
  low_stock_threshold: 5,
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
  variants: Array.isArray(record.variants) ? record.variants : [],
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
  const [productRecords, categories, settingsRows, content, collectionRows, collectionProductRows, reviewAggregateRows, reviewRows] = await Promise.all([
    fetchAllRows<ProductRecord>('aurel_products', new URLSearchParams({
      select: 'id,name,category,sub_category,price,rating,reviews_count,image_url,image_urls,variants,fallback_color,description,tagline,available_finishes,is_customizable,features,stock_quantity,is_active,is_published,created_at,updated_at',
      order: 'created_at.desc',
      limit: '1000'
    })),
    supabaseRequest<Array<{ slug: string; name: string; description: string; image_url: string; display_order: number; is_featured: boolean }>>(
      'aurel_categories',
      new URLSearchParams({ is_active: 'eq.true', select: 'slug,name,description,image_url,display_order,is_featured', order: 'display_order.asc,name.asc' })
    ),
    supabaseRequest<Array<{ settings: Partial<StoreSettings> & Record<string, unknown> }>>(
      'aurel_store_settings',
      new URLSearchParams({ id: 'eq.storefront', select: 'settings', limit: '1' })
    ),
    readPublishedStoreContent(),
    supabaseRequest<Array<{ id: string; name: string; description: string; image_url: string; display_order: number }>>(
      'aurel_collections',
      new URLSearchParams({ is_active: 'eq.true', select: 'id,name,description,image_url,display_order', order: 'display_order.asc,name.asc' })
    ),
    supabaseRequest<Array<{ collection_id: string; product_id: string; display_order: number }>>(
      'aurel_collection_products',
      new URLSearchParams({ select: 'collection_id,product_id,display_order', order: 'display_order.asc' })
    ),
    fetchAllRows<{ product_id: string; rating: number }>(
      'aurel_reviews',
      new URLSearchParams({ moderation_status: 'eq.approved', select: 'product_id,rating', order: 'created_at.desc' })
    ),
    supabaseRequest<Array<{ id: number; product_id: string; user_id: string; rating: number; title: string; body: string; created_at: string }>>(
      'aurel_reviews',
      new URLSearchParams({ moderation_status: 'eq.approved', select: 'id,product_id,user_id,rating,title,body,created_at', order: 'created_at.desc', limit: '100' })
    )
  ])
  const activeCategorySlugs = new Set(categories.map(category => category.slug))
  const storedSettings = settingsRows[0]?.settings ?? {}
  const catalogInitialized = storedSettings.catalogInitialized === true
  const publicProducts = productRecords.length || catalogInitialized
    ? productRecords.filter(product => product.is_active && product.is_published && activeCategorySlugs.has(product.category)).map(toPublicProduct)
    : PRODUCTS
  const reviewsByProduct = new Map<string, Array<{ product_id: string; rating: number }>>()
  for (const review of reviewAggregateRows) reviewsByProduct.set(review.product_id, [...(reviewsByProduct.get(review.product_id) ?? []), review])
  const reviewedProducts = publicProducts.map(product => {
    const reviews = reviewsByProduct.get(product.id) ?? []
    return reviews.length
      ? { ...product, rating: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length, reviewsCount: reviews.length }
      : { ...product, rating: 0, reviewsCount: 0 }
  })
  const reviewerIds = [...new Set(reviewRows.map(review => review.user_id))]
  const reviewers = reviewerIds.length
    ? await supabaseRequest<Array<{ id: string; name: string }>>(
      'aurel_users',
      new URLSearchParams({ id: `in.(${reviewerIds.join(',')})`, select: 'id,name', limit: String(reviewerIds.length) })
    )
    : []
  const reviewerNameById = new Map(reviewers.map(reviewer => [reviewer.id, reviewer.name]))
  return {
    products: reviewedProducts,
    categories: categories.length ? categories : categorySeeds().map((category, index) => ({ ...category, description: '', image_url: '', display_order: index, is_featured: false })),
    collections: collectionRows.map(collection => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      imageUrl: collection.image_url,
      displayOrder: collection.display_order,
      productIds: collectionProductRows.filter(item => item.collection_id === collection.id).map(item => item.product_id)
    })).filter(collection => collection.productIds.length > 0),
    reviews: reviewRows.map(review => ({
      id: review.id,
      productId: review.product_id,
      productName: reviewedProducts.find(product => product.id === review.product_id)?.name ?? 'AUREL product',
      rating: review.rating,
      title: review.title,
      body: review.body,
      customerName: reviewerNameById.get(review.user_id) ?? 'Customer',
      createdAt: review.created_at
    })),
    settings: resolveStoreSettings(storedSettings),
    content
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
  const imageUrls = value('imageUrls', existing?.image_urls ?? (existing?.image_url ? [existing.image_url] : []))
  const variants = value('variants', existing?.variants ?? [])
  const fallbackColor = value('fallbackColor', existing?.fallback_color ?? '#F6E8E0')
  const description = value('description', existing?.description ?? '')
  const tagline = value('tagline', existing?.tagline ?? '')
  const availableFinishes = value('availableFinishes', existing?.available_finishes ?? [])
  const features = value('features', existing?.features ?? [])
  const stockQuantity = value('stockQuantity', existing?.stock_quantity ?? null)
  const lowStockThreshold = value('lowStockThreshold', existing?.low_stock_threshold ?? 5)
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
    || !validContentImageUrl(imageUrl)
    || !Array.isArray(imageUrls) || imageUrls.length > 10
    || !imageUrls.every(item => typeof item === 'string' && item.length <= 2000 && validContentImageUrl(item))
    || !Array.isArray(variants) || variants.length > 50
    || !variants.every(item => item && typeof item === 'object'
      && typeof item.id === 'string' && /^[a-zA-Z0-9_-]{1,60}$/.test(item.id)
      && typeof item.name === 'string' && item.name.trim().length > 0 && item.name.length <= 100
      && typeof item.sku === 'string' && item.sku.length <= 100
      && typeof item.price === 'number' && Number.isFinite(item.price) && item.price >= 0
      && (item.stockQuantity === null || (typeof item.stockQuantity === 'number' && Number.isInteger(item.stockQuantity) && item.stockQuantity >= 0)))
    || typeof fallbackColor !== 'string' || !/^#[0-9a-f]{6}$/i.test(fallbackColor)
    || typeof description !== 'string' || description.length > 10000
    || typeof tagline !== 'string' || tagline.length > 500
    || !Array.isArray(availableFinishes) || !availableFinishes.every(item => item === 'matte' || item === 'gloss')
    || !Array.isArray(features) || features.length > 50 || !features.every(item => typeof item === 'string' && item.length <= 300)
    || !(stockQuantity === null || (typeof stockQuantity === 'number' && Number.isInteger(stockQuantity) && stockQuantity >= 0))
    || typeof lowStockThreshold !== 'number' || !Number.isInteger(lowStockThreshold) || lowStockThreshold < 0 || lowStockThreshold > 1000000
    || typeof isCustomizable !== 'boolean' || typeof isActive !== 'boolean' || typeof isPublished !== 'boolean'
    || !(subCategory === null || (typeof subCategory === 'string' && subCategory.length <= 100))) return undefined

  return {
    id, name: name.trim(), category, sub_category: subCategory, price, rating, reviews_count: reviewsCount,
    image_url: imageUrl,
    image_urls: [...new Set([imageUrl, ...imageUrls].filter((item): item is string => Boolean(item)))],
    variants,
    fallback_color: fallbackColor,
    description, tagline, available_finishes: availableFinishes, is_customizable: isCustomizable,
    features, stock_quantity: stockQuantity, low_stock_threshold: lowStockThreshold, is_active: isActive, is_published: isPublished,
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

  if (path === '/api/admin/content' && method === 'GET') {
    const rows = await supabaseRequest<Array<{ draft: Partial<StorefrontContent>; published: Partial<StorefrontContent>; updated_at: string; published_at: string | null }>>(
      'aurel_store_content',
      new URLSearchParams({ id: 'eq.storefront', select: 'draft,published,updated_at,published_at', limit: '1' })
    )
    const row = rows[0]
    return sendJson(res, 200, {
      draft: { ...defaultStorefrontContent, ...(row?.draft ?? {}) },
      published: { ...defaultStorefrontContent, ...(row?.published ?? {}) },
      updatedAt: row?.updated_at ?? null,
      publishedAt: row?.published_at ?? null
    })
  }
  if (path === '/api/admin/content' && method === 'PATCH') {
    const body = parseBody(req)
    const content = body.content
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      return sendJson(res, 400, { error: 'Provide storefront content fields to save as a draft.' })
    }
    const candidate = { ...defaultStorefrontContent } as StorefrontContent
    for (const key of Object.keys(defaultStorefrontContent) as (keyof StorefrontContent)[]) {
      const value = (content as Record<string, unknown>)[key]
      if (typeof value !== 'string' || value.length > (key.endsWith('Title') || key.endsWith('Description') || key === 'aboutText' || key.endsWith('Policy') ? 5000 : 500)) {
        return sendJson(res, 400, { error: `The ${key} content is missing or too long.` })
      }
      candidate[key] = value.trim()
    }
    if (!validContentImageUrl(candidate.heroImageUrl)) {
      return sendJson(res, 400, { error: 'Use a safe HTTPS image URL or a local path beginning with one slash.' })
    }
    await supabaseRequest('aurel_store_content', new URLSearchParams({ on_conflict: 'id' }), {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ id: 'storefront', draft: candidate, updated_by: session.user_id, updated_at: new Date().toISOString() })
    })
    await logAdminAction(session, 'storefront_content_draft_saved', 'storefront', 'storefront', { fields: Object.keys(candidate) })
    return sendJson(res, 200, { success: true })
  }
  if (path === '/api/admin/content/publish' && method === 'POST') {
    const rows = await supabaseRequest<Array<{ draft: StorefrontContent }>>(
      'aurel_store_content',
      new URLSearchParams({ id: 'eq.storefront', select: 'draft', limit: '1' })
    )
    if (!rows[0]) return sendJson(res, 409, { error: 'Save a storefront content draft before publishing.' })
    await supabaseRequest('aurel_store_content', new URLSearchParams({ id: 'eq.storefront' }), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ published: rows[0].draft, published_at: new Date().toISOString(), updated_by: session.user_id, updated_at: new Date().toISOString() })
    })
    await logAdminAction(session, 'storefront_content_published', 'storefront', 'storefront')
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/activity' && method === 'GET') {
    const entries = await supabaseRequest<AdminAuditEntry[]>(
      'aurel_admin_audit_log',
      new URLSearchParams({ select: 'id,actor_user_id,action,target_type,target_id,metadata,created_at', order: 'created_at.desc', limit: '100' })
    )
    return sendJson(res, 200, { entries })
  }

  if (path === '/api/admin/notifications' && method === 'GET') {
    const notifications = await supabaseRequest<Array<Record<string, unknown>>>(
      'aurel_admin_notifications',
      new URLSearchParams({ select: 'id,notification_type,title,message,target_type,target_id,read_at,created_at', order: 'created_at.desc', limit: '100' })
    )
    return sendJson(res, 200, { notifications, unreadCount: notifications.filter(item => !item.read_at).length })
  }
  if (path === '/api/admin/notifications/read-all' && method === 'POST') {
    await supabaseRequest('aurel_admin_notifications', new URLSearchParams({ read_at: 'is.null' }), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ read_at: new Date().toISOString() })
    })
    return sendJson(res, 200, { success: true })
  }
  const notificationMatch = path.match(/^\/api\/admin\/notifications\/(\d+)\/read$/)
  if (notificationMatch && method === 'POST') {
    const updated = await supabaseRequest<Array<{ id: number }>>(
      'aurel_admin_notifications',
      new URLSearchParams({ id: `eq.${notificationMatch[1]}`, select: 'id' }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ read_at: new Date().toISOString() })
      }
    )
    if (!updated.length) return sendJson(res, 404, { error: 'Notification not found.' })
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/reviews' && method === 'GET') {
    const [reviews, products, customers] = await Promise.all([
      fetchAllRows<Array<{ id: number; order_id: number; user_id: string; product_id: string; rating: number; title: string; body: string; moderation_status: string; created_at: string }>[number]>(
        'aurel_reviews',
        new URLSearchParams({ select: 'id,order_id,user_id,product_id,rating,title,body,moderation_status,created_at', order: 'created_at.desc', limit: '1000' })
      ),
      supabaseRequest<Array<{ id: string; name: string }>>('aurel_products', new URLSearchParams({ select: 'id,name', limit: '1000' })),
      supabaseRequest<Array<{ id: string; name: string; email: string }>>('aurel_users', new URLSearchParams({ select: 'id,name,email', limit: '1000' }))
    ])
    const productNames = new Map(products.map(product => [product.id, product.name]))
    const customerById = new Map(customers.map(customer => [customer.id, customer]))
    return sendJson(res, 200, {
      reviews: reviews.map(review => ({
        ...review,
        product_name: productNames.get(review.product_id) ?? review.product_id,
        customer_name: customerById.get(review.user_id)?.name ?? 'Deleted customer',
        customer_email: customerById.get(review.user_id)?.email ?? ''
      }))
    })
  }
  const reviewMatch = path.match(/^\/api\/admin\/reviews\/(\d+)$/)
  if (reviewMatch && method === 'PATCH') {
    const status = parseBody(req).status
    if (status !== 'approved' && status !== 'rejected') return sendJson(res, 400, { error: 'Choose approved or rejected for review moderation.' })
    const updated = await supabaseRequest<Array<{ id: number; order_id: number; product_id: string; moderation_status: string }>>(
      'aurel_reviews',
      new URLSearchParams({ id: `eq.${reviewMatch[1]}`, select: 'id,order_id,product_id,moderation_status' }),
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ moderation_status: status, moderated_by: session.user_id, moderated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      }
    )
    if (!updated.length) return sendJson(res, 404, { error: 'Review not found.' })
    await logAdminAction(session, `review_${status}`, 'review', updated[0].id, { orderId: updated[0].order_id, productId: updated[0].product_id })
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/overview' && method === 'GET') {
    const requestedRange = new URL(req.url ?? '/', 'http://localhost').searchParams.get('range') ?? '30d'
    if (!['7d', '30d', '90d', 'all'].includes(requestedRange)) {
      return sendJson(res, 400, { error: 'Choose a supported analytics period.' })
    }
    const orderQuery = new URLSearchParams({
      select: 'id,order_id,order_data,created_at,fulfillment_status',
      order: 'created_at.desc',
      limit: '500'
    })
    if (requestedRange !== 'all') {
      const days = Number(requestedRange.slice(0, -1))
      orderQuery.set('created_at', `gte.${new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()}`)
    }
    const [orders, products, users] = await Promise.all([
      fetchAllRows<{ id: number; order_id: string; order_data: Record<string, unknown>; created_at: string; fulfillment_status: string }>(
        'aurel_orders',
        orderQuery
      ),
      fetchAllRows<{ id: string; name: string; category: string; price: number; stock_quantity: number | null; low_stock_threshold: number; is_active: boolean }>(
        'aurel_products',
        new URLSearchParams({ select: 'id,name,category,price,stock_quantity,low_stock_threshold,is_active', limit: '1000' })
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
        recordedPaidOrderValue: revenue,
        orders: orders.length,
        customers: users.length,
        products: products.length,
        lowStock: products.filter(product => product.stock_quantity !== null && product.stock_quantity <= product.low_stock_threshold).length
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
    const existingProducts = await fetchAllRows<{ id: string }>(
      'aurel_products',
      new URLSearchParams({ select: 'id', limit: '1000' })
    )
    const existingIds = new Set(existingProducts.map(product => product.id))
    const missingProducts = PRODUCTS.filter(product => !existingIds.has(product.id)).map(toProductRecord)
    if (missingProducts.length) {
      await supabaseRequest('aurel_products', new URLSearchParams(), {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(missingProducts)
      })
    }
    await markCatalogInitialized()
    await logAdminAction(session, 'seed_catalog_imported', 'catalog', null, { importedCount: missingProducts.length })
    return sendJson(res, 200, { imported: missingProducts.length })
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

  if (path === '/api/admin/inventory' && method === 'GET') {
    const [products, movements] = await Promise.all([
      fetchAllRows<ProductRecord>(
        'aurel_products',
        new URLSearchParams({ select: '*', order: 'name.asc', limit: '1000' })
      ),
      supabaseRequest<AdminInventoryMovement[]>(
        'aurel_inventory_movements',
        new URLSearchParams({ select: 'id,product_id,product_name,actor_user_id,quantity_change,previous_quantity,new_quantity,reason,created_at', order: 'created_at.desc', limit: '100' })
      )
    ])
    return sendJson(res, 200, { products: products.map(product => ({ ...toPublicProduct(product), lowStockThreshold: product.low_stock_threshold })), movements })
  }
  const inventoryAdjustmentMatch = path.match(/^\/api\/admin\/inventory\/([A-Za-z0-9_-]{1,100})\/adjust$/)
  if (inventoryAdjustmentMatch && method === 'POST') {
    const body = parseBody(req)
    const quantityChange = body.quantityChange
    const reason = typeof body.reason === 'string' ? body.reason.trim() : ''
    const requestId = body.requestId
    if (typeof quantityChange !== 'number' || !Number.isInteger(quantityChange)
      || quantityChange === 0 || Math.abs(quantityChange) > 1000000
      || reason.length < 3 || reason.length > 500
      || typeof requestId !== 'string'
      || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(requestId)) {
      return sendJson(res, 400, { error: 'Provide a valid non-zero stock change, a reason, and a request ID.' })
    }
    const previousRequest = await supabaseRequest<Array<{ id: number }>>(
      'aurel_inventory_movements',
      new URLSearchParams({ request_id: `eq.${requestId}`, select: 'id', limit: '1' })
    )
    if (!previousRequest.length) {
      const products = await supabaseRequest<Array<{ id: string; stock_quantity: number | null }>>(
        'aurel_products',
        new URLSearchParams({ id: `eq.${inventoryAdjustmentMatch[1]}`, select: 'id,stock_quantity', limit: '1' })
      )
      if (!products[0]) return sendJson(res, 404, { error: 'Product not found.' })
      if (products[0].stock_quantity === null) return sendJson(res, 409, { error: 'Enable stock tracking for this product before adjusting inventory.' })
      if (products[0].stock_quantity + quantityChange < 0) return sendJson(res, 409, { error: 'The adjustment cannot reduce stock below zero.' })
    }
    const result = await supabaseRequest<Array<{
      movement_id: number
      product_id: string
      previous_quantity: number
      new_quantity: number
      quantity_change: number
    }>>('rpc/aurel_adjust_inventory', new URLSearchParams(), {
      method: 'POST',
      body: JSON.stringify({
        p_product_id: inventoryAdjustmentMatch[1],
        p_actor_id: session.user_id,
        p_quantity_change: quantityChange,
        p_reason: reason,
        p_request_id: requestId
      })
    })
    await logAdminAction(session, 'inventory_adjusted', 'product', inventoryAdjustmentMatch[1], {
      quantityChange, reason, movementId: result[0]?.movement_id
    })
    return sendJson(res, 200, { success: true, movement: result[0] })
  }

  if (path === '/api/admin/custom-orders' && method === 'GET') {
    const [orders, operations] = await Promise.all([
      fetchAllRows<{
        id: number
        order_id: string
        user_id: string | null
        order_data: Record<string, unknown>
        created_at: string
        fulfillment_status: string
      }>('aurel_orders', new URLSearchParams({
        select: 'id,order_id,user_id,order_data,created_at,fulfillment_status',
        order: 'created_at.desc',
        limit: '500'
      })),
      supabaseRequest<OrderOperation[]>(
        'aurel_order_operations',
        new URLSearchParams({ select: 'order_id,production_status,customer_approved_at,proof_sent_at,proof_url,expected_delivery_date,courier,tracking_number,owner_notes,checklist,updated_at', order: 'updated_at.desc', limit: '1000' })
      )
    ])
    const operationMap = new Map(operations.map(operation => [operation.order_id, operation]))
    const customOrders = orders.filter(order => {
      const items = Array.isArray(order.order_data.items) ? order.order_data.items : []
      return items.some(item => item && typeof item === 'object' && (
        Boolean((item as Record<string, unknown>).recipientName)
        || Boolean((item as Record<string, unknown>).customMessage)
        || Boolean((item as Record<string, unknown>).customComponents)
      ))
    }).map(order => ({
      ...order,
      operation: operationMap.get(order.id) ?? {
        order_id: order.id,
        production_status: 'awaiting_details',
        customer_approved_at: null,
        proof_sent_at: null,
        proof_url: '',
        expected_delivery_date: null,
        courier: '',
        tracking_number: '',
        owner_notes: '',
        checklist: [],
        updated_at: order.created_at
      }
    }))
    return sendJson(res, 200, { orders: customOrders })
  }
  const customOrderMatch = path.match(/^\/api\/admin\/custom-orders\/(\d+)$/)
  if (customOrderMatch && method === 'PATCH') {
    const body = parseBody(req)
    const orderId = Number(customOrderMatch[1])
    const productionStatus = body.productionStatus
    if (typeof productionStatus !== 'string' || !productionStatuses.includes(productionStatus as typeof productionStatuses[number])) {
      return sendJson(res, 400, { error: 'Choose a valid production status.' })
    }
    const orders = await supabaseRequest<Array<{ id: number }>>(
      'aurel_orders',
      new URLSearchParams({ id: `eq.${orderId}`, select: 'id', limit: '1' })
    )
    if (!orders[0]) return sendJson(res, 404, { error: 'Order not found.' })
    const existing = await supabaseRequest<OrderOperation[]>(
      'aurel_order_operations',
      new URLSearchParams({ order_id: `eq.${orderId}`, select: 'customer_approved_at', limit: '1' })
    )
    if (productionStatus === 'approved_for_production' && !existing[0]?.customer_approved_at) {
      return sendJson(res, 409, { error: 'The customer must record approval from their account before production can begin.' })
    }
    const checklist = body.checklist
    if (!Array.isArray(checklist) || checklist.length > 30 || !checklist.every(item =>
      item && typeof item === 'object' && typeof item.id === 'string' && /^[a-z0-9_-]{1,50}$/.test(item.id)
      && typeof item.label === 'string' && item.label.length <= 160 && typeof item.complete === 'boolean'
    )) return sendJson(res, 400, { error: 'The production checklist is invalid.' })
    const ownerNotes = body.ownerNotes
    const courier = body.courier
    const trackingNumber = body.trackingNumber
    const proofUrl = body.proofUrl
    const expectedDeliveryDate = body.expectedDeliveryDate
    if (typeof ownerNotes !== 'string' || ownerNotes.length > 5000
      || typeof courier !== 'string' || courier.length > 120
      || typeof trackingNumber !== 'string' || trackingNumber.length > 200
      || typeof proofUrl !== 'string' || proofUrl.length > 2000
      || !(expectedDeliveryDate === null || (typeof expectedDeliveryDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expectedDeliveryDate)))) {
      return sendJson(res, 400, { error: 'Enter valid owner notes, courier, tracking details, and delivery date.' })
    }
    let isSecureProofUrl = false
    if (proofUrl) {
      try {
        const parsedProofUrl = new URL(proofUrl)
        isSecureProofUrl = parsedProofUrl.protocol === 'https:'
          && !parsedProofUrl.username
          && !parsedProofUrl.password
      } catch {
        isSecureProofUrl = false
      }
    }
    if (proofUrl && !isSecureProofUrl) {
      return sendJson(res, 400, { error: 'Proof links must use HTTPS.' })
    }
    if (productionStatus === 'awaiting_customer_approval' && !proofUrl) {
      return sendJson(res, 400, { error: 'Add a secure proof link before requesting customer approval.' })
    }
    const currentRows = await supabaseRequest<Array<{ proof_sent_at: string | null }>>(
      'aurel_order_operations',
      new URLSearchParams({ order_id: `eq.${orderId}`, select: 'proof_sent_at', limit: '1' })
    )
    const now = new Date().toISOString()
    const proofSentAt = ['proof_sent', 'awaiting_customer_approval'].includes(productionStatus)
      ? currentRows[0]?.proof_sent_at ?? now
      : currentRows[0]?.proof_sent_at ?? null
    await supabaseRequest('aurel_order_operations', new URLSearchParams({ on_conflict: 'order_id' }), {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        order_id: orderId,
        production_status: productionStatus,
        proof_sent_at: proofSentAt,
        proof_url: proofUrl.trim(),
        expected_delivery_date: expectedDeliveryDate,
        courier: courier.trim(),
        tracking_number: trackingNumber.trim(),
        owner_notes: ownerNotes.trim(),
        checklist,
        updated_by: session.user_id,
        updated_at: now
      })
    })
    await logAdminAction(session, 'custom_order_workflow_updated', 'order', orderId, { productionStatus })
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/products' && method === 'GET') {
    const products = await fetchAllRows<ProductRecord>(
      'aurel_products',
      new URLSearchParams({ select: '*', order: 'updated_at.desc', limit: '1000' })
    )
    return sendJson(res, 200, {
      products: products.map(product => ({
        ...toPublicProduct(product),
        lowStockThreshold: product.low_stock_threshold
      }))
    })
  }
  if (path === '/api/admin/products' && method === 'POST') {
    const payload = productPayload(parseBody(req))
    if (!payload) return sendJson(res, 400, { error: 'Product details are incomplete or invalid.' })
    await supabaseRequest('aurel_products', new URLSearchParams(), { method: 'POST', body: JSON.stringify(payload), headers: { Prefer: 'return=minimal' } })
    await markCatalogInitialized()
    await logAdminAction(session, 'product_created', 'product', payload.id, { variantCount: payload.variants.length })
    return sendJson(res, 201, { success: true })
  }
  if (path === '/api/admin/products/bulk' && method === 'PATCH') {
    const body = parseBody(req)
    const productIds = body.productIds
    const action = body.action
    if (!Array.isArray(productIds) || productIds.length < 1 || productIds.length > 200
      || !productIds.every(id => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id))
      || new Set(productIds).size !== productIds.length
      || !['publish', 'unpublish', 'activate', 'deactivate'].includes(String(action))) {
      return sendJson(res, 400, { error: 'Choose a supported bulk action and between 1 and 200 unique products.' })
    }
    const existing = await supabaseRequest<Array<{ id: string }>>(
      'aurel_products',
      new URLSearchParams({ id: `in.(${productIds.join(',')})`, select: 'id', limit: String(productIds.length) })
    )
    if (existing.length !== productIds.length) return sendJson(res, 404, { error: 'Some selected products could not be found; no changes were made.' })
    const update = action === 'publish' ? { is_published: true }
      : action === 'unpublish' ? { is_published: false }
        : action === 'activate' ? { is_active: true }
          : { is_active: false }
    await supabaseRequest('aurel_products', new URLSearchParams({ id: `in.(${productIds.join(',')})` }), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ ...update, updated_at: new Date().toISOString() })
    })
    await logAdminAction(session, 'products_bulk_updated', 'product', null, { action, productIds })
    return sendJson(res, 200, { success: true, updatedCount: productIds.length })
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
    await logAdminAction(session, 'product_updated', 'product', productId, { variantCount: payload.variants.length })
    return sendJson(res, 200, { success: true })
  }
  if (productMatch && method === 'DELETE') {
    const productId = decodeURIComponent(productMatch[1])
    const existing = await supabaseRequest<Array<{ id: string }>>('aurel_products', new URLSearchParams({ id: `eq.${productId}`, select: 'id', limit: '1' }))
    if (!existing[0]) return sendJson(res, 404, { error: 'Product not found.' })
    await supabaseRequest('aurel_products', new URLSearchParams({ id: `eq.${productId}` }), { method: 'DELETE' })
    await markCatalogInitialized()
    await logAdminAction(session, 'product_deleted', 'product', productId)
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/collections' && method === 'GET') {
    const [collections, memberships] = await Promise.all([
      fetchAllRows<{ id: string; name: string; description: string; image_url: string; is_active: boolean; display_order: number; updated_at: string }>(
        'aurel_collections',
        new URLSearchParams({ select: '*', order: 'display_order.asc,name.asc' })
      ),
      fetchAllRows<{ collection_id: string; product_id: string; display_order: number }>(
        'aurel_collection_products',
        new URLSearchParams({ select: 'collection_id,product_id,display_order', order: 'display_order.asc' })
      )
    ])
    return sendJson(res, 200, {
      collections: collections.map(collection => ({
        ...collection,
        productIds: memberships.filter(item => item.collection_id === collection.id).sort((a, b) => a.display_order - b.display_order).map(item => item.product_id)
      }))
    })
  }
  if (path === '/api/admin/collections' && method === 'POST') {
    const body = parseBody(req)
    const id = typeof body.id === 'string' ? slugify(body.id) : ''
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    const displayOrder = body.displayOrder
    const isActive = body.isActive
    const productIds = body.productIds
    if (!id || id.length > 80 || !/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(id)
      || !name || name.length > 120 || description.length > 4000
      || imageUrl.length > 2000 || !validContentImageUrl(imageUrl)
      || typeof displayOrder !== 'number' || !Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000
      || typeof isActive !== 'boolean'
      || !Array.isArray(productIds) || productIds.length > 500
      || !productIds.every(productId => typeof productId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(productId))
      || new Set(productIds).size !== productIds.length) {
      return sendJson(res, 400, { error: 'Enter valid collection details and a unique list of products.' })
    }
    await supabaseRequest('aurel_collections', new URLSearchParams(), {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ id, name, description, image_url: imageUrl, display_order: displayOrder, is_active: isActive })
    })
    await supabaseRequest('rpc/aurel_set_collection_products', new URLSearchParams(), {
      method: 'POST',
      body: JSON.stringify({ p_collection_id: id, p_product_ids: productIds })
    })
    await logAdminAction(session, 'collection_created', 'collection', id, { productCount: productIds.length })
    return sendJson(res, 201, { success: true })
  }
  const collectionMatch = path.match(/^\/api\/admin\/collections\/([a-z0-9_-]+)$/)
  if (collectionMatch && method === 'PATCH') {
    const body = parseBody(req)
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : ''
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    const displayOrder = body.displayOrder
    const isActive = body.isActive
    const productIds = body.productIds
    if (!name || name.length > 120 || description.length > 4000
      || imageUrl.length > 2000 || !validContentImageUrl(imageUrl)
      || typeof displayOrder !== 'number' || !Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000
      || typeof isActive !== 'boolean'
      || !Array.isArray(productIds) || productIds.length > 500
      || !productIds.every(productId => typeof productId === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(productId))
      || new Set(productIds).size !== productIds.length) {
      return sendJson(res, 400, { error: 'Enter valid collection details and a unique list of products.' })
    }
    const existing = await supabaseRequest<Array<{ id: string }>>('aurel_collections', new URLSearchParams({ id: `eq.${collectionMatch[1]}`, select: 'id', limit: '1' }))
    if (!existing.length) return sendJson(res, 404, { error: 'Collection not found.' })
    await supabaseRequest('aurel_collections', new URLSearchParams({ id: `eq.${collectionMatch[1]}` }), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ name, description, image_url: imageUrl, display_order: displayOrder, is_active: isActive, updated_at: new Date().toISOString() })
    })
    await supabaseRequest('rpc/aurel_set_collection_products', new URLSearchParams(), {
      method: 'POST',
      body: JSON.stringify({ p_collection_id: collectionMatch[1], p_product_ids: productIds })
    })
    await logAdminAction(session, 'collection_updated', 'collection', collectionMatch[1], { productCount: productIds.length })
    return sendJson(res, 200, { success: true })
  }
  if (collectionMatch && method === 'DELETE') {
    const existing = await supabaseRequest<Array<{ id: string }>>('aurel_collections', new URLSearchParams({ id: `eq.${collectionMatch[1]}`, select: 'id', limit: '1' }))
    if (!existing.length) return sendJson(res, 404, { error: 'Collection not found.' })
    await supabaseRequest('aurel_collections', new URLSearchParams({ id: `eq.${collectionMatch[1]}` }), { method: 'DELETE' })
    await logAdminAction(session, 'collection_deleted', 'collection', collectionMatch[1])
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/categories' && method === 'GET') {
    const [categories, products] = await Promise.all([
      supabaseRequest<Array<Record<string, unknown>>>('aurel_categories', new URLSearchParams({ select: '*', order: 'display_order.asc,name.asc' })),
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
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : ''
    const displayOrder = body.displayOrder === undefined ? 0 : body.displayOrder
    const isFeatured = body.isFeatured === undefined ? false : body.isFeatured
    if (!name || name.length > 100 || slug.length > 64 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return sendJson(res, 400, { error: 'Enter a category name and a valid category slug.' })
    }
    if (typeof displayOrder !== 'number' || !Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000 || typeof isFeatured !== 'boolean') {
      return sendJson(res, 400, { error: 'Enter a valid category display order and featured setting.' })
    }
    if (imageUrl.length > 2000 || !validContentImageUrl(imageUrl)) {
      return sendJson(res, 400, { error: 'Enter a valid category image URL.' })
    }
    await supabaseRequest('aurel_categories', new URLSearchParams(), {
      method: 'POST', body: JSON.stringify({
        slug, name, description: typeof body.description === 'string' ? body.description.slice(0, 4000) : '',
        image_url: imageUrl,
        is_active: typeof body.isActive === 'boolean' ? body.isActive : true,
        display_order: displayOrder,
        is_featured: isFeatured
      }), headers: { Prefer: 'return=minimal' }
    })
    await logAdminAction(session, 'category_created', 'category', slug)
    return sendJson(res, 201, { success: true })
  }
  const categoryMatch = path.match(/^\/api\/admin\/categories\/([a-z0-9_-]+)$/)
  if (categoryMatch && method === 'PATCH') {
    const body = parseBody(req)
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof body.name === 'string' && body.name.trim() && body.name.length <= 100) update.name = body.name.trim()
    if (typeof body.description === 'string' && body.description.length <= 4000) update.description = body.description
    if (typeof body.imageUrl === 'string') {
      const imageUrl = body.imageUrl.trim()
      if (imageUrl.length > 2000 || !validContentImageUrl(imageUrl)) return sendJson(res, 400, { error: 'Enter a valid category image URL.' })
      update.image_url = imageUrl
    }
    if (typeof body.isActive === 'boolean') update.is_active = body.isActive
    if (body.displayOrder !== undefined) {
      if (typeof body.displayOrder !== 'number' || !Number.isInteger(body.displayOrder) || body.displayOrder < 0 || body.displayOrder > 10000) {
        return sendJson(res, 400, { error: 'Enter a valid category display order.' })
      }
      update.display_order = body.displayOrder
    }
    if (body.isFeatured !== undefined) {
      if (typeof body.isFeatured !== 'boolean') return sendJson(res, 400, { error: 'Choose a valid featured setting.' })
      update.is_featured = body.isFeatured
    }
    const existing = await supabaseRequest<Array<{ slug: string }>>(
      'aurel_categories',
      new URLSearchParams({ slug: `eq.${categoryMatch[1]}`, select: 'slug', limit: '1' })
    )
    if (!existing[0]) return sendJson(res, 404, { error: 'Category not found.' })
    await supabaseRequest('aurel_categories', new URLSearchParams({ slug: `eq.${categoryMatch[1]}` }), { method: 'PATCH', body: JSON.stringify(update), headers: { Prefer: 'return=minimal' } })
    await logAdminAction(session, 'category_updated', 'category', categoryMatch[1], { fields: Object.keys(update).filter(key => key !== 'updated_at') })
    return sendJson(res, 200, { success: true })
  }
  if (categoryMatch && method === 'DELETE') {
    const products = await supabaseRequest<Array<{ id: string }>>(
      'aurel_products',
      new URLSearchParams({ category: `eq.${categoryMatch[1]}`, select: 'id', limit: '1' })
    )
    if (products.length) return sendJson(res, 409, { error: 'Move or delete this category’s products before deleting the category.' })
    await supabaseRequest('aurel_categories', new URLSearchParams({ slug: `eq.${categoryMatch[1]}` }), { method: 'DELETE' })
    await logAdminAction(session, 'category_deleted', 'category', categoryMatch[1])
    return sendJson(res, 200, { success: true })
  }

  if (path === '/api/admin/orders' && method === 'GET') {
    const orders = await fetchAllRows<Record<string, unknown>>(
      'aurel_orders',
      new URLSearchParams({ select: 'id,user_id,order_id,order_data,created_at,fulfillment_status', order: 'created_at.desc', limit: '500' })
    )
    const orderIds = orders.map(order => Number(order.id)).filter(Number.isSafeInteger)
    const events = orderIds.length
      ? await supabaseRequest<Array<Record<string, unknown>>>(
        'aurel_order_events',
        new URLSearchParams({ order_id: `in.(${orderIds.join(',')})`, select: 'id,order_id,actor_type,event_type,summary,metadata,created_at', order: 'created_at.desc', limit: '5000' })
      )
      : []
    const eventMap = new Map<number, Array<Record<string, unknown>>>()
    for (const event of events) {
      const id = Number(event.order_id)
      eventMap.set(id, [...(eventMap.get(id) ?? []), event])
    }
    return sendJson(res, 200, { orders: orders.map(order => ({ ...order, events: eventMap.get(Number(order.id)) ?? [] })) })
  }
  const orderMatch = path.match(/^\/api\/admin\/orders\/(\d+)$/)
  if (orderMatch && method === 'PATCH') {
    const body = parseBody(req)
    const validFulfillmentStatuses = ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'] as const
    const fulfillmentStatus = typeof body.fulfillmentStatus === 'string' ? body.fulfillmentStatus : ''
    if (!validFulfillmentStatuses.includes(fulfillmentStatus as typeof validFulfillmentStatuses[number])) {
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
    await createOrderEvent(Number(orderMatch[1]), 'owner', session.user_id, 'fulfillment_updated', `Fulfillment updated to ${fulfillmentStatus.replaceAll('_', ' ')}.`, { fulfillmentStatus })
    await createAdminNotification('order_fulfillment', 'Order fulfillment updated', `Order ${orderMatch[1]} is now ${fulfillmentStatus.replaceAll('_', ' ')}.`, 'order', orderMatch[1])
    await logAdminAction(session, 'order_fulfillment_updated', 'order', orderMatch[1], { fulfillmentStatus })
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
    const userIds = customers.map(customer => String(customer.id))
    const orderRows = userIds.length
      ? await fetchAllRows<{ user_id: string; order_data: Record<string, unknown>; created_at: string }>(
        'aurel_orders',
        new URLSearchParams({ user_id: `in.(${userIds.join(',')})`, select: 'user_id,order_data,created_at', limit: '1000' })
      )
      : []
    const customerOrders = new Map<string, { count: number; totalOrderValue: number; latestOrderAt: string | null }>()
    for (const order of orderRows) {
      const current = customerOrders.get(order.user_id) ?? { count: 0, totalOrderValue: 0, latestOrderAt: null }
      current.count += 1
      const amount = Number(order.order_data.total)
      if (Number.isFinite(amount) && amount >= 0) current.totalOrderValue += amount
      if (!current.latestOrderAt || order.created_at > current.latestOrderAt) current.latestOrderAt = order.created_at
      customerOrders.set(order.user_id, current)
    }
    const visibleCustomers = !authUser?.email || getAdminEmails().has(authUser.email.toLowerCase())
      ? customers.filter(customer => !getAdminEmails().has(String(customer.email).toLowerCase()))
      : customers
    const customersWithOrders = visibleCustomers.map(customer => ({
      ...customer,
      orderSummary: customerOrders.get(String(customer.id)) ?? { count: 0, totalOrderValue: 0, latestOrderAt: null }
    }))
    return sendJson(res, 200, { customers: customersWithOrders })
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
      await logAdminAction(session, 'customer_permanently_deleted', 'customer', customerId, { alreadyDeleted: !authUser && !customer[0] })
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
    await logAdminAction(session, 'customer_profile_updated', 'customer', customerActionMatch[1], { fields: Object.keys(update) })
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
    await logAdminAction(session, 'customer_disabled', 'customer', customerActionMatch[1])
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
    await logAdminAction(session, 'customer_enabled', 'customer', customerActionMatch[1])
    return sendJson(res, 200, { success: true })
  }
  if (path === '/api/admin/settings' && method === 'GET') {
    const rows = await supabaseRequest<Array<{ settings: Partial<StoreSettings> }>>(
      'aurel_store_settings',
      new URLSearchParams({ id: 'eq.storefront', select: 'settings', limit: '1' })
    )
    return sendJson(res, 200, { settings: resolveStoreSettings(rows[0]?.settings) })
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
    if (!validPublicPhone(settings.phone ?? '') || !validPublicPhone(settings.whatsappNumber ?? '')) {
      return sendJson(res, 400, { error: 'Enter valid public phone and WhatsApp numbers, including their country code.' })
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
    await logAdminAction(session, 'store_settings_updated', 'store', 'storefront', { fields: Object.keys(settings) })
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
