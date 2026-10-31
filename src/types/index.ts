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
  variants?: ProductVariant[]
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

export interface ProductVariant {
  id: string
  name: string
  sku: string
  price: number
  stockQuantity: number | null
}

export interface StoreCollection {
  id: string
  name: string
  description: string
  imageUrl: string
  productIds: string[]
  displayOrder: number
}

export interface StoreReview {
  id: number
  productId: string
  productName: string
  rating: number
  title: string
  body: string
  customerName: string
  createdAt: string
}

export interface StoreCategory {
  slug: string
  name: string
  description?: string
  image_url?: string
  display_order?: number
  is_featured?: boolean
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

export interface StorefrontContent {
  heroEyebrow: string
  heroTitle: string
  heroSubtitle: string
  heroDescription: string
  heroCtaLabel: string
  secondaryCtaLabel: string
  heroImageUrl: string
  announcement: string
  aboutText: string
  deliveryPolicy: string
  returnsPolicy: string
}

export interface CartItem {
  cartId: string
  productId: string
  name: string
  price: number
  quantity: number
  imageUrl: string
  variantId?: string
  variantName?: string
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
  fulfillmentStatus?: string
  productionStatus?: string
  proofApproved?: boolean
  proofUrl?: string
  reviewedProductIds?: string[]
  events?: { event_type: string; summary: string; created_at: string }[]
}

export interface SecurityScanReport {
  vulnerability: string
  severity: 'low' | 'medium' | 'high'
  location: string
  status: 'resolved' | 'mitigated'
  details: string
}
