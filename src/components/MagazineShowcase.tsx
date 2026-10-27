import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Sparkles, Check, ArrowRight, BookOpen, Layers } from 'lucide-react'
import { FinishType, Product } from '../types'
import { BrandLogo } from './BrandLogo'

interface MagazineShowcaseProps {
  isDarkMode: boolean
  onCustomizeMagazine: (finish: FinishType, recipientName: string) => void
}

export const MagazineShowcase: React.FC<MagazineShowcaseProps> = ({
  isDarkMode,
  onCustomizeMagazine
}) => {
  const [selectedFinish, setSelectedFinish] = useState<FinishType>('matte')
  const [recipientName, setRecipientName] = useState('Ananya')
  const [occasionType, setOccasionType] = useState('Birthday')
  const [customMessage, setCustomMessage] = useState('To the sweetest memories we have lived and the ones yet to blossom')

  const titlePreview = recipientName.trim()
    ? `${recipientName.toUpperCase()}’S ${occasionType.toUpperCase()} EDITION`
    : `A SPECIAL ${occasionType.toUpperCase()} EDITION`

  return (
    <section className={`py-20 sm:py-28 transition-colors duration-500 border-t border-b ${
      isDarkMode 
        ? 'bg-[#1A1615] border-[#2E2422] text-[#F3EBE6]' 
        : 'bg-[#F8F1EB] border-[#E8D4CB] text-[#2C2422]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Editorial Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="font-editorial text-xs tracking-widest text-[#B36D6D] uppercase font-semibold">
            Signature Creation
          </span>
          <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl tracking-tight mt-2">
            Your story, made into a magazine
          </h2>
          <p className="font-sans-body text-sm text-[#7D6B65] dark:text-[#BAAAA3] mt-3 leading-relaxed">
            Favourite photographs, inside jokes, little memories, and big milestones. Bring them together and create a keepsake publication that feels completely yours.
          </p>

          <div className="flex justify-center items-center gap-4 text-xs tracking-widest uppercase text-[#B36D6D] font-medium mt-4">
            <span>Your Memories</span>
            <span>·</span>
            <span>Your Stories</span>
            <span>·</span>
            <span>Your People</span>
            <span>·</span>
            <span>Your Magazine</span>
          </div>
        </div>

        {/* Interactive Customizer & Live Magazine Mockup Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Live Magazine Spread Display */}
          <div className="lg:col-span-6 flex justify-center">
            <motion.div
              layout
              className={`relative w-full max-w-md aspect-[3/4] rounded-2xl shadow-2xl overflow-hidden border transition-all duration-500 ${
                selectedFinish === 'gloss'
                  ? 'ring-4 ring-amber-100/60 shadow-rose-900/20'
                  : 'shadow-neutral-900/25'
              }`}
              style={{
                backgroundColor: isDarkMode ? '#221B19' : '#FFFFFF',
                borderColor: isDarkMode ? '#483531' : '#E0CBC2'
              }}
            >
              {/* Gloss finish simulated specular reflection sheen */}
              {selectedFinish === 'gloss' && (
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none z-20" />
              )}

              {/* Matte finish simulated subtle paper grain */}
              {selectedFinish === 'matte' && (
                <div className="absolute inset-0 bg-[#000000]/[0.02] dark:bg-[#FFFFFF]/[0.02] pointer-events-none z-20" />
              )}

              {/* Spine shadow simulation */}
              <div className="absolute top-0 bottom-0 left-0 w-6 bg-gradient-to-r from-black/25 via-black/10 to-transparent z-10" />

              {/* Inner Magazine Cover Content */}
              <div className="relative h-full flex flex-col justify-between p-8 sm:p-10 z-0">
                {/* Masthead Header */}
                <div className="border-b border-black/10 dark:border-white/10 pb-4">
                  <div className="flex items-center justify-between text-[10px] tracking-[0.25em] uppercase text-[#B36D6D]">
                    <span className="flex items-center gap-1">
                      <BrandLogo isDarkMode={isDarkMode} className="h-5 w-8 object-contain" />
                      ARCHIVES
                    </span>
                    <span>VOL · 2026</span>
                  </div>
                  <BrandLogo isDarkMode={isDarkMode} className="mx-auto mt-2 block h-16 w-32 object-contain" />
                  <p className="font-editorial text-center text-xs tracking-widest text-[#8F5A54] dark:text-[#D5AEA7] italic mt-1">
                    Made With Love For You
                  </p>
                </div>

                {/* Cover Photograph Mockup */}
                <div className="my-auto py-4">
                  <div className="relative aspect-[4/3] rounded-xl overflow-hidden shadow-inner border border-black/5">
                    <img
                      src="https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80"
                      alt="Magazine feature photograph"
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    
                    {/* Live Dynamic Recipient Banner */}
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <motion.div
                        key={titlePreview}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="font-serif-title text-sm sm:text-base font-semibold tracking-wide"
                      >
                        {titlePreview}
                      </motion.div>
                    </div>
                  </div>

                  {/* Dynamic Custom Message Excerpt */}
                  <div className="mt-4 text-center px-2">
                    <p className="font-editorial text-xs italic text-[#7C6963] dark:text-[#B6A6A0] line-clamp-2">
                      “{customMessage}”
                    </p>
                  </div>
                </div>

                {/* Footer Bar of Magazine Cover */}
                <div className="border-t border-black/10 dark:border-white/10 pt-3 flex items-center justify-between text-[10px] tracking-wider uppercase text-[#88746F] dark:text-[#A79690]">
                  <span>Finish: {selectedFinish.toUpperCase()}</span>
                  <span>Collectors Issue</span>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Customization Controls */}
          <div className="lg:col-span-6 space-y-6">
            <div>
              <span className="font-editorial text-xs uppercase tracking-widest text-[#B36D6D] font-semibold">
                Make It Personal
              </span>
              <h3 className="font-serif-title text-2xl sm:text-3xl tracking-tight mt-1">
                Customize in real time
              </h3>
              <p className="font-sans-body text-xs text-[#7B6862] dark:text-[#BBAAA3] mt-1">
                Type details below to preview how your bespoke magazine edition appears
              </p>
            </div>

            {/* Finish Selection */}
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#8E7973] dark:text-[#BCAAA4] mb-2">
                Choose Print Finish
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFinish('matte')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedFinish === 'matte'
                      ? 'border-[#B36D6D] bg-[#B36D6D]/10 text-[#8C4F4A] dark:text-[#F3C2BA] shadow-xs'
                      : isDarkMode
                        ? 'border-[#382C29] bg-[#221B1A] text-[#BCAAA4]'
                        : 'border-[#DFC6BD] bg-[#FAF4F0] text-[#55433D]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif-title text-base font-semibold">MATTE</span>
                    {selectedFinish === 'matte' && <Check className="w-4 h-4 text-[#B36D6D]" />}
                  </div>
                  <p className="text-[11px] text-[#7A6761] dark:text-[#AA9892] mt-1 leading-snug">
                    Velvet tactile paper, soft subtle and elegant glare free touch
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFinish('gloss')}
                  className={`p-4 rounded-2xl border text-left transition-all ${
                    selectedFinish === 'gloss'
                      ? 'border-[#B36D6D] bg-[#B36D6D]/10 text-[#8C4F4A] dark:text-[#F3C2BA] shadow-xs'
                      : isDarkMode
                        ? 'border-[#382C29] bg-[#221B1A] text-[#BCAAA4]'
                        : 'border-[#DFC6BD] bg-[#FAF4F0] text-[#55433D]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-serif-title text-base font-semibold">GLOSS</span>
                    {selectedFinish === 'gloss' && <Check className="w-4 h-4 text-[#B36D6D]" />}
                  </div>
                  <p className="text-[11px] text-[#7A6761] dark:text-[#AA9892] mt-1 leading-snug">
                    Vibrant luster, brilliant rich contrast and silky smooth reflection
                  </p>
                </button>
              </div>
            </div>

            {/* Recipient Name Input */}
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#8E7973] dark:text-[#BCAAA4] mb-1.5">
                Recipient Name
              </label>
              <input
                type="text"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Enter recipient name e.g. Ananya"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                  isDarkMode
                    ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]'
                    : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                }`}
              />
            </div>

            {/* Occasion Selection */}
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#8E7973] dark:text-[#BCAAA4] mb-1.5">
                Occasion Theme
              </label>
              <div className="flex gap-2">
                {['Birthday', 'Anniversary', 'Celebration'].map((occ) => (
                  <button
                    key={occ}
                    type="button"
                    onClick={() => setOccasionType(occ)}
                    className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                      occasionType === occ
                        ? 'bg-[#B36D6D] text-white'
                        : isDarkMode
                          ? 'bg-[#271F1E] text-[#BBA9A3] hover:bg-[#342927]'
                          : 'bg-[#EFE2DC] text-[#5A4843] hover:bg-[#E7D4CD]'
                    }`}
                  >
                    {occ}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Dedication Note */}
            <div>
              <label className="block text-xs font-medium tracking-wide uppercase text-[#8E7973] dark:text-[#BCAAA4] mb-1.5">
                Dedication Message
              </label>
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Write your personal dedication note"
                className={`w-full px-4 py-3 rounded-xl border text-sm transition-colors focus:outline-hidden focus:border-[#B36D6D] resize-none ${
                  isDarkMode
                    ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]'
                    : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                }`}
              />
            </div>

            {/* Order / Add to Bag CTA */}
            <div className="pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onCustomizeMagazine(selectedFinish, recipientName || 'Beloved')}
                className="w-full py-4 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] text-white text-sm font-medium tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2"
              >
                <BookOpen className="w-4 h-4" />
                <span>Make Your Magazine · ₹799</span>
                <ArrowRight className="w-4 h-4" />
              </motion.button>
              <p className="text-center text-[11px] text-[#9A8781] dark:text-[#9A8781] mt-2">
                Includes complimentary heavy card envelope and rose silk ribbon
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  )
}
