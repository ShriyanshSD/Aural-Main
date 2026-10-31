import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownLeft, ArrowLeft, ArrowUpRight, Boxes, Check, ChevronDown, CircleAlert, ClipboardList, ImagePlus,
  Bell, LayoutDashboard, LoaderCircle, LogOut, Package, Plus, Search, Settings, ShieldCheck, ShoppingBag,
  Star, Store, Trash2, Users, X
} from 'lucide-react'
import type { Product } from './types'
import type { StorefrontContent } from './types'
import PasswordInput from './components/PasswordInput'

type Section = 'dashboard' | 'products' | 'inventory' | 'categories' | 'orders' | 'custom-orders' | 'customers' | 'reviews' | 'settings'
type Fulfillment = 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
interface AdminCategory {
  slug: string
  name: string
  description: string
  image_url: string
  is_active: boolean
  display_order: number
  is_featured: boolean
  productCount?: number
}
interface AdminProduct extends Product {
  stockQuantity: number | null
  lowStockThreshold: number
  isActive: boolean
  isPublished: boolean
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
interface CustomOrderOperation {
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
interface AdminCustomOrder {
  id: number
  order_id: string
  user_id: string | null
  order_data: Record<string, unknown>
  created_at: string
  fulfillment_status: string
  operation: CustomOrderOperation
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
interface AdminOrder {
  id: number
  order_id: string
  user_id: string
  order_data: Record<string, unknown>
  created_at: string
  fulfillment_status: Fulfillment
  events?: AdminOrderEvent[]
}
interface AdminOrderEvent {
  id: number
  actor_type: string
  event_type: string
  summary: string
  created_at: string
}
interface AdminReview {
  id: number
  order_id: number
  user_id: string
  product_id: string
  product_name: string
  customer_name: string
  customer_email: string
  rating: number
  title: string
  body: string
  moderation_status: 'pending' | 'approved' | 'rejected'
  created_at: string
}
interface AdminNotification {
  id: number
  notification_type: string
  title: string
  message: string
  target_type: string
  target_id: string | null
  read_at: string | null
  created_at: string
}
interface AdminCustomer {
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
  account_status: 'active' | 'disabled'
  created_at: string
  orderSummary: { count: number; totalOrderValue: number; latestOrderAt: string | null }
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
interface Overview {
  metrics: { recordedPaidOrderValue: number; orders: number; customers: number; products: number; lowStock: number }
  recentOrders: AdminOrder[]
  bestsellers: { name: string; quantity: number }[]
}

const sections: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'inventory', label: 'Inventory', icon: ClipboardList },
  { id: 'categories', label: 'Categories', icon: Boxes },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'custom-orders', label: 'Custom orders', icon: Package },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'settings', label: 'Settings & security', icon: Settings }
]
const initialContent: StorefrontContent = {
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

const initialSettings: StoreSettings = {
  storeName: 'AUREL',
  tagline: 'Made With Love For You',
  description: '',
  contactEmail: '',
  phone: '',
  whatsappNumber: '',
  instagramUrl: '',
  facebookUrl: '',
  deliveryNote: ''
}
const initialProduct: AdminProduct = {
  id: '',
  name: '',
  category: '',
  price: 0,
  rating: 0,
  reviewsCount: 0,
  imageUrl: '',
  fallbackColor: '#F6E8E0',
  description: '',
  tagline: '',
  availableFinishes: [],
  isCustomizable: false,
  features: [],
  stockQuantity: null,
  lowStockThreshold: 5,
  isActive: true,
  isPublished: true
}
const fulfillmentStatuses: Fulfillment[] = ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled']
const analyticsRangeStorageKey = 'aurel_admin_analytics_range'
const analyticsRanges = ['7d', '30d', '90d', 'all'] as const
type AnalyticsRange = typeof analyticsRanges[number]
const readAnalyticsRange = (): AnalyticsRange => {
  const saved = window.localStorage.getItem(analyticsRangeStorageKey)
  return analyticsRanges.find(range => range === saved) ?? '30d'
}
const sectionFromPath = (path: string): Section => {
  const segment = path.split('/').filter(Boolean)[1]
  if (segment === 'collections') return 'categories'
  if (segment === 'notifications' || segment === 'content' || segment === 'activity') return 'settings'
  return sections.some(section => section.id === segment) ? segment as Section : 'dashboard'
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    cache: 'no-store',
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers
    }
  })
  let payload: { error?: string } & T
  try {
    payload = await response.json() as { error?: string } & T
  } catch {
    throw new Error(`The owner service returned an invalid response (HTTP ${response.status}).`)
  }
  if (!response.ok) throw new Error(payload.error || `The request failed (HTTP ${response.status}).`)
  return payload
}

const money = (amount: unknown) => `₹${Number(amount || 0).toLocaleString('en-IN')}`
const dateLabel = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const statusLabel = (status: string) => status.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())
function usePagination<T>(items: T[], pageSize = 15) {
  const [page, setPage] = useState(0)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  useEffect(() => setPage(current => Math.min(current, pageCount - 1)), [pageCount])
  return { page, setPage, pageCount, visibleItems: items.slice(page * pageSize, (page + 1) * pageSize) }
}

export default function AdminApp() {
  const [section, setSection] = useState<Section>(() => sectionFromPath(window.location.pathname))
  const [ownerEmail, setOwnerEmail] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [authReady, setAuthReady] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [overview, setOverview] = useState<Overview | null>(null)
  const [analyticsRange, setAnalyticsRange] = useState<AnalyticsRange>(readAnalyticsRange)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [inventoryMovements, setInventoryMovements] = useState<AdminInventoryMovement[]>([])
  const [customOrders, setCustomOrders] = useState<AdminCustomOrder[]>([])
  const [activityEntries, setActivityEntries] = useState<AdminAuditEntry[]>([])
  const [contentDraft, setContentDraft] = useState<StorefrontContent>(initialContent)
  const [contentPublished, setContentPublished] = useState<StorefrontContent>(initialContent)
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [reviews, setReviews] = useState<AdminReview[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [settings, setSettings] = useState<StoreSettings>(initialSettings)
  const [productDraft, setProductDraft] = useState<AdminProduct | null>(null)
  const [categoryDraft, setCategoryDraft] = useState<AdminCategory | null>(null)
  const [customerDraft, setCustomerDraft] = useState<AdminCustomer | null>(null)

  const navigateSection = (target: Section) => {
    window.history.pushState(null, '', `/admin/${target}`)
    setSection(target)
  }

  const refreshNotifications = async () => {
    const result = await api<{ notifications: AdminNotification[]; unreadCount: number }>('/api/admin/notifications')
    setNotifications(result.notifications)
    setUnreadNotificationCount(result.unreadCount)
  }

  useEffect(() => {
    const handleRouteChange = () => setSection(sectionFromPath(window.location.pathname))
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.has('code') || params.has('access_token')) {
      window.history.replaceState(null, '', '/admin/login')
    }
    void api<{ user: { id: string; email: string } }>('/api/admin/me')
      .then(({ user }) => {
        setOwnerEmail(user.email)
        setSignedIn(true)
        navigateSection('dashboard')
      })
      .catch(() => setSignedIn(false))
      .finally(() => setAuthReady(true))
  }, [])

  const loadSection = async (target: Section) => {
    setBusy(true)
    setError('')
    try {
      if (target === 'dashboard') setOverview(await api<Overview>(`/api/admin/overview?range=${analyticsRange}`))
      if (target === 'products') {
        const [result, categoryResult] = await Promise.all([
          api<{ products: AdminProduct[] }>('/api/admin/products'),
          api<{ categories: AdminCategory[] }>('/api/admin/categories')
        ])
        setProducts(result.products)
        setCategories(categoryResult.categories)
        if (!result.products.length) setNotice('Import the existing storefront catalog to begin managing products.')
      }
      if (target === 'inventory') {
        const result = await api<{ products: AdminProduct[]; movements: AdminInventoryMovement[] }>('/api/admin/inventory')
        setProducts(result.products)
        setInventoryMovements(result.movements)
      }
      if (target === 'custom-orders') setCustomOrders((await api<{ orders: AdminCustomOrder[] }>('/api/admin/custom-orders')).orders)
      if (target === 'categories') {
        const categoryResult = await api<{ categories: AdminCategory[] }>('/api/admin/categories')
        setCategories(categoryResult.categories)
      }
      if (target === 'orders') setOrders((await api<{ orders: AdminOrder[] }>('/api/admin/orders')).orders)
      if (target === 'customers') setCustomers((await api<{ customers: AdminCustomer[] }>('/api/admin/customers')).customers)
      if (target === 'reviews') setReviews((await api<{ reviews: AdminReview[] }>('/api/admin/reviews')).reviews)
      if (target === 'settings') {
        const [settingsResult, contentResult, activityResult] = await Promise.all([
          api<{ settings: StoreSettings }>('/api/admin/settings'),
          api<{ draft: StorefrontContent; published: StorefrontContent }>('/api/admin/content'),
          api<{ entries: AdminAuditEntry[] }>('/api/admin/activity')
        ])
        setSettings(settingsResult.settings)
        setContentDraft(contentResult.draft)
        setContentPublished(contentResult.published)
        setActivityEntries(activityResult.entries)
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this dashboard section.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (signedIn) void loadSection(section)
  }, [section, signedIn, analyticsRange])

  useEffect(() => {
    if (!signedIn) return
    let active = true
    const refresh = () => {
      void refreshNotifications().catch(notificationError => {
        if (active) setError(notificationError instanceof Error ? notificationError.message : 'Unable to load owner notifications.')
      })
    }
    refresh()
    const timer = window.setInterval(refresh, 60_000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [signedIn])

  useEffect(() => {
    window.localStorage.setItem(analyticsRangeStorageKey, analyticsRange)
  }, [analyticsRange])
  const filteredProducts = useMemo(() => products.filter(product =>
    `${product.name} ${product.id} ${product.category}`.toLowerCase().includes(search.toLowerCase())
  ), [products, search])
  const filteredOrders = useMemo(() => orders.filter(order =>
    `${order.order_id} ${order.order_data.customerName ?? ''} ${order.order_data.email ?? ''}`.toLowerCase().includes(search.toLowerCase())
  ), [orders, search])
  const filteredCustomers = useMemo(() => customers.filter(customer =>
    `${customer.name} ${customer.username} ${customer.email} ${customer.phone}`.toLowerCase().includes(search.toLowerCase())
  ), [customers, search])

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      const { user } = await api<{ user: { id: string; email: string } }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      })
      setOwnerEmail(user.email)
      setSignedIn(true)
      setLoginPassword('')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Owner sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  const logout = async () => {
    try {
      await api('/api/admin/logout', { method: 'POST', body: '{}' })
      setSignedIn(false)
      setOwnerEmail('')
      setNotice('')
      setSection('dashboard')
      window.history.replaceState(null, '', '/admin/login')
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Unable to sign out.')
    }
  }

  const runAction = async (action: () => Promise<void>, successMessage: string) => {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      setNotice(successMessage)
      await loadSection(section)
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The change could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  const importCatalog = () => runAction(async () => {
    const result = await api<{ imported: number }>('/api/admin/products/import', { method: 'POST', body: '{}' })
    setNotice(`Imported ${result.imported} catalog products.`)
  }, 'The storefront catalog is ready to manage.')

  const markNotificationRead = async (notification: AdminNotification) => {
    if (notification.read_at) return
    try {
      await api(`/api/admin/notifications/${notification.id}/read`, { method: 'POST', body: '{}' })
      const readAt = new Date().toISOString()
      setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read_at: readAt } : item))
      setUnreadNotificationCount(count => Math.max(0, count - 1))
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Unable to mark the notification as read.')
      throw readError
    }
  }
  const openNotification = async (notification: AdminNotification) => {
    await markNotificationRead(notification)
    setNotificationsOpen(false)
    if (notification.target_type === 'order') navigateSection('orders')
    else if (notification.target_type === 'review') navigateSection('reviews')
  }
  const markAllNotificationsRead = async () => {
    try {
      await api('/api/admin/notifications/read-all', { method: 'POST', body: '{}' })
      const readAt = new Date().toISOString()
      setNotifications(current => current.map(item => ({ ...item, read_at: item.read_at ?? readAt })))
      setUnreadNotificationCount(0)
    } catch (readError) {
      setError(readError instanceof Error ? readError.message : 'Unable to mark notifications as read.')
    }
  }

  if (!authReady) return <AdminLoading />
  if (!signedIn) {
    return (
      <main className="min-h-screen bg-[#f7f3ef] px-5 py-12 text-[#342825]">
        <div className="mx-auto max-w-md">
          <a href="/" className="inline-flex items-center gap-2 text-sm text-[#8d7068] hover:text-[#a95f60]">
            <ArrowLeft className="h-4 w-4" /> Return to storefront
          </a>
          <div className="mt-16 rounded-3xl border border-[#eadbd4] bg-white p-8 shadow-xl shadow-[#5d3a2d]/5 sm:p-10">
            <div className="mb-8 inline-flex rounded-2xl bg-[#a45f60]/10 p-3 text-[#a45f60]"><ShieldCheck className="h-6 w-6" /></div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#a45f60]">Aurel Studio</p>
            <h1 className="mt-2 font-serif-title text-3xl">Owner sign in</h1>
            <p className="mt-3 text-sm leading-6 text-[#826f69]">This private dashboard is for authorized store owners.</p>
            {error && <AlertMessage message={error} />}
            <form onSubmit={submitLogin} className="mt-7 space-y-4">
              <label className="block text-sm font-medium">Owner email
                <input autoComplete="username" type="email" required value={loginEmail} onChange={event => setLoginEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e5d8d2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#a45f60] focus:ring-2 focus:ring-[#a45f60]/15" />
              </label>
              <div className="block text-sm font-medium">
                <label htmlFor="owner-login-password">Password</label>
                <PasswordInput id="owner-login-password" autoComplete="current-password" required value={loginPassword} onChange={event => setLoginPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e5d8d2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#a45f60] focus:ring-2 focus:ring-[#a45f60]/15" />
              </div>
              <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#a45f60] px-4 py-3 font-semibold text-white transition hover:bg-[#8c4e50] disabled:opacity-60">
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" />} Sign in securely
              </button>
            </form>
          </div>
          <p className="mt-5 text-center text-xs text-[#9b8881]">Access is restricted to server-configured, verified owner accounts.</p>
        </div>
      </main>
    )
  }

  const currentTitle = sections.find(item => item.id === section)?.label ?? 'Overview'
  return (
    <div className="owner-dashboard min-h-screen bg-[#f7f5f2] text-[#322825]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-[#eee6e1] bg-white lg:flex">
        <a href="/" className="flex h-24 items-center gap-3 border-b border-[#f1ebe7] px-6">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#a45f60] text-white">
            <Store className="h-5 w-5" />
          </span>
          <span className="flex flex-col items-start">
            <img src="/aurel-logo.png" alt="AUREL" className="block h-14 w-32 object-contain object-left" />
            <span className="mt-1 text-[10px] uppercase tracking-[.18em] text-[#9d7c74]">Owner studio</span>
          </span>
        </a>
        <nav className="flex-1 space-y-1 px-3 py-6">
          {sections.map(item => {
            const Icon = item.icon
            return <button key={item.id} onClick={() => { navigateSection(item.id); setSearch('') }} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition ${section === item.id ? 'bg-[#f8eeeb] text-[#a45f60]' : 'text-[#776762] hover:bg-[#faf7f5]'}`}><Icon className="h-4 w-4" />{item.label}</button>
          })}
        </nav>
        <div className="border-t border-[#f1ebe7] p-4">
          <div className="truncate px-2 text-xs text-[#92817b]" title={ownerEmail}>{ownerEmail}</div>
          <button onClick={() => { window.location.href = '/' }} className="mt-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#776762] hover:bg-[#faf7f5]"><ArrowUpRight className="h-4 w-4" /> View storefront</button>
          <button onClick={() => void logout()} className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#9e5353] hover:bg-[#fff4f2]"><LogOut className="h-4 w-4" /> Sign out</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-20 items-center justify-between border-b border-[#eee6e1] bg-white/95 px-4 backdrop-blur sm:px-8">
          <div><p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#aa7771]">Aurel Studio / {currentTitle}</p><h1 className="mt-1 font-serif-title text-xl sm:text-2xl">{currentTitle}</h1></div>
          <div className="flex items-center gap-3">
            <span className="hidden max-w-48 truncate text-xs text-[#897770] sm:block">{ownerEmail}</span>
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadNotificationCount}
              open={notificationsOpen}
              onToggle={() => {
                const nextOpen = !notificationsOpen
                setNotificationsOpen(nextOpen)
                if (nextOpen) void refreshNotifications().catch(refreshError => setError(refreshError instanceof Error ? refreshError.message : 'Unable to refresh notifications.'))
              }}
              onRead={markNotificationRead}
              onReadAll={() => void markAllNotificationsRead()}
              onOpen={notification => void openNotification(notification).catch(() => undefined)}
            />
            <button onClick={() => void logout()} title="Sign out" className="rounded-xl border border-[#eadfd9] p-2.5 text-[#866e65] hover:bg-[#faf6f3] lg:hidden"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>
        <div className="flex gap-1 overflow-x-auto border-b border-[#eee6e1] bg-white px-3 py-2 lg:hidden">
          {sections.map(item => <button key={item.id} onClick={() => { navigateSection(item.id); setSearch('') }} className={`shrink-0 rounded-lg px-3 py-2 text-xs font-medium ${section === item.id ? 'bg-[#a45f60] text-white' : 'text-[#776762]'}`}>{item.label}</button>)}
        </div>

        <main className="mx-auto max-w-[1500px] p-4 sm:p-8">
          {error && <AlertMessage message={error} />}
          {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check className="h-4 w-4" />{notice}<button onClick={() => setNotice('')} className="ml-auto"><X className="h-4 w-4" /></button></div>}
          {busy && <div className="mb-4 flex items-center gap-2 text-xs text-[#9b8881]"><LoaderCircle className="h-3.5 w-3.5 animate-spin" />Updating dashboard</div>}

          {section === 'dashboard' && <Dashboard overview={overview} range={analyticsRange} onRangeChange={setAnalyticsRange} onOpenSection={navigateSection} />}
          {section === 'products' && <ProductsPage
            products={filteredProducts} categories={categories} search={search} setSearch={setSearch}
            onRefresh={() => void loadSection('products')} onEdit={setProductDraft}
            onDuplicate={product => setProductDraft({
              ...product,
              id: `${product.id.slice(0, 80)}-copy-${Date.now().toString(36)}`,
              name: `${product.name} (copy)`,
              rating: 0,
              reviewsCount: 0,
              stockQuantity: null,
              isActive: true,
              isPublished: false
            })}
            onBulkAction={(productIds, action) => void runAction(async () => {
              const result = await api<{ updatedCount: number }>('/api/admin/products/bulk', {
                method: 'PATCH',
                body: JSON.stringify({ productIds, action })
              })
              await loadSection('products')
              setNotice(`${result.updatedCount} products updated.`)
            }, 'Selected products updated.')}
            onCreate={() => setProductDraft({ ...initialProduct, id: `product-${Date.now()}`, category: categories[0]?.slug ?? '' })}
            onImport={importCatalog}
            onDelete={product => {
              if (window.confirm(`Delete "${product.name}"? Existing order history is not changed.`)) {
                void runAction(async () => { await api(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' }) }, 'Product deleted.')
              }
            }}
          />}
          {section === 'inventory' && <InventoryPage
            products={products} movements={inventoryMovements} search={search} setSearch={setSearch}
            onAdjust={product => {
              const quantityText = window.prompt(`Enter the stock change for ${product.name} (positive to add, negative to remove):`)
              if (quantityText === null) return
              if (!/^-?\d+$/.test(quantityText) || Number(quantityText) === 0) {
                setError('Enter a non-zero whole number for the stock change.')
                return
              }
              if (Number(quantityText) < 0 && !window.confirm(`Remove ${Math.abs(Number(quantityText))} units from ${product.name}? Current stock: ${product.stockQuantity}.`)) return
              const reason = window.prompt('Enter a reason for this stock adjustment:')
              if (reason === null) return
              void runAction(async () => {
                await api(`/api/admin/inventory/${encodeURIComponent(product.id)}/adjust`, {
                  method: 'POST',
                  body: JSON.stringify({
                    quantityChange: Number(quantityText),
                    reason,
                    requestId: crypto.randomUUID()
                  })
                })
              }, `Inventory updated for ${product.name}.`)
            }}
          />}
          {section === 'categories' && <CategoriesPage
            categories={categories}
            onCreate={() => setCategoryDraft({ slug: '', name: '', description: '', image_url: '', is_active: true, display_order: categories.length, is_featured: false })}
            onEdit={setCategoryDraft}
            onDelete={category => {
              if (window.confirm(`Delete category "${category.name}"? Categories with products cannot be removed.`)) {
                void runAction(async () => { await api(`/api/admin/categories/${encodeURIComponent(category.slug)}`, { method: 'DELETE' }) }, 'Category deleted.')
              }
            }}
          />}
          {section === 'orders' && <OrdersPage orders={filteredOrders} search={search} setSearch={setSearch} onUpdate={(order, status) => {
            void runAction(async () => {
              await api(`/api/admin/orders/${order.id}`, { method: 'PATCH', body: JSON.stringify({ fulfillmentStatus: status }) })
            }, `Order ${order.order_id} fulfillment updated.`)
          }} />}
          {section === 'reviews' && <ReviewsPage
            reviews={reviews}
            onModerate={(review, status) => void runAction(async () => {
              await api(`/api/admin/reviews/${review.id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
              await loadSection('reviews')
            }, `Review ${status}.`)}
          />}
          {section === 'custom-orders' && <CustomOrdersPage
            orders={customOrders.filter(order => `${order.order_id} ${String(order.order_data.customerName ?? '')} ${JSON.stringify(order.order_data.items ?? [])}`.toLowerCase().includes(search.toLowerCase()))}
            search={search} setSearch={setSearch}
            onSave={(order, operation) => {
              void runAction(async () => {
                await api(`/api/admin/custom-orders/${order.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    productionStatus: operation.production_status,
                    expectedDeliveryDate: operation.expected_delivery_date,
                    courier: operation.courier,
                    trackingNumber: operation.tracking_number,
                    proofUrl: operation.proof_url,
                    ownerNotes: operation.owner_notes,
                    checklist: operation.checklist
                  })
                })
              }, `Production workflow saved for ${order.order_id}.`)
            }}
          />}
          {section === 'customers' && <CustomersPage customers={filteredCustomers} search={search} setSearch={setSearch} onEdit={setCustomerDraft} onToggleStatus={customer => {
            const action = customer.account_status === 'active' ? 'disable' : 'enable'
            if (action === 'disable' && !window.confirm(`Disable ${customer.name}'s account? Their order history will remain intact.`)) return
            void runAction(async () => { await api(`/api/admin/customers/${customer.id}/${action}`, { method: 'POST', body: '{}' }) }, `Customer account ${action === 'disable' ? 'disabled' : 'enabled'}.`)
          }} onDelete={customer => {
            const confirmed = window.confirm(
              `Permanently delete ${customer.name} (${customer.email})?\n\nTheir login, profile, saved chat history, and sessions will be deleted. Financial order history will be retained without its customer link, contact or delivery details, or personal gift messages. This cannot be undone.`
            )
            if (!confirmed) return
            const confirmationEmail = window.prompt(`Type ${customer.email} to permanently delete this customer.`)
            if (confirmationEmail === null) return
            void runAction(async () => {
              await api(`/api/admin/customers/${customer.id}/delete`, {
                method: 'POST',
                body: JSON.stringify({ confirmEmail: confirmationEmail })
              })
            }, `Customer ${customer.email} was deleted. Financial order history was retained with personal details removed.`)
          }} />}
          {section === 'settings' && <SettingsPage
            settings={settings}
            setSettings={setSettings}
            analyticsRange={analyticsRange}
            setAnalyticsRange={setAnalyticsRange}
            contentDraft={contentDraft}
            contentPublished={contentPublished}
            setContentDraft={setContentDraft}
            activityEntries={activityEntries}
            ownerEmail={ownerEmail}
            onSaveSettings={() => {
              void runAction(async () => { await api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(settings) }) }, 'Store settings saved.')
            }}
            onSaveContent={() => {
              void runAction(async () => { await api('/api/admin/content', { method: 'PATCH', body: JSON.stringify({ content: contentDraft }) }) }, 'Storefront content draft saved.')
            }}
            onPublishContent={() => {
              if (!window.confirm('Publish this content to the public storefront now?')) return
              void runAction(async () => {
                await api('/api/admin/content/publish', { method: 'POST', body: '{}' })
                setContentPublished(contentDraft)
              }, 'Storefront content published.')
            }}
            onRefreshActivity={() => void loadSection('settings')}
          />}
        </main>
      </div>

      {productDraft && <ProductEditor product={productDraft} isNew={!products.some(item => item.id === productDraft.id)} categories={categories}
        onClose={() => setProductDraft(null)}
        onSave={async product => {
          setBusy(true)
          setError('')
          try {
            const existing = products.some(item => item.id === product.id)
            await api(`/api/admin/products${existing ? `/${encodeURIComponent(product.id)}` : ''}`, {
              method: existing ? 'PATCH' : 'POST', body: JSON.stringify(product)
            })
            setProductDraft(null)
            setNotice('Product saved.')
            await loadSection('products')
          } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save product.')
          } finally { setBusy(false) }
        }} />}
      {categoryDraft && <CategoryEditor category={categoryDraft}
        onClose={() => setCategoryDraft(null)}
        onSave={async category => {
          setBusy(true)
          setError('')
          try {
            const existing = categories.some(item => item.slug === category.slug)
            await api(`/api/admin/categories${existing ? `/${encodeURIComponent(category.slug)}` : ''}`, {
              method: existing ? 'PATCH' : 'POST',
              body: JSON.stringify({
                name: category.name,
                slug: category.slug,
                description: category.description,
                imageUrl: category.image_url,
                isActive: category.is_active,
                displayOrder: category.display_order,
                isFeatured: category.is_featured
              })
            })
            setCategoryDraft(null)
            setNotice('Category saved.')
            await loadSection('categories')
          } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save category.')
          } finally { setBusy(false) }
        }} />}
      {customerDraft && <CustomerEditor customer={customerDraft}
        onClose={() => setCustomerDraft(null)}
        onSave={async customer => {
          setBusy(true)
          setError('')
          try {
            await api(`/api/admin/customers/${customer.id}`, { method: 'PATCH', body: JSON.stringify(customer) })
            setCustomerDraft(null)
            setNotice('Customer details saved.')
            await loadSection('customers')
          } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to save customer.')
          } finally { setBusy(false) }
        }} />}
    </div>
  )
}

function AdminLoading() {
  return <div className="grid min-h-screen place-items-center bg-[#f7f3ef]"><LoaderCircle className="h-6 w-6 animate-spin text-[#a45f60]" /></div>
}
const productionStatusOptions = [
  'awaiting_details', 'ready_for_design', 'design_in_progress', 'proof_sent',
  'awaiting_customer_approval', 'approved_for_production', 'in_production',
  'quality_check', 'packed', 'ready_to_dispatch', 'completed', 'on_hold', 'cancelled'
]
const defaultProductionChecklist = [
  ['verify_personalization', 'Verify spelling and personalization'],
  ['confirm_materials', 'Confirm materials'],
  ['prepare_product', 'Prepare product'],
  ['quality_check', 'Quality-check item'],
  ['gift_message', 'Add gift message'],
  ['package_label', 'Package and label'],
  ['delivery_details', 'Confirm delivery details']
]
function CustomOrdersPage({ orders, search, setSearch, onSave }: {
  orders: AdminCustomOrder[]; search: string; setSearch: (value: string) => void
  onSave: (order: AdminCustomOrder, operation: CustomOrderOperation) => void
}) {
  return <section className="space-y-5">
    <PageHeading title="Custom Orders Studio" description="Manage personalization and production separately from payment and fulfillment." />
    <SearchBox value={search} onChange={setSearch} placeholder="Search order, customer or item personalization" />
    {orders.length ? <div className="space-y-4">{orders.map(order =>
      <CustomOrderCard key={order.id} order={order} onSave={operation => onSave(order, operation)} />
    )}</div> : <EmptyState text="No orders with personalization details were found in the recent order records." />}
  </section>
}
function CustomOrderCard({ order, onSave }: { order: AdminCustomOrder; onSave: (operation: CustomOrderOperation) => void }) {
  const [operation, setOperation] = useState(() => ({
    ...order.operation,
    checklist: order.operation.checklist.length ? order.operation.checklist : defaultProductionChecklist.map(([id, label]) => ({ id, label, complete: false }))
  }))
  const data = order.order_data
  const items = Array.isArray(data.items) ? data.items as Record<string, unknown>[] : []
  const customItems = items.filter(item => item.recipientName || item.customMessage || item.customComponents)
  return <article className="rounded-2xl border border-[#eee5df] bg-white p-5">
    <div className="flex flex-col justify-between gap-2 border-b border-[#f2ece8] pb-4 sm:flex-row">
      <div><h3 className="font-semibold">{order.order_id}</h3><p className="mt-1 text-xs text-[#8f7c75]">{String(data.customerName ?? 'Customer')} · {dateLabel(order.created_at)}</p></div>
      <div className="text-sm font-semibold">{money(data.total)} · {statusLabel(order.fulfillment_status)}</div>
    </div>
    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">{customItems.map((item, index) =>
        <div key={`${String(item.productId)}-${index}`} className="rounded-xl bg-[#fbf8f6] p-3 text-sm">
          <p className="font-medium">{String(item.name ?? 'Personalized item')} × {String(item.quantity ?? 1)}</p>
          {Boolean(item.recipientName) && <p className="mt-1 text-xs text-[#76645e]">Recipient: {String(item.recipientName)}</p>}
          {Boolean(item.finish) && <p className="mt-1 text-xs text-[#76645e]">Finish: {String(item.finish)}</p>}
          {Boolean(item.customMessage) && <p className="mt-1 whitespace-pre-wrap text-xs text-[#76645e]">Message: {String(item.customMessage)}</p>}
          {Array.isArray(item.customComponents) && <p className="mt-1 text-xs text-[#76645e]">Components: {item.customComponents.map(String).join(', ')}</p>}
        </div>
      )}</div>
      <div className="space-y-3">
        <label className="block text-xs font-medium">Production status<select className="form-input mt-1" value={operation.production_status} onChange={event => setOperation(current => ({ ...current, production_status: event.target.value }))}>
          {productionStatusOptions.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}
        </select></label>
        {operation.production_status === 'approved_for_production' && !operation.customer_approved_at && <p className="text-xs text-amber-800">Customer approval is not recorded. The server will reject this transition.</p>}
        <label className="block text-xs font-medium">Secure proof link (HTTPS)<input className="form-input mt-1" type="url" value={operation.proof_url} onChange={event => setOperation(current => ({ ...current, proof_url: event.target.value }))} /></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs font-medium">Expected delivery date<input className="form-input mt-1" type="date" value={operation.expected_delivery_date ?? ''} onChange={event => setOperation(current => ({ ...current, expected_delivery_date: event.target.value || null }))} /></label>
          <label className="block text-xs font-medium">Courier<input className="form-input mt-1" value={operation.courier} onChange={event => setOperation(current => ({ ...current, courier: event.target.value }))} /></label>
          <label className="block text-xs font-medium sm:col-span-2">Tracking number<input className="form-input mt-1" value={operation.tracking_number} onChange={event => setOperation(current => ({ ...current, tracking_number: event.target.value }))} /></label>
        </div>
        <label className="block text-xs font-medium">Private owner notes<textarea className="form-input mt-1" rows={3} value={operation.owner_notes} onChange={event => setOperation(current => ({ ...current, owner_notes: event.target.value }))} /></label>
        <fieldset><legend className="mb-2 text-xs font-semibold">Preparation checklist</legend><div className="space-y-2">{operation.checklist.map(item =>
          <label key={item.id} className="flex items-start gap-2 text-xs"><input type="checkbox" checked={item.complete} onChange={event => setOperation(current => ({ ...current, checklist: current.checklist.map(row => row.id === item.id ? { ...row, complete: event.target.checked } : row) }))} />{item.label}</label>
        )}</div></fieldset>
        <button onClick={() => onSave(operation)} className="rounded-xl bg-[#a45f60] px-4 py-2.5 text-sm font-semibold text-white">Save production workflow</button>
      </div>
    </div>
  </article>
}
function StorefrontContentPage({ draft, published, setDraft, onSave, onPublish }: {
  draft: StorefrontContent; published: StorefrontContent
  setDraft: React.Dispatch<React.SetStateAction<StorefrontContent>>
  onSave: () => void; onPublish: () => void
}) {
  const field = (key: keyof StorefrontContent, label: string, rows = 1) => <label key={key} className="block text-sm font-medium">{label}
    {rows === 1
      ? <input className="form-input mt-2" value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} />
      : <textarea className="form-input mt-2" rows={rows} value={draft[key]} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} />}
  </label>
  return <section>
    <div className="mb-4 rounded-xl border border-[#eadbd4] bg-white p-4 text-xs text-[#806d65]">Published content preview: <strong>{published.heroTitle}</strong></div>
    <div className="max-w-4xl rounded-2xl border border-[#eee5df] bg-white p-5 sm:p-8">
      <h3 className="mb-5 font-semibold">Homepage hero and policies</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {field('heroEyebrow', 'Hero eyebrow')}
        {field('heroTitle', 'Hero title')}
        {field('heroSubtitle', 'Hero subtitle')}
        {field('heroCtaLabel', 'Primary action label')}
        {field('secondaryCtaLabel', 'Secondary action label')}
        {field('heroImageUrl', 'Hero image URL')}
        {field('heroDescription', 'Hero description', 3)}
        {field('announcement', 'Announcement banner')}
        {field('aboutText', 'About / brand story', 4)}
        {field('deliveryPolicy', 'Delivery policy', 4)}
        {field('returnsPolicy', 'Returns and cancellations policy', 4)}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <button onClick={onSave} className="rounded-xl border border-[#e8d9d2] px-4 py-2.5 text-sm font-semibold text-[#a45f60]">Save draft</button>
        <button onClick={onPublish} className="rounded-xl bg-[#a45f60] px-4 py-2.5 text-sm font-semibold text-white">Publish content</button>
      </div>
    </div>
  </section>
}
function ActivityPage({ entries, onRefresh }: { entries: AdminAuditEntry[]; onRefresh: () => void }) {
  return <section>
    <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="font-semibold">Recent owner activity</h3><p className="mt-1 text-xs text-[#8f7c75]">Sensitive dashboard changes recorded for review.</p></div><button onClick={onRefresh} className="rounded-xl border border-[#e8d9d2] bg-white px-4 py-2.5 text-sm">Refresh activity</button></div>
    <div className="overflow-hidden rounded-2xl border border-[#eee5df] bg-white">
      {entries.length ? <div className="divide-y divide-[#f2ece8]">{entries.map(entry =>
        <article key={entry.id} className="flex flex-col justify-between gap-2 px-5 py-4 sm:flex-row sm:items-center">
          <div><p className="font-medium">{statusLabel(entry.action)}</p><p className="mt-1 text-xs text-[#8f7c75]">{entry.target_type}{entry.target_id ? ` · ${entry.target_id}` : ''} · Owner {entry.actor_user_id ?? 'unavailable'}</p></div>
          <time className="text-xs text-[#8f7c75]" dateTime={entry.created_at}>{new Date(entry.created_at).toLocaleString()}</time>
        </article>
      )}</div> : <EmptyState text="No administrative activity has been recorded yet." />}
    </div>
  </section>
}
function ReviewsPage({ reviews, onModerate }: {
  reviews: AdminReview[]
  onModerate: (review: AdminReview, status: 'approved' | 'rejected') => void
}) {
  const [filter, setFilter] = useState('pending')
  const visible = filter === 'all' ? reviews : reviews.filter(review => review.moderation_status === filter)
  return <section>
    <PageHeading title="Review moderation" description="Only reviews attached to a delivered customer order can be submitted. Approved reviews appear publicly." />
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-[#8f7c75]">{reviews.filter(review => review.moderation_status === 'pending').length} awaiting moderation</p><select value={filter} onChange={event => setFilter(event.target.value)} className="rounded-xl border border-[#e9dfda] bg-white px-3 py-2 text-sm"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All reviews</option></select></div>
    {visible.length ? <div className="space-y-3">{visible.map(review => <article key={review.id} className="rounded-2xl border border-[#eee5df] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="flex items-center gap-1 text-[#a45f60]">{Array.from({ length: review.rating }, (_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div><h3 className="mt-2 font-semibold">{review.title || review.product_name}</h3><p className="mt-1 text-xs text-[#8f7c75]">{review.product_name} · Order #{review.order_id} · {review.customer_name} {review.customer_email && `(${review.customer_email})`}</p></div><span className="rounded-full bg-[#f8eeeb] px-2.5 py-1 text-[10px] font-semibold">{statusLabel(review.moderation_status)}</span></div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#5e4d47]">{review.body}</p>
      <div className="mt-4 flex justify-end gap-2 border-t border-[#f1ebe7] pt-3">{review.moderation_status !== 'approved' && <button onClick={() => onModerate(review, 'approved')} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white">Approve</button>}{review.moderation_status !== 'rejected' && <button onClick={() => onModerate(review, 'rejected')} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700">Reject</button>}</div>
    </article>)}</div> : <EmptyState text="No reviews match this moderation filter." />}
  </section>
}
function NotificationBell({ notifications, unreadCount, open, onToggle, onRead, onReadAll, onOpen }: {
  notifications: AdminNotification[]
  unreadCount: number
  open: boolean
  onToggle: () => void
  onRead: (notification: AdminNotification) => Promise<void>
  onReadAll: () => void
  onOpen: (notification: AdminNotification) => void
}) {
  const recent = notifications.slice(0, 10)
  return <div className="relative">
    <button type="button" onClick={onToggle} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open} className="relative rounded-xl border border-[#eadfd9] p-2.5 text-[#866e65] transition hover:bg-[#faf6f3]">
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#a45f60] px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <div role="dialog" aria-label="Owner notifications" className="absolute right-0 top-full z-50 mt-3 w-[min(92vw,400px)] overflow-hidden rounded-2xl border border-[#eadfd9] bg-white shadow-xl">
      <header className="flex items-center justify-between border-b border-[#f1ebe7] px-4 py-3"><div><h2 className="text-sm font-semibold">Alerts</h2><p className="text-[10px] text-[#92817b]">{unreadCount} unread</p></div><button type="button" onClick={onReadAll} disabled={!unreadCount} className="text-xs font-semibold text-[#a45f60] disabled:text-[#b9aaa5]">Mark all read</button></header>
      <div className="max-h-[min(65vh,480px)] overflow-y-auto">
        {recent.length ? recent.map(notification => <article key={notification.id} className={`border-b border-[#f4eeeb] p-3 last:border-0 ${notification.read_at ? '' : 'bg-[#fcf7f4]'}`}>
          <div className="flex gap-2.5">
            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? 'bg-transparent' : 'bg-[#a45f60]'}`} />
            <button type="button" onClick={() => onOpen(notification)} className="min-w-0 flex-1 text-left">
              <span className="block text-xs font-semibold text-[#40332f]">{notification.title}</span>
              <span className="mt-1 block text-xs leading-5 text-[#76645e]">{notification.message}</span>
              <time className="mt-1 block text-[10px] text-[#9a8881]" dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString()}</time>
            </button>
            {!notification.read_at && <button type="button" aria-label={`Mark ${notification.title} read`} onClick={() => void onRead(notification).catch(() => undefined)} className="self-start rounded-md px-2 py-1 text-[10px] font-semibold text-[#a45f60] hover:bg-[#f8eeeb]">Read</button>}
          </div>
        </article>) : <p className="px-5 py-8 text-center text-xs text-[#8f7c75]">You’re all caught up. New order, review, and customer alerts will appear here.</p>}
      </div>
    </div>}
  </div>
}
function AlertMessage({ message }: { message: string }) {
  return <div role="alert" className="my-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>
}
function Dashboard({ overview, range, onRangeChange, onOpenSection }: {
  overview: Overview | null
  range: '7d' | '30d' | '90d' | 'all'
  onRangeChange: (range: '7d' | '30d' | '90d' | 'all') => void
  onOpenSection: (section: Section) => void
}) {
  const metrics = overview?.metrics
  const cards = [
    ['Recorded paid-order value', money(metrics?.recordedPaidOrderValue), 'Checkout-recorded status only; payments are not independently verified'],
    ['Orders in period', String(metrics?.orders ?? 0), 'All recorded orders in the selected period'],
    ['Customers', String(metrics?.customers ?? 0), 'Registered customer accounts'],
    ['Products', String(metrics?.products ?? 0), `${metrics?.lowStock ?? 0} at or below their low-stock threshold`]
  ]
  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="font-serif-title text-2xl">Welcome to your studio</h2><p className="mt-1 text-sm text-[#887770]">A live snapshot of your storefront and operations.</p></div><div className="flex items-center gap-3"><label className="text-xs font-medium text-[#887770]">Period<select value={range} onChange={event => onRangeChange(event.target.value as typeof range)} className="ml-2 rounded-lg border border-[#e9dfda] bg-white px-2.5 py-2 text-xs"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All time</option></select></label><a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#a45f60]">Open storefront <ArrowUpRight className="h-4 w-4" /></a></div></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail]) => <div key={label} className="rounded-2xl border border-[#eee5df] bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#9a827a]">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-[#988780]">{detail}</p></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-[#eee5df] bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold">Recent orders</h3><p className="mt-1 text-xs text-[#9a8881]">Payment state is customer-submitted and is not independently verified.</p></div><button onClick={() => onOpenSection('orders')} className="text-xs font-semibold text-[#a45f60]">All orders</button></div>
        {overview?.recentOrders.length ? <div className="divide-y divide-[#f2ece8]">{overview.recentOrders.map(order => <div key={order.id} className="flex items-center justify-between gap-3 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium">{order.order_id}</p><p className="mt-1 truncate text-xs text-[#97857e]">{String(order.order_data.customerName ?? 'Customer')} · {dateLabel(order.created_at)}</p></div><div className="text-right"><p className="text-sm font-semibold">{money(order.order_data.total)}</p><p className="mt-1 text-[10px] text-[#97857e]">{statusLabel(order.fulfillment_status)} · {statusLabel(String(order.order_data.status ?? 'pending'))}</p></div></div>)}</div> : <EmptyState text="Orders will appear here once they are placed." />}
      </section>
      <section className="rounded-2xl border border-[#eee5df] bg-white p-5 sm:p-6"><div className="mb-5"><h3 className="font-semibold">Top sellers</h3><p className="mt-1 text-xs text-[#9a8881]">Based on recorded paid order items.</p></div>
        {overview?.bestsellers.length ? <div className="space-y-4">{overview.bestsellers.map(item => <div key={item.name}><div className="mb-1.5 flex justify-between gap-3 text-sm"><span className="truncate">{item.name}</span><span className="shrink-0 text-[#8d7770]">{item.quantity} sold</span></div><div className="h-2 overflow-hidden rounded-full bg-[#f3eae6]"><div className="h-full rounded-full bg-[#b97772]" style={{ width: `${Math.min(100, Math.max(8, item.quantity / overview.bestsellers[0].quantity * 100))}%` }} /></div></div>)}</div> : <EmptyState text="Product sales will appear here after paid orders." />}
      </section>
    </div>
  </div>
}
function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-[#e9ddd7] px-5 py-12 text-center text-sm text-[#988780]">{text}</div>
}
function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <label className="flex min-w-0 items-center gap-2 rounded-xl border border-[#e9dfda] bg-white px-3 py-2.5 text-[#9c8880]"><Search className="h-4 w-4 shrink-0" /><input value={value} onChange={event => onChange(event.target.value)} placeholder={placeholder} className="min-w-0 flex-1 bg-transparent text-sm text-[#322825] outline-none placeholder:text-[#ad9d96]" /></label>
}
function TablePager({ page, pageCount, total, onChange }: { page: number; pageCount: number; total: number; onChange: (page: number) => void }) {
  if (total <= 15) return null
  return <div className="flex flex-col items-center justify-between gap-3 border-t border-[#f2ece8] px-5 py-3 text-xs text-[#897770] sm:flex-row">
    <span>Showing {page * 15 + 1}–{Math.min(total, (page + 1) * 15)} of {total}</span>
    <div className="flex gap-2">
      <button disabled={page === 0} onClick={() => onChange(page - 1)} className="rounded-lg border border-[#eadfd9] px-3 py-2 disabled:opacity-40">Previous</button>
      <span className="flex items-center px-2">Page {page + 1} of {pageCount}</span>
      <button disabled={page + 1 >= pageCount} onClick={() => onChange(page + 1)} className="rounded-lg border border-[#eadfd9] px-3 py-2 disabled:opacity-40">Next</button>
    </div>
  </div>
}
function PageHeading({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="font-serif-title text-2xl">{title}</h2><p className="mt-1 text-sm text-[#8f7c75]">{description}</p></div>{action}</div>
}
function ProductsPage({ products, categories, search, setSearch, onRefresh, onEdit, onDuplicate, onBulkAction, onCreate, onImport, onDelete }: {
  products: AdminProduct[]; categories: AdminCategory[]; search: string; setSearch: (value: string) => void
  onRefresh: () => void; onEdit: (product: AdminProduct) => void; onDuplicate: (product: AdminProduct) => void
  onBulkAction: (productIds: string[], action: 'publish' | 'unpublish' | 'activate' | 'deactivate') => void; onCreate: () => void
  onImport: () => void; onDelete: (product: AdminProduct) => void
}) {
  const [sort, setSort] = useState<'name' | 'price-low' | 'price-high' | 'stock'>('name')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState<'publish' | 'unpublish' | 'activate' | 'deactivate'>('publish')
  const sortedProducts = useMemo(() => [...products].sort((a, b) => {
    if (sort === 'price-low') return a.price - b.price
    if (sort === 'price-high') return b.price - a.price
    if (sort === 'stock') return (a.stockQuantity ?? Number.MAX_SAFE_INTEGER) - (b.stockQuantity ?? Number.MAX_SAFE_INTEGER)
    return a.name.localeCompare(b.name)
  }), [products, sort])
  const categoryFilteredProducts = useMemo(
    () => categoryFilter ? sortedProducts.filter(product => product.category === categoryFilter) : sortedProducts,
    [categoryFilter, sortedProducts]
  )
  const { page, setPage, pageCount, visibleItems } = usePagination(categoryFilteredProducts)
  return <section>
    <PageHeading title="Product catalog" description="Manage prices, descriptions, inventory and storefront visibility." action={<button onClick={onCreate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#a45f60] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#8c4e50]"><Plus className="h-4 w-4" />Add product</button>} />
    <div className="mb-4 flex flex-col gap-3 sm:flex-row"><SearchBox value={search} onChange={value => { setSearch(value); setPage(0) }} placeholder="Search name, category or ID" /><select aria-label="Sort products" value={sort} onChange={event => { setSort(event.target.value as typeof sort); setPage(0) }} className="rounded-xl border border-[#e9dfda] bg-white px-3 py-2.5 text-sm"><option value="name">Sort by name</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="stock">Stock: low to high</option></select><select aria-label="Filter products by category" value={categoryFilter} onChange={event => { setCategoryFilter(event.target.value); setPage(0) }} className="rounded-xl border border-[#e9dfda] bg-white px-3 py-2.5 text-sm"><option value="">All categories</option>{categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select><button onClick={onImport} className="shrink-0 rounded-xl border border-[#e8d9d2] bg-white px-4 py-2.5 text-sm font-semibold text-[#a45f60] hover:bg-[#fcf6f3]">Import missing seed products</button><button onClick={onRefresh} className="rounded-xl border border-[#e8d9d2] bg-white px-4 py-2.5 text-sm text-[#7c6962]">Refresh</button></div>
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-[#eee5df] bg-white p-3">
      <button type="button" onClick={() => setSelectedIds(current => [...new Set([...current, ...visibleItems.map(product => product.id)])])} className="rounded-lg border border-[#e8d9d2] px-3 py-2 text-xs">Select this page</button>
      <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-[#e8d9d2] px-3 py-2 text-xs">Clear selection</button>
      <span className="text-xs text-[#8f7c75]">{selectedIds.length} selected</span>
      <select aria-label="Bulk product action" value={bulkAction} onChange={event => setBulkAction(event.target.value as typeof bulkAction)} className="ml-auto rounded-lg border border-[#e9dfda] bg-white px-3 py-2 text-xs">
        <option value="publish">Publish</option><option value="unpublish">Unpublish</option><option value="activate">Activate</option><option value="deactivate">Deactivate</option>
      </select>
      <button type="button" disabled={!selectedIds.length} onClick={() => onBulkAction(selectedIds, bulkAction)} className="rounded-lg bg-[#a45f60] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Apply</button>
    </div>
    {categories.length === 0 && <p className="mb-3 text-xs text-amber-800">Create or import a category before adding products.</p>}
    <div className="overflow-hidden rounded-2xl border border-[#eee5df] bg-white">
      {categoryFilteredProducts.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="bg-[#fbf8f6] text-[11px] uppercase tracking-wider text-[#967f77]"><tr><th className="px-3 py-3">Select</th><th className="px-5 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Visibility</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#f2ece8]">{visibleItems.map(product => <tr key={product.id}><td className="px-3 py-3"><input type="checkbox" aria-label={`Select ${product.name}`} checked={selectedIds.includes(product.id)} onChange={event => setSelectedIds(current => event.target.checked ? [...current, product.id] : current.filter(id => id !== product.id))} /></td><td className="px-5 py-3"><div className="flex items-center gap-3"><img src={product.imageUrl || '/favicon.ico'} alt="" className="h-11 w-11 rounded-lg bg-[#f5eeea] object-cover" /><div><p className="font-medium">{product.name}</p><p className="mt-1 text-[10px] text-[#a18c84]">{product.id}</p></div></div></td><td className="px-5 py-3">{categories.find(item => item.slug === product.category)?.name ?? product.category}</td><td className="px-5 py-3 font-medium">{money(product.price)}</td><td className="px-5 py-3">{product.stockQuantity === null ? <span className="text-[#9c8982]">Not tracked</span> : product.stockQuantity}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${product.isActive && product.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f4efec] text-[#88766f]'}`}>{product.isActive && product.isPublished ? 'Live' : 'Hidden'}</span></td><td className="px-5 py-3 text-right"><button onClick={() => onEdit(product)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a45f60] hover:bg-[#faf2ef]">Edit</button><button onClick={() => onDuplicate(product)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a45f60] hover:bg-[#faf2ef]">Duplicate</button><button onClick={() => onDelete(product)} className="rounded-lg p-2 text-[#a45f60] hover:bg-[#fff2f0]" title="Delete product"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div><TablePager page={page} pageCount={pageCount} total={categoryFilteredProducts.length} onChange={setPage} /></> : <EmptyState text="No products match these filters." />}
    </div>
  </section>
}
function InventoryPage({ products, movements, search, setSearch, onAdjust }: {
  products: AdminProduct[]; movements: AdminInventoryMovement[]; search: string
  setSearch: (value: string) => void; onAdjust: (product: AdminProduct) => void
}) {
  const filteredProducts = useMemo(() => products.filter(product =>
    `${product.name} ${product.id} ${product.category}`.toLowerCase().includes(search.toLowerCase())
  ), [products, search])
  const { page, setPage, pageCount, visibleItems } = usePagination(filteredProducts)
  const trackedProducts = products.filter(product => product.stockQuantity !== null)
  const lowStockCount = trackedProducts.filter(product => product.stockQuantity! <= product.lowStockThreshold).length
  const outOfStockCount = trackedProducts.filter(product => product.stockQuantity === 0).length

  return <section className="space-y-5">
    <PageHeading title="Inventory" description="Review tracked stock and record auditable manual adjustments." />
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        ['Tracked products', trackedProducts.length],
        ['At or below threshold', lowStockCount],
        ['Out of stock', outOfStockCount]
      ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[#eee5df] bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#9a827a]">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </div>)}
    </div>
    <SearchBox value={search} onChange={value => { setSearch(value); setPage(0) }} placeholder="Search product name, category or ID" />
    <div className="overflow-hidden rounded-2xl border border-[#eee5df] bg-white">
      {filteredProducts.length ? <>
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm">
          <thead className="bg-[#fbf8f6] text-[11px] uppercase tracking-wider text-[#967f77]"><tr>
            <th className="px-5 py-3">Product</th><th className="px-5 py-3">Available</th>
            <th className="px-5 py-3">Low-stock threshold</th><th className="px-5 py-3">Status</th>
            <th className="px-5 py-3 text-right">Action</th>
          </tr></thead>
          <tbody className="divide-y divide-[#f2ece8]">{visibleItems.map(product => {
            const stock = product.stockQuantity
            const low = stock !== null && stock <= product.lowStockThreshold
            return <tr key={product.id}>
              <td className="px-5 py-4"><p className="font-medium">{product.name}</p><p className="mt-1 text-xs text-[#9a8881]">{product.id}</p></td>
              <td className="px-5 py-4">{stock === null ? 'Not tracked' : stock}</td>
              <td className="px-5 py-4">{stock === null ? '—' : product.lowStockThreshold}</td>
              <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${stock === null ? 'bg-[#f4efec] text-[#88766f]' : low ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{stock === null ? 'Untracked' : stock === 0 ? 'Out of stock' : low ? 'Restock needed' : 'In stock'}</span></td>
              <td className="px-5 py-4 text-right"><button disabled={stock === null} onClick={() => onAdjust(product)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a45f60] hover:bg-[#faf2ef] disabled:opacity-40">Adjust stock</button></td>
            </tr>
          })}</tbody>
        </table></div>
        <TablePager page={page} pageCount={pageCount} total={filteredProducts.length} onChange={setPage} />
      </> : <EmptyState text="No products match your search." />}
    </div>
    <section className="rounded-2xl border border-[#eee5df] bg-white p-5">
      <h3 className="font-semibold">Recent stock movements</h3>
      <p className="mt-1 text-xs text-[#9a8881]">The latest 100 manual adjustments, including who made them and why.</p>
      {movements.length ? <div className="mt-4 divide-y divide-[#f2ece8]">{movements.map(movement =>
        <div key={movement.id} className="flex flex-col justify-between gap-1 py-3 text-sm sm:flex-row sm:items-center">
          <div><p className="font-medium">{movement.product_name} <span className={movement.quantity_change > 0 ? 'text-emerald-700' : 'text-rose-700'}>{movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}</span></p><p className="mt-1 text-xs text-[#897770]">{movement.reason} · {movement.previous_quantity} → {movement.new_quantity}</p></div>
          <time className="text-xs text-[#897770]" dateTime={movement.created_at}>{dateLabel(movement.created_at)}</time>
        </div>
      )}</div> : <div className="mt-4"><EmptyState text="No stock adjustments have been recorded." /></div>}
    </section>
  </section>
}
function CategoriesPage({ categories, onCreate, onEdit, onDelete }: {
  categories: AdminCategory[]; onCreate: () => void
  onEdit: (category: AdminCategory) => void; onDelete: (category: AdminCategory) => void
}) {
  return <section>
    <PageHeading title="Categories" description="Organize products, storefront ordering, and featured placement." action={<button onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#a45f60] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add category</button>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categories.map(category => <article key={category.slug} className="rounded-2xl border border-[#eee5df] bg-white p-5"><div className="flex items-start justify-between"><div><h3 className="font-semibold">{category.name}</h3><p className="mt-1 text-xs text-[#a18c84]">/{category.slug} · order {category.display_order}</p></div><div className="flex flex-col items-end gap-1"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${category.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f4efec] text-[#88766f]'}`}>{category.is_active ? 'Active' : 'Hidden'}</span>{category.is_featured && <span className="rounded-full bg-[#a45f60]/10 px-2.5 py-1 text-[10px] font-semibold text-[#a45f60]">Featured</span>}</div></div><p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-[#86736c]">{category.description || 'No description added.'}</p><div className="mt-5 flex items-center justify-between border-t border-[#f1ebe7] pt-4"><span className="text-xs text-[#95827a]">{category.productCount ?? 0} products</span><div className="flex gap-1"><button onClick={() => onEdit(category)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a45f60] hover:bg-[#faf2ef]">Edit</button><button onClick={() => onDelete(category)} className="rounded-lg p-2 text-[#a45f60] hover:bg-[#fff2f0]" title="Delete category"><Trash2 className="h-4 w-4" /></button></div></div></article>)}</div>
    {categories.length === 0 && <EmptyState text="No categories have been created yet." />}
  </section>
}
function OrdersPage({ orders, search, setSearch, onUpdate }: { orders: AdminOrder[]; search: string; setSearch: (value: string) => void; onUpdate: (order: AdminOrder, status: Fulfillment) => void }) {
  const [paymentFilter, setPaymentFilter] = useState('all')
  const [fulfillmentFilter, setFulfillmentFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const filteredOrders = useMemo(() => orders.filter(order => {
    const recordedPaymentStatus = String(order.order_data.status ?? 'pending')
    const date = order.created_at.slice(0, 10)
    return (paymentFilter === 'all' || recordedPaymentStatus === paymentFilter)
      && (fulfillmentFilter === 'all' || order.fulfillment_status === fulfillmentFilter)
      && (!fromDate || date >= fromDate)
      && (!toDate || date <= toDate)
  }), [orders, paymentFilter, fulfillmentFilter, fromDate, toDate])
  const { page, setPage, pageCount, visibleItems } = usePagination(filteredOrders)
  const exportCsv = () => {
    const columns = ['Order ID', 'Created at', 'Customer', 'Email', 'Recorded payment status', 'Total', 'Fulfillment']
    const escape = (value: unknown) => {
      const text = String(value ?? '')
      const safeText = /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text
      return `"${safeText.replace(/"/g, '""')}"`
    }
    const rows = filteredOrders.map(order => [
      order.order_id,
      order.created_at,
      order.order_data.customerName,
      order.order_data.email,
      order.order_data.status,
      order.order_data.total,
      order.fulfillment_status
    ].map(escape).join(','))
    const blob = new Blob([[columns.map(escape).join(','), ...rows].join('\r\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'aurel-orders.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
  }
  const printOrder = (order: AdminOrder) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      window.alert('Allow pop-up windows to print this order.')
      return
    }
    printWindow.opener = null
    const document = printWindow.document
    const title = document.createElement('title')
    title.textContent = `Order ${order.order_id}`
    document.head.append(title)
    const style = document.createElement('style')
    style.textContent = 'body{font:14px Arial,sans-serif;color:#222;margin:32px}h1{font-size:22px}h2{font-size:16px;margin-top:24px}p,li{line-height:1.5}.muted{color:#666;font-size:12px}'
    document.head.append(style)
    const main = document.createElement('main')
    const heading = document.createElement('h1')
    heading.textContent = `Order ${order.order_id}`
    main.append(heading)
    const detailLines = [
      `Customer: ${String(order.order_data.customerName ?? 'Customer')}`,
      `Email: ${String(order.order_data.email ?? '—')}`,
      `Phone: ${String(order.order_data.phoneNumber ?? '—')}`,
      `Address: ${[order.order_data.address, order.order_data.city, order.order_data.state, order.order_data.postalCode].filter(Boolean).map(String).join(', ') || '—'}`,
      `Recorded order total: ${money(order.order_data.total)} (payment is not verified)`,
      `Recorded payment status: ${String(order.order_data.status ?? 'pending')}`,
      `Fulfillment: ${statusLabel(order.fulfillment_status ?? 'unfulfilled')}`,
      `Placed: ${dateLabel(order.created_at)}`
    ]
    for (const line of detailLines) {
      const paragraph = document.createElement('p')
      paragraph.textContent = line
      main.append(paragraph)
    }
    const itemHeading = document.createElement('h2')
    itemHeading.textContent = 'Items'
    main.append(itemHeading)
    const itemList = document.createElement('ul')
    const items = Array.isArray(order.order_data.items) ? order.order_data.items as Record<string, unknown>[] : []
    for (const item of items) {
      const listItem = document.createElement('li')
      listItem.textContent = `${String(item.name ?? 'Item')}${typeof item.variantName === 'string' ? ` — ${item.variantName}` : ''} × ${String(item.quantity ?? 1)} · ${money(Number(item.price ?? 0) * Number(item.quantity ?? 1))}`
      itemList.append(listItem)
    }
    main.append(itemList)
    if (order.events?.length) {
      const timelineHeading = document.createElement('h2')
      timelineHeading.textContent = 'Order timeline'
      main.append(timelineHeading)
      const timeline = document.createElement('ul')
      for (const event of [...order.events].reverse()) {
        const listItem = document.createElement('li')
        listItem.textContent = `${dateLabel(event.created_at)} — ${event.summary}`
        timeline.append(listItem)
      }
      main.append(timeline)
    }
    document.body.replaceChildren(main)
    printWindow.focus()
    printWindow.onafterprint = () => printWindow.close()
    printWindow.print()
  }
  return <section>
    <PageHeading title="Orders" description="Filter, inspect, and export recorded orders. Payment status is customer-submitted and is not independently verified." action={<button onClick={exportCsv} disabled={!filteredOrders.length} className="rounded-xl border border-[#e8d9d2] bg-white px-4 py-2.5 text-sm font-semibold text-[#a45f60] disabled:opacity-50">Export CSV</button>} />
    <div className="mb-4 space-y-3">
      <SearchBox value={search} onChange={value => { setSearch(value); setPage(0) }} placeholder="Search order, customer or email" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-[#887770]">Recorded payment status<select value={paymentFilter} onChange={event => { setPaymentFilter(event.target.value); setPage(0) }} className="form-input mt-1"><option value="all">All</option><option value="paid">Recorded paid</option><option value="pending">Recorded pending</option></select></label>
        <label className="text-xs font-medium text-[#887770]">Fulfillment<select value={fulfillmentFilter} onChange={event => { setFulfillmentFilter(event.target.value); setPage(0) }} className="form-input mt-1"><option value="all">All</option>{fulfillmentStatuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
        <label className="text-xs font-medium text-[#887770]">From date<input type="date" value={fromDate} onChange={event => { setFromDate(event.target.value); setPage(0) }} className="form-input mt-1" /></label>
        <label className="text-xs font-medium text-[#887770]">To date<input type="date" value={toDate} onChange={event => { setToDate(event.target.value); setPage(0) }} className="form-input mt-1" /></label>
      </div>
    </div>
    <div className="overflow-hidden rounded-2xl border border-[#eee5df] bg-white">{filteredOrders.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-[#fbf8f6] text-[11px] uppercase tracking-wider text-[#967f77]"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Recorded payment</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Fulfillment</th><th className="px-5 py-3">Placed</th><th className="px-5 py-3">Details</th></tr></thead><tbody className="divide-y divide-[#f2ece8]">{visibleItems.map(order => {
      const items = Array.isArray(order.order_data.items) ? order.order_data.items as Record<string, unknown>[] : []
      return <tr key={order.id} className="align-top"><td className="px-5 py-4 font-semibold">{order.order_id}</td><td className="px-5 py-4"><p>{String(order.order_data.customerName ?? 'Customer')}</p><p className="mt-1 text-xs text-[#9a8881]">{String(order.order_data.email ?? '')}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${order.order_data.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabel(String(order.order_data.status ?? 'pending'))}</span><p className="mt-1 max-w-36 text-[10px] text-[#9a8881]">Unverified record</p></td><td className="px-5 py-4 font-medium">{money(order.order_data.total)}</td><td className="px-5 py-4"><select value={order.fulfillment_status ?? 'unfulfilled'} onChange={event => onUpdate(order, event.target.value as Fulfillment)} className="rounded-lg border border-[#e9dfda] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#a45f60]">{fulfillmentStatuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></td><td className="px-5 py-4 text-xs text-[#8e7d76]">{dateLabel(order.created_at)}</td><td className="px-5 py-4"><details className="max-w-72"><summary className="cursor-pointer text-xs font-semibold text-[#a45f60]">View</summary><div className="mt-3 space-y-2 rounded-xl bg-[#fbf8f6] p-3 text-xs"><p><strong>Phone:</strong> {String(order.order_data.phoneNumber ?? '—')}</p><p><strong>Address:</strong> {[order.order_data.address, order.order_data.city, order.order_data.state, order.order_data.postalCode].filter(Boolean).map(String).join(', ') || '—'}</p><p><strong>Method:</strong> {String(order.order_data.paymentMethod ?? '—')}</p><p><strong>Items:</strong></p><ul className="list-inside list-disc">{items.map((item, index) => <li key={`${String(item.productId)}-${index}`}>{String(item.name ?? 'Item')}{typeof item.variantName === 'string' ? ` — ${item.variantName}` : ''} × {String(item.quantity ?? 1)}</li>)}</ul><button type="button" onClick={() => printOrder(order)} className="rounded-lg border border-[#e8d9d2] px-3 py-2 text-xs font-semibold text-[#a45f60]">Print order</button>{order.events?.length ? <div className="border-t border-[#eee5df] pt-2"><p className="font-semibold">Timeline</p><ol className="mt-1 space-y-1">{[...order.events].reverse().map(event => <li key={event.id} className="text-[10px] text-[#806b63]">{dateLabel(event.created_at)} · {event.summary}</li>)}</ol></div> : <p className="border-t border-[#eee5df] pt-2 text-[10px] text-[#9a8881]">No timeline events recorded yet.</p>}</div></details></td></tr>
    })}</tbody></table></div><TablePager page={page} pageCount={pageCount} total={filteredOrders.length} onChange={setPage} /></> : <EmptyState text="No matching orders found." />}</div>
  </section>
}
function CustomersPage({ customers, search, setSearch, onEdit, onToggleStatus, onDelete }: { customers: AdminCustomer[]; search: string; setSearch: (value: string) => void; onEdit: (customer: AdminCustomer) => void; onToggleStatus: (customer: AdminCustomer) => void; onDelete: (customer: AdminCustomer) => void }) {
  const { page, setPage, pageCount, visibleItems } = usePagination(customers)
  return <section>
    <PageHeading title="Customers" description="Review account profiles, order counts and recorded order value, and disable access without deleting history. Order totals are not payment-verified." />
    <div className="mb-4"><SearchBox value={search} onChange={value => { setSearch(value); setPage(0) }} placeholder="Search name, username, email or phone" /></div>
    <div className="overflow-hidden rounded-2xl border border-[#eee5df] bg-white">{customers.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead className="bg-[#fbf8f6] text-[11px] uppercase tracking-wider text-[#967f77]"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Orders</th><th className="px-5 py-3">Recorded order value*</th><th className="px-5 py-3">Last order</th><th className="px-5 py-3">Email status</th><th className="px-5 py-3">Account</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#f2ece8]">{visibleItems.map(customer => <tr key={customer.id}><td className="px-5 py-4"><p className="font-medium">{customer.name}</p><p className="mt-1 text-xs text-[#9a8881]">@{customer.username}</p></td><td className="px-5 py-4"><p>{customer.email}</p><p className="mt-1 text-xs text-[#9a8881]">{customer.phone}</p></td><td className="px-5 py-4">{customer.orderSummary.count}</td><td className="px-5 py-4">{money(customer.orderSummary.totalOrderValue)}<p className="mt-1 text-[10px] text-[#9a8881]">Unverified order data</p></td><td className="px-5 py-4 text-xs text-[#8e7d76]">{customer.orderSummary.latestOrderAt ? dateLabel(customer.orderSummary.latestOrderAt) : '—'}</td><td className="px-5 py-4">{customer.email_verified ? <span className="text-xs text-emerald-700">Verified</span> : <span className="text-xs text-amber-700">Unverified</span>}{customer.pending_email && <p className="mt-1 max-w-48 truncate text-[10px] text-amber-700" title={customer.pending_email}>Pending {customer.pending_email}</p>}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${customer.account_status === 'disabled' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{statusLabel(customer.account_status)}</span></td><td className="px-5 py-4 text-xs text-[#8e7d76]">{dateLabel(customer.created_at)}</td><td className="px-5 py-4 text-right"><div className="inline-flex items-center gap-1"><button onClick={() => onEdit(customer)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a45f60] hover:bg-[#faf2ef]">Details</button><button onClick={() => onToggleStatus(customer)} className="rounded-lg px-3 py-2 text-xs font-medium text-[#806b63] hover:bg-[#faf7f5]">{customer.account_status === 'disabled' ? 'Enable' : 'Disable'}</button><button onClick={() => onDelete(customer)} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50" aria-label={`Permanently delete ${customer.email}`}>Delete</button></div></td></tr>)}</tbody></table></div><p className="px-5 py-3 text-[10px] text-[#9a8881]">* Based on submitted order totals, not verified payment records.</p><TablePager page={page} pageCount={pageCount} total={customers.length} onChange={setPage} /></> : <EmptyState text="No customers match your search." />}</div>
  </section>
}
function SettingsPage({
  settings, setSettings, analyticsRange, setAnalyticsRange, contentDraft, contentPublished, setContentDraft, activityEntries, ownerEmail,
  onSaveSettings, onSaveContent, onPublishContent, onRefreshActivity
}: {
  settings: StoreSettings
  setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>
  analyticsRange: AnalyticsRange
  setAnalyticsRange: (range: AnalyticsRange) => void
  contentDraft: StorefrontContent
  contentPublished: StorefrontContent
  setContentDraft: React.Dispatch<React.SetStateAction<StorefrontContent>>
  activityEntries: AdminAuditEntry[]
  ownerEmail: string
  onSaveSettings: () => void
  onSaveContent: () => void
  onPublishContent: () => void
  onRefreshActivity: () => void
}) {
  const [tab, setTab] = useState<'store' | 'content' | 'dashboard' | 'security'>('store')
  const field = (key: keyof StoreSettings, label: string, type = 'text') => <label key={key} className="block text-sm font-medium text-[#51413c]">{label}<input type={type} value={settings[key]} onChange={event => setSettings(current => ({ ...current, [key]: event.target.value }))} className="form-input mt-2" /></label>
  const tabs = [
    { id: 'store' as const, label: 'Store profile', detail: 'Identity and contact', icon: Store },
    { id: 'content' as const, label: 'Storefront content', detail: 'Homepage and policies', icon: ImagePlus },
    { id: 'dashboard' as const, label: 'Preferences', detail: 'Overview defaults', icon: LayoutDashboard },
    { id: 'security' as const, label: 'Security & activity', detail: 'Owner access and audit', icon: ShieldCheck }
  ]
  return <section className="space-y-5">
    <PageHeading title="Settings" description="A single place for public store details, storefront publishing, dashboard preferences, and owner security." />
    <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className="h-fit rounded-2xl border border-[#eee5df] bg-white p-2">
        {tabs.map(item => {
          const Icon = item.icon
          return <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)} className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition last:mb-0 ${tab === item.id ? 'bg-[#f8eeeb] text-[#934f51]' : 'text-[#776762] hover:bg-[#faf7f5]'}`}>
            <span className={`rounded-lg p-2 ${tab === item.id ? 'bg-white' : 'bg-[#f8f5f3]'}`}><Icon className="h-4 w-4" /></span>
            <span><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-[11px] text-[#938079]">{item.detail}</span></span>
          </button>
        })}
      </nav>
      <div aria-label={`${tabs.find(item => item.id === tab)?.label} settings`} className="min-w-0">
    {tab === 'store' && <div className="rounded-2xl border border-[#eee5df] bg-white p-5 sm:p-8">
      <div className="mb-7 flex items-start gap-3"><span className="rounded-xl bg-[#f8eeeb] p-2.5 text-[#a45f60]"><Store className="h-5 w-5" /></span><div><h3 className="font-semibold text-[#40322e]">Store profile</h3><p className="mt-1 text-sm text-[#938079]">These details are visible to shoppers. Keep private credentials and passwords out of public store fields.</p></div></div>
      <div className="space-y-7">
        <fieldset><legend className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-[#a45f60]">Brand details</legend><div className="grid gap-5 sm:grid-cols-2">{field('storeName', 'Store name')}{field('tagline', 'Tagline')}<label className="block text-sm font-medium text-[#51413c] sm:col-span-2">Store description<textarea rows={3} value={settings.description} onChange={event => setSettings(current => ({ ...current, description: event.target.value }))} className="form-input mt-2" /></label></div></fieldset>
        <fieldset className="border-t border-[#f1ebe7] pt-6"><legend className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-[#a45f60]">Customer contact</legend><div className="grid gap-5 sm:grid-cols-2">{field('contactEmail', 'Contact email', 'email')}{field('phone', 'Contact phone', 'tel')}{field('whatsappNumber', 'WhatsApp number', 'tel')}{field('deliveryNote', 'Delivery note')}</div></fieldset>
        <fieldset className="border-t border-[#f1ebe7] pt-6"><legend className="mb-4 text-xs font-bold uppercase tracking-[0.12em] text-[#a45f60]">Social links</legend><div className="grid gap-5 sm:grid-cols-2">{field('instagramUrl', 'Instagram URL', 'url')}{field('facebookUrl', 'Facebook URL', 'url')}</div></fieldset>
      </div>
      <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[#f1ebe7] pt-5"><p className="text-xs text-[#938079]">Changes are saved to the store profile when you select Save.</p><button onClick={onSaveSettings} className="rounded-xl bg-[#a45f60] px-5 py-3 text-sm font-semibold text-white hover:bg-[#8c4e50]">Save store profile</button></div>
    </div>}
    {tab === 'content' && <StorefrontContentPage draft={contentDraft} published={contentPublished} setDraft={setContentDraft} onSave={onSaveContent} onPublish={onPublishContent} />}
    {tab === 'dashboard' && <div className="rounded-2xl border border-[#eee5df] bg-white p-5 sm:p-8">
      <div className="mb-7 flex items-start gap-3"><span className="rounded-xl bg-[#f8eeeb] p-2.5 text-[#a45f60]"><LayoutDashboard className="h-5 w-5" /></span><div><h3 className="font-semibold text-[#40322e]">Dashboard preferences</h3><p className="mt-1 text-sm text-[#938079]">Choose how the Overview page presents your order analytics.</p></div></div>
      <label className="block max-w-md text-sm font-medium text-[#51413c]">Default overview period<select value={analyticsRange} onChange={event => setAnalyticsRange(event.target.value as AnalyticsRange)} className="form-input mt-2"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="all">All time</option></select></label>
      <p className="mt-3 max-w-xl text-xs leading-5 text-[#938079]">This preference is saved in this browser only. The Overview page refreshes its analytics for the selected period automatically.</p>
    </div>}
    {tab === 'security' && <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-[#eee5df] bg-white p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><ShieldCheck className="h-5 w-5" /></span><div><h3 className="font-semibold">Owner access</h3><p className="text-xs text-[#938079]">Signed in as {ownerEmail}</p></div></div><p className="mt-4 text-sm leading-6 text-[#76645e]">Dashboard access is restricted by the server-side <code>ADMIN_EMAILS</code> allowlist and verified Supabase Auth. To add or remove an owner, update that environment variable and restart or redeploy the server.</p></article>
        <article className="rounded-2xl border border-[#eee5df] bg-white p-5"><div className="flex items-center gap-3"><span className="rounded-xl bg-[#f8eeeb] p-2.5 text-[#a45f60]"><Settings className="h-5 w-5" /></span><div><h3 className="font-semibold">Session and secret safety</h3><p className="text-xs text-[#938079]">Private server configuration</p></div></div><ul className="mt-4 list-inside list-disc space-y-2 text-sm leading-6 text-[#76645e]"><li>Owner sessions use HTTP-only cookies and can be ended with Sign out.</li><li>Keep Supabase service-role credentials and owner allowlists on the server only.</li><li>Review owner activity below for recent sensitive changes.</li></ul></article>
      </div>
      <div className="rounded-2xl border border-[#eee5df] bg-white p-5 sm:p-6"><ActivityPage entries={activityEntries} onRefresh={onRefreshActivity} /></div>
    </div>}
      </div>
    </div>
  </section>
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#211917]/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[#fffdfa] p-5 shadow-2xl sm:rounded-3xl sm:p-7"><header className="mb-6 flex items-center justify-between"><h2 className="font-serif-title text-xl">{title}</h2><button onClick={onClose} className="rounded-full p-2 text-[#8a7770] hover:bg-[#f4ece8]"><X className="h-5 w-5" /></button></header>{children}</section></div>
}
function ProductEditor({ product, isNew, categories, onClose, onSave }: { product: AdminProduct; isNew: boolean; categories: AdminCategory[]; onClose: () => void; onSave: (product: AdminProduct) => Promise<void> }) {
  const [draft, setDraft] = useState(product)
  const [uploading, setUploading] = useState(false)
  const [editorError, setEditorError] = useState('')
  const set = <K extends keyof AdminProduct>(key: K, value: AdminProduct[K]) => setDraft(current => ({ ...current, [key]: value }))
  const upload = async (file?: File) => {
    if (!file) return
    if (file.size > 2.8 * 1024 * 1024) {
      setEditorError('Images must be smaller than 2.8 MB.')
      return
    }
    setUploading(true)
    setEditorError('')
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(new Error('The selected image could not be read.'))
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
        reader.readAsDataURL(file)
      })
      const result = await api<{ imageUrl: string }>('/api/admin/products/upload', {
        method: 'POST', body: JSON.stringify({ fileName: file.name, contentType: file.type, base64 })
      })
      if (!draft.imageUrl) set('imageUrl', result.imageUrl)
      else if (!draft.imageUrls?.includes(result.imageUrl)) set('imageUrls', [...(draft.imageUrls ?? []), result.imageUrl])
    } catch (uploadError) {
      setEditorError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.')
    } finally { setUploading(false) }
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    void onSave(draft)
  }
  return <ModalShell title={isNew ? 'New product' : 'Edit product'} onClose={onClose}>
    {editorError && <AlertMessage message={editorError} />}
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Product ID<input required value={draft.id} onChange={event => set('id', event.target.value)} disabled={!isNew} className="form-input" /></label>
        <label className="text-sm font-medium">Product name<input required value={draft.name} onChange={event => set('name', event.target.value)} className="form-input" /></label>
        <label className="text-sm font-medium">Category<select required value={draft.category} onChange={event => set('category', event.target.value)} className="form-input"><option value="">Choose category</option>{categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
        <label className="text-sm font-medium">Subcategory<input value={draft.subCategory ?? ''} onChange={event => set('subCategory', event.target.value)} className="form-input" /></label>
        <label className="text-sm font-medium">Price (INR)<input required min="0" step="0.01" type="number" value={draft.price} onChange={event => set('price', Number(event.target.value))} className="form-input" /></label>
        <label className="text-sm font-medium">Stock quantity<input min="0" type="number" placeholder="Leave blank to not track" value={draft.stockQuantity ?? ''} onChange={event => set('stockQuantity', event.target.value === '' ? null : Number(event.target.value))} className="form-input" /></label>
        <label className="text-sm font-medium">Low-stock alert threshold<input min="0" type="number" value={draft.lowStockThreshold ?? 5} onChange={event => set('lowStockThreshold', Number(event.target.value))} className="form-input" /><span className="mt-1 block text-xs font-normal text-[#938079]">Used for inventory alerts when stock tracking is enabled.</span></label>
      </div>
      <label className="block text-sm font-medium">Image URL<input value={draft.imageUrl} onChange={event => set('imageUrl', event.target.value)} className="form-input" /></label>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#eadfd9] px-3 py-2 text-xs font-semibold text-[#a45f60]"><ImagePlus className="h-4 w-4" />{uploading ? 'Uploading image…' : 'Upload product image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={event => void upload(event.target.files?.[0])} /></label>
      <label className="block text-sm font-medium">Additional image URLs (one per line)<textarea rows={3} value={(draft.imageUrls ?? []).filter(url => url !== draft.imageUrl).join('\n')} onChange={event => set('imageUrls', [draft.imageUrl, ...event.target.value.split('\n').map(url => url.trim()).filter(Boolean)])} className="form-input" /><span className="mt-1 block text-xs font-normal text-[#938079]">The primary image is tried first; additional images are used as fallbacks. Up to 10 images.</span></label>
      <div className="flex flex-wrap gap-2">{[...new Set([draft.imageUrl, ...(draft.imageUrls ?? [])].filter(Boolean))].map(imageUrl => <img key={imageUrl} src={imageUrl} alt="Product image preview" className="h-20 w-20 rounded-xl bg-[#f5eeea] object-cover" />)}</div>
      <label className="block text-sm font-medium">Tagline<input value={draft.tagline} onChange={event => set('tagline', event.target.value)} className="form-input" /></label>
      <label className="block text-sm font-medium">Description<textarea rows={3} value={draft.description} onChange={event => set('description', event.target.value)} className="form-input" /></label>
      <label className="block text-sm font-medium">Features, one per line<textarea rows={3} value={draft.features.join('\n')} onChange={event => set('features', event.target.value.split('\n').map(value => value.trim()).filter(Boolean))} className="form-input" /></label>
      <fieldset className="space-y-3 rounded-xl border border-[#eee5df] p-4">
        <legend className="text-sm font-semibold">Variants</legend>
        <div className="flex justify-end"><button type="button" onClick={() => set('variants', [...(draft.variants ?? []), { id: `${draft.id || 'variant'}-${crypto.randomUUID()}`, name: '', sku: '', price: draft.price, stockQuantity: null }])} className="rounded-lg border border-[#e8d9d2] px-3 py-2 text-xs font-semibold text-[#a45f60]">Add variant</button></div>
        <p className="text-xs text-[#938079]">Set a separate price and optional tracked stock for each customer-selectable option.</p>
        {(draft.variants ?? []).map((variant, index) => <div key={variant.id} className="grid gap-3 rounded-lg bg-[#fbf8f6] p-3 sm:grid-cols-2">
          <label className="text-xs font-medium">Variant name<input required value={variant.name} onChange={event => set('variants', (draft.variants ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))} className="form-input mt-1" /></label>
          <label className="text-xs font-medium">SKU<input value={variant.sku} onChange={event => set('variants', (draft.variants ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, sku: event.target.value } : item))} className="form-input mt-1" /></label>
          <label className="text-xs font-medium">Price (INR)<input required type="number" min="0" step="0.01" value={variant.price} onChange={event => set('variants', (draft.variants ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, price: Number(event.target.value) } : item))} className="form-input mt-1" /></label>
          <label className="text-xs font-medium">Stock quantity<input type="number" min="0" step="1" placeholder="Leave blank for untracked" value={variant.stockQuantity ?? ''} onChange={event => set('variants', (draft.variants ?? []).map((item, itemIndex) => itemIndex === index ? { ...item, stockQuantity: event.target.value === '' ? null : Number(event.target.value) } : item))} className="form-input mt-1" /></label>
          <div className="flex items-center justify-between gap-3 sm:col-span-2"><span className="text-[10px] text-[#938079]">ID: {variant.id}</span><button type="button" onClick={() => set('variants', (draft.variants ?? []).filter((_, itemIndex) => itemIndex !== index))} className="text-xs font-semibold text-rose-700">Remove</button></div>
        </div>)}
      </fieldset>
      <fieldset><legend className="mb-2 text-sm font-medium">Available finishes</legend><div className="flex gap-5 text-sm">{(['matte', 'gloss'] as const).map(finish => <label key={finish} className="inline-flex items-center gap-2"><input type="checkbox" checked={draft.availableFinishes?.includes(finish) ?? false} onChange={event => set('availableFinishes', event.target.checked ? [...(draft.availableFinishes ?? []), finish] : (draft.availableFinishes ?? []).filter(value => value !== finish))} className="accent-[#a45f60]" />{statusLabel(finish)}</label>)}</div></fieldset>
      <div className="flex flex-wrap gap-x-5 gap-y-3 text-sm">{([
        ['isCustomizable', 'Customizable'], ['isActive', 'Active'], ['isPublished', 'Published']
      ] as const).map(([key, label]) => <label key={key} className="inline-flex items-center gap-2"><input type="checkbox" checked={draft[key]} onChange={event => set(key, event.target.checked)} className="accent-[#a45f60]" />{label}</label>)}</div>
      <div className="flex justify-end gap-2 border-t border-[#f0e8e4] pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-[#e8ddd7] px-4 py-2.5 text-sm">Cancel</button><button disabled={uploading} className="rounded-xl bg-[#a45f60] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Save product</button></div>
    </form>
  </ModalShell>
}
function CategoryEditor({ category, onClose, onSave }: { category: AdminCategory; onClose: () => void; onSave: (category: AdminCategory) => Promise<void> }) {
  const [draft, setDraft] = useState(category)
  return <ModalShell title={category.name ? 'Edit category' : 'New category'} onClose={onClose}><form onSubmit={event => { event.preventDefault(); void onSave(draft) }} className="space-y-4">
    <label className="block text-sm font-medium">Name<input required value={draft.name} onChange={event => setDraft(current => ({ ...current, name: event.target.value }))} className="form-input" /></label>
    <label className="block text-sm font-medium">Slug<input required disabled={Boolean(category.name)} value={draft.slug} onChange={event => setDraft(current => ({ ...current, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-') }))} placeholder="gift-boxes" className="form-input" /></label>
    <label className="block text-sm font-medium">Description<textarea rows={3} value={draft.description} onChange={event => setDraft(current => ({ ...current, description: event.target.value }))} className="form-input" /></label>
    <label className="block text-sm font-medium">Collection image URL<input value={draft.image_url} onChange={event => setDraft(current => ({ ...current, image_url: event.target.value }))} className="form-input" /></label>
    <label className="block text-sm font-medium">Display order<input type="number" min="0" max="10000" value={draft.display_order} onChange={event => setDraft(current => ({ ...current, display_order: Number(event.target.value) }))} className="form-input" /></label>
    <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_active} onChange={event => setDraft(current => ({ ...current, is_active: event.target.checked }))} className="accent-[#a45f60]" />Active on storefront</label>
    <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_featured} onChange={event => setDraft(current => ({ ...current, is_featured: event.target.checked }))} className="accent-[#a45f60]" />Feature prominently on storefront</label>
    <div className="flex justify-end gap-2 border-t border-[#f0e8e4] pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-[#e8ddd7] px-4 py-2.5 text-sm">Cancel</button><button className="rounded-xl bg-[#a45f60] px-5 py-2.5 text-sm font-semibold text-white">Save category</button></div>
  </form></ModalShell>
}
function CustomerEditor({ customer, onClose, onSave }: { customer: AdminCustomer; onClose: () => void; onSave: (customer: AdminCustomer) => Promise<void> }) {
  const [draft, setDraft] = useState(customer)
  const fields: [keyof AdminCustomer, string][] = [['name', 'Full name'], ['username', 'Username'], ['phone', 'Phone'], ['address', 'Address'], ['gender', 'Gender'], ['date_of_birth', 'Date of birth'], ['city', 'City'], ['state', 'State'], ['postal_code', 'Postal code']]
  return <ModalShell title="Customer details" onClose={onClose}><form onSubmit={event => { event.preventDefault(); void onSave(draft) }}>
    <p className="mb-5 break-all text-sm text-[#897770]">{customer.email} {customer.email_verified ? '· verified' : '· not verified'}{customer.pending_email ? ` · pending ${customer.pending_email}` : ''}</p>
    <div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label]) => <label key={key} className={`text-sm font-medium ${key === 'address' ? 'sm:col-span-2' : ''}`}>{label}<input value={String(draft[key] ?? '')} onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} className="form-input" /></label>)}</div>
    <div className="mt-6 flex justify-end gap-2 border-t border-[#f0e8e4] pt-4"><button type="button" onClick={onClose} className="rounded-xl border border-[#e8ddd7] px-4 py-2.5 text-sm">Cancel</button><button className="rounded-xl bg-[#a45f60] px-5 py-2.5 text-sm font-semibold text-white">Save profile</button></div>
  </form></ModalShell>
}
