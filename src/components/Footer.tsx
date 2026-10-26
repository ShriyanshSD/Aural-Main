import React from 'react'
import { ProductCategory, StoreSettings } from '../types'

interface FooterProps {
  isDarkMode: boolean
  onSelectCategory: (category: ProductCategory) => void
  onOpenStory: () => void
  onOpenConcierge: () => void
  settings: StoreSettings
}

export const Footer: React.FC<FooterProps> = ({
  isDarkMode,
  onSelectCategory,
  onOpenStory,
  onOpenConcierge,
  settings
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
              {settings.storeName}
            </span>
            <p className="font-editorial text-sm text-[#B36D6D]">
              {settings.tagline}
            </p>
            <p className="font-sans-body text-xs text-[#826F69] dark:text-[#A79791] max-w-sm leading-relaxed">
              {settings.description}
            </p>
            <div className="pt-2 text-xs text-[#8E7973]">
              Concierge: <a href="mailto:aruelstudio22@gmail.com" className="hover:text-[#B36D6D]">aruelstudio22@gmail.com</a>
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
                <span className="opacity-70">{settings.deliveryNote}</span>
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
                <a
                  href="https://www.instagram.com/_.aurelstudio._?psln=YnRvcGt3dTNyM2V3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#B36D6D]"
                >
                  Instagram
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="mt-10 border-t border-black/5 pt-5 text-center text-[11px] text-[#8E7973] dark:border-white/5 dark:text-[#A79690]">
          © {new Date().getFullYear()} AUREL · All Rights Reserved
        </div>

      </div>
    </footer>
  )
}
