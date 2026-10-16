import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Star, Heart, Sparkles, Send, CheckCircle2, Mail, MessageCircle, Shield, Award } from 'lucide-react'
import { REVIEWS } from '../data/products'

interface StoryAndReviewsProps {
  isDarkMode: boolean
  onExploreGifts: () => void
}

export const StoryAndReviews: React.FC<StoryAndReviewsProps> = ({
  isDarkMode,
  onExploreGifts
}) => {
  const [activeReviewIndex, setActiveReviewIndex] = useState(0)
  const [supportMessageSent, setSupportMessageSent] = useState(false)
  const [supportEmail, setSupportEmail] = useState('')
  const [supportNote, setSupportNote] = useState('')

  const trustPillars = [
    {
      symbol: '♡',
      title: 'Personal',
      description: 'Made around your person, your cherished memories, and your shared story'
    },
    {
      symbol: '✦',
      title: 'Thoughtful',
      description: 'Every blossom, paper weight, and silk ribbon is chosen with sincere intention'
    },
    {
      symbol: '⌁',
      title: 'Handmade',
      description: 'Thoughtfully arranged flowers and hand bound magazines made with patience'
    },
    {
      symbol: '∞',
      title: 'Memorable',
      description: 'Because the best gestures become keepsakes that transcend passing years'
    }
  ]

  const instagramCards = [
    {
      id: 'ig_1',
      title: 'Anniversary Keepsake Book',
      likes: 248,
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'ig_2',
      title: 'Blush Garden Roses & Silk',
      likes: 312,
      imageUrl: 'https://images.unsplash.com/photo-1561181286-d3fee7d55364?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'ig_3',
      title: 'A Bouquet to Remember',
      likes: 420,
      imageUrl: '/collections/Bouquets/Bloom%20elan%202.png'
    },
    {
      id: 'ig_4',
      title: 'Bespoke Keepsake Hamper',
      likes: 289,
      imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80'
    }
  ]

  const handleSendSupport = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supportEmail) return
    setSupportMessageSent(true)
    setTimeout(() => {
      setSupportMessageSent(false)
      setSupportEmail('')
      setSupportNote('')
    }, 4000)
  }

  return (
    <div className={`transition-colors duration-500 ${
      isDarkMode ? 'bg-[#181615] text-[#F3EBE6]' : 'bg-[#FAF7F2] text-[#2C2422]'
    }`}>
      
      {/* 1. Why AUREL Section */}
      <section id="our-story" className="py-20 sm:py-28 border-t border-black/5 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="font-editorial text-xs tracking-widest text-[#B36D6D] uppercase font-semibold">
              Our Guiding Heart
            </span>
            <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl tracking-tight mt-2">
              It is more than a gift. <br />
              <span className="italic font-normal text-[#B36D6D]">It is the thought behind it.</span>
            </h2>
            <p className="font-sans-body text-sm text-[#7D6B65] dark:text-[#BAAAA3] mt-4 leading-relaxed">
              At AUREL, we believe the best gifts are not simply bought. They are thought about, personalized, and given with meaning. Every piece is created to make someone smile, feel loved, and cherish the moment long after the gift is opened.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {trustPillars.map((pillar, i) => (
              <motion.div
                key={pillar.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className={`p-6 sm:p-8 rounded-3xl border text-center transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-[#201A19] border-[#382B28]' 
                    : 'bg-[#FFFFFF] border-[#E8D4CB]'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-[#B36D6D]/15 text-[#B36D6D] text-2xl flex items-center justify-center mx-auto mb-4">
                  {pillar.symbol}
                </div>
                <h3 className="font-serif-title text-lg font-semibold tracking-wide mb-2 uppercase text-[#B36D6D]">
                  {pillar.title}
                </h3>
                <p className="font-sans-body text-xs text-[#7B6862] dark:text-[#BBA8A1] leading-relaxed">
                  {pillar.description}
                </p>
              </motion.div>
            ))}
          </div>

        </div>
      </section>

      {/* 2. Editorial Reviews Section */}
      <section className={`py-20 sm:py-24 border-t border-b ${
        isDarkMode 
          ? 'bg-[#1C1716] border-[#342724]' 
          : 'bg-[#F6EEE7] border-[#E8D2C7]'
      }`}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <span className="font-editorial text-xs tracking-widest text-[#B36D6D] uppercase font-semibold">
            Testimonies of Love
          </span>
          <h2 className="font-serif-title text-3xl sm:text-4xl tracking-tight mt-2 mb-10">
            Loved by the people who gave it
          </h2>

          {/* Active Review Spotlight */}
          <div className="min-h-[160px] flex flex-col justify-center max-w-3xl mx-auto">
            <p className="font-editorial text-xl sm:text-2xl lg:text-3xl font-light italic leading-relaxed text-[#2C2321] dark:text-[#F3EBE6]">
              “{REVIEWS[activeReviewIndex].comment}”
            </p>

            <div className="mt-6 flex flex-col items-center justify-center gap-1">
              <div className="flex items-center gap-1 text-[#B36D6D]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#B36D6D]" />
                ))}
              </div>
              <span className="font-serif-title text-base font-semibold mt-1">
                {REVIEWS[activeReviewIndex].name} · {REVIEWS[activeReviewIndex].city}
              </span>
              <span className="text-xs text-[#8E7973] dark:text-[#A79690]">
                {REVIEWS[activeReviewIndex].occasion} · {REVIEWS[activeReviewIndex].productName}
              </span>
            </div>
          </div>

          {/* Review Switcher Dots */}
          <div className="flex justify-center items-center gap-2 mt-8">
            {REVIEWS.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveReviewIndex(idx)}
                aria-label={`View review ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 ${
                  activeReviewIndex === idx
                    ? 'w-8 bg-[#B36D6D]'
                    : 'w-2 bg-[#B36D6D]/30 hover:bg-[#B36D6D]/60'
                }`}
              />
            ))}
          </div>

          <div className="mt-8 text-xs text-[#8E7973] dark:text-[#A89690] tracking-wider uppercase font-medium">
            ★★★★★ 4.9 / 5 Overall Rating Based on 200+ Cherished Deliveries
          </div>

        </div>
      </section>

      {/* 3. Moments Worth Sharing (Social Gallery) */}
      <section className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-xl mx-auto mb-12">
            <span className="font-editorial text-xs tracking-widest text-[#B36D6D] uppercase font-semibold">
              Community Gallery
            </span>
            <h2 className="font-serif-title text-3xl sm:text-4xl tracking-tight mt-1">
              Made for moments worth sharing
            </h2>
            <p className="font-sans-body text-xs sm:text-sm text-[#7D6B65] dark:text-[#BAAAA3] mt-2">
              Glimpses of unboxings, anniversary smiles, and treasured keepsakes
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {instagramCards.map((item) => (
              <div
                key={item.id}
                className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm cursor-pointer border border-black/5"
              >
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-4 text-center">
                  <div className="flex items-center gap-1.5 text-sm font-semibold mb-1">
                    <Heart className="w-4 h-4 fill-white" />
                    <span>{item.likes}</span>
                  </div>
                  <span className="text-xs font-serif-title">
                    {item.title}
                  </span>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* 4. Support & Concierge Section */}
      <section id="concierge" className={`py-16 sm:py-20 border-t ${
        isDarkMode ? 'bg-[#1D1817] border-[#342724]' : 'bg-[#F7EFE8] border-[#E8D4C9]'
      }`}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
            <div>
              <span className="font-editorial text-xs tracking-widest text-[#B36D6D] uppercase font-semibold">
                Personal Assistance
              </span>
              <h3 className="font-serif-title text-2xl sm:text-3xl tracking-tight mt-1">
                AUREL Concierge Support
              </h3>
              <p className="font-sans-body text-xs sm:text-sm text-[#7D6B65] dark:text-[#BAAAA3] mt-2 leading-relaxed">
                Need guidance tailoring a custom anniversary magazine, assembling an exclusive bulk hamper, or arranging immediate delivery? Our concierge is at your service.
              </p>

              <div className="mt-6 space-y-3 text-xs">
                <div className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-[#B36D6D]" />
                  <span className="font-medium">concierge@aurelgifts.com</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-[#B36D6D]" />
                  <span className="font-medium">WhatsApp Priority: +91 98765 43210</span>
                </div>
              </div>
            </div>

            {/* Quick Contact Box */}
            <div className={`p-6 rounded-3xl border shadow-sm ${
              isDarkMode ? 'bg-[#241D1C] border-[#3F302D]' : 'bg-[#FFFFFF] border-[#E5CEC4]'
            }`}>
              {supportMessageSent ? (
                <div className="text-center py-6 space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                  <h4 className="font-serif-title text-lg font-medium">
                    Message Transmitted
                  </h4>
                  <p className="text-xs text-[#8A7771]">
                    Our concierge will reach out to you within two hours
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSendSupport} className="space-y-3.5">
                  <h4 className="font-serif-title text-base font-semibold">
                    Request Concierge Advice
                  </h4>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A7771] mb-1">
                      Your Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="name@domain.com"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                        isDarkMode ? 'bg-[#1B1615] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FAF4F0] border-[#DEC5BB] text-[#2C2321]'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-[#8A7771] mb-1">
                      Your Note or Question
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={supportNote}
                      onChange={(e) => setSupportNote(e.target.value)}
                      placeholder="Tell us about the celebration or custom requirements"
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] resize-none ${
                        isDarkMode ? 'bg-[#1B1615] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FAF4F0] border-[#DEC5BB] text-[#2C2321]'
                      }`}
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] text-white text-xs font-semibold uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Concierge</span>
                  </button>
                </form>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* 5. Final Emotional Homepage CTA */}
      <section className="py-20 sm:py-28 text-center relative overflow-hidden">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 relative z-10">
          <span className="font-editorial text-xs tracking-widest text-[#B36D6D] uppercase font-semibold">
            The Lasting Keepsake
          </span>

          <h2 className="font-serif-title text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.12]">
            Give them something <br />
            <span className="italic font-normal text-[#B36D6D]">they will remember.</span>
          </h2>

          <p className="font-editorial text-xl text-[#7E655F] dark:text-[#C7B3AC] max-w-lg mx-auto font-light">
            A little thought can become a favourite memory.
          </p>

          <div className="pt-4">
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={onExploreGifts}
              className="px-8 py-4 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] text-white text-xs font-semibold uppercase tracking-wider shadow-lg transition-all"
            >
              Explore Bespoke Gifts
            </motion.button>
          </div>

          <div className="pt-8">
            <p className="font-serif-title text-xl tracking-[0.2em] font-light">
              AUREL
            </p>
            <p className="font-editorial text-xs text-[#8E7973] dark:text-[#A79690] mt-1">
              Made for your people · Made for your moments
            </p>
          </div>
        </div>
      </section>

    </div>
  )
}
