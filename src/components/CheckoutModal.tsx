import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { X, ShieldCheck, CheckCircle2, AlertCircle, Lock, ArrowRight, Copy, Check, RefreshCw } from 'lucide-react'
import confetti from 'canvas-confetti'
import { AuthUser, CartItem, OrderDetails, StoreSettings } from '../types'
import { sanitizeInput, validateCheckoutForm } from '../utils/security'
import { normalizeValidPhoneNumber } from '../utils/accountValidation'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  isDarkMode: boolean
  cartItems: CartItem[]
  authUser: AuthUser | null
  settings: StoreSettings
  onOrderSuccess: (order: OrderDetails) => Promise<void>
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  isDarkMode,
  cartItems,
  authUser,
  settings,
  onOrderSuccess
}) => {
  // Form State
  const [customerName, setCustomerName] = useState(authUser?.name ?? '')
  const [phoneNumber, setPhoneNumber] = useState(authUser?.phone ?? '')
  const [email, setEmail] = useState(authUser?.email ?? '')
  const [address, setAddress] = useState(authUser?.address ?? '')
  const [city, setCity] = useState(authUser?.city ?? '')
  const [state, setState] = useState(authUser?.state ?? '')
  const [postalCode, setPostalCode] = useState(authUser?.postalCode ?? '')
  const [notes, setNotes] = useState('')

  const [isPaymentPreviewOpen, setIsPaymentPreviewOpen] = useState(false)

  const [isSavingDemoOrder, setIsSavingDemoOrder] = useState(false)
  const [formErrors, setFormErrors] = useState<string[]>([])
  const [completedOrder, setCompletedOrder] = useState<OrderDetails | null>(null)
  const [copiedMessage, setCopiedMessage] = useState(false)

  useEffect(() => {
    if (!isOpen || !authUser) return
    setCustomerName(authUser.name)
    setPhoneNumber(authUser.phone)
    setEmail(authUser.email)
    setAddress(authUser.address)
    setCity(authUser.city)
    setState(authUser.state)
    setPostalCode(authUser.postalCode)
  }, [authUser, isOpen])

  if (!isOpen) return null

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const isFreeDelivery = subtotal >= 1500
  const deliveryFee = subtotal === 0 ? 0 : isFreeDelivery ? 0 : 99
  const grandTotal = subtotal + deliveryFee

  // Quick autofill for instant testing
  const handleAutofillTestData = () => {
    setCustomerName('Ananya Sharma')
    setPhoneNumber('9876543210')
    setEmail('ananya.sharma@example.com')
    setAddress('Penthouse 14, Lotus Villa, Silver Beach Road')
    setCity('Mumbai')
    setState('Maharashtra')
    setPostalCode('400049')
    setNotes('Please tie with blush rose silk ribbon and add wax seal')
    setFormErrors([])
  }

  const handleClearForm = () => {
    setCustomerName('')
    setPhoneNumber('')
    setEmail('')
    setAddress('')
    setCity('')
    setState('')
    setPostalCode('')
    setNotes('')
    setFormErrors([])
  }

  const validateCurrentCheckout = () => {
    const validation = validateCheckoutForm({
      customerName,
      phoneNumber,
      email,
      address,
      city,
      state,
      postalCode,
      notes
    })

    if (!validation.isValid) {
      setFormErrors(validation.errors)
      return false
    }

    setFormErrors([])
    return true
  }

  const handleOpenPaymentPreview = () => {
    if (!validateCurrentCheckout()) return
    setIsPaymentPreviewOpen(true)
  }

  const handleSaveDemoOrder = () => {
    setIsSavingDemoOrder(true)

    setTimeout(() => {
      const now = new Date()
      const formattedTimestamp = now.toLocaleString('en-US', {
        dateStyle: 'full',
        timeStyle: 'medium'
      })

      const generatedOrderId = `AUREL${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
      const orderData: OrderDetails = {
        orderId: generatedOrderId,
        customerName: customerName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        state: sanitizeInput(state),
        postalCode: postalCode.trim(),
        paymentMethod: 'Not processed — demo checkout only',
        paymentTimestamp: formattedTimestamp,
        items: [...cartItems],
        subtotal,
        shipping: deliveryFee,
        total: grandTotal,
        status: 'pending'
      }

      void onOrderSuccess(orderData).then(() => {
        setIsSavingDemoOrder(false)
        setIsPaymentPreviewOpen(false)
        setCompletedOrder(orderData)
        confetti({
          particleCount: 90,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#B36D6D', '#E8C7BE', '#FAF7F2', '#EFAFAF']
        })
      }).catch(error => {
        console.error('Unable to save completed order:', error)
        setIsSavingDemoOrder(false)
        setFormErrors([error instanceof Error ? error.message : 'The demo order request could not be saved. No payment was processed. Please try again.'])
      })
    }, 1600)
  }

  // WhatsApp Message Formatter
  const formatWhatsAppMessage = (order: OrderDetails) => {
    const itemsSummary = order.items.map(item => {
      const finishText = item.finish ? ` Finish: ${item.finish}` : ''
      const recipientText = item.recipientName ? ` For: ${item.recipientName}` : ''
      return `• ${item.name} x${item.quantity} (₹${item.price * item.quantity})${finishText}${recipientText}`
    }).join('\n')

    return [
      `✨ *NEW ${settings.storeName || 'AUREL'} ORDER REQUEST* ✨`,
      '',
      `*Order ID:* ${order.orderId}`,
      `*Order Submitted:* ${order.paymentTimestamp}`,
      `*Payment Status:* ${order.status === 'paid' ? 'Recorded as paid; not independently verified' : 'Not processed — pending payment'}`,
      `*Order Total:* ₹${order.total}`,
      '',
      '*CUSTOMER DETAILS*',
      `*Name:* ${order.customerName}`,
      `*Phone Number:* ${order.phoneNumber}`,
      `*Email Address:* ${order.email}`,
      `*Delivery Address:* ${order.address}, ${order.city}${order.state ? `, ${order.state}` : ''}, PIN ${order.postalCode}`,
      notes.trim() ? `*Special Notes:* ${notes.trim()}` : '',
      '',
      '*ITEMS ORDERED*',
      itemsSummary,
      '',
      `${settings.tagline || 'Made With Love For You'} · ${settings.storeName || 'AUREL'} Bespoke Archives`
    ].filter(Boolean).join('\n')
  }

  const getWhatsAppUrl = (order: OrderDetails) => {
    const brandWhatsAppNumber = settings.whatsappNumber.replace(/\D/g, '') || '919999200913'
    const message = formatWhatsAppMessage(order)
    return `https://wa.me/${brandWhatsAppNumber}?text=${encodeURIComponent(message)}`
  }

  const handleCopyWhatsAppMessage = (order: OrderDetails) => {
    const message = formatWhatsAppMessage(order)
    navigator.clipboard.writeText(message)
    setCopiedMessage(true)
    setTimeout(() => setCopiedMessage(false), 2500)
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6">
        
        {/* Main Checkout Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 28, stiffness: 220 }}
          className={`relative w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden border my-6 ${
            isDarkMode 
              ? 'bg-[#1C1817] text-[#F3EBE6] border-[#362A27]' 
              : 'bg-[#FAF6F2] text-[#2C2422] border-[#E8D4CB]'
          }`}
        >
          {/* Header */}
          <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-[#B36D6D]/15 text-[#B36D6D]">
                <ShieldCheck className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-serif-title text-xl font-normal tracking-wide">
                  {completedOrder ? 'Order Request Received' : 'Checkout'}
                </h3>
                <span className="text-[11px] text-[#8E7973] dark:text-[#A79690] block">
                  {completedOrder ? 'This demo checkout did not process a payment' : 'Enter your details to prepare an order request'}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close checkout"
              className={`p-2 rounded-full transition-colors ${
                isDarkMode ? 'hover:bg-[#2A2321] text-[#E0D2CB]' : 'hover:bg-[#EFE2DC] text-[#4A3B37]'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
            
            {completedOrder ? (
              /* Success & WhatsApp Dispatch Screen */
              <div className="text-center py-4 space-y-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center shadow-md"
                >
                  <CheckCircle2 className="w-10 h-10" />
                </motion.div>

                <div>
                  <span className="text-xs uppercase tracking-widest text-[#B36D6D] font-semibold">
                    Order Saved · {completedOrder.orderId}
                  </span>
                  <h2 className="font-serif-title text-3xl font-light mt-1">
                    Thank you, {completedOrder.customerName}
                  </h2>
                  <p className="font-editorial text-base text-[#7D6B65] dark:text-[#BBAAA3] mt-2 max-w-md mx-auto">
                    Your order request was saved at {completedOrder.paymentTimestamp}. No payment was processed by this demo checkout.
                  </p>
                </div>

                {/* Summary Card */}
                <div className={`p-6 rounded-2xl border text-left max-w-lg mx-auto text-xs space-y-2.5 ${
                  isDarkMode ? 'bg-[#221B1A] border-[#382C29]' : 'bg-[#FFFFFF] border-[#E8D4CB]'
                }`}>
                  <div className="flex justify-between pb-2 border-b border-black/5 dark:border-white/5 font-semibold text-sm">
                    <span>Order Total</span>
                    <span className="text-[#B36D6D] font-serif-title text-lg tabular-nums">
                      ₹{completedOrder.total.toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#8E7973]">
                    <span>Payment status</span>
                    <span className="text-[#2C2422] dark:text-[#EAE0DA] font-medium">{completedOrder.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between text-[#8E7973]">
                    <span>Delivery Contact</span>
                    <span className="text-[#2C2422] dark:text-[#EAE0DA] font-medium">{completedOrder.phoneNumber}</span>
                  </div>
                  <div className="flex justify-between text-[#8E7973]">
                    <span>Destination</span>
                    <span className="text-[#2C2422] dark:text-[#EAE0DA] font-medium truncate max-w-[240px] text-right">
                      {[completedOrder.address, completedOrder.city, completedOrder.state, completedOrder.postalCode].filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#8E7973] pt-1 border-t border-black/5 dark:border-white/5">
                    <span>Items Count</span>
                    <span className="text-[#2C2422] dark:text-[#EAE0DA] font-medium">
                      {completedOrder.items.reduce((acc, i) => acc + i.quantity, 0)} items
                    </span>
                  </div>
                </div>

                {/* WhatsApp Message Preview */}
                <div className="max-w-lg mx-auto text-left">
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-[#B36D6D]">
                      WhatsApp message preview
                    </span>
                    <button
                      onClick={() => handleCopyWhatsAppMessage(completedOrder)}
                      className="text-[11px] text-[#B36D6D] hover:underline flex items-center gap-1"
                    >
                      {copiedMessage ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Message</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className={`p-4 rounded-2xl border text-xs font-mono whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto ${
                    isDarkMode ? 'bg-[#151211] border-[#382B28] text-[#CBB9B2]' : 'bg-[#FAF4EE] border-[#DEC5BB] text-[#52413C]'
                  }`}>
                    {formatWhatsAppMessage(completedOrder)}
                  </div>
                </div>

                {/* WhatsApp Actions */}
                <div className="pt-2 max-w-lg mx-auto space-y-3">
                  <a
                    href={getWhatsAppUrl(completedOrder)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>Open WhatsApp Concierge</span>
                    <ArrowRight className="w-4 h-4" />
                  </a>

                  <button
                    onClick={onClose}
                    className={`w-full py-3 rounded-full border text-xs font-medium uppercase tracking-wider transition-colors ${
                      isDarkMode ? 'border-[#3D302D] hover:bg-[#2A2321]' : 'border-[#DEC5BB] hover:bg-[#F2E5DF]'
                    }`}
                  >
                    Continue Browsing AUREL
                  </button>
                </div>
              </div>
            ) : (
              /* Checkout form and demo-order handoff */
              <div className="space-y-6">
                
                {/* Test Helper Bar */}
                <div className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                  isDarkMode ? 'bg-[#221B1A] border-[#382C29]' : 'bg-[#FAF2EC] border-[#DEC7BC]'
                }`}>
                  <span className="text-[#88756F] dark:text-[#BCAAA3] text-[11px]">
                    Testing Controls
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutofillTestData}
                      className="px-3 py-1 rounded-full bg-[#B36D6D]/15 text-[#B36D6D] hover:bg-[#B36D6D]/25 font-medium transition-colors text-[11px]"
                    >
                      Fill Sample Test Data
                    </button>
                    <button
                      type="button"
                      onClick={handleClearForm}
                      className="px-3 py-1 rounded-full border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-[11px]"
                    >
                      Clear Fields
                    </button>
                  </div>
                </div>

                {/* Security Errors Alert Banner */}
                {formErrors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 space-y-1 text-xs"
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>Please complete the required information</span>
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 pl-2 text-[11px]">
                      {formErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Section 1: Customer Contact Info */}
                <div>
                  <h4 className="font-serif-title text-base font-semibold mb-3">
                    1. Recipient and Delivery Details
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[11px] font-medium tracking-wide uppercase text-[#88746E] dark:text-[#BCAAA4] mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="E.g. Ananya Sharma"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                          isDarkMode ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium tracking-wide uppercase text-[#88746E] dark:text-[#BCAAA4] mb-1">
                        Phone Number *
                      </label>
                      <div className="relative">
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="E.g. 9876543210"
                          aria-describedby="checkout-phone-status"
                          className={`w-full rounded-xl border py-2.5 pl-3.5 pr-10 text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                            isDarkMode ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                          }`}
                        />
                        {normalizeValidPhoneNumber(phoneNumber) && (
                          <CheckCircle2
                            aria-label="Valid phone number format"
                            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-400"
                          />
                        )}
                      </div>
                      <p id="checkout-phone-status" className="mt-1.5 text-[11px] text-[#88746E] dark:text-[#BCAAA4]">
                        {normalizeValidPhoneNumber(phoneNumber) ? 'Valid phone number format.' : 'Enter a valid phone number.'}
                      </p>
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium tracking-wide uppercase text-[#88746E] dark:text-[#BCAAA4] mb-1">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="E.g. ananya@example.com"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                          isDarkMode ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium tracking-wide uppercase text-[#88746E] dark:text-[#BCAAA4] mb-1">
                        Full Delivery Address *
                      </label>
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Flat or House number, Apartment, Street name"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                          isDarkMode ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium tracking-wide uppercase text-[#88746E] dark:text-[#BCAAA4] mb-1">
                        City *
                      </label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="E.g. Mumbai"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                          isDarkMode ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium tracking-wide uppercase text-[#88746E] dark:text-[#BCAAA4] mb-1">
                        Postal PIN Code *
                      </label>
                      <input
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="E.g. 400049"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                          isDarkMode ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium tracking-wide uppercase text-[#88746E] dark:text-[#BCAAA4] mb-1">
                        State
                      </label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="E.g. Maharashtra"
                        maxLength={100}
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                          isDarkMode ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                        }`}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium tracking-wide uppercase text-[#88746E] dark:text-[#BCAAA4] mb-1">
                        Special Packaging Note (Optional)
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="E.g. Special gift wrapping with blush ribbon"
                        className={`w-full px-3.5 py-2.5 rounded-xl border text-xs transition-colors focus:outline-hidden focus:border-[#B36D6D] ${
                          isDarkMode ? 'bg-[#221B19] border-[#3F302D] text-[#EDE0DA]' : 'bg-[#FFFFFF] border-[#DEC5BB] text-[#2C2321]'
                        }`}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Order Breakdown & Next Step */}
                <div className={`p-4 rounded-2xl border space-y-2 text-xs ${
                  isDarkMode ? 'bg-[#221B1A] border-[#382C29]' : 'bg-[#FAF4F0] border-[#E8D4CB]'
                }`}>
                  <div className="flex justify-between text-[#8E7973]">
                    <span>Items Subtotal ({cartItems.length} items)</span>
                    <span className="tabular-nums font-medium">₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-[#8E7973]">
                    <span>Packaging and Delivery</span>
                    <span>{deliveryFee === 0 ? 'Complimentary' : `₹${deliveryFee}`}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-black/5 dark:border-white/5 font-serif-title text-base font-semibold">
                    <span>Order total (not charged)</span>
                    <span className="text-xl text-[#B36D6D] tabular-nums">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Open order-request confirmation */}
                <div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleOpenPaymentPreview}
                    className="w-full py-4 rounded-full bg-[#B36D6D] hover:bg-[#9E5B5B] text-white text-xs font-semibold uppercase tracking-wider shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Continue to demo checkout (no payment processing)</span>
                  </motion.button>

                  <p className="text-[10px] text-center text-[#9A8781] mt-2">
                    Demo checkout only. This app is not connected to a payment provider.
                  </p>
                </div>

              </div>
            )}

          </div>
        </motion.div>

        {/* Payment UI preview; no provider request is made. */}
        <AnimatePresence>
          {isPaymentPreviewOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden text-neutral-900 border border-neutral-200"
              >
                <div className="bg-[#302622] text-white p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-amber-200 font-semibold">
                        Demo only · no payment connection
                      </div>
                      <h4 className="font-serif text-base font-medium text-white">
                        Order request
                      </h4>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-white/70 block uppercase">
                      Order total · not charged
                    </span>
                    <span className="font-semibold text-lg text-white tabular-nums">
                      ₹{grandTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
                    This app is not connected to a payment provider. Do not enter UPI, card, bank, or payment credentials here. Saving this request records an order with pending payment status only.
                  </div>

                  <div className="pt-2 space-y-2">
                    <button
                      type="button"
                      disabled={isSavingDemoOrder}
                      onClick={handleSaveDemoOrder}
                      className="w-full py-3.5 rounded-2xl bg-[#302622] hover:bg-[#4a3932] text-white text-xs font-semibold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md"
                    >
                      {isSavingDemoOrder ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Saving demo order request...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Save demo order request · ₹{grandTotal.toLocaleString('en-IN')}</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPaymentPreviewOpen(false)}
                      className="w-full py-2.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                    >
                      Cancel and return
                    </button>
                  </div>
                </div>

                {/* Footer security branding */}
                <div className="bg-neutral-100 p-3 text-center text-[10px] text-neutral-500 border-t border-neutral-200">
                  Do not enter real payment credentials. No payment is processed here.
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </AnimatePresence>
  )
}
