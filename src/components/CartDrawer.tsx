import React from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag, Sparkles } from 'lucide-react'
import { CartItem } from '../types'

interface CartDrawerProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode: boolean
  cartItems: CartItem[]
  onUpdateQuantity: (cartId: string, delta: number) => void
  onRemoveItem: (cartId: string) => void
  onProceedToCheckout: () => void
  onExplore: () => void
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onExplore
}) => {
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const isFreeDelivery = subtotal >= 1500
  const deliveryFee = subtotal === 0 ? 0 : isFreeDelivery ? 0 : 99

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 240 }}
            className={`fixed top-0 bottom-0 right-0 z-50 w-full max-w-md shadow-2xl flex flex-col justify-between overflow-hidden border-l transition-colors duration-500 ${
              isDarkMode 
                ? 'bg-[#1C1817] text-[#F3EBE6] border-[#342A27]' 
                : 'bg-[#FAF6F2] text-[#2C2422] border-[#E8D4CB]'
            }`}
          >
            {/* Header */}
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
              <div>
                <span className="font-editorial text-xs uppercase tracking-widest text-[#B36D6D] font-semibold">
                  Personal Bag
                </span>
                <h3 className="font-serif-title text-xl font-medium tracking-wide">
                  Your Selected Treasures ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})
                </h3>
              </div>

              <motion.button
                whileHover={{ rotate: 90 }}
                whileTap={{ scale: 0.9 }}
                transition={{ duration: 0.2 }}
                onClick={onClose}
                aria-label="Close bag"
                className={`p-2 rounded-full transition-colors ${
                  isDarkMode ? 'hover:bg-[#2A2321] text-[#E0D2CB]' : 'hover:bg-[#EFE2DC] text-[#4A3B37]'
                }`}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Body */}
            {cartItems.length === 0 ? (
              <div className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-[#B36D6D]/10 flex items-center justify-center text-[#B36D6D]">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <h4 className="font-serif-title text-2xl font-light">
                  Your bag is waiting.
                </h4>
                <p className="font-editorial text-sm text-[#7D6B65] dark:text-[#BAAAA4] max-w-xs">
                  Beautiful things belong here. Find bespoke magazines and floral keepsakes made with love.
                </p>
                <button
                  onClick={() => {
                    onExplore()
                    onClose()
                  }}
                  className="mt-2 px-6 py-3 rounded-full bg-[#B36D6D] text-white text-xs uppercase tracking-wider font-semibold shadow-md hover:bg-[#9E5B5B] transition-all"
                >
                  Explore AUREL
                </button>
              </div>
            ) : (
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {/* Free Shipping Progress */}
                <div className="p-3.5 rounded-2xl bg-black/5 dark:bg-white/5 text-xs">
                  {isFreeDelivery ? (
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                      <Sparkles className="w-4 h-4" />
                      <span>Complimentary Luxury Shipping Unlocked</span>
                    </div>
                  ) : (
                    <div className="text-[#786660] dark:text-[#B6A6A0]">
                      Add <span className="font-semibold text-[#B36D6D]">₹{1500 - subtotal}</span> more for complimentary luxury shipping
                    </div>
                  )}
                </div>

                {/* Items List */}
                {cartItems.map((item) => (
                  <motion.div
                    key={item.cartId}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`p-4 rounded-2xl border flex gap-3.5 items-start ${
                      isDarkMode ? 'bg-[#221B1A] border-[#382C29]' : 'bg-[#FFFFFF] border-[#E8D4CB]'
                    }`}
                  >
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className="font-serif-title text-sm font-semibold truncate pr-2">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => onRemoveItem(item.cartId)}
                          aria-label="Remove item"
                          className="text-[#96837D] hover:text-red-500 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Customization Details */}
                      {item.finish && (
                        <span className="text-[10px] uppercase tracking-wider text-[#B36D6D] font-semibold block">
                          Finish: {item.finish}
                        </span>
                      )}
                      {item.recipientName && (
                        <span className="text-[10px] text-[#786660] dark:text-[#B6A6A0] block truncate">
                          For: {item.recipientName}
                        </span>
                      )}
                      {item.customComponents && item.customComponents.length > 0 && (
                        <span className="text-[10px] text-[#786660] dark:text-[#B6A6A0] block truncate">
                          Includes: {item.customComponents.join(', ')}
                        </span>
                      )}

                      {/* Price and Quantity Stepper */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                        <span className="text-xs font-semibold text-[#B36D6D] tabular-nums">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>

                        <div className="flex items-center rounded-lg bg-black/5 dark:bg-white/5 px-2 py-0.5 text-xs">
                          <button
                            onClick={() => onUpdateQuantity(item.cartId, -1)}
                            className="p-1 hover:text-[#B36D6D]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 tabular-nums font-semibold">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => onUpdateQuantity(item.cartId, 1)}
                            className="p-1 hover:text-[#B36D6D]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Footer Summary & Checkout Action */}
            {cartItems.length > 0 && (
              <div className="p-6 border-t border-black/5 dark:border-white/5 space-y-3">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-[#786660] dark:text-[#B6A6A0]">
                    <span>Items Subtotal</span>
                    <span className="tabular-nums font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[#786660] dark:text-[#B6A6A0]">
                    <span>Luxury Delivery</span>
                    <span>{deliveryFee === 0 ? 'Complimentary' : `₹${deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-black/5 dark:border-white/5 font-serif-title text-base font-semibold">
                    <span>Grand Total</span>
                    <span className="text-xl text-[#B36D6D] tabular-nums">
                      ₹{(subtotal + deliveryFee).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onProceedToCheckout}
                  className="w-full py-4 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] text-white text-xs uppercase tracking-wider font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                <p className="text-[11px] text-center text-[#9A8781]">
                  Secured with Razorpay & Instant UPI Confirmation
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
