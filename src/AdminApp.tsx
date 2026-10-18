import React, { useEffect, useMemo, useState } from 'react'
import { flushSync } from 'react-dom'
import {
  ArrowDownLeft, ArrowLeft, ArrowUpRight, Boxes, Check, ChevronDown, CircleAlert, ImagePlus,
  LayoutDashboard, LoaderCircle, LogOut, Moon, Package, Plus, Search, Settings, ShieldCheck, ShoppingBag,
  Store, Sun, Trash2, Users, X
} from 'lucide-react'
import type { Product } from './types'

type Section = 'dashboard' | 'products' | 'categories' | 'orders' | 'customers' | 'settings'
type Fulfillment = 'unfulfilled' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
interface AdminCategory {
  slug: string
  name: string
  description: string
  image_url: string
  is_active: boolean
  productCount?: number
}
interface AdminProduct extends Product {
  stockQuantity: number | null
  isActive: boolean
  isPublished: boolean
}
interface AdminOrder {
  id: number
  order_id: string
  user_id: string
  order_data: Record<string, unknown>
  created_at: string
  fulfillment_status: Fulfillment
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
  metrics: { revenue: number; orders: number; customers: number; products: number; lowStock: number }
  recentOrders: AdminOrder[]
  bestsellers: { name: string; quantity: number }[]
}

const sections: { id: Section; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'categories', label: 'Categories', icon: Boxes },
  { id: 'orders', label: 'Orders', icon: ShoppingBag },
  { id: 'customers', label: 'Customers', icon: Users },
  { id: 'settings', label: 'Store settings', icon: Settings }
]

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
  isActive: true,
  isPublished: true
}
const fulfillmentStatuses: Fulfillment[] = ['unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled']
const sectionFromPath = (path: string): Section => {
  const segment = path.split('/').filter(Boolean)[1]
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
  const [isDarkMode, setIsDarkMode] = useState(false)
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
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [orders, setOrders] = useState<AdminOrder[]>([])
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [settings, setSettings] = useState<StoreSettings>(initialSettings)
  const [productDraft, setProductDraft] = useState<AdminProduct | null>(null)
  const [categoryDraft, setCategoryDraft] = useState<AdminCategory | null>(null)
  const [customerDraft, setCustomerDraft] = useState<AdminCustomer | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode)
  }, [isDarkMode])

  const toggleTheme = () => {
    const nextTheme = !isDarkMode
    const applyTheme = () => {
      document.documentElement.classList.toggle('dark', nextTheme)
      setIsDarkMode(nextTheme)
    }
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown
    }
    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => flushSync(applyTheme))
    } else {
      applyTheme()
    }
  }

  const navigateSection = (target: Section) => {
    window.history.pushState(null, '', `/admin/${target}`)
    setSection(target)
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
      if (target === 'dashboard') setOverview(await api<Overview>('/api/admin/overview'))
      if (target === 'products') {
        const [result, categoryResult] = await Promise.all([
          api<{ products: AdminProduct[] }>('/api/admin/products'),
          api<{ categories: AdminCategory[] }>('/api/admin/categories')
        ])
        setProducts(result.products)
        setCategories(categoryResult.categories)
        if (!result.products.length) setNotice('Import the existing storefront catalog to begin managing products.')
      }
      if (target === 'categories') setCategories((await api<{ categories: AdminCategory[] }>('/api/admin/categories')).categories)
      if (target === 'orders') setOrders((await api<{ orders: AdminOrder[] }>('/api/admin/orders')).orders)
      if (target === 'customers') setCustomers((await api<{ customers: AdminCustomer[] }>('/api/admin/customers')).customers)
      if (target === 'settings') setSettings((await api<{ settings: StoreSettings }>('/api/admin/settings')).settings)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load this dashboard section.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => {
    if (signedIn) void loadSection(section)
  }, [section, signedIn])

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
              <label className="block text-sm font-medium">Password
                <input autoComplete="current-password" type="password" required value={loginPassword} onChange={event => setLoginPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#e5d8d2] bg-[#fffdfa] px-4 py-3 outline-none focus:border-[#a45f60] focus:ring-2 focus:ring-[#a45f60]/15" />
              </label>
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
        <a href="/" className="flex h-20 items-center gap-3 border-b border-[#f1ebe7] px-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#a45f60] text-white"><Store className="h-5 w-5" /></span>
          <span><span className="block font-serif-title text-lg tracking-[.12em]">AUREL</span><span className="text-[10px] uppercase tracking-[.18em] text-[#9d7c74]">Owner studio</span></span>
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
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              aria-pressed={isDarkMode}
              title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}
              className="rounded-xl border border-[#eadfd9] p-2.5 text-[#866e65] transition-colors hover:bg-[#faf6f3] dark:border-[#493936] dark:text-[#e5d5ce] dark:hover:bg-white/10"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
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

          {section === 'dashboard' && <Dashboard overview={overview} onOpenSection={navigateSection} />}
          {section === 'products' && <ProductsPage
            products={filteredProducts} categories={categories} search={search} setSearch={setSearch}
            onRefresh={() => void loadSection('products')} onEdit={setProductDraft}
            onCreate={() => setProductDraft({ ...initialProduct, id: `product-${Date.now()}`, category: categories[0]?.slug ?? '' })}
            onImport={importCatalog}
            onDelete={product => {
              if (window.confirm(`Delete "${product.name}"? Existing order history is not changed.`)) {
                void runAction(async () => { await api(`/api/admin/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' }) }, 'Product deleted.')
              }
            }}
          />}
          {section === 'categories' && <CategoriesPage
            categories={categories} onRefresh={() => void loadSection('categories')}
            onCreate={() => setCategoryDraft({ slug: '', name: '', description: '', image_url: '', is_active: true })}
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
          {section === 'settings' && <SettingsPage settings={settings} setSettings={setSettings} onSave={() => {
            void runAction(async () => { await api('/api/admin/settings', { method: 'PATCH', body: JSON.stringify(settings) }) }, 'Store settings saved.')
          }} />}
        </main>
      </div>

      {productDraft && <ProductEditor product={productDraft} categories={categories}
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
              body: JSON.stringify({ name: category.name, slug: category.slug, description: category.description, imageUrl: category.image_url, isActive: category.is_active })
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
function AlertMessage({ message }: { message: string }) {
  return <div role="alert" className="my-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{message}</div>
}
function Dashboard({ overview, onOpenSection }: { overview: Overview | null; onOpenSection: (section: Section) => void }) {
  const metrics = overview?.metrics
  const cards = [
    ['Paid revenue', money(metrics?.revenue), 'Confirmed paid orders only'],
    ['Orders', String(metrics?.orders ?? 0), 'All recorded orders'],
    ['Customers', String(metrics?.customers ?? 0), 'Registered customer accounts'],
    ['Products', String(metrics?.products ?? 0), `${metrics?.lowStock ?? 0} at or below five in stock`]
  ]
  return <div className="space-y-7">
    <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><h2 className="font-serif-title text-2xl">Welcome to your studio</h2><p className="mt-1 text-sm text-[#887770]">A live snapshot of your storefront and operations.</p></div><a href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[#a45f60]">Open storefront <ArrowUpRight className="h-4 w-4" /></a></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail]) => <div key={label} className="rounded-2xl border border-[#eee5df] bg-white p-5 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[.12em] text-[#9a827a]">{label}</p><p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p><p className="mt-2 text-xs text-[#988780]">{detail}</p></div>)}</div>
    <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <section className="rounded-2xl border border-[#eee5df] bg-white p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><h3 className="font-semibold">Recent orders</h3><p className="mt-1 text-xs text-[#9a8881]">Payment and fulfillment are tracked separately.</p></div><button onClick={() => onOpenSection('orders')} className="text-xs font-semibold text-[#a45f60]">All orders</button></div>
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
function ProductsPage({ products, categories, search, setSearch, onRefresh, onEdit, onCreate, onImport, onDelete }: {
  products: AdminProduct[]; categories: AdminCategory[]; search: string; setSearch: (value: string) => void
  onRefresh: () => void; onEdit: (product: AdminProduct) => void; onCreate: () => void
  onImport: () => void; onDelete: (product: AdminProduct) => void
}) {
  const [sort, setSort] = useState<'name' | 'price-low' | 'price-high' | 'stock'>('name')
  const [categoryFilter, setCategoryFilter] = useState('')
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
    {categories.length === 0 && <p className="mb-3 text-xs text-amber-800">Create or import a category before adding products.</p>}
    <div className="overflow-hidden rounded-2xl border border-[#eee5df] bg-white">
      {categoryFilteredProducts.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-[#fbf8f6] text-[11px] uppercase tracking-wider text-[#967f77]"><tr><th className="px-5 py-3">Product</th><th className="px-5 py-3">Category</th><th className="px-5 py-3">Price</th><th className="px-5 py-3">Stock</th><th className="px-5 py-3">Visibility</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#f2ece8]">{visibleItems.map(product => <tr key={product.id}><td className="px-5 py-3"><div className="flex items-center gap-3"><img src={product.imageUrl || '/favicon.ico'} alt="" className="h-11 w-11 rounded-lg bg-[#f5eeea] object-cover" /><div><p className="font-medium">{product.name}</p><p className="mt-1 text-[10px] text-[#a18c84]">{product.id}</p></div></div></td><td className="px-5 py-3">{categories.find(item => item.slug === product.category)?.name ?? product.category}</td><td className="px-5 py-3 font-medium">{money(product.price)}</td><td className="px-5 py-3">{product.stockQuantity === null ? <span className="text-[#9c8982]">Not tracked</span> : product.stockQuantity}</td><td className="px-5 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${product.isActive && product.isPublished ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f4efec] text-[#88766f]'}`}>{product.isActive && product.isPublished ? 'Live' : 'Hidden'}</span></td><td className="px-5 py-3 text-right"><button onClick={() => onEdit(product)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a45f60] hover:bg-[#faf2ef]">Edit</button><button onClick={() => onDelete(product)} className="rounded-lg p-2 text-[#a45f60] hover:bg-[#fff2f0]" title="Delete product"><Trash2 className="h-4 w-4" /></button></td></tr>)}</tbody></table></div><TablePager page={page} pageCount={pageCount} total={categoryFilteredProducts.length} onChange={setPage} /></> : <EmptyState text="No products match these filters." />}
    </div>
  </section>
}
function CategoriesPage({ categories, onRefresh, onCreate, onEdit, onDelete }: {
  categories: AdminCategory[]; onRefresh: () => void; onCreate: () => void
  onEdit: (category: AdminCategory) => void; onDelete: (category: AdminCategory) => void
}) {
  return <section>
    <PageHeading title="Categories" description="Organize products and control which collections appear in the storefront." action={<button onClick={onCreate} className="inline-flex items-center gap-2 rounded-xl bg-[#a45f60] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />Add category</button>} />
    <div className="mb-4 flex justify-end"><button onClick={onRefresh} className="rounded-xl border border-[#e8d9d2] bg-white px-4 py-2.5 text-sm text-[#7c6962]">Refresh</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{categories.map(category => <article key={category.slug} className="rounded-2xl border border-[#eee5df] bg-white p-5"><div className="flex items-start justify-between"><div><h3 className="font-semibold">{category.name}</h3><p className="mt-1 text-xs text-[#a18c84]">/{category.slug}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${category.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-[#f4efec] text-[#88766f]'}`}>{category.is_active ? 'Active' : 'Hidden'}</span></div><p className="mt-4 line-clamp-2 min-h-10 text-sm leading-5 text-[#86736c]">{category.description || 'No description added.'}</p><div className="mt-5 flex items-center justify-between border-t border-[#f1ebe7] pt-4"><span className="text-xs text-[#95827a]">{category.productCount ?? 0} products</span><div className="flex gap-1"><button onClick={() => onEdit(category)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a45f60] hover:bg-[#faf2ef]">Edit</button><button onClick={() => onDelete(category)} className="rounded-lg p-2 text-[#a45f60] hover:bg-[#fff2f0]" title="Delete category"><Trash2 className="h-4 w-4" /></button></div></div></article>)}</div>
    {categories.length === 0 && <EmptyState text="No categories have been created yet." />}
  </section>
}
function OrdersPage({ orders, search, setSearch, onUpdate }: { orders: AdminOrder[]; search: string; setSearch: (value: string) => void; onUpdate: (order: AdminOrder, status: Fulfillment) => void }) {
  const { page, setPage, pageCount, visibleItems } = usePagination(orders)
  return <section>
    <PageHeading title="Orders" description="Update fulfillment only. Payment status is retained as recorded at checkout." />
    <div className="mb-4"><SearchBox value={search} onChange={value => { setSearch(value); setPage(0) }} placeholder="Search order, customer or email" /></div>
    <div className="overflow-hidden rounded-2xl border border-[#eee5df] bg-white">{orders.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-[#fbf8f6] text-[11px] uppercase tracking-wider text-[#967f77]"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Total</th><th className="px-5 py-3">Fulfillment</th><th className="px-5 py-3">Placed</th></tr></thead><tbody className="divide-y divide-[#f2ece8]">{visibleItems.map(order => <tr key={order.id}><td className="px-5 py-4 font-semibold">{order.order_id}</td><td className="px-5 py-4"><p>{String(order.order_data.customerName ?? 'Customer')}</p><p className="mt-1 text-xs text-[#9a8881]">{String(order.order_data.email ?? '')}</p></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${order.order_data.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{statusLabel(String(order.order_data.status ?? 'pending'))}</span></td><td className="px-5 py-4 font-medium">{money(order.order_data.total)}</td><td className="px-5 py-4"><select value={order.fulfillment_status ?? 'unfulfilled'} onChange={event => onUpdate(order, event.target.value as Fulfillment)} className="rounded-lg border border-[#e9dfda] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#a45f60]">{fulfillmentStatuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></td><td className="px-5 py-4 text-xs text-[#8e7d76]">{dateLabel(order.created_at)}</td></tr>)}</tbody></table></div><TablePager page={page} pageCount={pageCount} total={orders.length} onChange={setPage} /></> : <EmptyState text="No matching orders found." />}</div>
  </section>
}
function CustomersPage({ customers, search, setSearch, onEdit, onToggleStatus, onDelete }: { customers: AdminCustomer[]; search: string; setSearch: (value: string) => void; onEdit: (customer: AdminCustomer) => void; onToggleStatus: (customer: AdminCustomer) => void; onDelete: (customer: AdminCustomer) => void }) {
  const { page, setPage, pageCount, visibleItems } = usePagination(customers)
  return <section>
    <PageHeading title="Customers" description="Review customer profiles and disable access without deleting order history." />
    <div className="mb-4"><SearchBox value={search} onChange={value => { setSearch(value); setPage(0) }} placeholder="Search name, username, email or phone" /></div>
    <div className="overflow-hidden rounded-2xl border border-[#eee5df] bg-white">{customers.length ? <><div className="overflow-x-auto"><table className="w-full min-w-[950px] text-left text-sm"><thead className="bg-[#fbf8f6] text-[11px] uppercase tracking-wider text-[#967f77]"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Contact</th><th className="px-5 py-3">Email status</th><th className="px-5 py-3">Account</th><th className="px-5 py-3">Joined</th><th className="px-5 py-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-[#f2ece8]">{visibleItems.map(customer => <tr key={customer.id}><td className="px-5 py-4"><p className="font-medium">{customer.name}</p><p className="mt-1 text-xs text-[#9a8881]">@{customer.username}</p></td><td className="px-5 py-4"><p>{customer.email}</p><p className="mt-1 text-xs text-[#9a8881]">{customer.phone}</p></td><td className="px-5 py-4">{customer.email_verified ? <span className="text-xs text-emerald-700">Verified</span> : <span className="text-xs text-amber-700">Unverified</span>}{customer.pending_email && <p className="mt-1 max-w-48 truncate text-[10px] text-amber-700" title={customer.pending_email}>Pending {customer.pending_email}</p>}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${customer.account_status === 'disabled' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>{statusLabel(customer.account_status)}</span></td><td className="px-5 py-4 text-xs text-[#8e7d76]">{dateLabel(customer.created_at)}</td><td className="px-5 py-4 text-right"><div className="inline-flex items-center gap-1"><button onClick={() => onEdit(customer)} className="rounded-lg px-3 py-2 text-xs font-semibold text-[#a45f60] hover:bg-[#faf2ef]">Details</button><button onClick={() => onToggleStatus(customer)} className="rounded-lg px-3 py-2 text-xs font-medium text-[#806b63] hover:bg-[#faf7f5]">{customer.account_status === 'disabled' ? 'Enable' : 'Disable'}</button><button onClick={() => onDelete(customer)} className="rounded-lg px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50" aria-label={`Permanently delete ${customer.email}`}>Delete</button></div></td></tr>)}</tbody></table></div><TablePager page={page} pageCount={pageCount} total={customers.length} onChange={setPage} /></> : <EmptyState text="No customers match your search." />}</div>
  </section>
}
function SettingsPage({ settings, setSettings, onSave }: { settings: StoreSettings; setSettings: React.Dispatch<React.SetStateAction<StoreSettings>>; onSave: () => void }) {
  const field = (key: keyof StoreSettings, label: string, type = 'text') => <label key={key} className="block text-sm font-medium">{label}<input type={type} value={settings[key]} onChange={event => setSettings(current => ({ ...current, [key]: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#e9dfda] bg-white px-4 py-3 outline-none focus:border-[#a45f60] focus:ring-2 focus:ring-[#a45f60]/10" /></label>
  return <section>
    <PageHeading title="Store settings" description="Control the public store identity and contact details." />
    <div className="max-w-4xl rounded-2xl border border-[#eee5df] bg-white p-5 sm:p-8"><div className="mb-6 flex items-center gap-3"><span className="rounded-xl bg-[#f8eeeb] p-2.5 text-[#a45f60]"><Store className="h-5 w-5" /></span><div><h3 className="font-semibold">Storefront identity</h3><p className="text-xs text-[#938079]">These details are public. Do not enter passwords or private keys.</p></div></div><div className="grid gap-5 sm:grid-cols-2">{field('storeName', 'Store name')}{field('tagline', 'Tagline')}{field('contactEmail', 'Contact email', 'email')}{field('phone', 'Contact phone', 'tel')}{field('whatsappNumber', 'WhatsApp number', 'tel')}{field('instagramUrl', 'Instagram URL', 'url')}{field('facebookUrl', 'Facebook URL', 'url')}{field('deliveryNote', 'Delivery note')}<label className="block text-sm font-medium sm:col-span-2">Store description<textarea rows={4} value={settings.description} onChange={event => setSettings(current => ({ ...current, description: event.target.value }))} className="mt-2 w-full rounded-xl border border-[#e9dfda] bg-white px-4 py-3 outline-none focus:border-[#a45f60]" /></label></div><button onClick={onSave} className="mt-6 rounded-xl bg-[#a45f60] px-5 py-3 text-sm font-semibold text-white hover:bg-[#8c4e50]">Save store settings</button></div>
  </section>
}

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="fixed inset-0 z-40 flex items-end justify-center bg-[#211917]/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><section className="max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-t-3xl bg-[#fffdfa] p-5 shadow-2xl sm:rounded-3xl sm:p-7"><header className="mb-6 flex items-center justify-between"><h2 className="font-serif-title text-xl">{title}</h2><button onClick={onClose} className="rounded-full p-2 text-[#8a7770] hover:bg-[#f4ece8]"><X className="h-5 w-5" /></button></header>{children}</section></div>
}
function ProductEditor({ product, categories, onClose, onSave }: { product: AdminProduct; categories: AdminCategory[]; onClose: () => void; onSave: (product: AdminProduct) => Promise<void> }) {
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
      set('imageUrl', result.imageUrl)
    } catch (uploadError) {
      setEditorError(uploadError instanceof Error ? uploadError.message : 'Image upload failed.')
    } finally { setUploading(false) }
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    void onSave(draft)
  }
  return <ModalShell title={product.name ? 'Edit product' : 'New product'} onClose={onClose}>
    {editorError && <AlertMessage message={editorError} />}
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Product ID<input required value={draft.id} onChange={event => set('id', event.target.value)} disabled={Boolean(product.name)} className="form-input" /></label>
        <label className="text-sm font-medium">Product name<input required value={draft.name} onChange={event => set('name', event.target.value)} className="form-input" /></label>
        <label className="text-sm font-medium">Category<select required value={draft.category} onChange={event => set('category', event.target.value)} className="form-input"><option value="">Choose category</option>{categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select></label>
        <label className="text-sm font-medium">Subcategory<input value={draft.subCategory ?? ''} onChange={event => set('subCategory', event.target.value)} className="form-input" /></label>
        <label className="text-sm font-medium">Price (INR)<input required min="0" step="0.01" type="number" value={draft.price} onChange={event => set('price', Number(event.target.value))} className="form-input" /></label>
        <label className="text-sm font-medium">Stock quantity<input min="0" type="number" placeholder="Leave blank to not track" value={draft.stockQuantity ?? ''} onChange={event => set('stockQuantity', event.target.value === '' ? null : Number(event.target.value))} className="form-input" /></label>
      </div>
      <label className="block text-sm font-medium">Image URL<input value={draft.imageUrl} onChange={event => set('imageUrl', event.target.value)} className="form-input" /></label>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#eadfd9] px-3 py-2 text-xs font-semibold text-[#a45f60]"><ImagePlus className="h-4 w-4" />{uploading ? 'Uploading image…' : 'Upload product image'}<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="sr-only" onChange={event => void upload(event.target.files?.[0])} /></label>
      {draft.imageUrl && <img src={draft.imageUrl} alt="Product preview" className="h-32 w-32 rounded-xl bg-[#f5eeea] object-cover" />}
      <label className="block text-sm font-medium">Tagline<input value={draft.tagline} onChange={event => set('tagline', event.target.value)} className="form-input" /></label>
      <label className="block text-sm font-medium">Description<textarea rows={3} value={draft.description} onChange={event => set('description', event.target.value)} className="form-input" /></label>
      <label className="block text-sm font-medium">Features, one per line<textarea rows={3} value={draft.features.join('\n')} onChange={event => set('features', event.target.value.split('\n').map(value => value.trim()).filter(Boolean))} className="form-input" /></label>
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
    <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.is_active} onChange={event => setDraft(current => ({ ...current, is_active: event.target.checked }))} className="accent-[#a45f60]" />Active on storefront</label>
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
