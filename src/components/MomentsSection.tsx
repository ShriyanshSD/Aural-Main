import React from 'react'
import { motion } from 'motion/react'
import { Sparkles, Calendar, Heart, Gift, Smile } from 'lucide-react'
import { ProductCategory } from '../types'

interface MomentsSectionProps {
  isDarkMode: boolean
  onSelectMoment: (category: ProductCategory) => void
}

export const MomentsSection: React.FC<MomentsSectionProps> = ({
  isDarkMode,
  onSelectMoment
}) => {
  const moments = [
    {
      id: 'birthday',
      title: 'Birthday',
      subtitle: 'Celebrate their milestone with personalized memories',
      icon: Calendar,
      category: 'magazines' as ProductCategory,
      accent: '₹799 onwards'
    },
    {
      id: 'anniversary',
      title: 'Anniversary',
      subtitle: 'Honor your journey with bound love chronicles',
      icon: Heart,
      category: 'magazines' as ProductCategory,
      accent: '₹849 onwards'
    },
    {
      id: 'milestones',
      title: 'Milestones',
      subtitle: 'Commemorate triumphs with artisanal luxury hampers',
      icon: Gift,
      category: 'hampers' as ProductCategory,
      accent: '₹1899 onwards'
    },
    {
      id: 'just_because',
      title: 'Just Because',
      subtitle: 'Send a tender bouquet just because',
      icon: Smile,
      category: 'bouquets' as ProductCategory,
      accent: 'A thoughtful surprise'
    }
  ]

  return (
    <section className={`py-20 sm:py-28 transition-colors duration-500 border-t ${
      isDarkMode 
        ? 'bg-[#181615] border-[#2C2422] text-[#F3EBE6]' 
        : 'bg-[#FAF7F2] border-[#EAD5CD]/50 text-[#2C2422]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Emotional Context */}
          <div className="lg:col-span-5 space-y-6">
            <span className="font-editorial text-xs tracking-widest text-[#B36D6D] uppercase font-semibold">
              Made For Your Moments
            </span>

            <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.15]">
              Some moments are <br />
              <span className="italic font-normal text-[#B36D6D]">too special</span> to be just another gift.
            </h2>

            <p className="font-editorial text-lg text-[#885A54] dark:text-[#D5AEA6]">
              AUREL is about making someone feel special.
            </p>

            <p className={`font-sans-body text-sm sm:text-base leading-relaxed ${
              isDarkMode ? 'text-[#C9B9B3]' : 'text-[#67544F]'
            }`}>
              Choose something beautiful, add your personal touch, and create a gift that feels like it was made just for them. Every piece is crafted with intention and delivered with quiet elegance.
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs tracking-wider uppercase text-[#B36D6D] font-medium pt-2">
              <span>Birthdays</span>
              <span className="text-[#B36D6D]">·</span>
              <span>Anniversaries</span>
              <span className="text-[#B36D6D]">·</span>
              <span>Milestones</span>
              <span className="text-[#B36D6D]">·</span>
              <span>Just Because</span>
            </div>
          </div>

          {/* Right Column: Animated Moment Cards */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {moments.map((moment, index) => {
              const Icon = moment.icon
              return (
                <motion.div
                  key={moment.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={{ y: -4 }}
                  onClick={() => onSelectMoment(moment.category)}
                  className={`p-6 rounded-2xl cursor-pointer border transition-all duration-300 relative group overflow-hidden ${
                    isDarkMode
                      ? 'bg-[#201B1A] border-[#3A2D2A] hover:border-[#B36D6D]'
                      : 'bg-[#F6EDE8] border-[#EAD5CC] hover:border-[#B36D6D]'
                  }`}
                >
                  {/* Subtle hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#B36D6D]/0 via-[#B36D6D]/0 to-[#B36D6D]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="flex items-center justify-between mb-4">
                    <span className="p-2.5 rounded-xl bg-[#B36D6D]/15 text-[#B36D6D]">
                      <Icon className="w-5 h-5" />
                    </span>
                    <span className="text-[11px] font-semibold tracking-wider text-[#B36D6D] uppercase">
                      {moment.accent}
                    </span>
                  </div>

                  <h3 className="font-serif-title text-xl font-medium tracking-wide mb-1.5 text-[#2C2321] dark:text-[#F3EBE6]">
                    {moment.title}
                  </h3>

                  <p className="font-sans-body text-xs text-[#7B6963] dark:text-[#B6A59E] leading-relaxed">
                    {moment.subtitle}
                  </p>

                  <div className="mt-4 flex items-center gap-1.5 text-xs text-[#B36D6D] font-medium tracking-wide group-hover:underline">
                    <span>Create memory</span>
                    <span className="transform transition-transform group-hover:translate-x-1">→</span>
                  </div>
                </motion.div>
              )
            })}
          </div>

        </div>
      </div>
    </section>
  )
}
