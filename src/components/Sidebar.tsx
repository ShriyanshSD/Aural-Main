import React from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { X, Sparkles, BookOpen, Gift, Flower2, Heart, Layers, ArrowRight, UserRound, LogOut } from 'lucide-react'
import { ProductCategory } from '../types'
import { AuthUser } from '../types'
import { AuthMode } from './AuthModal'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode: boolean
  onSelectCategory: (category: ProductCategory) => void
  onOpenCustomBuilder: () => void
  onOpenStory: () => void
  onOpenConcierge: () => void
  onOpenChatbot: () => void
  activeCategory: ProductCategory
  user: AuthUser | null
  onOpenAuth: (mode: AuthMode) => void
  onLogout: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  onSelectCategory,
  onOpenCustomBuilder,
  onOpenStory,
  onOpenConcierge,
  onOpenChatbot,
  activeCategory,
  user,
  onOpenAuth,
  onLogout
}) => {
  const menuCategories = [
    {
      id: 'magazines' as ProductCategory,
      label: 'Custom Magazines',
      subtext: 'Anniversary and birthday editions in matte and gloss finish',
      icon: BookOpen,
      badge: 'Popular'
    },
    {
      id: 'hampers' as ProductCategory,
      label: 'Customized Gift Hampers',
      subtext: 'Thoughtful collections packaged in silk and linen chests',
      icon: Gift,
      badge: 'Curated'
    },
    {
      id: 'gift-box-hampers' as ProductCategory,
      label: 'Gift Box Hampers',
      subtext: 'Premium gifting boxes curated with florals and keepsakes',
      icon: Gift,
      badge: 'New'
    },
    {
      id: 'bag-charms' as ProductCategory,
      label: 'Bag Charms',
      subtext: 'Small daily keepsakes made to bring charm to every outing',
      icon: Sparkles,
      badge: 'Daily'
    },
    {
      id: 'bouquets' as ProductCategory,
      label: 'Luxury Bouquets',
      subtext: 'Fresh garden blush roses peonies and fragrant foliage',
      icon: Flower2,
      badge: 'Fresh'
    },
    {
      id: 'single-flowers' as ProductCategory,
      label: 'Single Flowers',
      subtext: 'Preserved eternal blooms in keepsake presentation',
      icon: Flower2,
      badge: 'Timeless'
    },
    {
      id: 'desk-buddy' as ProductCategory,
      label: 'Desk Buddy',
      subtext: 'Thoughtful desk accents with a warm personal touch',
      icon: Layers,
      badge: 'Desk'
    },
    {
      id: 'god-aasan' as ProductCategory,
      label: 'God Aasan',
      subtext: 'Sacred and graceful devotional pieces for mindful gifting',
      icon: Sparkles,
      badge: 'Sacred'
    },
    {
      id: 'hair-accessories' as ProductCategory,
      label: 'Hair Accessories',
      subtext: 'Elegant hairbands clutches and pins made to shine',
      icon: Heart,
      badge: 'Shine'
    },
    {
      id: 'key-chains' as ProductCategory,
      label: 'Key Chains',
      subtext: 'Compact keepsakes to carry joy wherever you go',
      icon: Layers,
      badge: 'Carry'
    },
  ]

  return (
    <MotionConfig reducedMotion="never">
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Fluid Backdrop Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.72, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
          />

          {/* Fluid Sliding Panel */}
          <motion.aside
            initial={{ x: '-100%', opacity: 0.96 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '-100%', opacity: 0.98 }}
            transition={{
              x: { duration: 0.82, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 0.48, ease: 'easeOut' }
            }}
            className={`theme-surface fixed top-0 bottom-0 left-0 z-50 w-full max-w-md shadow-2xl flex flex-col justify-between overflow-y-auto will-change-transform ${
              isDarkMode 
                ? 'bg-[#1C1817] text-[#F5ECE8] border-r border-[#342A27]' 
                : 'bg-[#FAF6F2] text-[#2C2422] border-r border-[#E8D6CF]'
            }`}
          >
            {/* Header with Brand and Close */}
            <div className="p-6 sm:p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div>
                <span className="font-serif-title text-2xl tracking-[0.2em] font-light">
                  AUREL
                </span>
                <p className="font-editorial text-xs text-[#B36D6D] tracking-wider mt-0.5">
                  Made With Love For You
                </p>
              </div>

              <motion.button
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                aria-label="Close navigation sidebar"
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode 
                    ? 'hover:bg-[#2A2321] text-[#E0D2CB]' 
                    : 'hover:bg-[#F0E2DC] text-[#4A3B37]'
                }`}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            <div className={`border-b px-6 py-4 sm:px-8 ${
              isDarkMode ? 'border-[#342A27] bg-[#211B19]' : 'border-[#E8D6CF] bg-[#F5EAE5]'
            }`}>
              {user ? (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="rounded-full bg-[#B36D6D]/15 p-2 text-[#B36D6D]"><UserRound className="h-4 w-4" /></span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.name}</p>
                      <p className="truncate text-xs text-[#8E7973] dark:text-[#A79690]">{user.email}</p>
                    </div>
                  </div>
                  <button onClick={onLogout} aria-label="Sign out" className="rounded-full p-2 text-[#B36D6D] hover:bg-[#B36D6D]/10">
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <p className="mb-3 font-serif-title text-base">Your AUREL account</p>
                  <div className="flex gap-2">
                    <button onClick={() => { onOpenAuth('login'); onClose() }} className="flex-1 rounded-full border border-[#B36D6D] px-3 py-2 text-xs font-semibold text-[#B36D6D] hover:bg-[#B36D6D]/10">
                      Log in
                    </button>
                    <button onClick={() => { onOpenAuth('signup'); onClose() }} className="flex-1 rounded-full bg-[#B36D6D] px-3 py-2 text-xs font-semibold text-white hover:bg-[#9E5B5B]">
                      Sign up
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content List */}
            <div className="p-6 sm:p-8 space-y-6 flex-1">
              {/* Highlighted Mix & Match Custom Gift Builder Card */}
              <div 
                onClick={() => {
                  onOpenCustomBuilder()
                  onClose()
                }}
                className={`p-5 rounded-2xl cursor-pointer border transition-all duration-300 relative overflow-hidden group ${
                  isDarkMode
                    ? 'bg-[#261E1D] border-[#4A3835] hover:border-[#B36D6D]'
                    : 'bg-[#F4E8E3] border-[#E5CEC5] hover:border-[#B36D6D]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-[#B36D6D] text-white">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-serif-title text-base font-medium tracking-wide">
                        Mix & Match Studio
                      </h4>
                      <span className="text-[11px] text-[#B36D6D] uppercase tracking-wider font-semibold">
                        Custom Gift Creator
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#B36D6D] transform transition-transform group-hover:translate-x-1" />
                </div>
                <p className="font-sans-body text-xs text-[#7A6762] dark:text-[#BAA7A1] mt-3 leading-relaxed">
                  Combine individual floral stems artisanal candles chocolates and personalized magazines into your custom bespoke hamper
                </p>
              </div>

              {/* Main Categories Navigation */}
              <div>
                <h3 className="font-editorial text-xs uppercase tracking-widest text-[#B36D6D] mb-3 px-1 font-semibold">
                  Bespoke Offerings
                </h3>
                <div className="space-y-1.5">
                  {menuCategories.map((cat) => {
                    const Icon = cat.icon
                    const isSelected = activeCategory === cat.id

                    return (
                      <motion.button
                        key={cat.id}
                        whileHover={{ x: 4 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          onSelectCategory(cat.id)
                          onClose()
                        }}
                        className={`w-full text-left p-3.5 rounded-xl transition-all flex items-center justify-between group ${
                          isSelected
                            ? isDarkMode ? 'bg-[#2E2422] text-[#F5C2B6]' : 'bg-[#EEDCD5] text-[#85453E]'
                            : isDarkMode ? 'hover:bg-[#251E1C]' : 'hover:bg-[#F2E5DF]'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <span className={`p-2 rounded-lg transition-colors ${
                            isSelected 
                              ? 'bg-[#B36D6D] text-white' 
                              : isDarkMode ? 'bg-[#2A2220] text-[#D2C2BC]' : 'bg-[#EBE0DB] text-[#63504A]'
                          }`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="font-serif-title text-sm font-medium tracking-wide">
                              {cat.label}
                            </div>
                            <div className="font-sans-body text-[11px] text-[#8E7973] dark:text-[#A89690] line-clamp-1 mt-0.5">
                              {cat.subtext}
                            </div>
                          </div>
                        </div>

                        <span className="text-[10px] tracking-wider uppercase font-semibold text-[#B36D6D] px-2 py-0.5 rounded-full bg-[#B36D6D]/10">
                          {cat.badge}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="pt-2 border-t border-black/5 dark:border-white/5 space-y-1">
                <button
                  onClick={() => {
                    onOpenChatbot()
                    onClose()
                  }}
                  className={`w-full text-left py-2 px-3 text-xs tracking-wider uppercase transition-colors rounded-lg flex items-center justify-between text-[#B36D6D] font-medium ${
                    isDarkMode ? 'hover:bg-[#261E1D]' : 'hover:bg-[#F0E2DC]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Concierge Chatbot</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#B36D6D]" />
                </button>

                <button
                  onClick={() => {
                    onOpenStory()
                    onClose()
                  }}
                  className={`w-full text-left py-2 px-3 text-xs tracking-wider uppercase transition-colors rounded-lg flex items-center justify-between ${
                    isDarkMode ? 'hover:bg-[#261E1D] text-[#CBB9B2]' : 'hover:bg-[#F0E2DC] text-[#695650]'
                  }`}
                >
                  <span>Our Craft & Philosophy</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#B36D6D]" />
                </button>

                <button
                  onClick={() => {
                    onOpenConcierge()
                    onClose()
                  }}
                  className={`w-full text-left py-2 px-3 text-xs tracking-wider uppercase transition-colors rounded-lg flex items-center justify-between ${
                    isDarkMode ? 'hover:bg-[#261E1D] text-[#CBB9B2]' : 'hover:bg-[#F0E2DC] text-[#695650]'
                  }`}
                >
                  <span>Concierge & Support</span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#B36D6D]" />
                </button>
              </div>
            </div>

            {/* Footer Note */}
            <div className="p-6 border-t border-black/5 dark:border-white/5 text-center">
              <p className="font-serif-title text-xs tracking-widest text-[#B36D6D]">
                AUREL BESPOKE ARCHIVE
              </p>
              <p className="font-sans-body text-[11px] text-[#917E79] dark:text-[#A18F89] mt-1">
                Made for your people · Made for your moments
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    </MotionConfig>
  )
}
