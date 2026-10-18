import React, { useState } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { X, Star, Heart, Check, Minus, Plus, ShoppingBag, Sparkles, ArrowLeft, ShieldCheck, Truck } from 'lucide-react'
import { Product, FinishType, CartItem } from '../types'

interface ProductDetailModalProps {
  product: Product | null
  isDarkMode: boolean
  onClose: () => void
  onAddToCart: (item: CartItem) => boolean
  isWishlisted: boolean
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void
  isAuthenticated: boolean
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  isDarkMode,
  onClose,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
  isAuthenticated
}) => {
  if (!product) return null

  const [quantity, setQuantity] = useState(1)
  const [selectedFinish, setSelectedFinish] = useState<FinishType>(
    product.availableFinishes ? product.availableFinishes[0] : 'matte'
  )
  const [recipientName, setRecipientName] = useState('')
  const [customMessage, setCustomMessage] = useState('')
  const [isAddedFeedback, setIsAddedFeedback] = useState(false)

  const livePreviewHeading = recipientName.trim()
    ? `${recipientName.toUpperCase()}’S EDITION`
    : 'SPECIAL COMMEMORATIVE EDITION'

  const handleAdd = () => {
    const cartItem: CartItem = {
      cartId: `${product.id}_${Date.now()}`,
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity,
      imageUrl: product.imageUrl,
      finish: product.availableFinishes ? selectedFinish : undefined,
      recipientName: recipientName.trim() || undefined,
      customMessage: customMessage.trim() || undefined
    }

    if (!onAddToCart(cartItem)) return
    setIsAddedFeedback(true)
    setTimeout(() => {
      setIsAddedFeedback(false)
      onClose()
    }, 900)
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className={`relative w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border my-6 ${
            isDarkMode 
              ? 'bg-[#1C1817] text-[#F3EBE6] border-[#362A27]' 
              : 'bg-[#FAF6F2] text-[#2C2422] border-[#E8D4CB]'
          }`}
        >
          {/* Top Bar with Back and Close */}
          <div className="p-5 sm:p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#B36D6D] hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Collection</span>
            </button>

            <button
              onClick={onClose}
              aria-label="Close product view"
              className={`p-2 rounded-full transition-colors ${
                isDarkMode ? 'hover:bg-[#2A2321] text-[#E0D2CB]' : 'hover:bg-[#EFE2DC] text-[#4A3B37]'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 2-Column Product Content */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 p-6 sm:p-10 max-h-[82vh] overflow-y-auto">
            
            {/* Left: Product Image / Live Preview */}
            <div className="md:col-span-6 space-y-4">
              <div className="relative aspect-[4/3] sm:aspect-[1/1] rounded-2xl overflow-hidden shadow-lg bg-[#F5ECE8] group">
                <MotionConfig reducedMotion="never">
                <motion.img
                  src={product.imageUrl}
                  alt={product.name}
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  decoding="async"
                  whileHover={{ scale: 1.045 }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  className="h-full w-full object-cover"
                />
                </MotionConfig>

                {/* Live Personalization Overlay for Magazines */}
                {product.category === 'magazines' && recipientName.trim() && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-4 left-4 right-4 p-3 rounded-xl bg-white/90 dark:bg-[#1C1615]/90 backdrop-blur-md shadow-lg border border-white/20 text-center"
                  >
                    <span className="text-[10px] uppercase tracking-widest text-[#B36D6D] font-bold block">
                      Live Masthead Preview
                    </span>
                    <span className="font-serif-title text-sm font-semibold tracking-wide text-[#28211F] dark:text-[#F3EBE6]">
                      {livePreviewHeading}
                    </span>
                  </motion.div>
                )}

                {/* Wishlist Button */}
                {isAuthenticated && (
                  <button
                    onClick={(e) => onToggleWishlist(product.id, e)}
                    aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                    aria-pressed={isWishlisted}
                    className="absolute right-4 top-4 rounded-full bg-white/85 p-2.5 shadow-md backdrop-blur-md dark:bg-[#1D1716]/85"
                  >
                    <Heart
                      className={`h-4 w-4 transition-colors ${
                        isWishlisted ? 'fill-[#B36D6D] text-[#B36D6D]' : 'text-[#8E7A74]'
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-[#B36D6D] shrink-0" />
                  <span className="text-[11px] text-[#786660] dark:text-[#B9A9A3]">
                    Carefully packaged with silk ribbon
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-black/5 dark:bg-white/5 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-[#B36D6D] shrink-0" />
                  <span className="text-[11px] text-[#786660] dark:text-[#B9A9A3]">
                    100% Quality guarantee
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Purchase and Customization Module */}
            <div className="md:col-span-6 space-y-6">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-[#B36D6D] font-semibold">
                  {product.category}
                </span>
                <h2 className="font-serif-title text-2xl sm:text-3xl font-normal tracking-wide mt-1">
                  {product.name}
                </h2>

                {/* Rating and Price */}
                <div className="flex items-center justify-between mt-3 pb-4 border-b border-black/5 dark:border-white/5">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="flex items-center text-[#B36D6D]">
                      <Star className="w-4 h-4 fill-[#B36D6D]" />
                      <span className="ml-1 font-semibold">{product.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-[#8E7A74] dark:text-[#A89791]">
                      ({product.reviewsCount} verified reviews)
                    </span>
                  </div>

                  <span className="font-serif-title text-2xl font-bold text-[#B36D6D] tabular-nums">
                    ₹{product.price.toLocaleString('en-IN')}
                  </span>
                </div>

                <p className="font-sans-body text-xs sm:text-sm text-[#705D57] dark:text-[#BEADA7] mt-3 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* Finish Options (if Magazine) */}
              {product.availableFinishes && (
                <div>
                  <label className="block text-xs font-semibold tracking-wider uppercase text-[#8B7771] dark:text-[#BCAAA4] mb-2">
                    Choose Finish
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {product.availableFinishes.map((finish) => (
                      <button
                        key={finish}
                        type="button"
                        onClick={() => setSelectedFinish(finish)}
                        className={`p-3 rounded-xl border text-xs font-medium uppercase tracking-wider transition-all flex items-center justify-between ${
                          selectedFinish === finish
                            ? 'border-[#B36D6D] bg-[#B36D6D]/10 text-[#8C4F4A] dark:text-[#F3C2BA]'
                            : isDarkMode
                              ? 'border-[#382C29] bg-[#221B1A] text-[#BCAAA4]'
                              : 'border-[#DFC6BD] bg-[#FAF4F0] text-[#55433D]'
                        }`}
                      >
                        <span>{finish}</span>
                        {selectedFinish === finish && <Check className="w-3.5 h-3.5 text-[#B36D6D]" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Personalization Inputs */}
              {product.isCustomizable && (
                <div className="space-y-3.5 p-4 rounded-2xl bg-black/5 dark:bg-white/5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[#B36D6D]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Make It Personal</span>
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A7771] mb-1">
                      Recipient Name
                    </label>
                    <input
                      type="text"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Name to appear on gift / magazine cover"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                        isDarkMode
                          ? 'bg-[#181413] border-[#3F302D] text-[#EDE0DA]'
                          : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A7771] mb-1">
                      Your Message or Dedication
                    </label>
                    <textarea
                      rows={2}
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="Add a heartfelt memory note to include inside"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] resize-none ${
                        isDarkMode
                          ? 'bg-[#181413] border-[#3F302D] text-[#EDE0DA]'
                          : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                      }`}
                    />
                  </div>
                </div>
              )}

              {/* Features List */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8B7771] block">
                  Crafting Highlights
                </span>
                {product.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-[#6C5A54] dark:text-[#C4B3AC]">
                    <Check className="w-3.5 h-3.5 text-[#B36D6D] shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* Quantity Stepper & Add to Bag */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center gap-4">
                <div className={`flex items-center rounded-full border px-2 py-1 ${
                  isDarkMode ? 'border-[#3D302D] bg-[#221B1A]' : 'border-[#DEC5BB] bg-[#FFFFFF]'
                }`}>
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-xs font-semibold tabular-nums">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(product.stockQuantity === null || product.stockQuantity === undefined
                      ? quantity + 1
                      : Math.min(product.stockQuantity, quantity + 1))}
                    disabled={product.stockQuantity === 0 || (product.stockQuantity !== null && product.stockQuantity !== undefined && quantity >= product.stockQuantity)}
                    className="p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <motion.button
                  disabled={product.stockQuantity === 0}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleAdd}
                  className={`flex-1 py-3.5 rounded-full text-xs font-medium tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 ${
                    isAddedFeedback
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#B36D6D] hover:bg-[#9E5B5B] text-white disabled:cursor-not-allowed disabled:bg-[#8d817d]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isAddedFeedback ? 'Added to Bag' : product.stockQuantity === 0 ? 'Out of stock' : `Add to Bag · ₹${(product.price * quantity).toLocaleString('en-IN')}`}
                  </span>
                </motion.button>
              </div>

            </div>

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
