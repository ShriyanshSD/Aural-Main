import { Product, BuilderItem } from '../types'

export const PRODUCTS: Product[] = [
  {
    id: 'prod_magazine_legacy',
    name: 'Aurel Legacy Journal',
    category: 'magazines',
    price: 0,
    rating: 5.0,
    reviewsCount: 148,
    imageUrl: '/collections/Magazines/magazine.png',
    fallbackColor: '#F6E8E0',
    description: 'A memory-rich editorial keepsake shaped like a refined storybook, made to hold your happiest milestones with elegance.',
    tagline: 'Your life story, printed with affection',
    availableFinishes: ['matte', 'gloss'],
    isCustomizable: true,
    features: [
      'Elegant soft-touch editorial layout',
      'Perfect for anniversaries and personal dedications',
      'Made to showcase moments with warmth and clarity',
      'Gift-ready with a thoughtful keepsake finish'
    ]
  },
  {
    id: 'prod_sunflower_theory',
    name: 'Sunflower Theory Bloom',
    category: 'bouquets',
    price: 0,
    rating: 4.9,
    reviewsCount: 41,
    imageUrl: '/collections/Bouquets/2%20sunflower%20theory.jpg',
    fallbackColor: '#F7EECB',
    description: 'A vibrant floral composition with golden warmth and soft natural movement, designed to brighten joyful celebrations and surprise moments.',
    tagline: 'A cheerfully radiant bloom for heartfelt occasions',
    features: [
      'Warm sunflower-inspired palette',
      'Created to feel joyful and celebratory',
      'Beautiful for birthdays and happy milestones',
      'Curated with a natural, fresh arrangement feel'
    ]
  },
  {
    id: 'prod_bloom_elan',
    name: 'Bloom Elan Arrangement',
    category: 'bouquets',
    price: 0,
    rating: 4.8,
    reviewsCount: 39,
    imageUrl: '/collections/Bouquets/Bloom%20elan%202.png',
    fallbackColor: '#F3E4E0',
    description: 'An expressive bouquet with layered soft tones and graceful floral movement, crafted for moments that deserve a storybook feel.',
    tagline: 'Blending romance and softness in one arrangement',
    features: [
      'Layered petals and balanced floral form',
      'A graceful composition for intimate gifting',
      'Soft romantic palette with natural texture',
      'Crafted for meaningful surprise gifting'
    ]
  },
  {
    id: 'prod_serene_bloom',
    name: 'Serene Bloom Story',
    category: 'bouquets',
    price: 0,
    rating: 4.7,
    reviewsCount: 33,
    imageUrl: '/collections/Bouquets/serene%20bloom.png',
    fallbackColor: '#E7DFDD',
    description: 'A calmer floral arrangement with soft blush and dreamy tones, created for gentle gestures and slow emotional moments.',
    tagline: 'Quiet elegance for personal celebrations',
    features: [
      'Soft pastel layering with a calming mood',
      'Ideal for thoughtful unpacking and quiet surprise',
      'Design-led arrangement with a boutique finish',
      'Pairs beautifully with handwritten notes'
    ]
  },
  {
    id: 'prod_blue_serenity',
    name: 'Blue Serenity Cluster',
    category: 'bouquets',
    price: 0,
    rating: 4.8,
    reviewsCount: 29,
    imageUrl: '/collections/Bouquets/blue%20serenity_.png',
    fallbackColor: '#DDE7F2',
    description: 'A floral composition with cool, dreamy tones that feels calm luxurious and fresh, ideal for thoughtful gifting with a modern edge.',
    tagline: 'Fresh elegance with a cool romantic touch',
    features: [
      'Cool palette with serene soft contrast',
      'Provides a modern floral aesthetic',
      'Perfect for boutique style gifting',
      'Keeps the mood polished and inviting'
    ]
  },
  {
    id: 'prod_moonlight_meadow',
    name: 'Moonlight Meadow',
    category: 'bouquets',
    price: 0,
    rating: 4.8,
    reviewsCount: 28,
    imageUrl: '/collections/Bouquets/moonlight%20meadow.png',
    fallbackColor: '#EFE4F2',
    description: 'This bouquet brings a dreamy twilight mood to the arrangement, with layered blooms designed for memorable evening gifting.',
    tagline: 'Soft floral light for evenings worth remembering',
    features: [
      'A delicate dusk inspired palette',
      'Elegant evening gifting feel',
      'Made for anniversary and romantic surprise moments',
      'Balances softness and luxury beautifully'
    ]
  },
  {
    id: 'prod_petal_poetry',
    name: 'Petal Poetry',
    category: 'bouquets',
    price: 0,
    rating: 4.9,
    reviewsCount: 36,
    imageUrl: '/collections/Bouquets/petal%20poetry_.png',
    fallbackColor: '#F7E7E9',
    description: 'A refined floral arrangement shaped with editorial softness and romantic layering, made to feel personal and deeply memorable.',
    tagline: 'Poetry in petals and gentle emotion',
    features: [
      'Soft layered floral movement',
      'Refined palette for intimate surprise gifting',
      'Excellent for meaningful relationship moments',
      'Designed with a boutique premium finish'
    ]
  },
  {
    id: 'prod_plushie_bouquet',
    name: 'Plushie Bouquet',
    category: 'bouquets',
    price: 0,
    rating: 4.7,
    reviewsCount: 25,
    imageUrl: '/collections/Bouquets/plushie%20bouquet_.png',
    fallbackColor: '#F2E6DB',
    description: 'A rich, lush bouquet styled with comforting warmth and floral fullness, ideal for congratulatory and celebratory gestures.',
    tagline: 'Full of texture, softness and celebration',
    features: [
      'Full-bodied floral presence',
      'Warm romantic texture and volume',
      'Perfect for big life moments',
      'Creates an instantly striking gifting impression'
    ]
  },
  {
    id: 'prod_bloom_elan_blush_tulips',
    name: 'Blush Tulip Bouquet',
    category: 'bouquets',
    price: 0,
    rating: 4.8,
    reviewsCount: 24,
    imageUrl: '/collections/Bouquets/Bloom%20elan%203.png',
    fallbackColor: '#F4DDE2',
    description: 'A soft pink tulip bouquet wrapped for a sweet, thoughtful surprise.',
    tagline: 'A gentle blush of color',
    features: ['Pink and ivory tulips', 'Wrapped for gifting']
  },
  {
    id: 'prod_bloom_elan_crimson_tulips',
    name: 'Crimson Tulip Bouquet',
    category: 'bouquets',
    price: 0,
    rating: 4.8,
    reviewsCount: 23,
    imageUrl: '/collections/Bouquets/Bloom%20elan%205.png',
    fallbackColor: '#F2D9DB',
    description: 'Red and ivory tulips make a bright bouquet for heartfelt occasions.',
    tagline: 'A vivid gesture of affection',
    features: ['Red and ivory tulips', 'Finished with a satin bow']
  },
  {
    id: 'prod_bloom_elan_sunlit_tulips',
    name: 'Sunlit Tulip Bouquet',
    category: 'bouquets',
    price: 0,
    rating: 4.7,
    reviewsCount: 20,
    imageUrl: '/collections/Bouquets/Bloom%20elan_.png',
    fallbackColor: '#F5E7B5',
    description: 'Golden tulips bring a cheerful, sunny touch to everyday gifting.',
    tagline: 'A little brightness, beautifully wrapped',
    features: ['Golden yellow tulips', 'A cheerful gift-ready style']
  },
  {
    id: 'prod_boom_elan_blue_bouquet',
    name: 'Blue Ribbon Bouquet',
    category: 'bouquets',
    price: 0,
    rating: 4.8,
    reviewsCount: 22,
    imageUrl: '/collections/Bouquets/Boom%20elan%204.png',
    fallbackColor: '#DCEAF2',
    description: 'Blue and white blooms create a fresh, graceful floral gift.',
    tagline: 'Cool tones with a soft finish',
    features: ['Blue and white blooms', 'Presented with a ribbon']
  },
  {
    id: 'prod_bouquet_pink_lily',
    name: 'Pink Lily Garden Bouquet',
    category: 'bouquets',
    price: 0,
    rating: 4.8,
    reviewsCount: 21,
    imageUrl: '/collections/Bouquets/file_0000000089c081f4b1678ff5b5df4400.png',
    fallbackColor: '#F3DCE4',
    description: 'A hand-held bouquet of pink lilies with a light, romantic feel.',
    tagline: 'A graceful garden-inspired gift',
    features: ['Pink lily focal blooms', 'Wrapped for a personal presentation']
  },
  {
    id: 'prod_bouquet_sunflower_noir',
    name: 'Sunflower Noir',
    category: 'bouquets',
    price: 0,
    rating: 4.7,
    reviewsCount: 19,
    imageUrl: '/collections/Bouquets/file_0000000095f081f485b4d86244f1ea5f.png',
    fallbackColor: '#EFCB72',
    description: 'A golden sunflower in dramatic dark wrapping makes a bold, joyful gift.',
    tagline: 'Golden petals with a striking finish',
    features: ['Statement sunflower', 'Dark contrast wrapping']
  },
  {
    id: 'prod_petal_poetry_blue',
    name: 'Blue Petal Poetry',
    category: 'bouquets',
    price: 0,
    rating: 4.8,
    reviewsCount: 20,
    imageUrl: '/collections/Bouquets/petal%20poetry%202.png',
    fallbackColor: '#DDE7F1',
    description: 'Petite blue and white arrangements bring a cool, polished floral touch.',
    tagline: 'A thoughtful arrangement in blue',
    features: ['Blue and ivory flowers', 'Several petite gift arrangements']
  },
  {
    id: 'prod_sunflower_rose_bouquet',
    name: 'Sunflower and Rose Bouquet',
    category: 'bouquets',
    price: 0,
    rating: 4.9,
    reviewsCount: 27,
    imageUrl: '/collections/Bouquets/sunflower%20bloom%202.png',
    fallbackColor: '#F2D58B',
    description: 'Sunflowers and red roses combine for a warm, celebratory bouquet.',
    tagline: 'A bright mix for big moments',
    features: ['Sunflower and rose accents', 'Wrapped in a bold finish']
  },
  {
    id: 'prod_sunflower_color_story',
    name: 'Sunflower Color Story',
    category: 'bouquets',
    price: 0,
    rating: 4.8,
    reviewsCount: 23,
    imageUrl: '/collections/Bouquets/sunflower%20bloom%203.png',
    fallbackColor: '#F1D48C',
    description: 'A cheerful sunflower bouquet accented with colorful blooms and greenery.',
    tagline: 'A lively bundle of color',
    features: ['Sunflower focal bloom', 'Mixed flowers and greenery']
  },
  {
    id: 'prod_sunflower_golden_hour',
    name: 'Golden Hour Sunflower',
    category: 'bouquets',
    price: 0,
    rating: 4.7,
    reviewsCount: 18,
    imageUrl: '/collections/Bouquets/sunflower%20bloom.png',
    fallbackColor: '#F2D88E',
    description: 'A bold golden sunflower makes a simple, cheerful statement gift.',
    tagline: 'One bright bloom, full of warmth',
    features: ['Large golden sunflower', 'A simple, expressive presentation']
  },
  {
    id: 'prod_single_sunflower_bloom',
    name: 'Single Sunflower Bloom',
    category: 'single-flowers',
    price: 0,
    rating: 4.9,
    reviewsCount: 42,
    imageUrl: '/collections/Single%20Flowers/Gallery_1790605997302.jpg',
    fallbackColor: '#F5E3AE',
    description: 'A bold bright bloom made to stand alone with warmth and personality, perfect for cheerful notes and happy little gestures.',
    tagline: 'A single bloom that carries a whole mood',
    features: [
      'Statement floral form in a warm golden tone',
      'Made for joyful and uplifting gifting',
      'Shows character in a minimal presentation',
      'Perfect for easy gifting with emotional impact'
    ]
  },
  {
    id: 'prod_rapunzel_special',
    name: 'Rapunzel Special Stem',
    category: 'single-flowers',
    price: 0,
    rating: 4.8,
    reviewsCount: 31,
    imageUrl: '/collections/Single%20Flowers/Rapunzel%20special_.png',
    fallbackColor: '#E9D8D5',
    description: 'A graceful singular blossom with a soft romantic palette, crafted for cherished tokens and thoughtful expressions of love.',
    tagline: 'Simple, soulful and gently unforgettable',
    features: [
      'Elegant single stem presentation',
      'Soft romantic styling with refined texture',
      'Perfect for heartfelt personal gifting',
      'Designed to leave a lasting visual impression'
    ]
  },
  {
    id: 'prod_single_bloom_celeste',
    name: 'Celeste Bloom',
    category: 'single-flowers',
    price: 0,
    rating: 4.7,
    reviewsCount: 25,
    imageUrl: '/collections/Single%20Flowers/Gallery_1790606013184.jpg',
    fallbackColor: '#EBD9E7',
    description: 'A delicate single bloom with a dreamy pastel finish, designed to carry quiet romance and thoughtful appreciation in a minimal form.',
    tagline: 'A gentle bloom for intimate feelings',
    features: [
      'Soft floral richness with minimal styling',
      'Thoughtful for quiet love notes and appreciation',
      'Elegant presentation with understated charm',
      'Made to feel personal and meaningful'
    ]
  },
  {
    id: 'prod_desk_buddy_sunrise',
    name: 'Desk Buddy Sunrise',
    category: 'desk-buddy',
    price: 0,
    rating: 4.7,
    reviewsCount: 20,
    imageUrl: '/collections/Desk%20Buddy/file_000000000ea48211a294023780370394.png',
    fallbackColor: '#F2E5D7',
    description: 'A warm desk companion created for workspaces that deserve a little softness and personal charm during the day.',
    tagline: 'A thoughtful little piece for your everyday corner',
    features: [
      'Brings warmth to desks and reading corners',
      'Made for home office gifting and personal styling',
      'Soft tactile finish with a comforting color story',
      'Ideal for thoughtful little gestures'
    ]
  },
  {
    id: 'prod_desk_buddy_morning',
    name: 'Desk Buddy Morning Glow',
    category: 'desk-buddy',
    price: 0,
    rating: 4.8,
    reviewsCount: 22,
    imageUrl: '/collections/Desk%20Buddy/file_00000000653c8211aa0128b1f9f24775.png',
    fallbackColor: '#EEDBC4',
    description: 'A gentle desk addition in warm neutral shades, created to make work routines feel more personal and comforting.',
    tagline: 'Small joy for quiet workdays',
    features: [
      'Warm neutral styling for cozy workspaces',
      'A polished piece for thoughtful desk gifting',
      'Feels curated and personal without effort',
      'Adds warmth to everyday moments'
    ]
  },
  {
    id: 'prod_desk_buddy_joy',
    name: 'Desk Buddy Bloom Joy',
    category: 'desk-buddy',
    price: 0,
    rating: 4.6,
    reviewsCount: 18,
    imageUrl: '/collections/Desk%20Buddy/file_0000000092508211a19e1c1a40ba56a4.png',
    fallbackColor: '#F4E2D4',
    description: 'A cheerful desk keepsake designed to bring warmth and personality into daily routines and happy work corners.',
    tagline: 'A bright little companion for your desk',
    features: [
      'Designed to uplift routine spaces',
      'Adds a cheerful finishing touch to desk styling',
      'Perfect for thoughtful office gifting',
      'Balances personality and practicality'
    ]
  },
  {
    id: 'prod_desk_buddy_silken',
    name: 'Desk Buddy Silken Rays',
    category: 'desk-buddy',
    price: 0,
    rating: 4.7,
    reviewsCount: 19,
    imageUrl: '/collections/Desk%20Buddy/file_00000000b6a48206bd8411bc68519947.png',
    fallbackColor: '#F3DED9',
    description: 'A soft sculpted desk companion with a detailed finish that feels luxurious and welcoming in every personal workspace.',
    tagline: 'A refined desk detail with a warm personal feel',
    features: [
      'Elegant sculptural styling',
      'Pairs beautifully with modern desk setups',
      'Feels thoughtful and premium in a compact form',
      'Perfect for heartfelt gifting'
    ]
  },
  {
    id: 'prod_gift_box_rose_suite',
    name: 'Rose Suite Gift Box',
    category: 'gift-box-hampers',
    price: 0,
    rating: 4.9,
    reviewsCount: 44,
    imageUrl: '/collections/Gift%20Box-%20Hampers/file_000000002e688211b8402aff34bc8c56.png',
    fallbackColor: '#F3E0DB',
    description: 'A premium presentation box layered with soft florals and warm keepsake elements for a beautifully composed surprise.',
    tagline: 'An elegant gifting box with layered affection',
    features: [
      'Curated presentation styling',
      'Refined floral accents and charming details',
      'Made for meaningful celebrations',
      'A ready-to-gift experience with premium feel'
    ]
  },
  {
    id: 'prod_gift_box_heart',
    name: 'Heartfelt Gift Box',
    category: 'gift-box-hampers',
    price: 0,
    rating: 4.8,
    reviewsCount: 38,
    imageUrl: '/collections/Gift%20Box-%20Hampers/file_00000000340c8211b64b62f168788b6d.png',
    fallbackColor: '#EFE0DB',
    description: 'A thoughtful hamper box styled with gentle floral arrangement and premium presentation, made for uplifting celebratory gifting.',
    tagline: 'A full surprise wrapped in warmth',
    features: [
      'Thoughtful premium layering',
      'Designed to feel luxurious from the first glance',
      'Ideal for milestones and personal gestures',
      'Crafted to speak with emotional detail'
    ]
  },
  {
    id: 'prod_gift_box_silken',
    name: 'Silken Grace Gift Box',
    category: 'gift-box-hampers',
    price: 0,
    rating: 4.9,
    reviewsCount: 40,
    imageUrl: '/collections/Gift%20Box-%20Hampers/file_00000000a16882118f255c0f9c760ed6~2.jpg',
    fallbackColor: '#E8DCDD',
    description: 'A graceful hamper style with a polished elegant finish, designed to feel premium and intimate from the very first reveal.',
    tagline: 'Thoughtful presentation in a beautifully composed box',
    features: [
      'Soft plush styling and tasteful details',
      'Celebratory gifting with an elevated finish',
      'Suitable for birthdays and relationship milestones',
      'Built to feel warm and special'
    ]
  },
  {
    id: 'prod_gift_box_blush_keepsake',
    name: 'Blush Keepsake Box',
    category: 'gift-box-hampers',
    price: 0,
    rating: 4.8,
    reviewsCount: 26,
    imageUrl: '/collections/Gift%20Box-%20Hampers/file_00000000af9c82099d18fdbe9bdc9dca.png',
    fallbackColor: '#F2E0D9',
    description: 'A warm-toned keepsake box filled with soft floral details and thoughtful accents.',
    tagline: 'A little box of thoughtful details',
    features: ['Decorative keepsake box', 'Soft floral presentation']
  },
  {
    id: 'prod_gift_box_flower_set',
    name: 'Floral Surprise Gift Set',
    category: 'gift-box-hampers',
    price: 0,
    rating: 4.8,
    reviewsCount: 25,
    imageUrl: '/collections/Gift%20Box-%20Hampers/file_00000000b7188211b818a03865d9339f.png',
    fallbackColor: '#F3E3D8',
    description: 'A colorful floral gift set arranged for a cheerful and memorable reveal.',
    tagline: 'A bright surprise, ready to share',
    features: ['Colorful floral keepsakes', 'Arranged as a gift set']
  },
  {
    id: 'prod_gift_box_handmade_surprise',
    name: 'Handmade Surprise Box',
    category: 'gift-box-hampers',
    price: 0,
    rating: 4.9,
    reviewsCount: 28,
    imageUrl: '/collections/Gift%20Box-%20Hampers/file_00000000bbb88246921842a055200c4e.png',
    fallbackColor: '#F1E6D7',
    description: 'An open gift box filled with colorful handmade floral keepsakes.',
    tagline: 'A playful collection of little gifts',
    features: ['Assorted handmade keepsakes', 'Presented in an open gift box']
  },
  {
    id: 'prod_sacred_aasan',
    name: 'Aasan of Grace',
    category: 'god-aasan',
    price: 0,
    rating: 4.8,
    reviewsCount: 24,
    imageUrl: '/collections/God%20Aasan/file_0000000009548211b1c8ef4eb0d7da4b.png',
    fallbackColor: '#F0E8DD',
    description: 'A devotional gifting piece shaped with serenity and elegance, intended for thoughtful blessings and sacred personal moments.',
    tagline: 'Graceful devotion in a keepsake form',
    features: [
      'Elegant sacred styling',
      'Built with reverence and softness',
      'Perfect for spiritual gifting',
      'Creates a calm and meaningful presentation'
    ]
  },
  {
    id: 'prod_aasan_warmth',
    name: 'Warmth Aasan Collection',
    category: 'god-aasan',
    price: 0,
    rating: 4.7,
    reviewsCount: 21,
    imageUrl: '/collections/God%20Aasan/file_00000000241c8209b37e9daefc9bf625.png',
    fallbackColor: '#F4E4D7',
    description: 'A refined devotional form with comforting hues and graceful structure, ideal for thoughtful expression and home blessing spaces.',
    tagline: 'Warmth and devotion in one thoughtful piece',
    features: [
      'Spiritual and elegant tone',
      'Created for personal rituals and gifting',
      'Warm muted palette for refined home styling',
      'Makes a calm and sincere impression'
    ]
  },
  {
    id: 'prod_aasan_floral_blush',
    name: 'Floral Blush Aasan',
    category: 'god-aasan',
    price: 0,
    rating: 4.8,
    reviewsCount: 19,
    imageUrl: '/collections/God%20Aasan/file_000000008cf482119d88f0ecf00149a0.png',
    fallbackColor: '#F1DCE1',
    description: 'A softly colored devotional piece for a calm and graceful home altar.',
    tagline: 'A gentle floral setting for worship',
    features: ['Soft floral styling', 'Made for devotional spaces']
  },
  {
    id: 'prod_aasan_sacred_petals',
    name: 'Sacred Petals Aasan',
    category: 'god-aasan',
    price: 0,
    rating: 4.7,
    reviewsCount: 17,
    imageUrl: '/collections/God%20Aasan/file_00000000d2948211bf21d57fd92cb8d3.png',
    fallbackColor: '#F3E5D6',
    description: 'A devotional accent with warm floral tones for thoughtful gifting and prayer spaces.',
    tagline: 'Warmth and reverence in one detail',
    features: ['Warm floral palette', 'A thoughtful devotional gift']
  },
  {
    id: 'prod_hair_clutcher_01',
    name: 'Velvet Clutcher Rose',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.8,
    reviewsCount: 27,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605807746.jpg',
    fallbackColor: '#F0D6D9',
    description: 'A statement clutcher with soft volume and elegant floral warmth, designed to finish occasion styling with graceful charm.',
    tagline: 'A soft floral finish for polished styling',
    features: [
      'Elegant plush styling with floral balance',
      'Ideal for occasion and bridal dressing',
      'Creates a premium final look with ease',
      'A graceful accent in a compact form'
    ]
  },
  {
    id: 'prod_hair_clutcher_02',
    name: 'Petal Clutcher Charm',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.7,
    reviewsCount: 24,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605823772.jpg',
    fallbackColor: '#F2D3E5',
    description: 'An ornate clutcher balancing floral softness with a polished silhouette, perfect for curated gifting and special styling days.',
    tagline: 'Soft bloom details with a memorable finish',
    features: [
      'Polished look with graceful volume',
      'Made for occasion styling and gifting',
      'Beautiful balance between elegance and charm',
      'Designed for memorable first impressions'
    ]
  },
  {
    id: 'prod_hair_clutcher_03',
    name: 'Rose Vibe Clutcher',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.8,
    reviewsCount: 25,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605835734.jpg',
    fallbackColor: '#F3E1E2',
    description: 'A softly sculpted clutcher with romantic detail and airy elegance, ideal for everyday grace and evening styling.',
    tagline: 'Warm floral charm in an easy statement piece',
    features: [
      'Soft sculptural design',
      'Beautiful for weddings and dinners',
      'Elegant detail with gentle bloom softness',
      'Gift-worthy finishing touch'
    ]
  },
  {
    id: 'prod_hair_clutcher_04',
    name: 'Sunlit Clutcher',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.7,
    reviewsCount: 22,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605848886.jpg',
    fallbackColor: '#F6E2B7',
    description: 'A bright jaunty clutcher with warm floral energy, created for cheerful days and celebratory styling moments.',
    tagline: 'Golden warmth for joyful styling days',
    features: [
      'Bright and happy floral energy',
      'Perfect for festive styling',
      'Brings instant charm to daily looks',
      'Made to feel expressive and uplifting'
    ]
  },
  {
    id: 'prod_hair_clutcher_05',
    name: 'Dreamy Pearl Clutcher',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.9,
    reviewsCount: 31,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605861665.jpg',
    fallbackColor: '#E9DDEB',
    description: 'A delicate clutcher designed with a soft pearl finish and floral movement for refined everyday elegance.',
    tagline: 'A little glamour for graceful days',
    features: [
      'Soft pearl-inspired finish',
      'Delicate but premium design language',
      'Made to elevate simple styling instantly',
      'Perfect for thoughtful gifting'
    ]
  },
  {
    id: 'prod_hair_clutcher_06',
    name: 'Bloom Silk Clutcher',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.8,
    reviewsCount: 26,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605875491.jpg',
    fallbackColor: '#F1CCDA',
    description: 'A floral clutcher with a silky finish and elegant texture, created to bring grace to occasions and intimate gifting.',
    tagline: 'Silk-soft detail with floral presence',
    features: [
      'A graceful statement silhouette',
      'Lovely for weddings and special dinners',
      'Soft and polished to the touch',
      'Creates a premium impression instantly'
    ]
  },
  {
    id: 'prod_hair_clutcher_07',
    name: 'Ruffle Dream Clutcher',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.7,
    reviewsCount: 19,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605926786.jpg',
    fallbackColor: '#E9D9E8',
    description: 'A soft textured clutcher with layered detail and a romantic finish, ideal for elegant styling with warmth and personality.',
    tagline: 'Romantic layers for a refined look',
    features: [
      'Layered sculptural finish',
      'Designed for elegant styling moments',
      'Adds a distinctive feminine touch',
      'Perfect for curated gifting'
    ]
  },
  {
    id: 'prod_hair_clutcher_08',
    name: 'Evening Bloom Clutcher',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.8,
    reviewsCount: 23,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605941155.jpg',
    fallbackColor: '#E1D5EC',
    description: 'A graceful evening style piece with floral detail and a polished silhouette, made to finish a refined look with softness.',
    tagline: 'Graceful bloom styling for evening moments',
    features: [
      'Soft evening-ready finish',
      'Perfect for events and cherished occasions',
      'Adds a refined floral accent',
      'Makes styling feel instantly elevated'
    ]
  },
  {
    id: 'prod_hair_clutcher_09',
    name: 'Whisper Bloom Clutcher',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.7,
    reviewsCount: 21,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605956746.jpg',
    fallbackColor: '#E9D9D8',
    description: 'A soft-toned clutcher blending floral elegance and understated glamour, ideal for gifting and personal styling moments.',
    tagline: 'A quiet statement with a romantic finish',
    features: [
      'Subtle and elegant feel',
      'Beautiful for personal gifting',
      'Blends feminine softness and structure',
      'Adds charm to simple looks'
    ]
  },
  {
    id: 'prod_hair_clutcher_10',
    name: 'Bloom Muse Clutcher',
    category: 'hair-accessories',
    subCategory: 'clutchers',
    price: 0,
    rating: 4.8,
    reviewsCount: 28,
    imageUrl: '/collections/Hair%20Accessories/Clutchers/Gallery_1790605969904.jpg',
    fallbackColor: '#E9D4D8',
    description: 'A polished floral clutcher with refined texture and graceful shape, designed to be a finishing touch for every treasured outfit.',
    tagline: 'Your final flourish, beautifully composed',
    features: [
      'Graceful floral styling',
      'Perfect for gifting and personal styling',
      'Feels premium and polished',
      'Adds a tasteful finishing mood'
    ]
  },
  {
    id: 'prod_hairband_01',
    name: 'Blush Silk Hairband',
    category: 'hair-accessories',
    subCategory: 'hairbands',
    price: 0,
    rating: 4.8,
    reviewsCount: 26,
    imageUrl: '/collections/Hair%20Accessories/Hairbands/Gallery_1790605738807.jpg',
    fallbackColor: '#F3DDE2',
    description: 'A soft hairband with romantic detailing and a polished finish, designed for gentle styling and treasured everyday gifting.',
    tagline: 'Soft, feminine style for graceful days',
    features: [
      'Lightweight and elegant finish',
      'Made for everyday wear and gifting',
      'Builds a soft feminine silhouette',
      'Beautifully styled for occasion moments'
    ]
  },
  {
    id: 'prod_hairband_02',
    name: 'Garden Pink Hairband',
    category: 'hair-accessories',
    subCategory: 'hairbands',
    price: 0,
    rating: 4.7,
    reviewsCount: 22,
    imageUrl: '/collections/Hair%20Accessories/Hairbands/Gallery_1790605756522.jpg',
    fallbackColor: '#F1D7D9',
    description: 'A floral hairband with a warm romantic palette, made to finish portraits, brunch looks, and special everyday styling.',
    tagline: 'Soft bloom styling with everyday ease',
    features: [
      'Comfortable and easy to style',
      'Warm romantic palette',
      'Made for personal and gift style moments',
      'A graceful accent for effortless charm'
    ]
  },
  {
    id: 'prod_hairband_03',
    name: 'Petal Whisper Hairband',
    category: 'hair-accessories',
    subCategory: 'hairbands',
    price: 0,
    rating: 4.9,
    reviewsCount: 29,
    imageUrl: '/collections/Hair%20Accessories/Hairbands/Gallery_1790605776583.jpg',
    fallbackColor: '#EADBF0',
    description: 'A gentle hairband with floral softness and a polished silhouette, perfect for styling moments that call for subtle glamour.',
    tagline: 'A dreamy touch for graceful styling',
    features: [
      'Graceful silhouette with polished finish',
      'Ideal for intimate styling moments',
      'Adds romantic softness to every look',
      'Lovely for gifting and personal keepsakes'
    ]
  },
  {
    id: 'prod_hairpin_01',
    name: 'Classic Bloom Pin',
    category: 'hair-accessories',
    subCategory: 'hairpins',
    price: 0,
    rating: 4.7,
    reviewsCount: 20,
    imageUrl: '/collections/Hair%20Accessories/Hairpins/file_0000000011707206aa06b81889a186ce.png',
    fallbackColor: '#F5DDE7',
    description: 'A classic floral hairpin with soft romance and a delicate finish, ideal for styling and sweet small gift moments.',
    tagline: 'A petite bloom for a polished finish',
    features: [
      'Delicate floral styling',
      'Perfect for elegant everyday looks',
      'Adds a soft feminine touch',
      'Giftable and beautifully compact'
    ]
  },
  {
    id: 'prod_hairpin_02',
    name: 'Lilac Petal Pin',
    category: 'hair-accessories',
    subCategory: 'hairpins',
    price: 0,
    rating: 4.8,
    reviewsCount: 23,
    imageUrl: '/collections/Hair%20Accessories/Hairpins/file_000000005ba47209896fa83a51489a5d.png',
    fallbackColor: '#E6DBF4',
    description: 'A delicate lilac-toned hairpin created to add gentle softness and thoughtful detail to styled looks and gifting moments.',
    tagline: 'Soft lilac charm with a delicate glow',
    features: [
      'Soft pastel finish',
      'Elegant and easy to style',
      'Adds a refined romantic touch',
      'Lovely for gifting in sets'
    ]
  },
  {
    id: 'prod_hairpin_03',
    name: 'Bloom Charm Pin',
    category: 'hair-accessories',
    subCategory: 'hairpins',
    price: 0,
    rating: 4.7,
    reviewsCount: 18,
    imageUrl: '/collections/Hair%20Accessories/Hairpins/file_0000000061907207b4dcb7c844d6413b.png',
    fallbackColor: '#F4E1DF',
    description: 'A sweet floral pin with a soft romantic presence, perfect for gentle styling and lovely personal gifting.',
    tagline: 'Little bloom, big feminine charm',
    features: [
      'Soft romantic finish',
      'Easy to style and easy to gift',
      'Beautiful for elegant everyday wear',
      'Adds a graceful finishing detail'
    ]
  },
  {
    id: 'prod_hairpin_04',
    name: 'Rose Glow Pin',
    category: 'hair-accessories',
    subCategory: 'hairpins',
    price: 0,
    rating: 4.8,
    reviewsCount: 19,
    imageUrl: '/collections/Hair%20Accessories/Hairpins/file_0000000067307207bebb04cefab798b1.png',
    fallbackColor: '#F3D5DF',
    description: 'A softly shaded rose hairpin made to add warmth and charm to everyday styling with a premium boutique finish.',
    tagline: 'Warm rose detail in a playful floral form',
    features: [
      'Soft rose-toned styling',
      'Ideal for polished everyday looks',
      'Adds emotional warmth to styling',
      'A lovely personal gift detail'
    ]
  },
  {
    id: 'prod_hairpin_05',
    name: 'Ivory Bloom Pin',
    category: 'hair-accessories',
    subCategory: 'hairpins',
    price: 0,
    rating: 4.7,
    reviewsCount: 17,
    imageUrl: '/collections/Hair%20Accessories/Hairpins/file_000000009b7872078d26106356e205e0.png',
    fallbackColor: '#F0E5F1',
    description: 'A refined ivory-toned hairpin with delicate floral shape, designed for graceful styling and thoughtful gifting moments.',
    tagline: 'A soft bloom for polished looks',
    features: [
      'Delicate floral styling',
      'Made for boutique finishing touches',
      'Perfect for layered hair looks',
      'Great as a soft personal gift'
    ]
  },
  {
    id: 'prod_hairpin_06',
    name: 'Petal Whisper Pin',
    category: 'hair-accessories',
    subCategory: 'hairpins',
    price: 0,
    rating: 4.8,
    reviewsCount: 21,
    imageUrl: '/collections/Hair%20Accessories/Hairpins/file_00000000c60c72079383f1ea6c020ba2.png',
    fallbackColor: '#E4D9F4',
    description: 'A gentle floral hairpin with a soft pastel finish, designed to add a little emotion and elegance to everyday styling.',
    tagline: 'A whisper of bloom in every look',
    features: [
      'Soft pastel finish',
      'Elegant accent for everyday looks',
      'Adds subtle romantic detail',
      'Easy to gift and easy to love'
    ]
  },
  {
    id: 'prod_bag_charm_rose',
    name: 'Rosy Everyday Charm',
    category: 'bag-charms',
    price: 0,
    rating: 4.8,
    reviewsCount: 31,
    imageUrl: '/collections/Bag%20Charms/Gallery_1790605896816.jpg',
    fallbackColor: '#F3E4DF',
    description: 'A polished charm with everyday grace, made to bring a little softness and personality to purses and day-to-day carry items.',
    tagline: 'Small details with a big personal touch',
    features: [
      'Perfect for daily use and gifting',
      'Soft romantic detailing in a compact form',
      'Easy styling for bags and accessories',
      'A charming keepsake that feels personal'
    ]
  },
  {
    id: 'prod_bag_charm_daisy',
    name: 'Daisy Bloom Bag Charm',
    category: 'bag-charms',
    price: 0,
    rating: 4.8,
    reviewsCount: 22,
    imageUrl: '/collections/Bag%20Charms/Gallery_1790605909848.jpg',
    fallbackColor: '#F5DDE4',
    description: 'A bright handmade flower charm to add a playful touch to a favorite bag.',
    tagline: 'A little bloom to carry along',
    features: ['Handmade flower detail', 'Easy to clip onto a bag']
  },
  {
    id: 'prod_keychain_daisy_collection',
    name: 'Bright Daisy Keychain Collection',
    category: 'key-chains',
    price: 0,
    rating: 4.8,
    reviewsCount: 24,
    imageUrl: '/collections/Key%20Chains/Key%20Chain%201.png',
    fallbackColor: '#E4EAF0',
    description: 'Six colorful handmade flower keychains bring a cheerful touch to everyday essentials.',
    tagline: 'Six colors, one little bloom',
    features: ['Six colorful flower designs', 'A bright everyday accessory']
  },
  {
    id: 'prod_keychain_blue_pink_pair',
    name: 'Blue and Pink Bloom Keychain Pair',
    category: 'key-chains',
    price: 0,
    rating: 4.8,
    reviewsCount: 20,
    imageUrl: '/collections/Key%20Chains/Key%20Chain%202.png',
    fallbackColor: '#E2EAF4',
    description: 'A playful pair of blue and pink flower keychains for keys or bags.',
    tagline: 'A colorful pair to carry along',
    features: ['Blue and pink flower designs', 'Includes two keychains']
  }
]

export const BUILDER_ITEMS: BuilderItem[] = [
  {
    id: 'box_ivory',
    name: 'Ivory Silk Keepsake Box',
    category: 'box',
    price: 350,
    imageUrl: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?auto=format&fit=crop&w=600&q=80',
    description: 'Rigid luxury gift box in warm ivory paper with magnetic ribbon seal'
  },
  {
    id: 'box_rose',
    name: 'Blush Velvet Presentation Box',
    category: 'box',
    price: 450,
    imageUrl: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=600&q=80',
    description: 'Soft touch velvet exterior in dusty petal pink with gold foil stamp'
  },
  {
    id: 'flower_single_rose',
    name: 'Preserved Blush Garden Rose',
    category: 'flower',
    price: 299,
    imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=600&q=80',
    description: 'Single long lasting garden rose in tender peach blush'
  },
  {
    id: 'flower_crochet_tulip',
    name: 'Handmade Crochet Tulip Stem',
    category: 'flower',
    price: 349,
    imageUrl: '/collections/Single%20Flowers/Rapunzel%20special_.png',
    description: 'Artisanal knitted cotton tulip in delicate pastel pink'
  },
  {
    id: 'keep_candle',
    name: 'Damask Rose Soy Candle',
    category: 'keepsake',
    price: 399,
    imageUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=600&q=80',
    description: 'Hand poured vegan soy wax with gentle rose and vanilla notes'
  },
  {
    id: 'keep_mini_mag',
    name: 'Pocket Keepsake Memory Folio',
    category: 'keepsake',
    price: 499,
    imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80',
    description: 'Compact 8 page customized editorial picture booklet'
  },
  {
    id: 'treat_chocolates',
    name: 'Artisan Berry Bonbons Box',
    category: 'treat',
    price: 299,
    imageUrl: 'https://images.unsplash.com/photo-1548741487-18d16a1ca232?auto=format&fit=crop&w=600&q=80',
    description: 'Handmade Belgian dark chocolate filled with raspberry ganache'
  },
  {
    id: 'card_wax_seal',
    name: 'Personalized Wax Sealed Letter',
    category: 'card',
    price: 149,
    imageUrl: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=600&q=80',
    description: 'Heavy cotton parchment paper stamped with metallic rose wax'
  },
  {
    id: 'ribbon_satin',
    name: 'Dusty Rose Silk Satin Bow',
    category: 'ribbon',
    price: 99,
    imageUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=600&q=80',
    description: 'Double faced pure silk ribbon in muted rose gold tint'
  }
]

export const REVIEWS = [
  {
    id: 'rev_1',
    name: 'Aanya Sharma',
    city: 'Mumbai',
    occasion: 'First Anniversary',
    rating: 5,
    date: 'September 2026',
    comment: 'It was not just a gift. It felt like an entire collection of our most sacred memories bound into high art. My partner had tears of joy when opening the matte magazine edition.',
    productName: 'Custom Anniversary Magazine'
  },
  {
    id: 'rev_2',
    name: 'Rohan Mehra',
    city: 'Bengaluru',
    occasion: 'Birthday Surprise',
    rating: 5,
    date: 'August 2026',
    comment: 'The quality of the paper and packaging is astonishing. The blush ribbon and personalized letter made her feel truly cherished. AUREL understands thoughtful emotion.',
    productName: 'The Keepsake Romance Hamper'
  },
  {
    id: 'rev_3',
    name: 'Priyanka Sen',
    city: 'New Delhi',
    occasion: 'Special Milestone',
    rating: 5,
    date: 'July 2026',
    comment: 'The crochet tulip blossoms look even more graceful in person than on screen. Knowing it is handmade by artisans makes the gift feel warm and everlasting.',
    productName: 'Handcrafted Crochet Tulip Blossom'
  }
]
