import React, { useState } from 'react'
import { motion, MotionConfig } from 'motion/react'
import { ArrowUpRight } from 'lucide-react'
import { ProductCategory, StoreCategory } from '../types'

interface CategoryGridProps {
  isDarkMode: boolean
  onSelectCategory: (category: ProductCategory) => void
  categories: StoreCategory[]
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  isDarkMode,
  onSelectCategory,
  categories
}) => {
  const [hoveredCategory, setHoveredCategory] = useState<ProductCategory | null>(null)

  const topCategories = [
    {
      id: 'magazines' as ProductCategory,
      title: 'Custom Magazines',
      subtitle: 'Turn your memories photographs and stories into a magazine made for them',
      tag: 'Gloss & Matte Finishes',
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1200&q=80',
      cols: 'lg:col-span-6'
    },
    {
      id: 'hampers' as ProductCategory,
      title: 'Custom Hampers',
      subtitle: 'A thoughtful collection of little things put together with a lot of care',
      tag: 'Bespoke Keepsake Boxes',
      imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=1200&q=80',
      cols: 'lg:col-span-6'
    }
  ]

  const bottomCategories = [
    {
      id: 'bouquets' as ProductCategory,
      title: 'Bouquets',
      subtitle: 'Beautiful flowers designed to make the moment feel even more special',
      tag: 'Fresh Garden Cuts',
      imageUrl: '/collections/Bouquets/Bloom%20elan%202.png',
      cols: 'lg:col-span-4'
    },
    {
      id: 'single-flowers' as ProductCategory,
      title: 'Single Flowers',
      subtitle: 'Sometimes one flower says enough',
      tag: 'Eternal Preserved Stems',
      imageUrl: '/collections/Single%20Flowers/Gallery_1790605997302.jpg',
      cols: 'lg:col-span-4'
    },
    {
      id: 'desk-buddy' as ProductCategory,
      title: 'Desk Buddy',
      subtitle: 'Thoughtful desk accents that brighten the everyday',
      tag: 'Workday Warmth',
      imageUrl: '/collections/Desk%20Buddy/file_000000000ea48211a294023780370394.png',
      cols: 'lg:col-span-4'
    },
    {
      id: 'gift-box-hampers' as ProductCategory,
      title: 'Gift Box Hampers',
      subtitle: 'A touch of luxury wrapped in a curated surprise box',
      tag: 'Curated Keepsakes',
      imageUrl: '/collections/Gift%20Box-%20Hampers/file_000000002e688211b8402aff34bc8c56.png',
      cols: 'lg:col-span-4'
    },
    {
      id: 'hair-accessories' as ProductCategory,
      title: 'Hair Accessories',
      subtitle: 'Elegant finishing touches with a soft personal charm',
      tag: 'Occasion Glow',
      imageUrl: '/collections/Hair%20Accessories/Hairbands/hairbands.png',
      cols: 'lg:col-span-4'
    },
    {
      id: 'bag-charms' as ProductCategory,
      title: 'Bag Charms',
      subtitle: 'Little details that make everyday carry feel special',
      tag: 'Daily Delight',
      imageUrl: '/collections/Bag%20Charms/Gallery_1790605896816.jpg',
      cols: 'lg:col-span-4'
    }
  ]
  const activeCategorySlugs = new Set(categories.map(category => category.slug))
  const presets = [...topCategories, ...bottomCategories]
  const categoryCards = categories
    .map((category, index) => {
      const preset = presets.find(item => item.id === category.slug)
      return {
        id: category.slug,
        title: category.name || preset?.title || category.slug,
        subtitle: category.description || preset?.subtitle || 'Thoughtful finds, curated for meaningful moments.',
        tag: preset?.tag || (category.is_featured ? 'Featured collection' : 'Curated collection'),
        imageUrl: category.image_url || preset?.imageUrl || '/hero-image.png',
        cols: preset?.cols || 'lg:col-span-4',
        order: category.display_order ?? index,
        featured: category.is_featured === true
      }
    })
    .filter(category => activeCategorySlugs.has(category.id))
    .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title))
  const explicitFeatured = categoryCards.filter(category => category.featured)
  const legacyFeaturedIds = new Set(topCategories.map(category => category.id))
  const visibleTopCategories = explicitFeatured.length
    ? explicitFeatured.slice(0, 2)
    : categoryCards.filter(category => legacyFeaturedIds.has(category.id))
  const topIds = new Set(visibleTopCategories.map(category => category.id))
  const visibleBottomCategories = categoryCards.filter(category => !topIds.has(category.id))

  return (
    <section className={`theme-surface py-20 sm:py-28 ${
      isDarkMode ? 'bg-[#151312] text-[#F3EBE6]' : 'bg-[#FAF7F2] text-[#2C2422]'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="font-editorial text-xs tracking-widest text-[#B36D6D] uppercase font-semibold">
            Bespoke Portfolios
          </span>
          <h2 className="font-serif-title text-3xl sm:text-4xl lg:text-5xl tracking-tight mt-2">
            Explore AUREL
          </h2>
          <p className="font-sans-body text-sm text-[#7D6B65] dark:text-[#BAAAA3] mt-3">
            Handcrafted keepsakes and botanical treasures tailored for your cherished recipients
          </p>
        </div>

        {/* Top 2 Large Visual Cards */}
        <MotionConfig reducedMotion="never">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          {visibleTopCategories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -3 }}
              onHoverStart={() => setHoveredCategory(cat.id)}
              onHoverEnd={() => setHoveredCategory(null)}
              viewport={{ once: true }}
              transition={{ duration: 0.42, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onSelectCategory(cat.id)}
              className={`${cat.cols} relative group rounded-3xl overflow-hidden cursor-pointer aspect-[16/10] sm:aspect-[16/9] shadow-md hover:shadow-2xl transition-all duration-500`}
            >
              <motion.img
                src={cat.imageUrl}
                alt={cat.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                animate={{ scale: hoveredCategory === cat.id ? 1.045 : 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full object-cover"
              />

              {/* Editorial Gradient Scrim */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />

              {/* Content Overlay */}
              <div className="absolute inset-0 p-8 sm:p-10 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[11px] uppercase tracking-widest text-white/90 font-medium px-3 py-1 rounded-full bg-white/20 backdrop-blur-md">
                    {cat.tag}
                  </span>
                  <div className="p-3 rounded-full bg-white/20 backdrop-blur-md text-white transform transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                </div>

                <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
                  <h3 className="font-serif-title text-2xl sm:text-3xl text-white font-medium tracking-wide">
                    {cat.title}
                  </h3>
                  <p className="font-sans-body text-xs sm:text-sm text-white/80 max-w-md mt-2 line-clamp-2 leading-relaxed">
                    {cat.subtitle}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom 3 Medium Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6">
          {visibleBottomCategories.map((cat, idx) => (
            <motion.div
              key={cat.id}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -3 }}
              onHoverStart={() => setHoveredCategory(cat.id)}
              onHoverEnd={() => setHoveredCategory(null)}
              viewport={{ once: true }}
              transition={{ duration: 0.42, delay: 0.16 + idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => onSelectCategory(cat.id)}
              className={`${cat.cols} relative group rounded-3xl overflow-hidden cursor-pointer aspect-[4/3] sm:aspect-[1/1] shadow-md hover:shadow-2xl transition-all duration-500`}
            >
              <motion.img
                src={cat.imageUrl}
                alt={cat.title}
                referrerPolicy="no-referrer"
                loading="lazy"
                decoding="async"
                animate={{ scale: hoveredCategory === cat.id ? 1.045 : 1 }}
                transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10 transition-opacity duration-300 group-hover:opacity-90" />

              <div className="absolute inset-0 p-6 sm:p-8 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] uppercase tracking-widest text-white/90 font-medium px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md">
                    {cat.tag}
                  </span>
                  <div className="p-2.5 rounded-full bg-white/20 backdrop-blur-md text-white transform transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>

                <div className="transform transition-transform duration-500 group-hover:-translate-y-2">
                  <h3 className="font-serif-title text-xl sm:text-2xl text-white font-medium tracking-wide">
                    {cat.title}
                  </h3>
                  <p className="font-sans-body text-xs text-white/80 mt-1 line-clamp-2 leading-relaxed">
                    {cat.subtitle}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        </MotionConfig>

      </div>
    </section>
  )
}
