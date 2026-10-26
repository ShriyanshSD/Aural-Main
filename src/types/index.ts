export type FinishType = 'matte' | 'gloss'

export type ProductCategory = string

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
  imageUrls?: string[]
  fallbackColor: string
  description: string
  tagline: string
  availableFinishes?: FinishType[]
  isCustomizable?: boolean
  features: string[]
  stockQuantity?: number | null
  isActive?: boolean
  isPublished?: boolean
}

export interface StoreCategory {
  slug: string
  name: string
  description?: string
  image_url?: string
}

export interface StoreSettings {
  storeName: string
  tagline: string
  description: string
  contactEmail: string
  phone: string
  whatsappNumber: string
  instagramUrl: string
  facebookUrl: string
  deliveryNote: string
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
  state?: string
  postalCode: string
  paymentMethod: string
  paymentTimestamp: string
  items: CartItem[]
  subtotal: number
  shipping: number
  total: number
  status: 'paid' | 'pending'
}

export interface AuthUser {
  id: string
  name: string
  username: string
  email: string
  pendingEmail?: string
  emailVerified: boolean
  phone: string
  address: string
  gender: string
  dateOfBirth: string
  city: string
  state: string
  postalCode: string
  createdAt: string
}

export interface AccountOrder {
  order: OrderDetails
  createdAt: string
}

export interface SecurityScanReport {
  vulnerability: string
  severity: 'low' | 'medium' | 'high'
  location: string
  status: 'resolved' | 'mitigated'
  details: string
}
