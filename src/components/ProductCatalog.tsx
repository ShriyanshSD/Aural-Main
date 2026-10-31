import React, { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { Star, Heart, Plus, ChevronDown, Check, SlidersHorizontal, ArrowLeft } from 'lucide-react'
import { Product, ProductCategory, SortOption, StoreCategory, StoreCollection } from '../types'
import { PRODUCTS } from '../data/products'

const ProductCardImage: React.FC<{ product: Product; isDarkMode: boolean }> = ({ product, isDarkMode }) => {
  const bundledProduct = PRODUCTS.find(item => item.id === product.id)
  const hasBundledImage = bundledProduct?.imageUrl === product.imageUrl
  const optimizedBundledImage = bundledProduct
    ? `/catalog-images/${encodeURIComponent(product.id)}.webp`
    : undefined
  const imageSources = [...new Set([
    ...(hasBundledImage && optimizedBundledImage ? [optimizedBundledImage] : []),
    product.imageUrl,
    ...(product.imageUrls ?? []),
    bundledProduct?.imageUrl
  ].filter((source): source is string => typeof source === 'string' && source.trim().length > 0))]
  const [sourceIndex, setSourceIndex] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isUnavailable, setIsUnavailable] = useState(imageSources.length === 0)

  return (
    <>
      {!isLoaded && (
        <div
          className={`absolute inset-0 ${isUnavailable ? 'flex items-center justify-center px-5 text-center font-editorial text-xl italic text-[#8C7068]' : ''}`}
          style={{ backgroundColor: product.fallbackColor }}
        >
          {isUnavailable ? product.name : null}
        </div>
      )}
      {!isUnavailable && imageSources[sourceIndex] && (
        <motion.img
          src={imageSources[sourceIndex]}
          alt={product.name}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            setIsLoaded(false)
            if (sourceIndex < imageSources.length - 1) {
              setSourceIndex(index => index + 1)
            } else {
              setIsUnavailable(true)
            }
          }}
          whileHover={{ scale: 1.04 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className={`relative h-full w-full object-cover transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } ${isDarkMode ? '' : 'mix-blend-multiply'}`}
        />
      )}
    </>
  )
}

interface ProductCatalogProps {
  isDarkMode: boolean
  activeCategory: ProductCategory
  onSelectCategory: (category: ProductCategory) => void
  onSelectProduct: (product: Product) => void
  onQuickAdd: (product: Product, e: React.MouseEvent) => boolean
  wishlist: string[]
  onToggleWishlist: (productId: string, e: React.MouseEvent) => void
  searchQuery: string
  products: Product[]
  categories: StoreCategory[]
  collections: StoreCollection[]
  activeCollectionId: string
  onSelectCollection: (collectionId: string) => void
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
  products,
  categories,
  collections,
  activeCollectionId,
  onSelectCollection
}) => {
  const categoryScrollRef = useRef<HTMLDivElement>(null)
  const categoryTrackRef = useRef<HTMLDivElement>(null)
  const categoryScrollTargetRef = useRef(0)
  const categoryScrollFrameRef = useRef<number | null>(null)
  const categoryDragRef = useRef<{ pointerId: number; startX: number; startOffset: number } | null>(null)
  const [categoryScrollMetrics, setCategoryScrollMetrics] = useState({ thumbWidth: 0, thumbOffset: 0, maxScroll: 0 })
  const [currentSort, setCurrentSort] = useState<SortOption>('recommended')
  const [isSortOpen, setIsSortOpen] = useState(false)
  const [addedAnimationId, setAddedAnimationId] = useState<string | null>(null)
  const [selectedHairSubCategory, setSelectedHairSubCategory] = useState<'all' | 'clutchers' | 'hairbands' | 'hairpins' | 'hair-clips' | 'latkan-clutchers'>('all')

  const updateCategoryScrollMetrics = () => {
    const scroller = categoryScrollRef.current
    const track = categoryTrackRef.current
    if (!scroller || !track) return

    const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth)
    const trackWidth = track.clientWidth
    const thumbWidth = maxScroll > 0
      ? Math.min(trackWidth, Math.max(36, trackWidth * scroller.clientWidth / scroller.scrollWidth))
      : trackWidth
    const maxThumbOffset = Math.max(0, trackWidth - thumbWidth)
    const thumbOffset = maxScroll > 0 ? scroller.scrollLeft / maxScroll * maxThumbOffset : 0
    const thumb = track.querySelector<HTMLButtonElement>('[role="scrollbar"]')
    if (thumb) {
      thumb.style.width = `${thumbWidth}px`
      thumb.style.transform = `translateX(${thumbOffset}px)`
      thumb.setAttribute('aria-valuemax', String(Math.round(maxScroll)))
      thumb.setAttribute('aria-valuenow', String(Math.round(scroller.scrollLeft)))
    }
    track.style.opacity = maxScroll > 0 ? '1' : '0'
    setCategoryScrollMetrics(current => (
      current.thumbWidth === thumbWidth && current.maxScroll === maxScroll
        ? current
        : { thumbWidth, thumbOffset, maxScroll }
    ))
  }

  const handleCategoryScroll = () => {
    if (!categoryDragRef.current && categoryScrollFrameRef.current === null) {
      categoryScrollTargetRef.current = categoryScrollRef.current?.scrollLeft ?? 0
    }
    updateCategoryScrollMetrics()
  }

  const handleCategoryThumbPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (categoryScrollMetrics.maxScroll <= 0) return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const scroller = categoryScrollRef.current
    const track = categoryTrackRef.current
    const maxThumbOffset = Math.max(0, (track?.clientWidth ?? 0) - categoryScrollMetrics.thumbWidth)
    categoryDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startOffset: scroller && categoryScrollMetrics.maxScroll > 0
        ? scroller.scrollLeft / categoryScrollMetrics.maxScroll * maxThumbOffset
        : 0
    }
  }

  const handleCategoryThumbPointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const drag = categoryDragRef.current
    const track = categoryTrackRef.current
    if (!drag || drag.pointerId !== event.pointerId || !track) return

    const maxThumbOffset = Math.max(0, track.clientWidth - categoryScrollMetrics.thumbWidth)
    const thumbOffset = Math.max(0, Math.min(maxThumbOffset, drag.startOffset + event.clientX - drag.startX))
    categoryScrollTargetRef.current = maxThumbOffset > 0
      ? thumbOffset / maxThumbOffset * categoryScrollMetrics.maxScroll
      : 0

    const scroller = categoryScrollRef.current
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (scroller) scroller.scrollLeft = categoryScrollTargetRef.current
      return
    }

    if (categoryScrollFrameRef.current !== null) return
    const easeScroll = () => {
      const currentScroller = categoryScrollRef.current
      if (!currentScroller) {
        categoryScrollFrameRef.current = null
        return
      }
      const distance = categoryScrollTargetRef.current - currentScroller.scrollLeft
      if (Math.abs(distance) < 0.5) {
        currentScroller.scrollLeft = categoryScrollTargetRef.current
        categoryScrollFrameRef.current = null
        return
      }
      currentScroller.scrollLeft += distance * 0.08
      categoryScrollFrameRef.current = requestAnimationFrame(easeScroll)
    }
    categoryScrollFrameRef.current = requestAnimationFrame(easeScroll)
  }

  const handleCategoryThumbPointerEnd = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (categoryDragRef.current?.pointerId !== event.pointerId) return
    categoryDragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleCategoryScrollbarKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const scroller = categoryScrollRef.current
    if (!scroller) return
    const step = Math.max(40, scroller.clientWidth * 0.15)
    let target: number | null = null
    if (event.key === 'ArrowRight') target = Math.min(categoryScrollMetrics.maxScroll, scroller.scrollLeft + step)
    if (event.key === 'ArrowLeft') target = Math.max(0, scroller.scrollLeft - step)
    if (event.key === 'Home') target = 0
    if (event.key === 'End') target = categoryScrollMetrics.maxScroll
    if (target === null) return
    event.preventDefault()
    categoryScrollTargetRef.current = target
    scroller.scrollTo({ left: target, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  useEffect(() => {
    const scroller = categoryScrollRef.current
    if (!scroller) return
    const resizeObserver = new ResizeObserver(updateCategoryScrollMetrics)
    resizeObserver.observe(scroller)
    scroller.querySelectorAll(':scope > button').forEach(button => resizeObserver.observe(button))
    if (categoryTrackRef.current) resizeObserver.observe(categoryTrackRef.current)
    updateCategoryScrollMetrics()
    return () => {
      resizeObserver.disconnect()
      if (categoryScrollFrameRef.current !== null) cancelAnimationFrame(categoryScrollFrameRef.current)
    }
  }, [categories])

  useEffect(() => {
    if (activeCategory !== 'hair-accessories') {
      setSelectedHairSubCategory('all')
    }
  }, [activeCategory])

  const categoryLabels: Record<string, string> = {
    magazines: 'Custom Magazines',
    hampers: 'Custom Hampers',
    'gift-box-hampers': 'Gift Box Hampers',
    'bag-charms': 'Bag Charms',
    bouquets: 'Bouquets',
    'single-flowers': 'Single Flowers',
    'desk-buddy': 'Desk Buddy',
    'god-aasan': 'God Aasan',
    'hair-accessories': 'Hair Accessories',
    'key-chains': 'Key Chains'
  }
  const categoriesList: { id: ProductCategory; label: string }[] = [
    { id: 'all', label: 'All Offerings' },
    ...categories
      .filter(category => category.slug !== 'custom_builder')
      .map(category => ({
        id: category.slug,
        label: categoryLabels[category.slug] ?? category.name
      }))
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
    let list = products.filter(p => {
      const normalizedQuery = searchQuery.trim().toLowerCase()
      if (normalizedQuery && ![
        p.name,
        p.category.replaceAll('-', ' '),
        p.subCategory?.replaceAll('-', ' '),
        p.tagline,
        p.description
      ].some(value => value?.toLowerCase().includes(normalizedQuery))) return false
      if (activeCollectionId) {
        const collection = collections.find(item => item.id === activeCollectionId)
        if (!collection?.productIds.includes(p.id)) return false
      }
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
  }, [activeCategory, activeCollectionId, collections, currentSort, products, searchQuery, selectedHairSubCategory])

  const handleQuickAddClick = (product: Product, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!onQuickAdd(product, e)) return
    setAddedAnimationId(product.id)
    setTimeout(() => {
      setAddedAnimationId(null)
    }, 1200)
  }

  return (
    <section className={`theme-surface py-20 ${
      isDarkMode ? 'bg-[#181615] text-[#F3EBE6]' : 'bg-[#FAF7F2] text-[#2C2422]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {categoryLanding ? (
          <div className="relative isolate mb-12 min-h-97.5 overflow-hidden rounded-2xl sm:min-h-115">
            <img
              src={categoryLanding.imageUrl}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
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

        {collections.length > 0 && activeCategory !== 'hair-accessories' && (
          <div className="mb-8">
            <div className="mb-3 flex items-end justify-between gap-3">
              <div><p className="font-editorial text-[10px] uppercase tracking-[.2em] text-[#B36D6D]">Curated edits</p><h3 className="mt-1 font-serif-title text-xl">Shop a collection</h3></div>
              {activeCollectionId && <button onClick={() => onSelectCollection('')} className="text-xs font-semibold text-[#9E5B5B] underline">Clear collection</button>}
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {collections.map(collection => (
                <button key={collection.id} type="button" onClick={() => onSelectCollection(activeCollectionId === collection.id ? '' : collection.id)} aria-pressed={activeCollectionId === collection.id} className={`group relative h-28 min-w-52 overflow-hidden rounded-xl border text-left sm:min-w-64 ${activeCollectionId === collection.id ? 'border-[#B36D6D] ring-2 ring-[#B36D6D]/30' : 'border-black/10'}`}>
                  <img src={collection.imageUrl || '/hero-image.png'} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105" />
                  <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="absolute inset-x-3 bottom-3 text-white"><span className="block font-serif-title text-lg">{collection.name}</span><span className="mt-0.5 block text-[10px] text-white/80">{collection.productIds.length} curated products</span></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Categories Bar & Sorting Menu */}
        {activeCategory !== 'hair-accessories' && (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-8 mb-8 border-b border-black/5 dark:border-white/5">
          
          {/* Category Tabs */}
          <div className="min-w-0 w-full flex-1">
            <div
              id="category-tabs-list"
              ref={categoryScrollRef}
              aria-label="Product categories"
              onScroll={handleCategoryScroll}
              className="category-tabs-scroll flex min-w-0 w-full items-center gap-1.5 overflow-x-auto"
            >
              {categoriesList.map(cat => {
                const isActive = activeCategory === cat.id
                return (
                  <button
                    key={cat.id}
                    onClick={() => onSelectCategory(cat.id)}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-medium tracking-wide whitespace-nowrap transition-all duration-300 ${
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
            <div
              ref={categoryTrackRef}
              aria-hidden={categoryScrollMetrics.maxScroll === 0}
              className="category-scroll-track mt-3"
              style={{ opacity: categoryScrollMetrics.maxScroll > 0 ? 1 : 0 }}
            >
              {categoryScrollMetrics.maxScroll > 0 && (
                <button
                  type="button"
                  role="scrollbar"
                  aria-label="Scroll product categories"
                  aria-controls="category-tabs-list"
                  aria-orientation="horizontal"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(categoryScrollMetrics.maxScroll)}
                  aria-valuenow={Math.round(
                    categoryScrollMetrics.thumbOffset
                    / Math.max(1, (categoryTrackRef.current?.clientWidth ?? 0) - categoryScrollMetrics.thumbWidth)
                    * categoryScrollMetrics.maxScroll
                  )}
                  onPointerDown={handleCategoryThumbPointerDown}
                  onPointerMove={handleCategoryThumbPointerMove}
                  onPointerUp={handleCategoryThumbPointerEnd}
                  onPointerCancel={handleCategoryThumbPointerEnd}
                  onKeyDown={handleCategoryScrollbarKeyDown}
                  className="category-scroll-thumb"
                  style={{
                    width: `${categoryScrollMetrics.thumbWidth}px`,
                    transform: `translateX(${categoryScrollMetrics.thumbOffset}px)`
                  }}
                />
              )}
            </div>
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
            className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-8 lg:grid-cols-3"
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
                  className={`group flex cursor-pointer flex-col justify-between overflow-hidden transition-[border-color,box-shadow] duration-300 ease-out md:rounded-3xl md:border ${
                    isDarkMode
                      ? 'bg-transparent md:bg-[#1F1918] md:border-[#362A27] md:hover:border-[#B36D6D]/60 md:hover:shadow-xl md:hover:shadow-black/40'
                      : 'bg-transparent md:bg-[#FFFFFF] md:border-[#EAD7CF] md:hover:border-[#B36D6D]/60 md:hover:shadow-xl md:hover:shadow-[#B36D6D]/10'
                  }`}
                >
                  {/* Image Container with Smooth Zoom */}
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-[#F6ECE8] md:aspect-4/3">
                    <ProductCardImage
                      key={`${product.id}-${product.imageUrl}-${(product.imageUrls ?? []).join('|')}`}
                      product={product}
                      isDarkMode={isDarkMode}
                    />

                    {/* Subtle Scrim */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/25 via-transparent to-transparent pointer-events-none" />

                    {/* Wishlist Heart Button */}
                    <motion.button
                      onClick={(e) => onToggleWishlist(product.id, e)}
                      aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                      aria-pressed={isWishlisted}
                      whileHover={{ scale: 1.12, rotate: isWishlisted ? -6 : 6 }}
                      whileTap={{ scale: 0.84, rotate: isWishlisted ? 10 : -10 }}
                      className="absolute right-2 top-2 rounded-full bg-white/85 p-2 shadow-md backdrop-blur-md sm:right-4 sm:top-4 sm:p-2.5 dark:bg-[#1D1716]/85"
                    >
                      <motion.span
                        key={`${product.id}-${isWishlisted}`}
                        initial={{ scale: 0.55, rotate: -18 }}
                        animate={{ scale: [0.55, 1.22, 0.92, 1], rotate: [-18, 12, -7, 0] }}
                        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        className="block"
                      >
                        <Heart
                          className={`h-4 w-4 transition-colors ${
                            isWishlisted
                              ? 'fill-[#B36D6D] text-[#B36D6D]'
                              : 'text-[#8E7A74] hover:text-[#B36D6D]'
                          }`}
                        />
                      </motion.span>
                    </motion.button>

                    {/* Available finishes indicator */}
                    {product.availableFinishes && (
                      <div className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-white/90 dark:bg-[#1C1615]/90 backdrop-blur-md text-[10px] tracking-wider uppercase font-semibold text-[#8C544F] dark:text-[#E2B7B0]">
                        Matte & Gloss Available
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex flex-1 flex-col justify-between px-0 py-4 text-center sm:p-6 sm:text-left">
                    <div>
                      {/* Rating & Review Counter */}
                      <div className="mb-2 hidden items-center justify-between sm:flex">
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
                      <h3 className="mb-1 font-editorial text-base font-semibold leading-snug tracking-wide transition-colors group-hover:text-[#B36D6D] sm:font-serif-title sm:text-xl sm:font-medium">
                        {product.name}
                      </h3>

                      {/* Tagline */}
                      <p className="hidden font-sans-body text-xs leading-relaxed text-[#7B6862] dark:text-[#B8A7A1] sm:line-clamp-2 sm:block">
                        {product.tagline}
                      </p>
                    </div>

                    {/* Price Baseline & Quick Add Button */}
                    <div className="mt-2 flex items-center justify-between gap-1 border-t border-black/5 pt-3 dark:border-white/5 sm:mt-4 sm:pt-5">
                      <div className="min-w-0 text-left">
                        <span className="mb-0.5 hidden text-[10px] uppercase tracking-wider text-[#988680] sm:block">
                          {product.price > 0 ? 'Starts at' : 'Pricing'}
                        </span>
                        <span className="font-serif-title text-sm font-semibold tabular-nums text-[#B36D6D] sm:text-xl">
                          {product.price > 0 ? `₹${product.price.toLocaleString('en-IN')}` : 'Price on request'}
                        </span>
                      </div>

                      <motion.button
                        disabled={product.stockQuantity === 0}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => handleQuickAddClick(product, e)}
                        aria-label={product.stockQuantity === 0 ? 'Out of stock' : 'Add to bag'}
                        className={`flex items-center gap-1 rounded-full px-2.5 py-2 text-[9px] font-medium uppercase tracking-wide transition-all duration-300 disabled:cursor-not-allowed disabled:bg-[#8d817d] sm:gap-1.5 sm:px-4 sm:text-xs sm:tracking-wider ${
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
                            <span>{product.stockQuantity === 0 ? 'Out of stock' : 'Quick Add'}</span>
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
