import React from 'react'
import { ProductCategory } from '../types'

interface FooterProps {
  isDarkMode: boolean
  onSelectCategory: (category: ProductCategory) => void
  onOpenStory: () => void
  onOpenConcierge: () => void
}

export const Footer: React.FC<FooterProps> = ({
  isDarkMode,
  onSelectCategory,
  onOpenStory,
  onOpenConcierge
}) => {
  return (
    <footer className={`border-t py-16 transition-colors duration-500 ${
      isDarkMode 
        ? 'bg-[#151211] border-[#2A211F] text-[#EDE0DA]' 
        : 'bg-[#F5ECE5] border-[#E2CCC1] text-[#2C2422]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          
          {/* Brand Info */}
          <div className="md:col-span-5 space-y-3">
            <span className="font-serif-title text-2xl sm:text-3xl tracking-[0.2em] font-light">
              AUREL
            </span>
            <p className="font-editorial text-sm text-[#B36D6D]">
              Made With Love For You
            </p>
            <p className="font-sans-body text-xs text-[#826F69] dark:text-[#A79791] max-w-sm leading-relaxed">
              Curated luxury memory magazines, botanical bouquets, eternal single blossoms, and thoughtful keepsakes.
            </p>
            <div className="pt-2 text-xs text-[#8E7973]">
              Concierge: concierge@aurelgifts.com
            </div>
          </div>

          {/* Shop Column */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="font-editorial text-xs uppercase tracking-widest text-[#B36D6D] font-semibold">
              Bespoke Shop
            </h4>
            <ul className="space-y-2 text-xs text-[#6F5C56] dark:text-[#C5B4AD]">
              <li>
                <button 
                  onClick={() => onSelectCategory('magazines')}
                  className="hover:text-[#B36D6D] transition-colors"
                >
                  Custom Magazines
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onSelectCategory('hampers')}
                  className="hover:text-[#B36D6D] transition-colors"
                >
                  Artisanal Hampers
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onSelectCategory('bouquets')}
                  className="hover:text-[#B36D6D] transition-colors"
                >
                  Fresh Bouquets
                </button>
              </li>
              <li>
                <button 
                  onClick={() => onSelectCategory('single-flowers')}
                  className="hover:text-[#B36D6D] transition-colors"
                >
                  Single Preserved Stems
                </button>
              </li>
            </ul>
          </div>

          {/* Client Care */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-editorial text-xs uppercase tracking-widest text-[#B36D6D] font-semibold">
              Client Care
            </h4>
            <ul className="space-y-2 text-xs text-[#6F5C56] dark:text-[#C5B4AD]">
              <li>
                <button onClick={onOpenConcierge} className="hover:text-[#B36D6D] transition-colors">
                  Concierge Support
                </button>
              </li>
              <li>
                <button onClick={onOpenStory} className="hover:text-[#B36D6D] transition-colors">
                  Our Story & Craft
                </button>
              </li>
              <li>
                <span className="opacity-70">Pan India Delivery</span>
              </li>
              <li>
                <span className="opacity-70">Care Instructions</span>
              </li>
            </ul>
          </div>

          {/* Follow */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="font-editorial text-xs uppercase tracking-widest text-[#B36D6D] font-semibold">
              Follow Us
            </h4>
            <ul className="space-y-2 text-xs text-[#6F5C56] dark:text-[#C5B4AD]">
              <li>
                <span className="hover:text-[#B36D6D] cursor-pointer">Instagram @aurel.keepsakes</span>
              </li>
              <li>
                <span className="hover:text-[#B36D6D] cursor-pointer">Pinterest @aurelgifts</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-black/5 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#8E7973] dark:text-[#A79690]">
          <div>
            © 2026 AUREL · All Rights Reserved
          </div>
          <div className="flex items-center gap-4">
            <span>Privacy Policy</span>
            <span>·</span>
            <span>Terms of Service</span>
            <span>·</span>
            <span>Secured Checkout</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
