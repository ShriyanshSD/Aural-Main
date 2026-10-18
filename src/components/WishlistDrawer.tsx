import React from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowRight, Heart, ShoppingBag, Trash2, X } from 'lucide-react'
import { Product } from '../types'

interface WishlistDrawerProps {
  isOpen: boolean
  isDarkMode: boolean
  products: Product[]
  onClose: () => void
  onRemove: (productId: string) => void
  onAddToBag: (product: Product) => void
  onOpenBag: () => void
}

export const WishlistDrawer: React.FC<WishlistDrawerProps> = ({
  isOpen,
  isDarkMode,
  products,
  onClose,
  onRemove,
  onAddToBag,
  onOpenBag
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.button
          type="button"
          aria-label="Close wishlist"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-50 cursor-default bg-black/50 backdrop-blur-sm"
        />
        <motion.aside
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 240 }}
          aria-label="Wishlist"
          className={`theme-surface fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden border-l shadow-2xl ${
            isDarkMode
              ? 'border-[#342A27] bg-[#1C1817] text-[#F3EBE6]'
              : 'border-[#E8D4CB] bg-[#FAF6F2] text-[#2C2422]'
          }`}
        >
          <div className="flex items-center justify-between border-b border-black/5 p-6 dark:border-white/5">
            <div>
              <span className="font-editorial text-xs font-semibold uppercase tracking-widest text-[#B36D6D]">
                Saved for later
              </span>
              <h2 className="font-serif-title text-xl font-medium tracking-wide">
                Your Wishlist ({products.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close wishlist"
              className={`rounded-full p-2 transition-colors ${
                isDarkMode ? 'text-[#E0D2CB] hover:bg-[#2A2321]' : 'text-[#4A3B37] hover:bg-[#EFE2DC]'
              }`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {products.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center space-y-4 p-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#B36D6D]/10 text-[#B36D6D]">
                <Heart className="h-9 w-9" />
              </div>
              <h3 className="font-serif-title text-2xl font-light">Your wishlist is waiting.</h3>
              <p className="max-w-xs font-editorial text-sm text-[#7D6B65] dark:text-[#BAAAA4]">
                Save the pieces you love and return to them whenever you are ready.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full bg-[#B36D6D] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#9E5B5B]"
              >
                Explore AUREL
              </button>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {products.map(product => (
                  <motion.div
                    key={product.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97 }}
                    className={`flex gap-3 rounded-2xl border p-3 ${
                      isDarkMode ? 'border-[#382C29] bg-[#221B1A]' : 'border-[#E8D4CB] bg-white'
                    }`}
                  >
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="h-20 w-20 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="truncate font-serif-title text-sm font-semibold">{product.name}</h3>
                          <p className="mt-1 text-xs font-semibold text-[#B36D6D]">
                            {product.price > 0 ? `₹${product.price.toLocaleString('en-IN')}` : 'Price on request'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(product.id)}
                          aria-label={`Remove ${product.name} from wishlist`}
                          className="shrink-0 rounded-full p-1.5 text-[#96837D] transition-colors hover:text-red-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => onAddToBag(product)}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#B36D6D] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white transition-colors hover:bg-[#9E5B5B]"
                      >
                        <ShoppingBag className="h-3.5 w-3.5" />
                        Add to bag
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="border-t border-black/5 p-5 dark:border-white/5">
                <button
                  type="button"
                  onClick={onOpenBag}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[#B36D6D] py-3.5 text-xs font-semibold uppercase tracking-wider text-white shadow-md transition-colors hover:bg-[#9E5B5B]"
                >
                  View bag & checkout
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </>
          )}
        </motion.aside>
      </>
    )}
  </AnimatePresence>
)
