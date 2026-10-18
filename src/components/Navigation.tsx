import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Heart, Search, ShoppingBag, Sun, Moon, Menu, Sparkles, UserRound, LogOut, Settings, X } from 'lucide-react'
import { AuthUser, Product } from '../types'
import { AuthMode } from './AuthModal'
import { PRODUCTS } from '../data/products'

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
  onLogout
}) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const searchResults = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return []
    return PRODUCTS.filter(product =>
      [product.name, product.category.replaceAll('-', ' '), product.tagline]
        .some(value => value.toLowerCase().includes(query))
    ).slice(0, 5)
  }, [searchQuery])

  const selectSearchResult = (product: Product) => {
    onSelectProduct(product)
    onSearchChange('')
    setIsSearchOpen(false)
  }

  return (
    <header className={`theme-surface sticky top-0 z-40 backdrop-blur-md border-b ${
      isDarkMode 
        ? 'bg-[#181615]/90 border-[#322A28] text-[#F3EBE6]' 
        : 'bg-[#FAF7F2]/90 border-[#EAD5CD]/60 text-[#2C2523]'
    }`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2 sm:gap-3">
        {/* Left Zone: Menu button & Brand Wordmark */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-4">
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
            className="group flex flex-col items-start text-left"
          >
            <span className="font-serif-title text-xl tracking-[0.16em] font-light transition-opacity duration-300 group-hover:opacity-80 sm:text-3xl sm:tracking-[0.25em]">
              AUREL
            </span>
            <span className="font-editorial text-[10px] tracking-widest text-[#B36D6D] uppercase hidden sm:block">
              Made With Love For You
            </span>
          </button>
        </div>

        {/* Center Zone: Clean editorial text links */}
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap text-[11px] font-medium font-sans-body xl:flex xl:gap-3 xl:text-xs 2xl:gap-3 2xl:text-xs">
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
            <Sparkles className="w-3.5 h-3.5 text-[#B36D6D]" />
            Custom Gift Studio
            {activeTab === 'builder' && (
              <motion.div 
                layoutId="navIndicator" 
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
                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#B36D6D]" 
              />
            )}
          </button>

        </nav>

        {/* Right Zone: Theme Toggle & Animated Bag Button */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-3">
          <motion.div
            layout
            animate={{ width: isSearchOpen ? 'min(14rem, 55vw)' : 36 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className={`relative flex h-9 items-center overflow-visible rounded-full border sm:h-10 ${
              isSearchOpen
                ? isDarkMode ? 'border-[#493936] bg-[#211B19]' : 'border-[#E8D4CB] bg-white'
                : 'border-transparent'
            }`}
          >
            <AnimatePresence initial={false}>
              {isSearchOpen && (
                <motion.form
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: '100%' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.24 }}
                  onSubmit={event => { event.preventDefault(); onSearchSubmit() }}
                  className="absolute inset-y-0 left-0 flex items-center"
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
                    onClick={() => { setIsSearchOpen(false); onSearchChange('') }}
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
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search products"
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors sm:h-10 sm:w-10 ${
                  isDarkMode ? 'text-[#E5D7D0] hover:bg-[#2A2422]' : 'text-[#4A3C38] hover:bg-[#F2E5DF]'
                }`}
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </motion.div>

          {user ? (
            <>
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={onOpenWishlist}
              aria-label={`Open wishlist${wishlistCount ? ` with ${wishlistCount} items` : ''}`}
              className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${
                isSearchOpen ? 'max-sm:hidden' : ''
              } ${
                isDarkMode ? 'bg-[#2A2422] text-[#F3C4B8] hover:bg-[#382E2B]' : 'bg-[#F2E5DF] text-[#8C4F49] hover:bg-[#EAD5CD]'
              }`}
            >
              <Heart className="h-4 w-4" />
              {wishlistCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B36D6D] px-1 text-[9px] font-semibold text-white">
                  {wishlistCount}
                </span>
              )}
            </motion.button>
            <div className={`relative ${isSearchOpen ? 'max-sm:hidden' : ''}`}>
              <button
                onClick={() => setIsProfileOpen(open => !open)}
                aria-expanded={isProfileOpen}
                aria-label="Open profile menu"
                className={`flex max-w-20 items-center gap-2 rounded-full px-2 py-2 text-xs font-medium sm:max-w-44 sm:px-3 ${
                  isDarkMode ? 'bg-[#2A2422] text-[#F3EBE6] hover:bg-[#382E2B]' : 'bg-[#F2E5DF] text-[#5D4640] hover:bg-[#EAD5CD]'
                }`}
              >
                <UserRound className="h-4 w-4 shrink-0 text-[#B36D6D]" />
                <span className="hidden truncate sm:inline">{user.name}</span>
              </button>
              {isProfileOpen && (
                <div className={`absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border p-4 shadow-xl ${
                  isDarkMode ? 'border-[#493936] bg-[#211B19]' : 'border-[#E8D4CB] bg-[#FFFCF9]'
                }`}>
                  <div className="border-b border-black/5 pb-3 dark:border-white/10">
                    <p className="font-serif-title text-lg">Hello, {user.name}</p>
                    <p className="text-xs text-[#8E7973] dark:text-[#A79690]">@{user.username}</p>
                  </div>
                  <dl className="mt-3 space-y-2 text-xs">
                    <div><dt className="text-[#9A8781]">Email</dt><dd className="break-all">{user.email}</dd></div>
                  </dl>
                  <button
                    onClick={() => { setIsProfileOpen(false); onOpenProfile() }}
                    className="mt-3 flex w-full items-center gap-2 rounded-xl bg-[#B36D6D]/10 px-3 py-2.5 text-xs font-semibold text-[#B36D6D] transition-colors hover:bg-[#B36D6D]/15"
                  >
                    <UserRound className="h-4 w-4" /> My Profile
                  </button>
                  <button
                    onClick={() => { setIsProfileOpen(false); onOpenSettings() }}
                    className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors hover:bg-[#B36D6D]/10"
                  >
                    <Settings className="h-4 w-4" /> Settings
                  </button>
                  <button
                    onClick={() => { setIsProfileOpen(false); onLogout() }}
                    className="mt-1 flex w-full items-center gap-2 border-t border-black/5 pt-3 text-xs font-semibold text-[#B36D6D] dark:border-white/10"
                  >
                    <LogOut className="h-4 w-4" /> Logout
                  </button>
                </div>
              )}
            </div>
            </>
          ) : (
            <div className={`flex items-center gap-1 rounded-full border p-1 ${isSearchOpen ? 'max-sm:hidden' : ''} ${
              isDarkMode ? 'border-[#493936] bg-[#211B19]/80' : 'border-[#E8D4CB] bg-white/75'
            }`}>
              <button
                onClick={() => onOpenAuth('login')}
                className={`rounded-full px-1.5 py-1.5 text-[10px] font-semibold transition-colors sm:px-3 sm:py-2 sm:text-xs ${
                  isDarkMode ? 'text-[#E5D7D0] hover:bg-white/5' : 'text-[#6B524C] hover:bg-[#F6EAE5]'
                }`}
              >
                Log in
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="rounded-full bg-[#B36D6D] px-2 py-1.5 text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-[#9E5B5B] sm:px-4 sm:py-2 sm:text-xs"
              >
                <span className="hidden sm:inline">Create account</span>
                <span className="sm:hidden">Join</span>
              </button>
            </div>
          )}

          {/* Theme toggle with smooth rotation */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onToggleTheme}
            aria-label="Toggle light and dark mode"
            className={`rounded-full p-2 transition-colors duration-300 sm:p-2.5 ${isSearchOpen ? 'max-sm:hidden' : ''} ${
              isDarkMode 
                ? 'bg-[#2A2422] text-[#F3C4B8] hover:bg-[#382E2B]' 
                : 'bg-[#F2E5DF] text-[#8C4F49] hover:bg-[#EAD5CD]'
            }`}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </motion.button>

          {/* Bag button with fluid badge count */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onOpenBag}
            aria-label="View shopping bag"
            className={`relative flex items-center gap-1.5 rounded-full px-2 py-2 text-sm font-medium shadow-sm transition-all duration-300 sm:gap-2.5 sm:px-4 sm:py-2.5 ${isSearchOpen ? 'max-sm:hidden' : ''} ${
              isDarkMode
                ? 'bg-[#B36D6D] text-white hover:bg-[#C27979]'
                : 'bg-[#B36D6D] text-white hover:bg-[#9E5B5B]'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="font-sans-body hidden sm:inline text-xs tracking-wider uppercase">Bag</span>
            <motion.span
              key={bagCount}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="bg-white/25 px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums"
            >
              {bagCount}
            </motion.span>
          </motion.button>
        </div>
      </div>
    </header>
  )
}
