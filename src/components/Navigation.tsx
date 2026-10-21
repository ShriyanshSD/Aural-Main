import React, { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { Heart, Search, ShoppingBag, Sun, Moon, Menu, Sparkles, UserRound, LogOut, Settings, X } from 'lucide-react'
import { AuthUser, Product, StoreSettings } from '../types'
import { AuthMode } from './AuthModal'

interface NavigationProps {
  isDarkMode: boolean
  onToggleTheme: () => void
  onOpenSidebar: () => void
  onOpenBag: () => void
  onOpenWishlist: () => void
  bagCount: number
  wishlistCount: number
  searchQuery: string
  onSearchChange: (query: string) => void
  onSearchSubmit: () => void
  onSelectProduct: (product: Product) => void
  activeTab: string
  onSelectTab: (tab: string) => void
  onOpenBuilder: () => void
  user: AuthUser | null
  onOpenAuth: (mode: AuthMode) => void
  onOpenProfile: () => void
  onOpenSettings: () => void
  onLogout: () => void
  products: Product[]
  settings: StoreSettings
}

interface WishlistActionProps {
  isDarkMode: boolean
  wishlistCount: number
  onOpenWishlist: () => void
}

const CountPulseIcon: React.FC<{
  count: number
  className: string
  children: React.ReactNode
}> = ({ count, className, children }) => {
  const previousCount = useRef(count)
  const [pulseKey, setPulseKey] = useState(0)

  useEffect(() => {
    if (count > previousCount.current) {
      setPulseKey(key => key + 1)
    }
    previousCount.current = count
  }, [count])

  return (
    <span
      key={pulseKey}
      className={`${className}${pulseKey > 0 ? ' compact-count-pulse' : ''}`}
    >
      {children}
    </span>
  )
}

const WishlistAction: React.FC<WishlistActionProps> = ({ isDarkMode, wishlistCount, onOpenWishlist }) => {
  return (
    <button
      type="button"
      onClick={onOpenWishlist}
      aria-label={`Open wishlist${wishlistCount ? ` with ${wishlistCount} items` : ''}`}
      className={`wishlist-expand group relative flex h-10 shrink-0 items-center justify-center overflow-hidden rounded-full ${
        isDarkMode ? 'bg-[#2A2422] text-[#F3C4B8] hover:bg-[#382E2B]' : 'bg-[#F2E5DF] text-[#8C4F49] hover:bg-[#EAD5CD]'
      }`}
    >
      <CountPulseIcon count={wishlistCount} className={`wishlist-heart shrink-0 ${wishlistCount > 0 ? 'is-wishlisted' : ''}`}>
        <Heart className={`h-4 w-4 ${wishlistCount > 0 ? 'fill-current' : ''}`} />
      </CountPulseIcon>
      <span
        className="wishlist-label overflow-hidden whitespace-nowrap text-xs font-medium"
      >
        Wishlist
      </span>
      {wishlistCount > 0 && (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B36D6D] px-1 text-[9px] font-semibold text-white">
          {wishlistCount}
        </span>
      )}
    </button>
  )
}

export const Navigation: React.FC<NavigationProps> = ({
  isDarkMode,
  onToggleTheme,
  onOpenSidebar,
  onOpenBag,
  onOpenWishlist,
  bagCount,
  wishlistCount,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onSelectProduct,
  activeTab,
  onSelectTab,
  onOpenBuilder,
  user,
  onOpenAuth,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  products,
  settings
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isCompactProfileOpen, setIsCompactProfileOpen] = useState(false)
  const profileMenuRef = useRef<HTMLDivElement>(null)
  const compactProfileMenuRef = useRef<HTMLDivElement>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSearchHovered, setIsSearchHovered] = useState(false)
  const [isHeaderHidden, setIsHeaderHidden] = useState(() => window.scrollY > 24)
  useEffect(() => {
    const handleScroll = () => {
      setIsHeaderHidden(window.scrollY > 24)
      setIsProfileOpen(false)
      setIsCompactProfileOpen(false)
    }

    const handleOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (profileMenuRef.current?.contains(target) || compactProfileMenuRef.current?.contains(target)) return
      setIsProfileOpen(false)
      setIsCompactProfileOpen(false)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('pointerdown', handleOutsidePointerDown)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.removeEventListener('pointerdown', handleOutsidePointerDown)
    }
  }, [])

  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    return products.filter(product =>
      [product.name, product.category.replaceAll('-', ' '), product.tagline]
        .some(value => value.toLowerCase().includes(query))
    ).slice(0, 5)
  }, [products, searchQuery])

  const selectSearchResult = (product: Product) => {
    onSelectProduct(product)
    setIsSearchOpen(false)
    setIsSearchHovered(false)
    onSearchChange('')
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    setIsSearchHovered(false)
    onSearchChange('')
  }

  const renderSearchControl = () => (
    <div
      onMouseEnter={() => setIsSearchHovered(true)}
      onMouseLeave={() => setIsSearchHovered(false)}
      className={`top-search-control relative flex h-10 items-center overflow-visible rounded-full ${
        isSearchOpen ? 'top-search-open' : isSearchHovered ? 'top-search-hovered' : ''
      }`}
    >
      <AnimatePresence initial={false}>
        {isSearchOpen && (
          <motion.form
            key="search-form"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scaleX: 0.9 }}
            transition={{
              opacity: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
              scaleX: { duration: 0.55, ease: [0.4, 0, 0.2, 1] }
            }}
            style={{ transformOrigin: 'left center' }}
            onSubmit={event => { event.preventDefault(); onSearchSubmit() }}
            className={`absolute inset-0 flex items-center rounded-full ${
              isDarkMode ? 'bg-[#211B19]' : 'bg-white'
            }`}
          >
            <input
              autoFocus
              type="search"
              value={searchQuery}
              onChange={event => onSearchChange(event.target.value)}
              placeholder="Search gifts..."
              aria-label="Search products"
              className={`h-full w-full rounded-full bg-transparent pl-4 pr-10 text-xs outline-none ${
                isDarkMode ? 'text-[#F3EBE6] placeholder:text-[#A7958F]' : 'text-[#2C2523] placeholder:text-[#96827C]'
              }`}
            />
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close product search"
              className="absolute right-2 rounded-full p-1 text-[#96827C] hover:text-[#B36D6D]"
            >
              <X className="h-4 w-4" />
            </button>
            {searchQuery.trim() && (
              <div className={`absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border p-1 shadow-xl ${
                isDarkMode ? 'border-[#493936] bg-[#211B19]' : 'border-[#E8D4CB] bg-[#FFFCF9]'
              }`}>
                {searchResults.length ? searchResults.map(product => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => selectSearchResult(product)}
                    className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[#B36D6D]/10"
                  >
                    <img
                      src={product.imageUrl}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-10 w-10 shrink-0 rounded-lg object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium">{product.name}</span>
                      <span className="block truncate text-[10px] text-[#96827C]">
                        {product.price > 0 ? `₹${product.price.toLocaleString('en-IN')}` : 'Price on request'}
                      </span>
                    </span>
                  </button>
                )) : (
                  <p className="px-3 py-4 text-center text-xs text-[#96827C]">No matching gifts found.</p>
                )}
                <button
                  type="submit"
                  className="w-full rounded-xl px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-[#B36D6D] hover:bg-[#B36D6D]/10"
                >
                  See all matching gifts
                </button>
              </div>
            )}
          </motion.form>
        )}
      </AnimatePresence>
      {!isSearchOpen && (
        <motion.button
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.32, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Search products"
          className={`top-search-trigger flex h-10 w-full shrink-0 items-center justify-center rounded-full transition-colors ${
            isDarkMode ? 'text-[#E5D7D0] hover:bg-[#2A2422]' : 'text-[#4A3C38] hover:bg-[#F2E5DF]'
          }`}
        >
          <Search className="top-search-icon h-4 w-4 shrink-0" />
          <span className="top-search-label">Search</span>
        </motion.button>
      )}
    </div>
  )

  const renderBagButton = () => (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={onOpenBag}
      aria-label={`View shopping bag${bagCount ? ` with ${bagCount} items` : ''}`}
      className={`compact-action-expand compact-action-bag relative flex shrink-0 items-center justify-center rounded-full transition-colors ${
        isDarkMode ? 'bg-[#2A2422] text-[#F3EBE6] hover:bg-[#382E2B]' : 'bg-[#F2E5DF] text-[#5D4640] hover:bg-[#EAD5CD]'
      }`}
    >
      <CountPulseIcon
        count={bagCount}
        className="compact-action-icon"
      >
        <ShoppingBag className="h-4 w-4" />
      </CountPulseIcon>
      <span className="compact-action-label">Bag</span>
      {bagCount > 0 && (
        <motion.span
          key={bagCount}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B36D6D] px-1 text-[9px] font-semibold text-white"
        >
          {bagCount}
        </motion.span>
      )}
    </motion.button>
  )

  const renderAccountMenu = (compact = false) => {
    const setMenuOpen = compact ? setIsCompactProfileOpen : setIsProfileOpen

    return (
    <div ref={compact ? compactProfileMenuRef : profileMenuRef} className="relative">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => (compact ? setIsCompactProfileOpen : setIsProfileOpen)(open => !open)}
        aria-expanded={compact ? isCompactProfileOpen : isProfileOpen}
        aria-label={user ? 'Open profile menu' : 'Open account menu'}
        className={`compact-action-expand compact-action-account relative flex shrink-0 items-center justify-center overflow-hidden rounded-full transition-colors ${
          isDarkMode ? 'bg-[#2A2422] text-[#F3EBE6] hover:bg-[#382E2B]' : 'bg-[#F2E5DF] text-[#5D4640] hover:bg-[#EAD5CD]'
        }`}
      >
        <span className={`compact-action-icon ${compact ? 'compact-action-icon-compact h-4 w-4' : 'h-8 w-8 rounded-full'} flex items-center justify-center text-xs font-semibold ${
          compact
            ? 'text-[#B36D6D]'
            : isDarkMode ? 'bg-[#493936] text-[#F3EBE6]' : 'bg-[#EAD5CD] text-[#6B524C]'
        }`}>
          {user ? user.name.trim().charAt(0).toUpperCase() : <UserRound className="h-4 w-4 text-[#B36D6D]" />}
        </span>
        <span className="compact-action-label">Account</span>
      </motion.button>
      <AnimatePresence>
        {(compact ? isCompactProfileOpen : isProfileOpen) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute right-0 top-full z-50 mt-3 w-72 origin-top-right rounded-2xl border p-4 shadow-xl ${
              isDarkMode ? 'border-[#493936] bg-[#211B19]' : 'border-[#E8D4CB] bg-[#FFFCF9]'
            }`}
          >
            {user ? (
              <>
                <div className="border-b border-black/5 pb-3 dark:border-white/10">
                  <p className="font-serif-title text-lg">Hello, {user.name}</p>
                  <p className="text-xs text-[#8E7973] dark:text-[#A79690]">@{user.username}</p>
                </div>
                <dl className="mt-3 space-y-2 text-xs">
                  <div><dt className="text-[#9A8781]">Email</dt><dd className="break-all">{user.email}</dd></div>
                </dl>
                <button
                  onClick={() => { setMenuOpen(false); onOpenProfile() }}
                  className="mt-3 flex w-full items-center gap-2 rounded-xl bg-[#B36D6D]/10 px-3 py-2.5 text-xs font-semibold text-[#B36D6D] transition-colors hover:bg-[#B36D6D]/15"
                >
                  <UserRound className="h-4 w-4" /> My Profile
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onOpenSettings() }}
                  className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-[#B36D6D]/10"
                >
                  <Settings className="h-4 w-4" /> Settings
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onLogout() }}
                  className="mt-1 flex w-full items-center gap-2 border-t border-black/5 pt-3 text-xs font-semibold text-[#B36D6D] dark:border-white/10"
                >
                  <LogOut className="h-4 w-4" /> Logout
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <p className="px-2 pb-1 font-serif-title text-base">Your AUREL account</p>
                <button
                  onClick={() => { setMenuOpen(false); onOpenAuth('signup') }}
                  className="w-full rounded-xl bg-[#B36D6D] px-3 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#9E5B5B]"
                >
                  Create account
                </button>
                <button
                  onClick={() => { setMenuOpen(false); onOpenAuth('login') }}
                  className={`w-full rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                    isDarkMode ? 'text-[#E5D7D0] hover:bg-white/5' : 'text-[#6B524C] hover:bg-[#F6EAE5]'
                  }`}
                >
                  Sign in
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    )
  }

  return (
    <>
    <div aria-hidden="true" className="h-[4.5rem] lg:h-32" />
    <header className={`nav-hide-reveal theme-surface fixed inset-x-0 top-0 z-40 px-2 pb-3 transition-transform duration-700 ease-in-out sm:px-6 lg:px-8 ${
      isHeaderHidden ? 'pointer-events-none -translate-y-full' : 'translate-y-0'
    }`}>
      <div className="mx-auto max-w-7xl">
        <div className="relative">
          {!isHeaderHidden && (
            <motion.div
              aria-hidden="true"
              className={`absolute inset-x-0 top-0 h-14 rounded-full border shadow-lg backdrop-blur-xl transition-colors duration-500 ${
                isDarkMode
                  ? 'border-white/10 bg-[#211B19]/65 shadow-black/10'
                  : 'border-white/60 bg-white/55 shadow-[#6B524C]/10'
              }`}
            />
          )}
          <div className="relative z-30 flex h-14 items-center justify-between gap-2 px-2 sm:px-4">
          <button
            onClick={onOpenSidebar}
            aria-label="Open sidebar menu"
            className={`rounded-full p-2 transition-all duration-300 flex items-center gap-2 text-sm font-medium sm:p-2.5 ${
              isDarkMode 
                ? 'hover:bg-[#2A2422] text-[#E5D7D0]' 
                : 'hover:bg-[#F2E5DF] text-[#4A3C38]'
            }`}
          >
            <Menu className="w-5 h-5" />
            <span className="hidden sm:inline font-sans-body tracking-wider text-xs uppercase">Menu</span>
          </button>

          <button
            onClick={() => onSelectTab('home')}
            aria-label="AUREL home"
            className="absolute left-1/2 flex h-10 w-16 -translate-x-1/2 items-center justify-center sm:h-[3.25rem] sm:w-[100px]"
          >
            {isDarkMode ? (
              <span className="brand-logo-salmon h-full w-full" role="img" aria-label="AUREL" />
            ) : (
              <img
                src="/aurel-logo.png"
                alt="AUREL"
                className="h-full w-full object-contain transition-opacity duration-300 hover:opacity-80"
              />
            )}
          </button>

        {/* Search and primary quick actions */}
        <div className="mobile-header-actions flex shrink-0 items-center gap-0.5 sm:gap-3">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onToggleTheme}
            aria-label="Toggle light and dark mode"
            className={`hidden h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300 sm:flex ${
              isDarkMode
                ? 'bg-[#2A2422] text-[#F3C4B8] hover:bg-[#382E2B]'
                : 'bg-[#F2E5DF] text-[#8C4F49] hover:bg-[#EAD5CD]'
            }`}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </motion.button>
          <div className="flex shrink-0 items-center gap-0 sm:gap-2">
            <WishlistAction isDarkMode={isDarkMode} wishlistCount={wishlistCount} onOpenWishlist={onOpenWishlist} />
            {renderBagButton()}
            {renderAccountMenu()}
          </div>
        </div>
        </div>

        {/* Center Zone: Clean editorial text links */}
        <div className="relative mt-2 flex min-h-11 items-center justify-start lg:justify-center">
          <div className={`mobile-search-actions absolute right-0 z-20 flex items-center gap-1 transition-opacity duration-200 lg:left-[calc(50%+17rem)] lg:right-auto ${
            isProfileOpen ? 'pointer-events-none opacity-0' : 'opacity-100'
          }`}>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onToggleTheme}
              aria-label="Toggle light and dark mode"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors duration-300 sm:hidden ${
                isDarkMode
                  ? 'bg-[#2A2422] text-[#F3C4B8] hover:bg-[#382E2B]'
                  : 'bg-[#F2E5DF] text-[#8C4F49] hover:bg-[#EAD5CD]'
              }`}
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.button>
            {renderSearchControl()}
          </div>
          <MotionConfig reducedMotion="never">
            <nav className={`mobile-nav-scroll flex w-[calc(100%-10rem)] min-w-0 items-center justify-start gap-5 overflow-x-auto whitespace-nowrap rounded-full border px-4 py-2.5 text-[11px] font-medium font-sans-body shadow-md backdrop-blur-xl transition-colors duration-500 sm:w-[calc(100%-6rem)] lg:w-fit lg:min-w-[28rem] lg:justify-center lg:gap-6 lg:overflow-visible lg:px-8 ${
              isDarkMode
                ? 'border-white/10 bg-[#211B19]/65 text-[#F3EBE6] shadow-black/10'
                : 'border-white/60 bg-white/55 text-[#2C2523] shadow-[#6B524C]/10'
            }`}>
          <button
            onClick={() => onSelectTab('home')}
            className={`relative whitespace-nowrap py-1 transition-colors ${
              activeTab === 'home'
                ? 'text-[#B36D6D] font-semibold'
                : isDarkMode ? 'text-[#C7B7AF] hover:text-white' : 'text-[#6B5A55] hover:text-[#2C2523]'
            }`}
          >
            Home
            {activeTab === 'home' && (
              <motion.div
                layoutId="navIndicator"
                transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 1.15 }}
                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#B36D6D]"
              />
            )}
          </button>
          <button
            onClick={() => onSelectTab('shop')}
            className={`relative whitespace-nowrap py-1 transition-colors ${
              activeTab === 'shop'
                ? 'text-[#B36D6D] font-semibold'
                : isDarkMode ? 'text-[#C7B7AF] hover:text-white' : 'text-[#6B5A55] hover:text-[#2C2523]'
            }`}
          >
            Collection
            {activeTab === 'shop' && (
              <motion.div
                layoutId="navIndicator"
                transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 1.15 }}
                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#B36D6D]"
              />
            )}
          </button>
          <button
            onClick={onOpenBuilder}
            className={`relative flex items-center gap-1.5 whitespace-nowrap py-1 transition-colors ${
              activeTab === 'builder'
                ? 'text-[#B36D6D] font-semibold'
                : isDarkMode ? 'text-[#C7B7AF] hover:text-white' : 'text-[#6B5A55] hover:text-[#2C2523]'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-[#B36D6D]" />
            Custom Gift Studio
            {activeTab === 'builder' && (
              <motion.div
                layoutId="navIndicator"
                transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 1.15 }}
                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#B36D6D]"
              />
            )}
          </button>
          <button
            onClick={() => onSelectTab('story')}
            className={`relative whitespace-nowrap py-1 transition-colors ${
              activeTab === 'story'
                ? 'text-[#B36D6D] font-semibold'
                : isDarkMode ? 'text-[#C7B7AF] hover:text-white' : 'text-[#6B5A55] hover:text-[#2C2523]'
            }`}
          >
            Our Story
            {activeTab === 'story' && (
              <motion.div
                layoutId="navIndicator"
                transition={{ type: 'spring', stiffness: 180, damping: 24, mass: 1.15 }}
                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#B36D6D]"
              />
            )}
          </button>
            </nav>
          </MotionConfig>
        </div>
      </div>
      </div>
    </header>
    <div
      className={`compact-nav-glass compact-nav-vertical fixed right-4 top-4 z-50 flex flex-col items-end gap-2.5 rounded-full border sm:right-5 sm:top-5 ${
        isDarkMode ? 'compact-nav-glass-dark' : 'compact-nav-glass-light'
      } ${isHeaderHidden ? 'compact-nav-visible' : 'compact-nav-hidden'}`}
      aria-hidden={!isHeaderHidden}
    >
      <div className="compact-nav-actions relative z-10 flex flex-col items-end gap-2.5">
        <div className="compact-nav-action-item compact-nav-wishlist">
          <WishlistAction isDarkMode={isDarkMode} wishlistCount={wishlistCount} onOpenWishlist={onOpenWishlist} />
        </div>
        <div className="compact-nav-action-item compact-nav-bag">
          {renderBagButton()}
        </div>
      </div>
    </div>
    </>
  )
}
