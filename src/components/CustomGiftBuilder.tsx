import React, { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Sparkles, Check, Plus, Trash2, ShoppingBag, ArrowRight, X } from 'lucide-react'
import { BuilderItem, CartItem } from '../types'
import { BUILDER_ITEMS } from '../data/products'

interface CustomGiftBuilderProps {
  isDarkMode: boolean
  onClose: () => void
  onAddCustomHamperToBag: (item: CartItem) => void
}

export const CustomGiftBuilder: React.FC<CustomGiftBuilderProps> = ({
  isDarkMode,
  onClose,
  onAddCustomHamperToBag
}) => {
  // Selected items state
  const [selectedBox, setSelectedBox] = useState<BuilderItem>(BUILDER_ITEMS.find(i => i.category === 'box') || BUILDER_ITEMS[0])
  const [selectedItems, setSelectedItems] = useState<BuilderItem[]>([
    BUILDER_ITEMS.find(i => i.id === 'flower_single_rose') || BUILDER_ITEMS[2],
    BUILDER_ITEMS.find(i => i.id === 'keep_candle') || BUILDER_ITEMS[4]
  ])
  const [recipientName, setRecipientName] = useState('')
  const [personalNote, setPersonalNote] = useState('')
  const [hamperTitle, setHamperTitle] = useState('My Bespoke Keepsake Hamper')

  // Total price calculation
  const totalPrice = selectedBox.price + selectedItems.reduce((sum, item) => sum + item.price, 0)

  const toggleItemSelection = (item: BuilderItem) => {
    if (selectedItems.some(i => i.id === item.id)) {
      setSelectedItems(selectedItems.filter(i => i.id !== item.id))
    } else {
      setSelectedItems([...selectedItems, item])
    }
  }

  const handleCreateAndAdd = () => {
    const itemNames = [selectedBox.name, ...selectedItems.map(i => i.name)]
    const newCartItem: CartItem = {
      cartId: 'custom_' + Date.now(),
      productId: 'custom_hamper_mix',
      name: hamperTitle.trim() || 'Custom Mix & Match Hamper',
      price: totalPrice,
      quantity: 1,
      imageUrl: selectedBox.imageUrl,
      recipientName: recipientName.trim() || undefined,
      customMessage: personalNote.trim() || undefined,
      customComponents: itemNames
    }

    onAddCustomHamperToBag(newCartItem)
  }

  const groupedCategories = [
    { title: 'Step 1: Choose Your Keepsake Box', category: 'box' },
    { title: 'Step 2: Add Botanical & Floral Stems', category: 'flower' },
    { title: 'Step 3: Include Scented Keepsakes & Folios', category: 'keepsake' },
    { title: 'Step 4: Indulgent Treats', category: 'treat' },
    { title: 'Step 5: Ribbons & Parchment Cards', category: ['card', 'ribbon'] }
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      className={`min-h-screen py-16 transition-colors duration-500 ${
        isDarkMode ? 'bg-[#181615] text-[#F3EBE6]' : 'bg-[#FAF7F2] text-[#2C2422]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Studio Top Header */}
        <div className="flex items-center justify-between pb-8 mb-10 border-b border-black/5 dark:border-white/5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider text-[#B36D6D] bg-[#B36D6D]/10 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mix & Match Studio</span>
            </div>
            <h1 className="font-serif-title text-3xl sm:text-4xl font-normal tracking-tight">
              Create Your Custom Hamper
            </h1>
            <p className="font-sans-body text-xs sm:text-sm text-[#7D6B65] dark:text-[#BBAAA3] mt-1">
              Select your presentation box, pick individual treasures, and write your heartfelt message
            </p>
          </div>

          <button
            onClick={onClose}
            aria-label="Back to collection"
            className={`p-3 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-[#2A2321] text-[#E0D2CB]' : 'hover:bg-[#EFE2DC] text-[#4A3B37]'
            }`}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Studio 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Selection Steps */}
          <div className="lg:col-span-7 space-y-10">
            
            {/* Box Selection */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif-title text-xl font-medium tracking-wide">
                  1. Presentation Gift Box
                </h3>
                <span className="text-xs text-[#B36D6D] font-medium">
                  Select 1 Box Base
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BUILDER_ITEMS.filter(i => i.category === 'box').map((box) => {
                  const isSelected = selectedBox.id === box.id
                  return (
                    <div
                      key={box.id}
                      onClick={() => setSelectedBox(box)}
                      className={`p-4 rounded-2xl cursor-pointer border transition-all duration-300 relative group flex gap-3.5 items-center ${
                        isSelected
                          ? 'border-[#B36D6D] bg-[#B36D6D]/10 ring-2 ring-[#B36D6D]/20'
                          : isDarkMode
                            ? 'border-[#382C29] bg-[#221B1A] hover:border-[#523F3B]'
                            : 'border-[#DFC6BD] bg-[#FAF5F1] hover:border-[#B36D6D]/50'
                      }`}
                    >
                      <img
                        src={box.imageUrl}
                        alt={box.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif-title text-sm font-semibold truncate">
                            {box.name}
                          </h4>
                          {isSelected && <Check className="w-4 h-4 text-[#B36D6D] shrink-0" />}
                        </div>
                        <p className="text-[11px] text-[#7E6B65] dark:text-[#A79690] line-clamp-1 mt-0.5">
                          {box.description}
                        </p>
                        <span className="text-xs font-semibold text-[#B36D6D] tabular-nums mt-1 block">
                          ₹{box.price}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Individual Items Mix & Match */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif-title text-xl font-medium tracking-wide">
                  2. Choose Mix & Match Elements
                </h3>
                <span className="text-xs text-[#8E7B75] dark:text-[#BBAAA4]">
                  {selectedItems.length} elements selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {BUILDER_ITEMS.filter(i => i.category !== 'box').map((item) => {
                  const isSelected = selectedItems.some(i => i.id === item.id)
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleItemSelection(item)}
                      className={`p-4 rounded-2xl cursor-pointer border transition-all duration-300 relative group flex gap-3.5 items-center ${
                        isSelected
                          ? 'border-[#B36D6D] bg-[#B36D6D]/10 ring-2 ring-[#B36D6D]/20'
                          : isDarkMode
                            ? 'border-[#382C29] bg-[#221B1A] hover:border-[#523F3B]'
                            : 'border-[#DFC6BD] bg-[#FAF5F1] hover:border-[#B36D6D]/50'
                      }`}
                    >
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-16 h-16 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-serif-title text-sm font-semibold truncate">
                            {item.name}
                          </h4>
                          <span className={`p-1 rounded-full text-xs ${
                            isSelected ? 'bg-[#B36D6D] text-white' : 'bg-black/5 dark:bg-white/5 text-[#887771]'
                          }`}>
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#7E6B65] dark:text-[#A79690] line-clamp-1 mt-0.5">
                          {item.description}
                        </p>
                        <span className="text-xs font-semibold text-[#B36D6D] tabular-nums mt-1 block">
                          +₹{item.price}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Step 3: Personalized Dedication */}
            <div className={`p-6 rounded-2xl border ${
              isDarkMode ? 'bg-[#221B1A] border-[#382C29]' : 'bg-[#FAF4F0] border-[#E0CBC2]'
            }`}>
              <h3 className="font-serif-title text-xl font-medium tracking-wide mb-3">
                3. Personalize The Keepsake Note
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium tracking-wide uppercase text-[#8E7973] dark:text-[#BCAAA4] mb-1">
                    Recipient Name
                  </label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="E.g. Sahil or My Dearest Maya"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                      isDarkMode
                        ? 'bg-[#1C1716] border-[#3F302D] text-[#EDE0DA]'
                        : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium tracking-wide uppercase text-[#8E7973] dark:text-[#BCAAA4] mb-1">
                    Handwritten Parchment Note
                  </label>
                  <textarea
                    rows={3}
                    value={personalNote}
                    onChange={(e) => setPersonalNote(e.target.value)}
                    placeholder="Write the message to be transcribed in calligraphy inside the hamper wax seal"
                    className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-hidden focus:border-[#B36D6D] resize-none ${
                      isDarkMode
                        ? 'bg-[#1C1716] border-[#3F302D] text-[#EDE0DA]'
                        : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                    }`}
                  />
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Live Hamper Summary & Add to Bag */}
          <div className="lg:col-span-5">
            <div className={`sticky top-28 p-6 sm:p-8 rounded-3xl border shadow-xl ${
              isDarkMode 
                ? 'bg-[#201A19] border-[#3C2E2B] text-[#F3EBE6]' 
                : 'bg-[#FFFFFF] border-[#E8D4CB] text-[#2C2422]'
            }`}>
              <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
                <span className="font-editorial text-xs uppercase tracking-widest text-[#B36D6D] font-semibold">
                  Hamper Blueprint
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#B36D6D]/15 text-[#B36D6D] font-medium">
                  {1 + selectedItems.length} items
                </span>
              </div>

              {/* Box Presentation preview */}
              <div className="py-4 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
                <img
                  src={selectedBox.imageUrl}
                  alt={selectedBox.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1">
                  <span className="text-[10px] uppercase tracking-wider text-[#B36D6D] font-semibold">
                    Foundation Box
                  </span>
                  <h4 className="font-serif-title text-sm font-semibold truncate">
                    {selectedBox.name}
                  </h4>
                  <span className="text-xs text-[#8E7973] tabular-nums">
                    ₹{selectedBox.price}
                  </span>
                </div>
              </div>

              {/* Selected Items List */}
              <div className="py-4 space-y-2.5 max-h-56 overflow-y-auto">
                <span className="text-[10px] uppercase tracking-wider text-[#8E7973] font-semibold block">
                  Included Treasures
                </span>
                {selectedItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-xs py-1">
                    <span className="text-[#5E4C47] dark:text-[#C5B4AD] truncate pr-2">
                      · {item.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-semibold text-[#B36D6D] tabular-nums">
                        ₹{item.price}
                      </span>
                      <button
                        onClick={() => toggleItemSelection(item)}
                        className="text-[#98847E] hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Recipient summary if typed */}
              {recipientName && (
                <div className="p-3 rounded-xl bg-[#B36D6D]/10 text-xs mb-4">
                  <span className="font-semibold text-[#B36D6D]">To: </span>
                  <span>{recipientName}</span>
                </div>
              )}

              {/* Price Calculation */}
              <div className="pt-4 border-t border-black/5 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs text-[#8E7973]">
                  <span>Crafting and Presentation</span>
                  <span className="text-emerald-600 font-medium">Complimentary</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="font-serif-title text-lg font-medium">Total Price</span>
                  <span className="font-serif-title text-2xl font-bold text-[#B36D6D] tabular-nums">
                    ₹{totalPrice.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateAndAdd}
                className="w-full mt-6 py-4 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] text-white text-sm font-medium tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add Custom Hamper to Bag</span>
              </motion.button>

            </div>
          </div>

        </div>

      </div>
    </motion.div>
  )
}
