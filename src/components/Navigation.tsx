import React from 'react'
import { motion } from 'motion/react'
import { ShoppingBag, Sun, Moon, Menu, Sparkles, Heart } from 'lucide-react'

interface NavigationProps {
  isDarkMode: boolean
  onToggleTheme: () => void
  onOpenSidebar: () => void
  onOpenBag: () => void
  onOpenChatbot: () => void
  bagCount: number
  activeTab: string
  onSelectTab: (tab: string) => void
  onOpenBuilder: () => void
}

export const Navigation: React.FC<NavigationProps> = ({
  isDarkMode,
  onToggleTheme,
  onOpenSidebar,
  onOpenBag,
  onOpenChatbot,
  bagCount,
  activeTab,
  onSelectTab,
  onOpenBuilder
}) => {
  return (
    <header className={`sticky top-0 z-40 transition-colors duration-500 backdrop-blur-md border-b ${
      isDarkMode 
        ? 'bg-[#181615]/90 border-[#322A28] text-[#F3EBE6]' 
        : 'bg-[#FAF7F2]/90 border-[#EAD5CD]/60 text-[#2C2523]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Left Zone: Menu button & Brand Wordmark */}
        <div className="flex items-center gap-4">
          <button
            onClick={onOpenSidebar}
            aria-label="Open sidebar menu"
            className={`p-2.5 rounded-full transition-all duration-300 flex items-center gap-2 text-sm font-medium ${
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
            <span className="font-serif-title text-2xl sm:text-3xl tracking-[0.25em] font-light transition-opacity duration-300 group-hover:opacity-80">
              AUREL
            </span>
            <span className="font-editorial text-[10px] tracking-widest text-[#B36D6D] uppercase hidden sm:block">
              Made With Love For You
            </span>
          </button>
        </div>

        {/* Center Zone: Clean editorial text links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium font-sans-body">
          <button
            onClick={() => onSelectTab('home')}
            className={`transition-colors py-1 relative ${
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
            className={`transition-colors py-1 relative ${
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
            className={`transition-colors py-1 relative flex items-center gap-1.5 ${
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
            className={`transition-colors py-1 relative ${
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

          <button
            onClick={() => onSelectTab('contact')}
            className={`transition-colors py-1 relative ${
              activeTab === 'contact'
                ? 'text-[#B36D6D] font-semibold'
                : isDarkMode ? 'text-[#C7B7AF] hover:text-white' : 'text-[#6B5A55] hover:text-[#2C2523]'
            }`}
          >
            Concierge
            {activeTab === 'contact' && (
              <motion.div 
                layoutId="navIndicator" 
                className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-[#B36D6D]" 
              />
            )}
          </button>
        </nav>

        {/* Right Zone: Theme Toggle & Animated Bag Button */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* AI Concierge quick trigger */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onOpenChatbot}
            aria-label="Open AI Concierge Chatbot"
            className={`hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-medium tracking-wide transition-colors ${
              isDarkMode
                ? 'bg-[#2A2422] text-[#F3C4B8] hover:bg-[#382E2B]'
                : 'bg-[#F2E5DF] text-[#8C4F49] hover:bg-[#EAD5CD]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B36D6D]" />
            <span>AI Concierge</span>
          </motion.button>

          {/* Theme toggle with smooth rotation */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onToggleTheme}
            aria-label="Toggle light and dark mode"
            className={`p-2.5 rounded-full transition-colors duration-300 ${
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
            className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-300 shadow-sm ${
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
