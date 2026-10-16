import React, { useState } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react'
import { Sparkles, ArrowRight, BookOpen, Gift, Heart } from 'lucide-react'

interface HeroProps {
  isDarkMode: boolean
  onExplore: () => void
  onCreateMemory: () => void
}

export const Hero: React.FC<HeroProps> = ({
  isDarkMode,
  onExplore,
  onCreateMemory
}) => {
  // Gentle mouse parallax calculation
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const springConfig = { damping: 30, stiffness: 150 }
  const smoothX = useSpring(mouseX, springConfig)
  const smoothY = useSpring(mouseY, springConfig)

  const imageRotateX = useTransform(smoothY, [-0.5, 0.5], [6, -6])
  const imageRotateY = useTransform(smoothX, [-0.5, 0.5], [-8, 8])
  const floatMoveX = useTransform(smoothX, [-0.5, 0.5], [-16, 16])
  const floatMoveY = useTransform(smoothY, [-0.5, 0.5], [-16, 16])

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const xPct = (e.clientX - rect.left) / rect.width - 0.5
    const yPct = (e.clientY - rect.top) / rect.height - 0.5
    mouseX.set(xPct)
    mouseY.set(yPct)
  }

  const handleMouseLeave = () => {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section 
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative min-h-[92vh] flex items-center justify-center overflow-hidden transition-colors duration-500 py-16 sm:py-24 ${
        isDarkMode 
          ? 'bg-gradient-to-b from-[#181615] via-[#1D1918] to-[#181615]' 
          : 'bg-gradient-to-b from-[#FAF7F2] via-[#F6EDE8] to-[#FAF7F2]'
      }`}
    >
      {/* Soft Ambient Glows in Rose and Warm Champagne */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-[#E8C7BE]/20 dark:bg-[#B36D6D]/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[30rem] h-[30rem] rounded-full bg-[#F3DDD5]/30 dark:bg-[#7D4646]/10 blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Editorial Headline & Copy */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            {/* Soft Memory Progression Breadcrumb */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full text-xs font-medium tracking-wide border transition-colors shadow-xs"
              style={{
                backgroundColor: isDarkMode ? '#28201E' : '#F4E7E1',
                borderColor: isDarkMode ? '#483531' : '#E6D0C7',
                color: '#B36D6D'
              }}
            >
              <span>A memory</span>
              <span className="text-[#B36D6D]">→</span>
              <span>becomes a gift</span>
              <span className="text-[#B36D6D]">→</span>
              <span>becomes a keepsake</span>
            </motion.div>

            {/* Display Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-serif-title text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-[1.12]"
            >
              Make moments <br />
              <span className="italic font-normal text-[#B36D6D]">worth keeping.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="font-editorial text-xl sm:text-2xl text-[#8E5E58] dark:text-[#D5AFA7] font-light"
            >
              Thoughtful gifts, made personal.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className={`font-sans-body text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 ${
                isDarkMode ? 'text-[#C9B9B3]' : 'text-[#67544F]'
              }`}
            >
              From custom magazines and beautiful bouquets to curated hampers and thoughtful keepsakes, AUREL helps you turn your favourite moments into something unforgettable.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-2"
            >
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onExplore}
                className="px-7 py-3.5 rounded-full text-sm font-medium tracking-wide text-white bg-[#B36D6D] hover:bg-[#9E5B5B] shadow-md hover:shadow-lg transition-all flex items-center gap-2 group"
              >
                <span>Explore AUREL</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={onCreateMemory}
                className={`px-7 py-3.5 rounded-full text-sm font-medium tracking-wide transition-all border flex items-center gap-2 ${
                  isDarkMode
                    ? 'border-[#523F3B] hover:border-[#B36D6D] text-[#EFE3DE] hover:bg-[#2B211F]'
                    : 'border-[#DFC6BC] hover:border-[#B36D6D] text-[#4A3B36] hover:bg-[#F2E4DE]'
                }`}
              >
                <Sparkles className="w-4 h-4 text-[#B36D6D]" />
                <span>Create a Memory</span>
              </motion.button>
            </motion.div>

            {/* Quiet Footer Note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="text-xs text-[#9E8B85] dark:text-[#9A8781] tracking-wider pt-2"
            >
              Made for birthdays, anniversaries, celebrations, and all the little moments that deserve to be remembered.
            </motion.p>
          </div>

          {/* Right Column: Hero Visual with Gentle 3D Tilt */}
          <div className="lg:col-span-6 relative flex justify-center items-center">
            <motion.div
              style={{
                rotateX: imageRotateX,
                rotateY: imageRotateY,
                transformPerspective: 1000
              }}
              transition={{ type: 'spring', damping: 25 }}
              className="relative w-full max-w-lg aspect-[4/3] sm:aspect-[16/11] rounded-3xl overflow-hidden shadow-2xl border border-black/5 dark:border-white/10 group"
            >
              <img
                src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80"
                alt="AUREL bespoke memory magazine opened on a limestone table with florals"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Ambient Glass Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />

              {/* Live Editorial Overlay Tag */}
              <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-white/85 dark:bg-[#1D1716]/85 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-widest text-[#B36D6D] font-semibold">
                    The Keepsake Edition
                  </span>
                  <h3 className="font-serif-title text-base font-medium text-[#292220] dark:text-[#F3EBE6]">
                    Ananya and Vikram · First Anniversary
                  </h3>
                  <p className="text-xs text-[#7B6862] dark:text-[#A99892]">
                    Available in Velvet Matte & Radiant Gloss
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold text-[#B36D6D] tabular-nums">
                    ₹849
                  </span>
                  <div className="text-[10px] text-[#8E7C76] dark:text-[#9F8C86]">
                    5.0 ★ (188 reviews)
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Floating Keepsake Accent Badge 1 */}
            <motion.div
              style={{ x: floatMoveX, y: floatMoveY }}
              className="absolute -top-4 -right-2 sm:-right-4 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-[#251E1C]/95 backdrop-blur-md shadow-xl border border-[#E8D4CD]/60 dark:border-[#423430] hidden sm:flex items-center gap-3"
            >
              <span className="p-2 rounded-xl bg-[#F6ECE8] dark:bg-[#342724] text-[#B36D6D]">
                <Heart className="w-4 h-4 fill-current" />
              </span>
              <div>
                <div className="font-serif-title text-xs font-medium text-[#2C2321] dark:text-[#EFE5E0]">
                  Handcrafted with warmth
                </div>
                <div className="text-[10px] text-[#8C7A74] dark:text-[#A4938D]">
                  Every detail chosen with care
                </div>
              </div>
            </motion.div>

            {/* Floating Keepsake Accent Badge 2 */}
            <motion.div
              style={{ x: floatMoveX, y: floatMoveY }}
              className="absolute -bottom-4 -left-2 sm:-left-4 px-4 py-2.5 rounded-2xl bg-white/95 dark:bg-[#251E1C]/95 backdrop-blur-md shadow-xl border border-[#E8D4CD]/60 dark:border-[#423430] hidden sm:flex items-center gap-3"
            >
              <span className="p-2 rounded-xl bg-[#F6ECE8] dark:bg-[#342724] text-[#B36D6D]">
                <Gift className="w-4 h-4" />
              </span>
              <div>
                <div className="font-serif-title text-xs font-medium text-[#2C2321] dark:text-[#EFE5E0]">
                  Complimentary Gift Wrapping
                </div>
                <div className="text-[10px] text-[#8C7A74] dark:text-[#A4938D]">
                  Signature blush ribbon & wax seal
                </div>
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  )
}
