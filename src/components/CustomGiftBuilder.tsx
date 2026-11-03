import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { Check, ChevronDown, Gift, Minus, Plus, ShoppingBag, Sparkles, X } from 'lucide-react'
import type { BuilderItem, CartItem, Product, StoreCategory } from '../types'
import { BUILDER_ITEMS, PRODUCTS } from '../data/products'
import { MAGAZINE_PRICES } from '../data/magazinePricing'

interface CustomGiftBuilderProps {
  isDarkMode: boolean
  onClose: () => void
  onAddCustomHamperToBag: (item: CartItem) => void
  categories: StoreCategory[]
  products: Product[]
}

const featuredCategoryLabels: Record<string, string> = {
  magazines: 'Custom Magazines',
  hampers: 'Custom Hampers',
  bouquets: 'Bouquets',
  'single-flowers': 'Single Flowers',
  'desk-buddy': 'Desk Buddy',
  'gift-box-hampers': 'Gift Box Hampers',
  'hair-accessories': 'Hair Accessories',
  'bag-charms': 'Bag Charms',
  'key-chains': 'Key Chains',
  'god-aasan': 'God Aasan'
}

const getCategoryLabel = (category: StoreCategory) => (
  featuredCategoryLabels[category.slug]
  ?? category.name
  ?? category.slug.split('-').map(word => word[0]?.toUpperCase() + word.slice(1)).join(' ')
)

const previewPlacements = [
  { left: '25%', top: '25%', width: '50%', height: '48%', rotate: -1, zIndex: 20 },
  { left: '7%', top: '9%', width: '30%', height: '36%', rotate: -7, zIndex: 30 },
  { left: '64%', top: '8%', width: '28%', height: '35%', rotate: 6, zIndex: 30 },
  { left: '6%', top: '58%', width: '32%', height: '34%', rotate: 3, zIndex: 40 },
  { left: '64%', top: '56%', width: '30%', height: '35%', rotate: -3, zIndex: 40 },
  { left: '3%', top: '34%', width: '27%', height: '31%', rotate: -5, zIndex: 35 },
  { left: '70%', top: '34%', width: '27%', height: '31%', rotate: 5, zIndex: 35 },
  { left: '35%', top: '6%', width: '29%', height: '30%', rotate: 3, zIndex: 25 },
  { left: '35%', top: '66%', width: '31%', height: '28%', rotate: -2, zIndex: 45 }
]

const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`

export const CustomGiftBuilder: React.FC<CustomGiftBuilderProps> = ({
  isDarkMode,
  onClose,
  onAddCustomHamperToBag,
  categories = [],
  products = []
}) => {
  const [selectedBox, setSelectedBox] = useState<BuilderItem>(
    BUILDER_ITEMS.find(item => item.category === 'box') ?? BUILDER_ITEMS[0]
  )
  const [selectedItems, setSelectedItems] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState(
    categories.find(category => category.slug !== 'magazines')?.slug ?? categories[0]?.slug ?? ''
  )
  const [recipientName, setRecipientName] = useState('')
  const [personalNote, setPersonalNote] = useState('')

  const totalPrice = selectedBox.price + selectedItems.reduce((sum, item) => sum + item.price, 0)
  const selectedItemGroups = selectedItems.reduce<Array<{ item: Product; quantity: number }>>((groups, item) => {
    const existing = groups.find(group => group.item.id === item.id)
    if (existing) existing.quantity += 1
    else groups.push({ item, quantity: 1 })
    return groups
  }, [])
  const catalogItems = products
    .filter(product => product.category === activeCategory && product.isActive !== false && product.isPublished !== false)
    .slice(0, 3)
  const magazineProduct = activeCategory === 'magazines'
    ? PRODUCTS.find(product => product.category === 'magazines')
    : undefined
  const magazineOptions: Product[] = magazineProduct && catalogItems.length === 0
    ? ([4, 8] as const).map(pageCount => ({
      ...magazineProduct,
      id: `${magazineProduct.id}-${pageCount}-page`,
      name: `Custom Memory Magazine · ${pageCount} pages`,
      price: MAGAZINE_PRICES[pageCount],
      description: `A personalized ${pageCount}-page AUREL memory magazine`
    }))
    : []
  const availableItems = catalogItems.length ? catalogItems : magazineOptions
  const exploreCategories = [...categories].sort((left, right) => {
    if (left.slug === 'magazines') return -1
    if (right.slug === 'magazines') return 1
    return (left.display_order ?? Number.MAX_SAFE_INTEGER) - (right.display_order ?? Number.MAX_SAFE_INTEGER)
      || getCategoryLabel(left).localeCompare(getCategoryLabel(right))
  })
  const activeCategoryLabel = categories.find(category => category.slug === activeCategory)
  const selectedCategoryName = activeCategoryLabel ? getCategoryLabel(activeCategoryLabel) : 'this category'
  const previewItems = [selectedBox, ...selectedItems]
  const boxPalette = selectedBox.id.includes('rose')
    ? { edge: '#A66F68', side: '#C18D82', interior: '#E8D0C9' }
    : { edge: '#A77C4E', side: '#B89160', interior: '#C8AA7D' }
  const isDark = isDarkMode

  useEffect(() => {
    if (categories.some(category => category.slug === activeCategory)) return
    setActiveCategory(categories.find(category => category.slug !== 'magazines')?.slug ?? categories[0]?.slug ?? '')
  }, [activeCategory, categories])

  const adjustItemQuantity = (item: Product, change: -1 | 1) => {
    setSelectedItems(current => {
      if (change === 1) return [...current, item]
      const itemIndex = current.findIndex(selected => selected.id === item.id)
      return itemIndex === -1 ? current : current.filter((_, index) => index !== itemIndex)
    })
  }

  const handleCreateAndAdd = () => {
    const newCartItem: CartItem = {
      cartId: `custom_${Date.now()}`,
      productId: 'custom_hamper_mix',
      name: 'Custom Mix & Match Hamper',
      price: totalPrice,
      quantity: 1,
      imageUrl: selectedBox.imageUrl,
      recipientName: recipientName.trim() || undefined,
      customMessage: personalNote.trim() || undefined,
      customComponents: previewItems.map(item => item.name)
    }

    onAddCustomHamperToBag(newCartItem)
  }

  const cardClass = isDark
    ? 'border-[#3A302C] bg-[#221D1A]'
    : 'border-[#E9DDD0] bg-white'
  const mutedTextClass = isDark ? 'text-[#BBAAA1]' : 'text-[#82736A]'
  const inputClass = isDark
    ? 'border-[#463A35] bg-[#1C1816] text-[#F3EBE6] placeholder:text-[#81746D]'
    : 'border-[#E3D7CC] bg-[#FFFEFC] text-[#352B25] placeholder:text-[#A69A90]'

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className={`min-h-screen pt-20 pb-8 sm:pt-16 sm:pb-12 lg:py-12 transition-colors duration-300 ${
        isDark ? 'bg-[#181615] text-[#F3EBE6]' : 'bg-[#FAF8F4] text-[#352B25]'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <header className={`mb-7 flex items-start justify-between gap-5 border-b pb-6 ${
          isDark ? 'border-white/10' : 'border-[#E8DED4]'
        }`}>
          <div>
            <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#A96F61]">
              <Sparkles className="h-3.5 w-3.5" />
              AUREL gift studio
            </p>
            <h1 className="font-serif-title text-3xl font-normal tracking-tight sm:text-4xl">
              Create a gift, made personal
            </h1>
            <p className={`mt-2 max-w-xl text-sm leading-relaxed ${mutedTextClass}`}>
              Choose a keepsake box, gather a few thoughtful things, and make it yours.
            </p>
          </div>
          <motion.button
            type="button"
            onClick={onClose}
            aria-label="Close gift studio"
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.92 }}
            className={`group rounded-full p-2.5 transition-colors ${
              isDark ? 'text-[#E0D2CB] hover:bg-white/10' : 'text-[#65574F] hover:bg-[#EFE8E0]'
            }`}
          >
            <span className="block transition-transform duration-300 ease-out group-hover:rotate-90 group-focus-visible:rotate-90">
              <X className="h-5 w-5" />
            </span>
          </motion.button>
        </header>

        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12">
          <div className="min-w-0 space-y-8">
            <section aria-labelledby="box-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A96F61]">01 · The foundation</p>
                  <h2 id="box-heading" className="mt-1 font-serif-title text-2xl font-medium">Choose your gift box</h2>
                </div>
                <span className={`shrink-0 text-xs ${mutedTextClass}`}>Choose one</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {BUILDER_ITEMS.filter(item => item.category === 'box').slice(0, 3).map(box => {
                  const isSelected = selectedBox.id === box.id
                  return (
                    <button
                      type="button"
                      key={box.id}
                      aria-pressed={isSelected}
                      onClick={() => setSelectedBox(box)}
                      className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-[#B36D6D] bg-[#B36D6D]/[0.07] ring-1 ring-[#B36D6D]/25'
                          : `${cardClass} hover:border-[#C79B8C]`
                      }`}
                    >
                      <img src={box.imageUrl} alt="" className="h-[68px] w-[68px] shrink-0 rounded-xl object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-serif-title text-sm font-medium">{box.name}</span>
                        <span className={`mt-1 block line-clamp-1 text-[11px] ${mutedTextClass}`}>{box.description}</span>
                        <span className="mt-1.5 block text-xs font-semibold tabular-nums text-[#A96F61]">{formatPrice(box.price)}</span>
                      </span>
                      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        isSelected ? 'border-[#B36D6D] bg-[#B36D6D] text-white' : 'border-[#D9CEC4]'
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section aria-labelledby="items-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A96F61]">02 · The little details</p>
                  <h2 id="items-heading" className="mt-1 font-serif-title text-2xl font-medium">Choose what goes inside</h2>
                </div>
                <span className={`shrink-0 text-xs ${mutedTextClass}`}>
                  {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'} chosen
                </span>
              </div>

              <div className="mb-4">
                <label htmlFor="gift-item-category" className={`mb-2 block text-xs font-medium ${mutedTextClass}`}>
                  Choose a category
                </label>
                <div className="relative max-w-md">
                  <select
                    id="gift-item-category"
                    value={activeCategory}
                  onChange={event => setActiveCategory(event.target.value)}
                    aria-controls="gift-category-products"
                    className={`w-full appearance-none rounded-xl border px-4 py-3 pr-11 text-sm outline-none transition-colors focus:border-[#B36D6D] ${
                      isDark
                        ? 'border-[#463A35] bg-[#221D1A] text-[#F3EBE6]'
                        : 'border-[#E3D8CE] bg-white text-[#352B25]'
                    }`}
                  >
                    {exploreCategories.map(category => (
                      <option key={category.slug} value={category.slug}>{getCategoryLabel(category)}</option>
                    ))}
                  </select>
                  <ChevronDown className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 ${mutedTextClass}`} />
                </div>
                <p className={`mt-2 text-xs ${mutedTextClass}`}>
                  Showing up to 3 {selectedCategoryName.toLowerCase()} products. Select a few to make it yours.
                </p>
              </div>
              <div id="gift-category-products" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {availableItems.slice(0, 3).map(item => {
                  const quantity = selectedItems.filter(selected => selected.id === item.id).length
                  return (
                    <div
                      key={item.id}
                      className={`relative flex min-w-0 items-center gap-3 rounded-2xl border p-3 text-left transition-all ${
                        quantity > 0
                          ? 'border-[#B36D6D] bg-[#B36D6D]/[0.07] ring-1 ring-[#B36D6D]/25'
                          : `${cardClass} hover:border-[#C79B8C]`
                      }`}
                    >
                      <img src={item.imageUrl} alt="" className="h-[68px] w-[68px] shrink-0 rounded-xl object-cover" />
                      <span className="min-w-0 flex-1">
                        <span className="block line-clamp-2 font-serif-title text-sm font-medium">{item.name}</span>
                        <span className={`mt-1 block line-clamp-1 text-[11px] ${mutedTextClass}`}>{item.description}</span>
                        <span className="mt-1.5 block text-xs font-semibold tabular-nums text-[#A96F61]">{formatPrice(item.price)} each</span>
                      </span>
                      <div className={`flex shrink-0 items-center gap-2 rounded-full border p-1 ${
                        isDark ? 'border-[#463A35] bg-[#1C1816]' : 'border-[#E5D9CE] bg-[#FFFEFC]'
                      }`}>
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name} quantity`}
                          disabled={quantity === 0}
                          onClick={() => adjustItemQuantity(item, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#A96F61] transition-colors hover:bg-[#A96F61]/10 disabled:cursor-not-allowed disabled:opacity-35"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span aria-live="polite" className="min-w-4 text-center text-xs font-medium tabular-nums">{quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.name} quantity`}
                          onClick={() => adjustItemQuantity(item, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#A96F61] transition-colors hover:bg-[#A96F61]/10"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {availableItems.length === 0 && (
                  <p className={`col-span-full rounded-2xl border border-dashed px-4 py-8 text-center text-sm ${mutedTextClass}`}>
                    There are no available products in this collection yet.
                  </p>
                )}
              </div>
            </section>

            <section aria-labelledby="note-heading" className={`rounded-2xl border p-5 sm:p-6 ${cardClass}`}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#A96F61]/10 text-[#A96F61]">
                  <Gift className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A96F61]">03 · A personal note</p>
                  <h2 id="note-heading" className="font-serif-title text-xl font-medium">Add your finishing words</h2>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block">
                  <span className={`mb-1.5 block text-xs ${mutedTextClass}`}>Recipient name</span>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={event => setRecipientName(event.target.value)}
                    placeholder="Who is this little gift for?"
                    className={`w-full rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors focus:border-[#B36D6D] ${inputClass}`}
                  />
                </label>
                <label className="block">
                  <span className={`mb-1.5 block text-xs ${mutedTextClass}`}>Gift message</span>
                  <textarea
                    rows={3}
                    value={personalNote}
                    onChange={event => setPersonalNote(event.target.value)}
                    placeholder="A few heartfelt words..."
                    className={`w-full resize-none rounded-xl border px-3.5 py-3 text-sm outline-none transition-colors focus:border-[#B36D6D] ${inputClass}`}
                  />
                </label>
              </div>
            </section>
          </div>

          <aside className="min-w-0">
            <div className="mb-3 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A96F61]">Your gift, taking shape</p>
                <h2 className="mt-1 font-serif-title text-2xl font-medium">A little preview</h2>
              </div>
              <span className={`flex items-center gap-1 text-[11px] ${mutedTextClass}`}>
                <ChevronDown className="h-3.5 w-3.5" />
                Top view
              </span>
            </div>

            <div
              className="relative aspect-[1/0.88] min-h-[330px] w-full max-w-full overflow-hidden rounded-[1.75rem] border border-[#D7C8B3] shadow-[0_20px_44px_-24px_rgba(80,54,34,0.5)]"
              style={{
                backgroundColor: '#DDD0BE',
                backgroundImage: 'radial-gradient(ellipse at 18% 18%, rgba(255,255,255,0.75), transparent 38%), radial-gradient(ellipse at 82% 75%, rgba(116,91,66,0.22), transparent 45%), repeating-linear-gradient(3deg, rgba(111,86,61,0.08) 0px, rgba(111,86,61,0.08) 1px, transparent 1px, transparent 5px), repeating-linear-gradient(93deg, rgba(255,255,255,0.28) 0px, rgba(255,255,255,0.28) 1px, transparent 1px, transparent 8px)'
              }}
            >
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -left-[8%] -top-[22%] h-[72%] w-[50%] rotate-[-18deg] rounded-full bg-white/25 blur-3xl" />
                <div className="absolute -bottom-[28%] -right-[8%] h-[66%] w-[58%] rounded-full bg-[#8C7052]/20 blur-3xl" />
              </div>
              <div
                className="absolute inset-x-[6%] bottom-[4%] top-[8%] grid place-items-center"
                style={{ perspective: '1000px' }}
              >
                <div
                  className="relative h-[86%] w-[86%]"
                  style={{ transform: 'rotateX(48deg) rotateZ(-3deg) scale(0.94)', transformStyle: 'preserve-3d' }}
                >
                  <div
                    className="absolute inset-0 rounded-[1.35rem] border-[10px] shadow-[0_24px_28px_rgba(65,46,26,0.4),inset_0_0_0_2px_rgba(255,242,212,0.45)] sm:border-[14px]"
                    style={{ borderColor: boxPalette.edge, backgroundColor: boxPalette.side, transform: 'translateZ(-18px)' }}
                  />
                  <div
                    className="absolute inset-[4%] overflow-hidden rounded-[0.85rem] border border-[#92704C]/70"
                    style={{
                      transform: 'translateZ(-8px)',
                      backgroundColor: boxPalette.interior,
                      backgroundImage: 'radial-gradient(ellipse at 48% 42%, rgba(255,246,220,0.62), transparent 62%), repeating-linear-gradient(0deg, rgba(111,77,43,0.09) 0px, rgba(111,77,43,0.09) 1px, transparent 1px, transparent 10px)'
                    }}
                  />
                  <div
                    className="absolute inset-x-[1%] bottom-0 h-[12%] rounded-b-xl border-t border-[#D6B98D]/70 bg-gradient-to-b from-[#BC9664] to-[#87613C] shadow-[0_14px_18px_rgba(64,43,24,0.38)]"
                    style={{ transform: 'translateZ(22px)', backgroundImage: `linear-gradient(to bottom, ${boxPalette.side}, ${boxPalette.edge})` }}
                  />
                  <div
                    className="absolute inset-y-[1%] right-0 w-[9%] rounded-r-xl bg-gradient-to-l from-[#805A37] to-[#B38A5A]"
                    style={{ transform: 'translateZ(17px)', backgroundImage: `linear-gradient(to left, ${boxPalette.edge}, ${boxPalette.side})` }}
                  />
                  <div className="absolute inset-[9%]">
                    {selectedItems.map((item, index) => {
                      const placement = previewPlacements[index % previewPlacements.length]
                      return (
                        <motion.div
                          key={`${item.id}-${index}`}
                          layout
                          initial={{ opacity: 0, scale: 0.84 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                          className="absolute"
                          title={item.name}
                          style={{
                            left: placement.left,
                            top: placement.top,
                            width: placement.width,
                            height: placement.height,
                            zIndex: placement.zIndex,
                            transform: `rotateZ(${placement.rotate}deg) translateZ(${index === 0 ? 8 : 14 + (index % 3) * 4}px)`,
                            transformStyle: 'preserve-3d'
                          }}
                        >
                          <div className="relative h-full w-full overflow-hidden rounded-md border-[3px] border-[#F8F1E3] bg-[#F8F1E3] shadow-[0_10px_12px_rgba(52,37,22,0.42)] sm:rounded-lg sm:border-4">
                            <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                            <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-[#35291F]/85 via-[#35291F]/45 to-transparent px-1 pb-1 pt-3 text-center text-[8px] font-medium text-white sm:text-[9px]">
                              {item.name}
                            </span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                  <div className="pointer-events-none absolute inset-x-0 bottom-[-8%] z-[55] flex justify-center">
                    <span className="rounded-full border border-[#E6D3B7]/70 bg-[#FFF9ED]/90 px-3 py-1 text-[9px] uppercase tracking-[0.14em] text-[#715A42] shadow-[0_4px_12px_rgba(67,48,29,0.2)]">
                      {previewItems.length} {previewItems.length === 1 ? 'piece' : 'pieces'} · made with love
                    </span>
                  </div>
                </div>
              </div>

              {(recipientName.trim() || personalNote.trim()) && (
                <motion.div
                  key={`${recipientName}-${personalNote}`}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute bottom-[6%] left-1/2 z-[70] max-w-[48%] -translate-x-1/2 rounded-md border border-[#E7D7C6] bg-[#FFFCF5]/95 px-2.5 py-1.5 text-center shadow-[0_5px_16px_rgba(67,48,29,0.22)]"
                >
                  {recipientName.trim() && (
                    <p className="truncate font-serif-title text-[10px] italic text-[#80695A]">For {recipientName.trim()}</p>
                  )}
                  {personalNote.trim() && (
                    <p className="mt-0.5 line-clamp-2 text-[8px] leading-tight text-[#8D7B6C]">{personalNote.trim()}</p>
                  )}
                </motion.div>
              )}
            </div>

            <p className={`mt-2 px-1 text-[10px] leading-relaxed ${mutedTextClass}`}>
              This preview is for 2D representation purposes only. The actual product may differ.
            </p>

            <section aria-labelledby="total-heading" className={`mt-5 rounded-2xl border p-5 sm:p-6 ${cardClass}`}>
              <div className="flex items-start justify-between gap-4 border-b border-black/[0.07] pb-4 dark:border-white/[0.09]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A96F61]">Your selection</p>
                  <h3 className="mt-1 font-serif-title text-lg font-medium">Your custom gift</h3>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] ${isDark ? 'bg-white/10' : 'bg-[#F4EEE7]'}`}>
                  {previewItems.length} items
                </span>
              </div>
              <div className={`mt-4 space-y-2.5 text-xs ${mutedTextClass}`}>
                <div className="flex justify-between gap-4">
                  <span className="truncate">{selectedBox.name}</span>
                  <span className="shrink-0 tabular-nums">{formatPrice(selectedBox.price)}</span>
                </div>
                {selectedItemGroups.map(({ item, quantity }) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className={`flex items-center gap-1 rounded-full border p-0.5 ${
                        isDark ? 'border-[#463A35] bg-[#1C1816]' : 'border-[#E5D9CE] bg-[#FFFEFC]'
                      }`}>
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name} quantity`}
                          onClick={() => adjustItemQuantity(item, -1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[#A96F61] transition-colors hover:bg-[#A96F61]/10"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="min-w-4 text-center text-[11px] font-medium tabular-nums">{quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.name} quantity`}
                          onClick={() => adjustItemQuantity(item, 1)}
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[#A96F61] transition-colors hover:bg-[#A96F61]/10"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="w-16 text-right tabular-nums">{formatPrice(item.price * quantity)}</span>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between gap-4 border-t border-black/[0.07] pt-3 dark:border-white/[0.09]">
                  <span>Gift note & presentation</span>
                  <span className="font-medium text-[#74836E]">Complimentary</span>
                </div>
                <p className="text-[10px] leading-relaxed">Delivery charges, if applicable, are calculated at checkout.</p>
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-black/[0.07] pt-4 dark:border-white/[0.09]">
                <div>
                  <h2 id="total-heading" className="font-serif-title text-base font-medium">Total payable</h2>
                  <p className={`mt-0.5 text-[10px] ${mutedTextClass}`}>For your gift selection</p>
                </div>
                <span className="font-serif-title text-2xl font-semibold tabular-nums text-[#A96F61]">
                  {formatPrice(totalPrice)}
                </span>
              </div>
              <motion.button
                type="button"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateAndAdd}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#A96F61] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#925D52]"
              >
                <ShoppingBag className="h-4 w-4" />
                Add your gift to bag
              </motion.button>
            </section>
          </aside>
        </div>
      </div>
    </motion.main>
  )
}
