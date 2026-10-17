import React, { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { Star, Heart, Plus, ChevronDown, Check, SlidersHorizontal, ArrowLeft } from 'lucide-react'
import { Product, ProductCategory, SortOption } from '../types'
import { PRODUCTS } from '../data/products'

interface ProductCatalogProps {
  isDarkMode: boolean
  activeCategory: ProductCategory
  onSelectCategory: (category: ProductCategory) => void
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product, e: React.MouseEvent) => void
  wishlist: string[]
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void
  searchQuery: string
  isAuthenticated: boolean
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({
  isDarkMode,
  activeCategory,
  onSelectCategory,
  onSelectProduct,
  onQuickAdd,
  wishlist,
  onToggleWishlist,
  searchQuery = '',
  isAuthenticated
}) => {
  const [currentSort, setCurrentSort] = useState<SortOption>('recommended')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null)
  const [selectedHairSubCategory, setSelectedHairSubCategory] = useState<'all' | 'clutchers' | 'hairbands' | 'hairpins' | 'hair-clips' | 'latkan-clutchers'>('all')

  useEffect(() => {
    if (activeCategory !== 'hair-accessories') {
      setSelectedHairSubCategory('all')
    }
  }, [activeCategory])

  const categoriesList: { id: ProductCategory; label: string }[] = [
    { id: 'all', label: 'All Offerings' },
    { id: 'magazines', label: 'Custom Magazines' },
    { id: 'hampers', label: 'Custom Hampers' },
    { id: 'gift-box-hampers', label: 'Gift Box Hampers' },
    { id: 'bag-charms', label: 'Bag Charms' },
    { id: 'bouquets', label: 'Bouquets' },
    { id: 'single-flowers', label: 'Single Flowers' },
    { id: 'desk-buddy', label: 'Desk Buddy' },
    { id: 'god-aasan', label: 'God Aasan' },
    { id: 'hair-accessories', label: 'Hair Accessories' },
    { id: 'key-chains', label: 'Key Chains' }
  ]

  const hairSubCategories: { id: 'all' | 'clutchers' | 'hairbands' | 'hairpins' | 'hair-clips' | 'latkan-clutchers'; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'clutchers', label: 'Clutchers' },
    { id: 'hairbands', label: 'Hairbands' },
    { id: 'hairpins', label: 'Hairpins' },
    { id: 'hair-clips', label: 'Hair Clips' },
    { id: 'latkan-clutchers', label: 'Latkan Clutchers' }
  ]

  const categoryLanding = activeCategory === 'hair-accessories'
    ? {
        eyebrow: 'Hair Collection',
        title: 'Hair Accessories',
        description: 'Where little blooms meet big dreams. Explore graceful clutchers, hairbands, and pins made for everyday elegance and special moments.',
        imageUrl: '/collections/Hair%20Accessories/Hairbands/hairbands.png'
      }
    : null

  const sortOptionsList: { id: SortOption; label: string }[] = [
    { id: 'recommended', label: 'Recommended' },
    { id: 'highest_rated', label: 'Highest Rated' },
    { id: 'most_reviewed', label: 'Most Reviewed' },
    { id: 'price_low', label: 'Price: Low to High' },
    { id: 'price_high', label: 'Price: High to Low' },
    { id: 'newest', label: 'Newest Releases' }
  ]

  // Filtered & Sorted products
  const processedProducts = useMemo(() => {
    let list = PRODUCTS.filter(p => {
      const normalizedQuery = searchQuery.trim().toLowerCase()
      if (normalizedQuery && ![
        p.name,
        p.category.replaceAll('-', ' '),
        p.subCategory?.replaceAll('-', ' '),
        p.tagline,
        p.description
      ].some(value => value?.toLowerCase().includes(normalizedQuery))) return false
      if (activeCategory === 'all') return true
      if (activeCategory === 'hair-accessories') {
        if (selectedHairSubCategory === 'all') return p.category === 'hair-accessories'
        return p.category === 'hair-accessories' && p.subCategory === selectedHairSubCategory
      }
      return p.category === activeCategory
    })

    switch (currentSort) {
      case 'highest_rated':
        return [...list].sort((a, b) => b.rating - a.rating)
      case 'most_reviewed':
        return [...list].sort((a, b) => b.reviewsCount - a.reviewsCount)
      case 'price_low':
        return [...list].sort((a, b) => a.price - b.price)
      case 'price_high':
        return [...list].sort((a, b) => b.price - a.price)
      case 'newest':
        return [...list].reverse()
      case 'recommended':
      default:
        return list
    }
  }, [activeCategory, currentSort, searchQuery, selectedHairSubCategory])

  const handleQuickAddClick = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    setAddedAnimationId(product.id)
    onQuickAdd(product, e)
    setTimeout(() => {
      setAddedAnimationId(null)
    }, 1200)
  }

  return (
    <section id="collection-grid" className={`theme-surface py-20 ${
      isDarkMode ? 'bg-[#181615] text-[#F3EBE6]' : 'bg-[#FAF7F2] text-[#2C2422]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {categoryLanding ? (
          <div className="relative isolate mb-12 min-h-97.5 overflow-hidden rounded-2xl sm:min-h-115">
            <img
              src={categoryLanding.imageUrl}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 -z-20 h-full w-full object-cover"
            />
            <div className="absolute inset-0 -z-10 bg-linear-to-r from-[#211716]/85 via-[#211716]/55 to-[#211716]/10" />
            <div className="flex min-h-97.5 flex-col items-start justify-center p-7 sm:min-h-115 sm:p-12 lg:p-16">
              <button
                onClick={() => onSelectCategory('all')}
                className="mb-10 inline-flex items-center gap-2 text-xs font-medium text-white/85 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all collections
              </button>
              <div className="max-w-2xl">
                <span className="font-editorial text-[10px] uppercase tracking-[0.2em] text-white/80 font-semibold">
                  {categoryLanding.eyebrow}
                </span>
                <h2 className="font-serif-title mt-3 text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
                  {categoryLanding.title}
                </h2>
                <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/85 sm:text-base">
                  {categoryLanding.description}
                </p>
              </div>
              {activeCategory === 'hair-accessories' && (
                <div className="mt-8 flex flex-wrap gap-2">
                  {hairSubCategories.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedHairSubCategory(item.id)}
                      className={`rounded-full px-4 py-2 text-xs font-medium backdrop-blur-sm transition-colors ${
                        selectedHairSubCategory === item.id
                          ? 'bg-white text-[#4A302B]'
                          : 'bg-black/25 text-white hover:bg-black/40'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center mx-auto mb-10 max-w-xl">
            <span className="font-editorial text-xs tracking-widest text-[#B36D6D] uppercase font-semibold">
              The Bespoke Archive
            </span>
            <h2 className="font-serif-title mt-2 text-3xl sm:text-4xl">
              A few things you will love
            </h2>
            <p className="font-sans-body mt-2 text-xs text-[#7D6B65] dark:text-[#BAAAA3] sm:text-sm">
              Made to be given · Designed to be remembered
            </p>
          </div>
        )}

        {/* Categories Bar & Sorting Menu */}
        {activeCategory !== 'hair-accessories' && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-8 mb-8 border-b border-black/5 dark:border-white/5">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {categoriesList.map(cat => {
              const isActive = activeCategory === cat.id
              return (
                <button
                  key={cat.id}
                  onClick={() => onSelectCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all duration-300 ${
                    isActive
                      ? 'bg-[#B36D6D] text-white shadow-xs'
                      : isDarkMode
                        ? 'bg-[#251E1D] text-[#CBB8B0] hover:bg-[#322724]'
                        : 'bg-[#F2E5DF] text-[#5C4B45] hover:bg-[#EAD5CD]'
                  }`}
                >
                  {cat.label}
                </button>
              )
            })}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <span className="text-xs text-[#8E7C76] dark:text-[#A79690] whitespace-nowrap tabular-nums">
              Showing {processedProducts.length} creations
            </span>

            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium border transition-colors ${
                  isDarkMode
                    ? 'border-[#3D312E] bg-[#221B1A] text-[#EDE0DA] hover:border-[#B36D6D]'
                    : 'border-[#E2CFC6] bg-[#F7EFEA] text-[#4A3B36] hover:border-[#B36D6D]'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#B36D6D]" />
                <span>
                  Sort by: {sortOptionsList.find(s => s.id === currentSort)?.label}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSortOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isSortOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`absolute right-0 mt-2 w-56 rounded-2xl shadow-xl border p-2 z-30 backdrop-blur-md ${
                      isDarkMode
                        ? 'bg-[#221B1A]/95 border-[#453633] text-[#EDE0DA]'
                        : 'bg-[#FAF4F0]/95 border-[#E2CEC5] text-[#3D302C]'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider font-semibold px-3 py-1 text-[#B36D6D]">
                      Sort Selection
                    </div>
                    {sortOptionsList.map(option => (
                      <button
                        key={option.id}
                        onClick={() => {
                          setCurrentSort(option.id)
                          setIsSortOpen(false)
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                          currentSort === option.id
                            ? 'bg-[#B36D6D] text-white font-medium'
                            : isDarkMode ? 'hover:bg-[#2F2422]' : 'hover:bg-[#F2E5DF]'
                        }`}
                      >
                        <span>{option.label}</span>
                        {currentSort === option.id && <Check className="w-3.5 h-3.5" />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
        )}

        {/* Product Grid */}
        <MotionConfig reducedMotion="never">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${activeCategory}-${selectedHairSubCategory}-${currentSort}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
          >
            {processedProducts.length === 0 && activeCategory === 'hair-accessories' && (
              <div
                className={`col-span-full rounded-3xl border p-8 text-center ${
                  isDarkMode ? 'border-[#362A27] bg-[#1F1918]' : 'border-[#F0DDD6] bg-[#FFF9F7]'
                }`}
              >
                <p className="font-serif-title text-2xl text-[#B36D6D]">Coming soon</p>
                <p className="mt-2 text-sm text-[#6F5B57] dark:text-[#C7B4AE]">
                  {selectedHairSubCategory === 'latkan-clutchers'
                    ? 'Latkan Clutchers are coming soon.'
                    : selectedHairSubCategory === 'hair-clips'
                      ? 'Hair Clips are coming soon.'
                      : 'This hair subcollection is being curated and will be added here soon.'}
                </p>
              </div>
            )}
            {processedProducts.map((product, index) => {
              const isWishlisted = wishlist.includes(product.id)
              const isQuickAdded = addedAnimationId === product.id

              return (
                <motion.div
                  key={product.id}
                  onClick={() => onSelectProduct(product)}
                  initial={{ opacity: 0, y: 34, scale: 0.94, rotateX: -5 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
                  whileHover={{
                    y: -5,
                    scale: 1.015,
                    transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] }
                  }}
                  exit={{ opacity: 0, y: -8 }}
                  viewport={{ once: true, amount: 0.12 }}
                  style={{ transformPerspective: 1000, transformOrigin: 'center top' }}
                  transition={{
                    duration: 0.78,
                    delay: (index % 3) * 0.09,
                    ease: [0.22, 1, 0.36, 1]
                  }}
                  className={`group flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border transition-[border-color,box-shadow] duration-300 ease-out ${
                    isDarkMode
                      ? 'bg-[#1F1918] border-[#362A27] hover:border-[#B36D6D]/60 hover:shadow-xl hover:shadow-black/40'
                      : 'bg-[#FFFFFF] border-[#EAD7CF] hover:border-[#B36D6D]/60 hover:shadow-xl hover:shadow-[#B36D6D]/10'
                  }`}
                >
                  {/* Image Container with Smooth Zoom */}
                  <div className="relative aspect-4/3 w-full overflow-hidden bg-[#F6ECE8]">
                    <motion.img
                      src={product.imageUrl}
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      whileHover={{ scale: 1.04 }}
                      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full w-full object-cover will-change-transform"
                    />

                    {/* Subtle Scrim */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

                    {/* Wishlist Heart Button */}
                    {isAuthenticated && (
                      <button
                        onClick={(e) => onToggleWishlist(product.id, e)}
                        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                        aria-pressed={isWishlisted}
                        className="absolute right-4 top-4 rounded-full bg-white/85 p-2.5 shadow-md backdrop-blur-md transition-all duration-200 hover:scale-110 dark:bg-[#1D1716]/85"
                      >
                        <Heart
                          className={`h-4 w-4 transition-colors ${
                            isWishlisted
                              ? 'fill-[#B36D6D] text-[#B36D6D]'
                              : 'text-[#8E7A74] hover:text-[#B36D6D]'
                          }`}
                        />
                      </button>
                    )}

                    {/* Available finishes indicator */}
                    {product.availableFinishes && (
                      <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-white/90 dark:bg-[#1C1615]/90 backdrop-blur-md text-[10px] tracking-wider uppercase font-semibold text-[#8C544F] dark:text-[#E2B7B0]">
                        Matte & Gloss Available
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Rating & Review Counter */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5 text-xs text-[#B36D6D] font-medium">
                          <Star className="w-3.5 h-3.5 fill-[#B36D6D]" />
                          <span className="tabular-nums font-semibold">{product.rating.toFixed(1)}</span>
                          <span className="text-[#96827C] dark:text-[#A7958F] text-[11px]">
                            ({product.reviewsCount} reviews)
                          </span>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider text-[#A18F89] dark:text-[#B7A7A1]">
                          {product.category}
                        </span>
                      </div>

                      {/* Product Name */}
                      <h3 className="font-serif-title text-xl font-medium tracking-wide mb-1 transition-colors group-hover:text-[#B36D6D]">
                        {product.name}
                      </h3>

                      {/* Tagline */}
                      <p className="font-sans-body text-xs text-[#7B6862] dark:text-[#B8A7A1] line-clamp-2 leading-relaxed">
                        {product.tagline}
                      </p>
                    </div>

                    {/* Price Baseline & Quick Add Button */}
                    <div className="pt-5 mt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-[#988680] block">
                          {product.price > 0 ? 'Starts at' : 'Pricing'}
                        </span>
                        <span className="font-serif-title text-xl font-semibold text-[#B36D6D] tabular-nums">
                          {product.price > 0 ? `₹${product.price.toLocaleString('en-IN')}` : 'Price on request'}
                        </span>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => handleQuickAddClick(product, e)}
                        aria-label="Add to bag"
                        className={`px-4 py-2 rounded-full text-xs font-medium tracking-wider uppercase transition-all duration-300 flex items-center gap-1.5 ${
                          isQuickAdded
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#B36D6D] text-white hover:bg-[#9E5B5B]'
                        }`}
                      >
                        {isQuickAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Added</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Quick Add</span>
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
        </MotionConfig>

      </div>
    </section>
  )
}
