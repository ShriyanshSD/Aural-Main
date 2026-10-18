/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { Navigation } from './components/Navigation'
import { Sidebar } from './components/Sidebar'
import { Hero } from './components/Hero'
import { MomentsSection } from './components/MomentsSection'
import { CategoryGrid } from './components/CategoryGrid'
import { ProductCatalog } from './components/ProductCatalog'
import { MagazineShowcase } from './components/MagazineShowcase'
import { CustomGiftBuilder } from './components/CustomGiftBuilder'
import { ProductDetailModal } from './components/ProductDetailModal'
import { CartDrawer } from './components/CartDrawer'
import { WishlistDrawer } from './components/WishlistDrawer'
import { CheckoutModal } from './components/CheckoutModal'
import { AuthModal, AuthMode } from './components/AuthModal'
import { AccountModal } from './components/AccountModal'
import { ChatbotModal } from './components/ChatbotModal'
import { StoryAndReviews } from './components/StoryAndReviews'
import { Footer } from './components/Footer'
import { Product, ProductCategory, CartItem, OrderDetails, FinishType, AuthUser } from './types'
import { PRODUCTS } from './data/products'

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
const getWishlistStorageKey = (userId: string) => `aurel_wishlist_${userId}`
const appTabs = new Set<AppTab>(['home', 'shop', 'builder', 'story', 'contact'])
const productCategories = new Set<ProductCategory>([
  'all', 'magazines', 'hampers', 'bouquets', 'bag-charms', 'desk-buddy',
  'gift-box-hampers', 'god-aasan', 'hair-accessories', 'key-chains',
  'single-flowers', 'custom_builder'
])

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
      || !productCategories.has(state.activeCategory as ProductCategory)
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

export default function App() {
  const [signupResume] = useState(readSignupResumeState)
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(signupResume?.isDarkMode ?? false)

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<AppTab>(signupResume?.activeTab ?? 'home')
  const [activeCategory, setActiveCategory] = useState<ProductCategory>(signupResume?.activeCategory ?? 'all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [isAuthLoaded, setIsAuthLoaded] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [accountInitialSection, setAccountInitialSection] = useState<'profile' | 'settings'>('profile')
  const [authMode, setAuthMode] = useState<AuthMode>('login')
  const [authNotice, setAuthNotice] = useState('')
  const [checkoutAfterAuth, setCheckoutAfterAuth] = useState(signupResume?.resumeCheckout ?? false)

  // Cart & Wishlist state
  const [cartItems, setCartItems] = useState<CartItem[]>(signupResume?.cartItems ?? [])
  const [isBagOpen, setIsBagOpen] = useState(false)
  const [cartFeedback, setCartFeedback] = useState<{ productName: string; timestamp: number } | null>(null)
  const [wishlist, setWishlist] = useState<string[]>(signupResume?.wishlist ?? [])
  const [wishlistOwnerId, setWishlistOwnerId] = useState<string | null>(null)
  const [isWishlistOpen, setIsWishlistOpen] = useState(false)

  // Modals state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false)

  // Sync dark mode class on html/body
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

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
    if (!isAuthLoaded) return
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
      const validProductIds = new Set(PRODUCTS.map(product => product.id))
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
  }, [authUser, isAuthLoaded, signupResume])

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
      document.getElementById('collection-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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

  const handleAddToCart = (item: CartItem) => {
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
    setCartFeedback({ productName: item.name, timestamp: Date.now() })
  }

  const handleQuickAdd = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    const newItem: CartItem = {
      cartId: `${product.id}_${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      finish: product.availableFinishes ? product.availableFinishes[0] : undefined
    }
    handleAddToCart(newItem)
  }

  const handleAddWishlistItemToBag = (product: Product) => {
    setIsWishlistOpen(false)
    handleAddToCart({
      cartId: `${product.id}_${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
      imageUrl: product.imageUrl,
      finish: product.availableFinishes ? product.availableFinishes[0] : undefined
    })
  }

  const handleUpdateQuantity = (cartId: string, delta: number) => {
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
    const magProduct = PRODUCTS.find(p => p.id === 'prod_bday_mag') || PRODUCTS[0]
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
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onOpenBag={() => setIsBagOpen(true)}
        onOpenWishlist={() => setIsWishlistOpen(true)}
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
            document.getElementById('collection-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
            window.scrollTo({ top: 0, behavior: 'smooth' })
          } else if (tab === 'shop') {
            const el = document.getElementById('collection-grid')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          } else if (tab === 'story') {
            const el = document.getElementById('our-story')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          } else if (tab === 'contact') {
            setIsChatbotOpen(true)
            const el = document.getElementById('concierge')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
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
            <span className="font-semibold text-[#B36D6D]">Added to bag</span>
            <span className="ml-2">{cartFeedback.productName}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fluid Sidebar Menu */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isDarkMode={isDarkMode}
        onSelectCategory={handleSelectCategory}
        onOpenCustomBuilder={() => setActiveTab('builder')}
        onOpenStory={() => {
          setActiveTab('story')
          const el = document.getElementById('our-story')
          if (el) el.scrollIntoView({ behavior: 'smooth' })
        }}
        onOpenConcierge={() => {
          setIsChatbotOpen(true)
          const el = document.getElementById('concierge')
          if (el) el.scrollIntoView({ behavior: 'smooth' })
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
      />

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
            <CustomGiftBuilder
              isDarkMode={isDarkMode}
              onClose={() => setActiveTab('home')}
              onAddCustomHamperToBag={handleAddCustomHamperToBag}
            />
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
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }}
                  onCreateMemory={() => setActiveTab('builder')}
                />

                {/* Moments Section */}
                <MomentsSection
                  isDarkMode={isDarkMode}
                  onSelectMoment={handleSelectCategory}
                />

                {/* Visual Categories Grid */}
                <CategoryGrid
                  isDarkMode={isDarkMode}
                  onSelectCategory={handleSelectCategory}
                />
              </>
            )}

            {/* Product Catalog with Sort & Filter Controls */}
            <ProductCatalog
              isDarkMode={isDarkMode}
              activeCategory={activeCategory}
              onSelectCategory={setActiveCategory}
              onSelectProduct={(prod) => setSelectedProduct(prod)}
              onQuickAdd={handleQuickAdd}
              wishlist={wishlist}
              onToggleWishlist={handleToggleWishlist}
              searchQuery={searchQuery}
              isAuthenticated={Boolean(authUser)}
            />

            {activeCategory !== 'hair-accessories' && (
              <>
                {/* Magazine Feature Section with Live Preview */}
                <MagazineShowcase
                  isDarkMode={isDarkMode}
                  onCustomizeMagazine={handleCustomizeMagazine}
                />

                {/* Trust, Story, Testimonials & Concierge Support */}
                <StoryAndReviews
                  isDarkMode={isDarkMode}
                  onExploreGifts={() => {
                    const el = document.getElementById('collection-grid')
                    if (el) el.scrollIntoView({ behavior: 'smooth' })
                  }}
                />
              </>
            )}
          </motion.main>
        )}
      </AnimatePresence>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        isDarkMode={isDarkMode}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        isWishlisted={selectedProduct ? wishlist.includes(selectedProduct.id) : false}
        onToggleWishlist={handleToggleWishlist}
        isAuthenticated={Boolean(authUser)}
      />

      <WishlistDrawer
        isOpen={isWishlistOpen && Boolean(authUser)}
        isDarkMode={isDarkMode}
        products={PRODUCTS.filter(product => wishlist.includes(product.id))}
        onClose={() => setIsWishlistOpen(false)}
        onRemove={productId => setWishlist(current => current.filter(id => id !== productId))}
        onAddToBag={handleAddWishlistItemToBag}
        onOpenBag={() => {
          setIsWishlistOpen(false)
          setIsBagOpen(true)
        }}
      />

      {/* Sliding Cart Drawer */}
      <CartDrawer
        isOpen={isBagOpen}
        onClose={() => setIsBagOpen(false)}
        isDarkMode={isDarkMode}
        cartItems={cartItems}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveCartItem}
        onProceedToCheckout={() => {
          setIsBagOpen(false)
          setCheckoutAfterAuth(true)
        }}
        onExplore={() => {
          const el = document.getElementById('collection-grid')
          if (el) el.scrollIntoView({ behavior: 'smooth' })
        }}
      />

      {/* Razorpay and WhatsApp Checkout Modal */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        isDarkMode={isDarkMode}
        cartItems={cartItems}
        authUser={authUser}
        onOrderSuccess={handleOrderSuccess}
      />

      <AuthModal
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
      />

      {authUser && (
        <AccountModal
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
        />
      )}

      {/* AUREL Assistant */}
      <ChatbotModal
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        onOpen={() => setIsChatbotOpen(true)}
        isDarkMode={isDarkMode}
        user={authUser}
        isAuthLoaded={isAuthLoaded}
        onNavigateToBuilder={() => setActiveTab('builder')}
      />

      {/* Footer */}
      <Footer
        isDarkMode={isDarkMode}
        onSelectCategory={handleSelectCategory}
        onOpenStory={() => {
          setActiveTab('home')
          setTimeout(() => {
            const el = document.getElementById('our-story')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }}
        onOpenConcierge={() => {
          setActiveTab('home')
          setTimeout(() => {
            const el = document.getElementById('concierge')
            if (el) el.scrollIntoView({ behavior: 'smooth' })
          }, 100)
        }}
      />

    </div>
    </MotionConfig>
  )
}
