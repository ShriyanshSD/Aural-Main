/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { flushSync } from 'react-dom'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ArrowUp, Sparkles } from 'lucide-react'
import { Navigation } from './components/Navigation'
import { Hero } from './components/Hero'
import type { AuthMode } from './components/AuthModal'
import { Product, ProductCategory, CartItem, OrderDetails, FinishType, AuthUser, StoreCategory, StoreSettings } from './types'
import { PRODUCTS } from './data/products'

const AdminApp = React.lazy(() => import('./AdminApp'))
const Sidebar = React.lazy(() => import('./components/Sidebar').then(module => ({ default: module.Sidebar })))
const MomentsSection = React.lazy(() => import('./components/MomentsSection').then(module => ({ default: module.MomentsSection })))
const CategoryGrid = React.lazy(() => import('./components/CategoryGrid').then(module => ({ default: module.CategoryGrid })))
const ProductCatalog = React.lazy(() => import('./components/ProductCatalog').then(module => ({ default: module.ProductCatalog })))
const MagazineShowcase = React.lazy(() => import('./components/MagazineShowcase').then(module => ({ default: module.MagazineShowcase })))
const CustomGiftBuilder = React.lazy(() => import('./components/CustomGiftBuilder').then(module => ({ default: module.CustomGiftBuilder })))
const ProductDetailModal = React.lazy(() => import('./components/ProductDetailModal').then(module => ({ default: module.ProductDetailModal })))
const CartDrawer = React.lazy(() => import('./components/CartDrawer').then(module => ({ default: module.CartDrawer })))
const WishlistDrawer = React.lazy(() => import('./components/WishlistDrawer').then(module => ({ default: module.WishlistDrawer })))
const CheckoutModal = React.lazy(() => import('./components/CheckoutModal').then(module => ({ default: module.CheckoutModal })))
const AuthModal = React.lazy(() => import('./components/AuthModal').then(module => ({ default: module.AuthModal })))
const AccountModal = React.lazy(() => import('./components/AccountModal').then(module => ({ default: module.AccountModal })))
const ChatbotModal = React.lazy(() => import('./components/ChatbotModal').then(module => ({ default: module.ChatbotModal })))
const StoryAndReviews = React.lazy(() => import('./components/StoryAndReviews').then(module => ({ default: module.StoryAndReviews })))
const Footer = React.lazy(() => import('./components/Footer').then(module => ({ default: module.Footer })))

const LazyViewport: React.FC<{ children: React.ReactNode; minHeight: number; id?: string }> = ({ children, minHeight, id }) => {
  const [isVisible, setIsVisible] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return
    if (!('IntersectionObserver' in window)) {
      setIsVisible(true)
      return
    }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { rootMargin: '600px 0px' })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  return (
    <div id={id} ref={containerRef} style={{ minHeight }}>
      {isVisible && <React.Suspense fallback={null}>{children}</React.Suspense>}
    </div>
  )
}

const DeferredMount: React.FC<{ active: boolean; children: React.ReactNode }> = ({ active, children }) => {
  const [hasBeenActivated, setHasBeenActivated] = React.useState(active)
  React.useEffect(() => {
    if (active) setHasBeenActivated(true)
  }, [active])
  return hasBeenActivated ? <React.Suspense fallback={null}>{children}</React.Suspense> : null
}

type AppTab = 'home' | 'shop' | 'builder' | 'story' | 'contact'

interface SignupResumeState {
  activeTab: AppTab
  activeCategory: ProductCategory
  cartItems: CartItem[]
  wishlist: string[]
  isDarkMode: boolean
  scrollY: number
  resumeCheckout: boolean
  createdAt: number
}

const signupResumeStorageKey = 'aurel_signup_resume'
const savedThemeStorageKey = 'aurel_theme'
const savedCartStorageKey = 'aurel_cart'
const getWishlistStorageKey = (userId: string) => `aurel_wishlist_${userId}`
const appTabs = new Set<AppTab>(['home', 'shop', 'builder', 'story', 'contact'])
const productCategories = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/
const isCartItem = (value: unknown): value is CartItem => {
  if (typeof value !== 'object' || value === null) return false
  const item = value as Partial<CartItem>
  return typeof item.cartId === 'string'
    && typeof item.productId === 'string'
    && typeof item.name === 'string'
    && typeof item.price === 'number'
    && Number.isFinite(item.price)
    && item.price >= 0
    && typeof item.quantity === 'number'
    && Number.isInteger(item.quantity)
    && item.quantity > 0
    && typeof item.imageUrl === 'string'
    && (item.finish === undefined || item.finish === 'matte' || item.finish === 'gloss')
    && (item.recipientName === undefined || typeof item.recipientName === 'string')
    && (item.customMessage === undefined || typeof item.customMessage === 'string')
    && (item.customComponents === undefined || (
      Array.isArray(item.customComponents)
      && item.customComponents.every(component => typeof component === 'string')
    ))
}

const readSavedTheme = (): boolean | null => {
  try {
    const theme = window.localStorage.getItem(savedThemeStorageKey)
    return theme === 'dark' ? true : theme === 'light' ? false : null
  } catch (error) {
    console.error('Unable to restore the saved theme:', error)
    return null
  }
}

const readSavedCart = (): CartItem[] => {
  try {
    const serializedCart = window.localStorage.getItem(savedCartStorageKey)
    if (!serializedCart) return []
    const savedCart: unknown = JSON.parse(serializedCart)
    if (!Array.isArray(savedCart)) {
      console.error('Unable to restore the saved bag: stored data is not a list.')
      return []
    }
    return savedCart.filter(isCartItem)
  } catch (error) {
    console.error('Unable to restore the saved bag:', error)
    return []
  }
}

const initialCategories: StoreCategory[] = [...new Set(PRODUCTS.map(product => product.category))]
  .map(slug => ({ slug, name: slug.split('-').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ') }))
const initialStoreSettings: StoreSettings = {
  storeName: 'AUREL',
  tagline: 'Made With Love For You',
  description: 'Curated luxury memory magazines, botanical bouquets, eternal single blossoms, and thoughtful keepsakes.',
  contactEmail: 'aruelstudio22@gmail.com',
  phone: '',
  whatsappNumber: '919999200913',
  instagramUrl: '',
  facebookUrl: '',
  deliveryNote: 'Pan India Delivery'
}

const readSignupResumeState = (): SignupResumeState | null => {
  try {
    const serializedState = window.localStorage.getItem(signupResumeStorageKey)
    if (!serializedState) return null
    window.localStorage.removeItem(signupResumeStorageKey)
    const state = JSON.parse(serializedState) as Partial<SignupResumeState>
    if (
      typeof state.createdAt !== 'number'
      || Date.now() - state.createdAt > 24 * 60 * 60 * 1000
      || typeof state.activeTab !== 'string'
      || !appTabs.has(state.activeTab as AppTab)
      || typeof state.activeCategory !== 'string'
      || !productCategories.test(state.activeCategory)
      || !Array.isArray(state.cartItems)
      || !Array.isArray(state.wishlist)
      || typeof state.isDarkMode !== 'boolean'
      || typeof state.scrollY !== 'number'
      || typeof state.resumeCheckout !== 'boolean'
    ) {
      return null
    }
    return state as SignupResumeState
  } catch (error) {
    console.error('Unable to restore the page state after signup:', error)
    return null
  }
}

function StorefrontApp() {
  const [signupResume] = useState(readSignupResumeState)
  const scrollAnimationRef = useRef<number | null>(null)
  const originalScrollBehaviorRef = useRef<string | null>(null)
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(signupResume?.isDarkMode ?? readSavedTheme() ?? false)

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<AppTab>(signupResume?.activeTab ?? 'home')
  const [activeCategory, setActiveCategory] = useState<ProductCategory>(signupResume?.activeCategory ?? 'all')
  const [catalogProducts, setCatalogProducts] = useState<Product[]>(PRODUCTS)
  const [storeCategories, setStoreCategories] = useState<StoreCategory[]>(initialCategories)
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(initialStoreSettings)
  const [isCatalogLoaded, setIsCatalogLoaded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isAuthLoaded, setIsAuthLoaded] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [accountInitialSection, setAccountInitialSection] = useState<'profile' | 'settings'>('profile')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authNotice, setAuthNotice] = useState('')
  const [checkoutAfterAuth, setCheckoutAfterAuth] = useState(signupResume?.resumeCheckout ?? false)

  // Cart & Wishlist state
  const [cartItems, setCartItems] = useState<CartItem[]>(signupResume?.cartItems ?? readSavedCart())
  const [isBagOpen, setIsBagOpen] = useState(false)
  const [cartFeedback, setCartFeedback] = useState<{
    productName: string
    timestamp: number
    kind: 'added' | 'unavailable'
  } | null>(null)
  const [wishlist, setWishlist] = useState<string[]>(signupResume?.wishlist ?? [])
  const [wishlistOwnerId, setWishlistOwnerId] = useState<string | null>(null)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)

  useEffect(() => {
    const updateBackToTopVisibility = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', updateBackToTopVisibility, { passive: true })
    updateBackToTopVisibility()
    return () => window.removeEventListener('scroll', updateBackToTopVisibility)
  }, [])

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Sync dark mode class on html/body
  useLayoutEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  useEffect(() => {
    try {
      window.localStorage.setItem(savedThemeStorageKey, isDarkMode ? 'dark' : 'light')
    } catch (error) {
      console.error('Unable to save the selected theme:', error)
    }
  }, [isDarkMode])

  useEffect(() => {
    try {
      window.localStorage.setItem(savedCartStorageKey, JSON.stringify(cartItems))
    } catch (error) {
      console.error('Unable to save the bag:', error)
    }
  }, [cartItems])

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const response = await fetch('/api/catalog', { cache: 'no-store' })
        if (!response.ok) throw new Error(`Catalog lookup failed with status ${response.status}.`)
        const data = await response.json() as {
          products?: Product[]
          categories?: StoreCategory[]
          settings?: Partial<StoreSettings>
        }
        if (!Array.isArray(data.products) || !Array.isArray(data.categories)) {
          throw new Error('The catalog service returned an invalid response.')
        }
        setCatalogProducts(data.products)
        setStoreCategories(data.categories)
        setStoreSettings(current => ({ ...current, ...data.settings }))
      } catch (error) {
        console.error('Unable to load the database storefront catalog, using the bundled catalog:', error)
      } finally {
        setIsCatalogLoaded(true)
      }
    }
    void loadCatalog()
  }, [])

  useEffect(() => {
    if (activeCategory !== 'all' && !storeCategories.some(category => category.slug === activeCategory)) {
      setActiveCategory('all')
    }
  }, [activeCategory, storeCategories])

  useEffect(() => {
    if (!signupResume) return
    requestAnimationFrame(() => window.scrollTo({ top: signupResume.scrollY, behavior: 'auto' }))
  }, [signupResume])

  useEffect(() => {
    if (!cartFeedback) return
    const timeoutId = window.setTimeout(() => setCartFeedback(null), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [cartFeedback])

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' })
        if (response.status === 401) return
        if (!response.ok) throw new Error(`Account lookup failed with status ${response.status}.`)
        const data = await response.json() as { user: AuthUser }
        setAuthUser(data.user)
      } catch (error) {
        console.error('Unable to restore account session:', error)
      } finally {
        setIsAuthLoaded(true)
      }
    }

    void loadAccount()
  }, [])

  useEffect(() => {
    if (!isAuthLoaded || !isCatalogLoaded) return
    if (!authUser) {
      setWishlistOwnerId(null)
      setWishlist([])
      setIsWishlistOpen(false)
      return
    }

    try {
      const serializedWishlist = window.localStorage.getItem(getWishlistStorageKey(authUser.id))
      const savedWishlist: unknown = serializedWishlist
        ? JSON.parse(serializedWishlist)
        : signupResume?.wishlist ?? []
      const validProductIds = new Set(catalogProducts.map(product => product.id))
      setWishlist(
        Array.isArray(savedWishlist)
          ? savedWishlist.filter((id): id is string => typeof id === 'string' && validProductIds.has(id))
          : []
      )
      setWishlistOwnerId(authUser.id)
    } catch (error) {
      console.error('Unable to load the account wishlist:', error)
      setWishlist([])
      setWishlistOwnerId(authUser.id)
    }
  }, [authUser, catalogProducts, isAuthLoaded, isCatalogLoaded, signupResume])

  useEffect(() => {
    if (!authUser || wishlistOwnerId !== authUser.id) return
    try {
      window.localStorage.setItem(getWishlistStorageKey(authUser.id), JSON.stringify(wishlist))
    } catch (error) {
      console.error('Unable to save the account wishlist:', error)
    }
  }, [authUser, wishlist, wishlistOwnerId])

  useEffect(() => {
    const callbackUrl = new URL(window.location.href)
    const hashParams = new URLSearchParams(callbackUrl.hash.slice(1))
    const accessToken = hashParams.get('access_token') ?? callbackUrl.searchParams.get('access_token')
    const tokenHash = hashParams.get('token_hash') ?? callbackUrl.searchParams.get('token_hash')
    const verificationType = hashParams.get('type') ?? callbackUrl.searchParams.get('type')
    const verificationError = hashParams.get('error') ?? callbackUrl.searchParams.get('error')
    const verificationErrorCode = hashParams.get('error_code') ?? callbackUrl.searchParams.get('error_code')
    const isEmailChange = verificationType === 'email_change'
    const clearVerificationParams = () => {
      for (const key of ['access_token', 'type', 'error', 'error_code', 'error_description', 'token_hash']) {
        callbackUrl.searchParams.delete(key)
      }
      callbackUrl.hash = ''
      window.history.replaceState(null, '', `${callbackUrl.pathname}${callbackUrl.search}`)
    }

    if (verificationError) {
      clearVerificationParams()
      setAuthMode(isEmailChange ? 'login' : 'signup')
      setAuthNotice(
        verificationErrorCode === 'otp_expired'
          ? isEmailChange
            ? 'This email change link has expired or was already used. Sign in with your current email address and request a new link.'
            : 'This confirmation link has expired or was already used. Sign in if you already verified your email, or sign up again to request a new link.'
          : isEmailChange
            ? 'The new email address could not be verified. Sign in with your current email address and request a new link.'
            : 'The confirmation link could not be used. Sign in if you already verified your email, or request a new confirmation link.'
      )
      setIsAuthOpen(true)
      return
    }
    if ((!accessToken && !tokenHash) || (verificationType !== 'signup' && verificationType !== 'email_change')) return

    const verifyEmail = async () => {
      try {
        const response = await fetch(isEmailChange ? '/api/auth/confirm-email-change' : '/api/auth/verify', {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(accessToken ? { accessToken } : { tokenHash })
        })
        clearVerificationParams()
        const data = await response.json() as { error?: string; user?: AuthUser }
        if (!response.ok || !data.user) {
          throw new Error(data.error || 'The email confirmation link could not be verified.')
        }

        const sessionResponse = await fetch('/api/auth/me', {
          credentials: 'same-origin',
          cache: 'no-store'
        })
        const sessionData = await sessionResponse.json() as { error?: string; user?: AuthUser }
        if (isEmailChange && (!sessionResponse.ok || !sessionData.user || sessionData.user.id !== data.user.id)) {
          setAuthMode('login')
          setAuthNotice('Your new email is verified. Please sign in with your updated email address.')
          setIsAuthOpen(true)
          return
        }
        if (!sessionResponse.ok || !sessionData.user || sessionData.user.id !== data.user.id) {
          throw new Error(sessionData.error || 'Your email was verified, but this browser could not keep your sign-in session. Please sign in once to continue.')
        }

        setAuthUser(sessionData.user)
        setAuthNotice('')
        setIsAuthOpen(false)
      } catch (error) {
        console.error('Email confirmation link failed:', error)
        setAuthMode(isEmailChange ? 'login' : 'signup')
        setAuthNotice(error instanceof Error
          ? error.message
          : 'The email confirmation link could not be verified. Request a new confirmation link.')
        setIsAuthOpen(true)
      }
    }

    void verifyEmail()
  }, [])

  useEffect(() => {
    if (!isAuthLoaded || !checkoutAfterAuth) return
    if (authUser) {
      setCheckoutAfterAuth(false)
      setIsCheckoutOpen(true)
    } else {
      setAuthMode('login')
      setIsAuthOpen(true)
    }
  }, [authUser, checkoutAfterAuth, isAuthLoaded])

  const totalBagCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)

  // Handlers
  const smoothScrollTo = (target: number | HTMLElement, duration = 900) => {
    if (scrollAnimationRef.current !== null) {
      cancelAnimationFrame(scrollAnimationRef.current)
      scrollAnimationRef.current = null
      document.documentElement.style.scrollBehavior = originalScrollBehaviorRef.current ?? ''
    }

    const startY = window.scrollY
    const targetY = Math.max(0, Math.min(
      typeof target === 'number' ? target : startY + target.getBoundingClientRect().top,
      document.documentElement.scrollHeight - window.innerHeight
    ))
    const distance = targetY - startY
    const startTime = performance.now()
    const previousScrollBehavior = document.documentElement.style.scrollBehavior
    originalScrollBehaviorRef.current = previousScrollBehavior
    document.documentElement.style.scrollBehavior = 'auto'

    const animateScroll = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const easedProgress = progress < 0.5
        ? 8 * progress ** 4
        : 1 - ((-2 * progress + 2) ** 4) / 2
      window.scrollTo({ top: startY + distance * easedProgress, behavior: 'instant' })

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(animateScroll)
      } else {
        scrollAnimationRef.current = null
        document.documentElement.style.scrollBehavior = originalScrollBehaviorRef.current ?? previousScrollBehavior
        originalScrollBehaviorRef.current = null
      }
    }

    scrollAnimationRef.current = requestAnimationFrame(animateScroll)
  }

  const handleScrollBackToTop = () => {
    if (scrollAnimationRef.current !== null) {
      cancelAnimationFrame(scrollAnimationRef.current)
      scrollAnimationRef.current = null
      document.documentElement.style.scrollBehavior = originalScrollBehaviorRef.current ?? ''
      originalScrollBehaviorRef.current = null
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      window.scrollTo({ top: 0, behavior: 'instant' })
      return
    }

    const duration = Math.min(3500, 1800 + window.scrollY * 0.15)
    smoothScrollTo(0, duration)
  }

  const handleToggleTheme = () => {
    const updateTheme = () => setIsDarkMode(prev => !prev)
    const transitionDocument = document as Document & {
      startViewTransition?: (callback: () => void) => unknown
    }
    if (transitionDocument.startViewTransition) {
      transitionDocument.startViewTransition(() => flushSync(updateTheme))
    } else {
      updateTheme()
    }
  }

  const handleSelectCategory = (category: ProductCategory) => {
    setActiveCategory(category)
    setActiveTab('shop')
    requestAnimationFrame(() => {
      const collection = document.getElementById('collection-grid')
      if (collection) smoothScrollTo(collection)
    })
  }

  const handleToggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!authUser) {
      setAuthMode('login')
      setIsAuthOpen(true)
      return
    }
    setWishlist(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId) 
        : [...prev, productId]
    )
  }

  const handleAddToCart = (item: CartItem): boolean => {
    const product = catalogProducts.find(candidate => candidate.id === item.productId)
    const currentQuantity = cartItems
      .filter(cartItem => cartItem.productId === item.productId)
      .reduce((total, cartItem) => total + cartItem.quantity, 0)
    if (typeof product?.stockQuantity === 'number' && currentQuantity + item.quantity > product.stockQuantity) {
      setCartFeedback({ productName: item.name, timestamp: Date.now(), kind: 'unavailable' })
      return false
    }
    setCartItems(prev => {
      const existing = prev.find(
        i => i.productId === item.productId && i.finish === item.finish && i.recipientName === item.recipientName
      )
      if (existing) {
        return prev.map(i => 
          i.cartId === existing.cartId 
            ? { ...i, quantity: i.quantity + item.quantity } 
            : i
        )
      }
      return [item, ...prev]
    })
    setCartFeedback({ productName: item.name, timestamp: Date.now(), kind: 'added' })
    return true
  }

  const handleQuickAdd = (product: Product, e: React.MouseEvent): boolean => {
    e.stopPropagation()
    if (product.stockQuantity === 0) {
      setCartFeedback({ productName: product.name, timestamp: Date.now(), kind: 'unavailable' })
      return false
    }
    const newItem: CartItem = {
      cartId: `${product.id}_${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      finish: product.availableFinishes ? product.availableFinishes[0] : undefined
    }
    return handleAddToCart(newItem)
  }

  const handleAddWishlistItemToBag = (product: Product) => {
    const addedToBag = handleAddToCart({
      cartId: `${product.id}_${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      finish: product.availableFinishes ? product.availableFinishes[0] : undefined
    })
    if (addedToBag) {
      setWishlist(current => current.filter(productId => productId !== product.id))
      setIsWishlistOpen(false)
      setIsBagOpen(true)
    }
  }

  const handleUpdateQuantity = (cartId: string, delta: number) => {
    const item = cartItems.find(cartItem => cartItem.cartId === cartId)
    const product = item && catalogProducts.find(candidate => candidate.id === item.productId)
    const currentProductQuantity = item
      ? cartItems.filter(cartItem => cartItem.productId === item.productId).reduce((total, cartItem) => total + cartItem.quantity, 0)
      : 0
    if (item && typeof product?.stockQuantity === 'number' && currentProductQuantity + delta > product.stockQuantity) {
      setCartFeedback({ productName: item.name, timestamp: Date.now(), kind: 'unavailable' })
      return
    }
    setCartItems(prev => 
      prev.map(item => {
        if (item.cartId === cartId) {
          const newQty = item.quantity + delta
          return newQty > 0 ? { ...item, quantity: newQty } : null
        }
        return item
      }).filter(Boolean) as CartItem[]
    )
  }

  const handleRemoveCartItem = (cartId: string) => {
    setCartItems(prev => prev.filter(i => i.cartId !== cartId))
  }

  const handleCustomizeMagazine = (finish: FinishType, recipientName: string) => {
    const magProduct = catalogProducts.find(p => p.id === 'prod_bday_mag') || catalogProducts[0] || PRODUCTS[0]
    const customItem: CartItem = {
      cartId: `mag_${Date.now()}`,
      productId: magProduct.id,
      name: `Custom Magazine (${recipientName.toUpperCase()})`,
      price: magProduct.price,
      quantity: 1,
      imageUrl: magProduct.imageUrl,
      finish,
      recipientName
    }
    handleAddToCart(customItem)
  }

  const handleAddCustomHamperToBag = (customItem: CartItem) => {
    handleAddToCart(customItem)
    setActiveTab('shop')
  }

  const handleOrderSuccess = async (order: OrderDetails) => {
    if (!authUser) throw new Error('Sign in to save your order to your account.')
    const response = await fetch('/api/auth/orders', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order })
    })
    const data = await response.json() as { error?: string }
    if (!response.ok) throw new Error(data.error || 'Your order could not be saved to your account.')
    setCartItems([])
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) throw new Error(`Sign out failed with status ${response.status}.`)
      setAuthUser(null)
    } catch (error) {
      console.error('Unable to sign out:', error)
      window.alert('Unable to sign out right now. Please try again.')
    }
  }

  const handleAccountDeleted = () => {
    if (authUser) {
      try {
        window.localStorage.removeItem(getWishlistStorageKey(authUser.id))
      } catch (error) {
        console.error('Unable to remove the deleted account wishlist from this device:', error)
      }
    }
    setAuthUser(null)
    setWishlist([])
    setWishlistOwnerId(null)
    setIsWishlistOpen(false)
    setIsProfileOpen(false)
  }

  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
    <div className={`aurel-theme-transition theme-surface min-h-screen font-sans-body selection:bg-[#B36D6D]/20 selection:text-[#B36D6D] ${
      isDarkMode
        ? 'bg-[#181615] text-[#F3EBE6]'
        : 'bg-[#FAF7F2] text-[#2C2422]'
    }`}>
      
      {/* Top Navigation */}
      <Navigation
        products={catalogProducts}
        settings={storeSettings}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenBag={() => setIsBagOpen(true)}
        onOpenWishlist={() => {
          if (authUser) {
            setIsWishlistOpen(true)
          } else {
            setAuthMode('login')
            setIsAuthOpen(true)
          }
        }}
        bagCount={totalBagCount}
        wishlistCount={wishlist.length}
        searchQuery={searchQuery}
        onSearchChange={query => {
          setSearchQuery(query)
          if (query.trim()) {
            setActiveCategory('all')
            setActiveTab('shop')
          }
        }}
        onSearchSubmit={() => {
          setActiveCategory('all')
          setActiveTab('shop')
          requestAnimationFrame(() => {
            const collection = document.getElementById('collection-grid')
            if (collection) smoothScrollTo(collection)
          })
        }}
        onSelectProduct={product => {
          setActiveCategory('all')
          setActiveTab('shop')
          setSelectedProduct(product)
        }}
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab as any)
          if (tab === 'home' || tab === 'shop') {
            setActiveCategory('all')
          }
          if (tab === 'home') {
            smoothScrollTo(0)
          } else if (tab === 'shop') {
            const el = document.getElementById('collection-grid')
            if (el) smoothScrollTo(el)
          } else if (tab === 'story') {
            const el = document.getElementById('our-story')
            if (el) smoothScrollTo(el)
          } else if (tab === 'contact') {
            setIsChatbotOpen(true)
            const el = document.getElementById('concierge')
            if (el) smoothScrollTo(el)
          }
        }}
        onOpenBuilder={() => setActiveTab('builder')}
        user={authUser}
        onOpenAuth={(mode) => {
          setAuthMode(mode)
          setIsAuthOpen(true)
        }}
        onOpenProfile={() => {
          setAccountInitialSection('profile')
          setIsProfileOpen(true)
        }}
        onOpenSettings={() => {
          setAccountInitialSection('settings')
          setIsProfileOpen(true)
        }}
        onLogout={() => { void handleLogout() }}
      />

      <AnimatePresence>
        {cartFeedback && (
          <motion.div
            key={cartFeedback.timestamp}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            role="status"
            aria-live="polite"
            className={`fixed right-4 top-24 z-40 max-w-[calc(100vw-2rem)] rounded-2xl border px-4 py-3 text-sm shadow-lg ${
              isDarkMode
                ? 'border-[#493936] bg-[#211B19] text-[#F3EBE6]'
                : 'border-[#E8D4CB] bg-[#FFFCF9] text-[#2C2523]'
            }`}
          >
            <span className={`font-semibold ${cartFeedback.kind === 'added' ? 'text-[#B36D6D]' : 'text-amber-700'}`}>
              {cartFeedback.kind === 'added' ? 'Added to bag' : 'Stock limit reached'}
            </span>
            <span className="ml-2">{cartFeedback.productName}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fluid Sidebar Menu */}
      <DeferredMount active={isSidebarOpen}><Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isDarkMode={isDarkMode}
        onSelectCategory={handleSelectCategory}
        onOpenCustomBuilder={() => setActiveTab('builder')}
        onOpenStory={() => {
          setActiveTab('story')
          const el = document.getElementById('our-story')
          if (el) smoothScrollTo(el)
        }}
        onOpenConcierge={() => {
          setIsChatbotOpen(true)
          const el = document.getElementById('concierge')
          if (el) smoothScrollTo(el)
        }}
        onOpenChatbot={() => setIsChatbotOpen(true)}
        activeCategory={activeCategory}
        user={authUser}
        onOpenProfile={() => {
          setAccountInitialSection('profile')
          setIsProfileOpen(true)
        }}
        onOpenAuth={(mode) => {
          setAuthMode(mode)
          setIsAuthOpen(true)
        }}
        onLogout={() => { void handleLogout() }}
        categories={storeCategories}
        settings={storeSettings}
      /></DeferredMount>

      {/* Main Content Area with Faded Page Transitions */}
      <AnimatePresence mode="wait">
        {activeTab === 'builder' ? (
          <motion.div
            key="builder-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            <React.Suspense fallback={null}><CustomGiftBuilder
              isDarkMode={isDarkMode}
              onClose={() => setActiveTab('home')}
              onAddCustomHamperToBag={handleAddCustomHamperToBag}
            /></React.Suspense>
          </motion.div>
        ) : (
          <motion.main
            key="home-and-shop-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          >
            {activeCategory !== 'hair-accessories' && (
              <>
                {/* Hero Section */}
                <Hero
                  isDarkMode={isDarkMode}
                  onExplore={() => {
                    const el = document.getElementById('collection-grid')
                    if (el) smoothScrollTo(el)
                  }}
                  onCreateMemory={() => setActiveTab('builder')}
                />

                {/* Moments Section */}
                <LazyViewport minHeight={300}>
                  <MomentsSection isDarkMode={isDarkMode} categories={storeCategories} onSelectMoment={handleSelectCategory} />
                </LazyViewport>

                {/* Visual Categories Grid */}
                <LazyViewport minHeight={520}>
                  <CategoryGrid isDarkMode={isDarkMode} categories={storeCategories} onSelectCategory={handleSelectCategory} />
                </LazyViewport>
              </>
            )}

            {/* Product Catalog with Sort & Filter Controls */}
            <LazyViewport id="collection-grid" minHeight={720}>
              <ProductCatalog
                isDarkMode={isDarkMode}
                products={catalogProducts}
                categories={storeCategories}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                onSelectProduct={prod => setSelectedProduct(prod)}
                onQuickAdd={handleQuickAdd}
                wishlist={wishlist}
                onToggleWishlist={handleToggleWishlist}
                searchQuery={searchQuery}
              />
            </LazyViewport>

            {activeCategory !== 'hair-accessories' && (
              <>
                {/* Magazine Feature Section with Live Preview */}
                <LazyViewport minHeight={620}>
                  <MagazineShowcase isDarkMode={isDarkMode} onCustomizeMagazine={handleCustomizeMagazine} />
                </LazyViewport>

                {/* Trust, Story, Testimonials & Concierge Support */}
                <LazyViewport minHeight={760}>
                  <StoryAndReviews
                    isDarkMode={isDarkMode}
                    onExploreGifts={() => {
                      const el = document.getElementById('collection-grid')
                      if (el) smoothScrollTo(el)
                    }}
                  />
                </LazyViewport>
              </>
            )}
          </motion.main>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <DeferredMount active={Boolean(selectedProduct)}><ProductDetailModal
        product={selectedProduct}
        isDarkMode={isDarkMode}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        isWishlisted={selectedProduct ? wishlist.includes(selectedProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        isAuthenticated={Boolean(authUser)}
      /></DeferredMount>

      <DeferredMount active={isWishlistOpen && Boolean(authUser)}><WishlistDrawer
        isOpen={isWishlistOpen && Boolean(authUser)}
        isDarkMode={isDarkMode}
        products={catalogProducts.filter(product => wishlist.includes(product.id))}
        onClose={() => setIsWishlistOpen(false)}
        onRemove={productId => setWishlist(current => current.filter(id => id !== productId))}
        onAddToBag={handleAddWishlistItemToBag}
        onOpenBag={() => {
          setIsWishlistOpen(false)
          setIsBagOpen(true)
        }}
      /></DeferredMount>

      {/* Sliding Cart Drawer */}
      <DeferredMount active={isBagOpen}><CartDrawer
        isOpen={isBagOpen}
        onClose={() => setIsBagOpen(false)}
        isDarkMode={isDarkMode}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          const unavailableItem = cartItems.find(item => {
            const product = catalogProducts.find(candidate => candidate.id === item.productId)
            const totalQuantity = cartItems
              .filter(cartItem => cartItem.productId === item.productId)
              .reduce((total, cartItem) => total + cartItem.quantity, 0)
            return typeof product?.stockQuantity === 'number' && totalQuantity > product.stockQuantity
          })
          if (unavailableItem) {
            setCartFeedback({ productName: unavailableItem.name, timestamp: Date.now(), kind: 'unavailable' })
            return
          }
          setIsBagOpen(false)
          setCheckoutAfterAuth(true)
        }}
        onExplore={() => {
          const el = document.getElementById('collection-grid')
          if (el) smoothScrollTo(el)
        }}
      /></DeferredMount>

      {/* Razorpay and WhatsApp Checkout Modal */}
      <DeferredMount active={isCheckoutOpen}><CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        isDarkMode={isDarkMode}
        cartItems={cartItems}
        authUser={authUser}
        onOrderSuccess={handleOrderSuccess}
      /></DeferredMount>

      <DeferredMount active={isAuthOpen}><AuthModal
        isOpen={isAuthOpen}
        mode={authMode}
        isDarkMode={isDarkMode}
        onClose={() => { setIsAuthOpen(false); setAuthNotice('') }}
        onModeChange={setAuthMode}
        notice={authNotice}
        onSignupPending={() => {
          try {
            const resumeState: SignupResumeState = {
              activeTab,
              activeCategory,
              cartItems,
              wishlist,
              isDarkMode,
              scrollY: window.scrollY,
              resumeCheckout: checkoutAfterAuth,
              createdAt: Date.now()
            }
            window.localStorage.setItem(signupResumeStorageKey, JSON.stringify(resumeState))
          } catch (error) {
            console.error('Unable to save the page state for email confirmation:', error)
          }
        }}
        onAuthenticated={user => {
          setAuthUser(user)
          setAuthNotice('')
          setIsAuthOpen(false)
        }}
      /></DeferredMount>

      <DeferredMount active={Boolean(authUser && isProfileOpen)}>
        {authUser && <AccountModal
          isOpen={isProfileOpen}
          initialSection={accountInitialSection}
          user={authUser}
          isDarkMode={isDarkMode}
          onClose={() => setIsProfileOpen(false)}
          onProfileUpdated={setAuthUser}
          onOpenWishlist={() => {
            setIsProfileOpen(false)
            setIsWishlistOpen(true)
          }}
          onOpenHelp={() => {
            setIsProfileOpen(false)
            setIsChatbotOpen(true)
          }}
          onLogout={() => { void handleLogout() }}
          onAccountDeleted={handleAccountDeleted}
        />}
      </DeferredMount>

      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, y: 8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.92 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ scale: 1.08, y: -2 }}
            whileTap={{ scale: 0.92 }}
            onClick={handleScrollBackToTop}
            aria-label="Scroll back to top"
            title="Back to top"
            className={`theme-surface fixed bottom-24 right-6 z-50 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-lg backdrop-blur-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#B36D6D] ${
              isDarkMode
                ? 'border-[#493936] bg-[#211B19]/90 text-[#E2B7B0] hover:bg-[#B36D6D] hover:text-white'
                : 'border-[#EAD7CF] bg-white/90 text-[#B36D6D] hover:bg-[#B36D6D] hover:text-white'
            }`}
          >
            <motion.span
              whileHover={{ y: -3 }}
              whileTap={{ y: -5 }}
              transition={{ type: 'spring', stiffness: 360, damping: 18 }}
            >
              <ArrowUp className="h-4 w-4" />
            </motion.span>
          </motion.button>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsChatbotOpen(true)}
        aria-label="Open AUREL Assistant"
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 rounded-full bg-[#B36D6D] p-4 text-white shadow-xl transition-all hover:bg-[#9E5B5B] hover:shadow-2xl"
      >
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-200 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-white" />
        </span>
        <Sparkles className="h-5 w-5 text-white" />
        <span className="hidden font-sans-body text-xs font-semibold uppercase tracking-wider sm:inline">AUREL Assistant</span>
      </motion.button>
      <DeferredMount active={isChatbotOpen}><ChatbotModal
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        onOpen={() => setIsChatbotOpen(true)}
        showLauncher={false}
        isDarkMode={isDarkMode}
        user={authUser}
        isAuthLoaded={isAuthLoaded}
        onNavigateToBuilder={() => setActiveTab('builder')}
      /></DeferredMount>

      {/* Footer */}
      <LazyViewport minHeight={360}>
        <Footer
          isDarkMode={isDarkMode}
          settings={storeSettings}
          onSelectCategory={handleSelectCategory}
          onOpenStory={() => {
            setActiveTab('home')
            setTimeout(() => {
              const el = document.getElementById('our-story')
              if (el) smoothScrollTo(el)
            }, 100)
          }}
          onOpenConcierge={() => {
            setActiveTab('home')
            setTimeout(() => {
              const el = document.getElementById('concierge')
              if (el) smoothScrollTo(el)
            }, 100)
          }}
        />
      </LazyViewport>

    </div>
    </MotionConfig>
  )
}

export default function App() {
  if (typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')) {
    return <React.Suspense fallback={<div className="min-h-screen bg-[#f7f3ef]" />}><AdminApp /></React.Suspense>
  }
  return <StorefrontApp />
}
