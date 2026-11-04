import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { ChevronDown, Gift, Minus, Plus, ShoppingBag, Sparkles, X } from 'lucide-react'
import type { CartItem, Product, StoreCategory } from '../types'
import { PRODUCTS } from '../data/products'
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

const formatPrice = (price: number) => `₹${price.toLocaleString('en-IN')}`

export const CustomGiftBuilder: React.FC<CustomGiftBuilderProps> = ({
  isDarkMode,
  onClose,
  onAddCustomHamperToBag,
  categories = [],
  products = []
}) => {
  const [selectedItems, setSelectedItems] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState(
    categories.find(category => category.slug !== 'magazines')?.slug ?? categories[0]?.slug ?? ''
  )
  const [recipientName, setRecipientName] = useState('')
  const [personalNote, setPersonalNote] = useState('')

  const selectedItemGroups = selectedItems.reduce<Array<{ item: Product; quantity: number }>>((groups, item) => {
    const existing = groups.find(group => group.item.id === item.id)
    if (existing) existing.quantity += 1
    else groups.push({ item, quantity: 1 })
    return groups
  }, [])
  const totalPrice = selectedItemGroups.reduce((sum, group) => sum + group.item.price * group.quantity, 0)
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
    const components = selectedItemGroups.map(({ item, quantity }) => {
      const magazineOption = item.id.match(/^(.*)-([48])-page$/)
      return {
        productId: magazineOption?.[1] ?? item.id,
        name: item.name,
        price: item.price,
        quantity,
        ...(magazineOption ? { magazinePageCount: Number(magazineOption[2]) as 4 | 8 } : {})
      }
    })
    const newCartItem: CartItem = {
      cartId: `custom_${Date.now()}`,
      productId: 'custom_hamper_mix',
      name: 'Custom Mix & Match Hamper',
      price: totalPrice,
      quantity: 1,
      imageUrl: selectedItems[0]?.imageUrl ?? '',
      recipientName: recipientName.trim() || undefined,
      customMessage: personalNote.trim() || undefined,
      customComponents: components.map(component => (
        component.quantity > 1 ? `${component.quantity} × ${component.name}` : component.name
      )),
      customGiftCustomization: { components }
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
              Pick the products you love, add a personal note, and make a gift that feels like them.
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
            <section aria-labelledby="items-heading">
              <div className="mb-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A96F61]">01 · The little details</p>
                  <h2 id="items-heading" className="mt-1 font-serif-title text-2xl font-medium">Choose your gift items</h2>
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
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A96F61]">02 · A personal note</p>
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
                    maxLength={100}
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
                    maxLength={1000}
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
              <span className={`text-[11px] ${mutedTextClass}`}>Open gift box</span>
            </div>

            <div
              className="relative mx-auto aspect-[3/4] w-full max-w-[420px] overflow-hidden rounded-[1.75rem] border border-[#E8E4DF] shadow-[0_20px_44px_-24px_rgba(80,54,34,0.28)]"
              style={{
                background: isDark
                  ? 'radial-gradient(ellipse at 50% 42%, #3b332f 0%, #211d1a 72%)'
                  : 'radial-gradient(ellipse at 50% 42%, #fffdfa 0%, #f3efeb 75%)'
              }}
            >
              <img
                src="/illustrations/aurel-gift-box-preview.png"
                alt="An open AUREL gift box with pink shopping bags"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-x-[24%] top-[64%] bottom-[13%] z-10 grid auto-rows-min grid-cols-3 content-start justify-items-center gap-x-1 gap-y-1 overflow-y-auto px-1 pt-1 sm:gap-x-2 sm:gap-y-2 sm:px-2">
                {selectedItemGroups.length ? selectedItemGroups.map(({ item, quantity }) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.85, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                    title={item.name}
                    className={`relative flex min-w-0 max-w-[72px] flex-col items-center rounded-md px-1 py-0.5 sm:max-w-[86px] sm:rounded-lg sm:px-1.5 sm:py-1 ${
                      isDark ? 'bg-[#2A2522]/90' : 'bg-white/90'
                    } shadow-[0_2px_7px_rgba(45,35,28,0.2)]`}
                  >
                    {quantity > 1 && (
                      <span className="absolute -right-1 -top-1 z-10 grid h-4 min-w-4 place-items-center rounded-full bg-[#A96F61] px-1 text-[9px] font-bold text-white">
                        {quantity}
                      </span>
                    )}
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="h-7 w-full object-contain sm:h-9"
                    />
                    <span className={`mt-0.5 w-full truncate text-center text-[8px] font-medium leading-tight sm:text-[9px] ${
                      isDark ? 'text-[#F3EBE6]' : 'text-[#51443D]'
                    }`}>
                      {item.name}
                    </span>
                  </motion.div>
                )) : (
                  <p className={`col-span-3 rounded-xl px-3 py-2 text-center text-[10px] ${
                    isDark ? 'bg-[#2A2522]/80 text-[#BBAAA1]' : 'bg-white/85 text-[#82736A]'
                  }`}>
                    Your chosen items will appear here
                  </p>
                )}
              </div>
            </div>

            <p className={`mt-2 px-1 text-[10px] leading-relaxed ${mutedTextClass}`}>
              Your selected items appear inside the open gift box, with short labels.
            </p>

            <section aria-labelledby="total-heading" className={`mt-5 rounded-2xl border p-5 sm:p-6 ${cardClass}`}>
              <div className="flex items-start justify-between gap-4 border-b border-black/[0.07] pb-4 dark:border-white/[0.09]">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#A96F61]">Your selection</p>
                  <h3 className="mt-1 font-serif-title text-lg font-medium">Your custom gift</h3>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[10px] ${isDark ? 'bg-white/10' : 'bg-[#F4EEE7]'}`}>
                  {selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>
              <div className={`mt-4 space-y-2.5 text-xs ${mutedTextClass}`}>
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
                disabled={selectedItems.length === 0}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#A96F61] px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-[#925D52] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ShoppingBag className="h-4 w-4" />
                {selectedItems.length ? 'Add your gift to bag' : 'Choose at least one gift item'}
              </motion.button>
            </section>
          </aside>
        </div>
      </div>
    </motion.main>
  )
}
