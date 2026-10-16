/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
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
import { CheckoutModal } from './components/CheckoutModal'
import { ChatbotModal } from './components/ChatbotModal'
import { StoryAndReviews } from './components/StoryAndReviews'
import { Footer } from './components/Footer'
import { Product, ProductCategory, CartItem, OrderDetails, FinishType } from './types'
import { PRODUCTS } from './data/products'

export default function App() {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Navigation & View state
  const [activeTab, setActiveTab] = useState<'home' | 'shop' | 'builder' | 'story' | 'contact'>('home')
  const [activeCategory, setActiveCategory] = useState<ProductCategory>('all')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isChatbotOpen, setIsChatbotOpen] = useState(false)

  // Cart & Wishlist state
  const [cartItems, setCartItems] = useState<CartItem[]>([
    {
      cartId: 'init_1',
      productId: 'prod_bday_mag',
      name: 'Custom Birthday Magazine',
      price: 799,
      quantity: 1,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
      finish: 'matte',
      recipientName: 'Ananya'
    }
  ])
  const [isBagOpen, setIsBagOpen] = useState(false)
  const [wishlist, setWishlist] = useState<string[]>(['prod_bday_mag'])

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

  const totalBagCount = cartItems.reduce((acc, item) => acc + item.quantity, 0)

  // Handlers
  const handleToggleTheme = () => {
    setIsDarkMode(prev => !prev)
  }

  const handleSelectCategory = (category: ProductCategory) => {
    setActiveCategory(category)
    setActiveTab('shop')
    const element = document.getElementById('collection-grid')
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const handleToggleWishlist = (productId: string, e: React.MouseEvent) => {
    e.stopPropagation()
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
    setIsBagOpen(true)
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

  const handleOrderSuccess = (order: OrderDetails) => {
    // Keep cart cleared upon payment completion
    setCartItems([])
  }

  return (
    <div className={`min-h-screen font-sans-body transition-colors duration-500 selection:bg-[#B36D6D]/20 selection:text-[#B36D6D] ${
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
        onOpenChatbot={() => setIsChatbotOpen(true)}
        bagCount={totalBagCount}
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
      />

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
      />

      {/* Main Content Area with Faded Page Transitions */}
      <AnimatePresence mode="wait">
        {activeTab === 'builder' ? (
          <motion.div
            key="builder-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
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
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
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
          setIsCheckoutOpen(true)
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
        onOrderSuccess={handleOrderSuccess}
      />

      {/* Gemini AI Concierge Chatbot */}
      <ChatbotModal
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        onOpen={() => setIsChatbotOpen(true)}
        isDarkMode={isDarkMode}
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
  )
}
