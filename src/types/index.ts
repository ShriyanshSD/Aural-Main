export type FinishType = 'matte' | 'gloss'

export type ProductCategory = 
  | 'all'
  | 'magazines' 
  | 'hampers' 
  | 'bouquets' 
  | 'bag-charms'
  | 'desk-buddy'
  | 'gift-box-hampers'
  | 'god-aasan'
  | 'hair-accessories'
  | 'key-chains'
  | 'single-flowers'
  | 'custom_builder'

export type SortOption = 
  | 'recommended' 
  | 'highest_rated' 
  | 'most_reviewed' 
  | 'price_low' 
  | 'price_high' 
  | 'newest'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  subCategory?: string
  price: number
  rating: number
  reviewsCount: number
  imageUrl: string
  fallbackColor: string
  description: string
  tagline: string
  availableFinishes?: FinishType[]
  isCustomizable?: boolean
  features: string[]
}

export interface CartItem {
  cartId: string
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl: string
  finish?: FinishType
  recipientName?: string
  customMessage?: string
  customComponents?: string[]
}

export interface BuilderItem {
  id: string
  name: string
  category: 'box' | 'flower' | 'keepsake' | 'treat' | 'card' | 'ribbon'
  price: number
  imageUrl: string
  description: string
}

export interface OrderDetails {
  orderId: string
  customerName: string
  phoneNumber: string
  email: string
  address: string
  city: string
  postalCode: string
  paymentMethod: string
  paymentTimestamp: string
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
  status: 'paid' | 'pending'
}

export interface SecurityScanReport {
  vulnerability: string
  severity: 'low' | 'medium' | 'high'
  location: string
  status: 'resolved' | 'mitigated'
  details: string
}
