import type { OrderDetails } from '../types'

export interface PaymentConfig {
  upiId: string
  payeeName: string
  whatsappNumber: string
}

export const normalizeWhatsAppNumber = (value: string): string => {
  const digits = value.replace(/\D/g, '')
  if (digits.length === 10) return `91${digits}`
  if (digits.length === 11 && digits.startsWith('0')) return `91${digits.slice(1)}`
  return digits
}

export const createUpiPaymentUrl = (order: OrderDetails, config: PaymentConfig): string => {
  const parameters = new URLSearchParams({
    pa: config.upiId,
    pn: config.payeeName,
    am: order.total.toFixed(2),
    tn: order.orderId,
    cu: 'INR'
  })
  return `upi://pay?${parameters.toString()}`
}

export const createWhatsAppMessage = (order: OrderDetails): string => {
  const items = order.items
    .map(item => `${item.name} x${item.quantity}`)
    .join('\n')
  const address = [order.address, order.city, order.state, order.postalCode].filter(Boolean).join(', ')

  return [
    'Hello AUREL!',
    '',
    'I have completed the UPI payment for my order.',
    '',
    `Order ID: ${order.orderId}`,
    `Customer Name: ${order.customerName}`,
    `Phone: ${order.phoneNumber}`,
    '',
    'Order Items:',
    items,
    '',
    `Order Amount: ₹${order.total.toLocaleString('en-IN')}`,
    'Payment Method: UPI',
    '',
    `Delivery Address: ${address}`,
    '',
    'Please verify my payment and confirm my order.',
    '',
    'Thank you!'
  ].join('\n')
}

export const createWhatsAppUrl = (order: OrderDetails, config: PaymentConfig): string =>
  `https://wa.me/${normalizeWhatsAppNumber(config.whatsappNumber)}?text=${encodeURIComponent(createWhatsAppMessage(order))}`
