import React, { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, CircleAlert, LoaderCircle, PackageCheck, ShieldCheck } from 'lucide-react'
import type { OrderDetails } from '../types'
import { createUpiPaymentUrl, createWhatsAppUrl, type PaymentConfig } from '../utils/payment'

interface PaymentPageProps {
  orderId: string
  isDarkMode: boolean
  onContinueShopping: () => void
  onViewOrders: () => void
}

const readResponse = async <T,>(response: Response): Promise<T> => {
  const text = await response.text()
  if (!text) throw new Error('The server returned an empty response.')
  return JSON.parse(text) as T
}

export const PaymentPage: React.FC<PaymentPageProps> = ({
  orderId, isDarkMode, onContinueShopping, onViewOrders
}) => {
  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [config, setConfig] = useState<PaymentConfig | null>(null)
  const [error, setError] = useState('')
  const [pollingError, setPollingError] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadOrder = useCallback(async () => {
    const response = await fetch(`/api/auth/orders?orderId=${encodeURIComponent(orderId)}`, {
      credentials: 'same-origin',
      cache: 'no-store'
    })
    const data = await readResponse<{ order?: OrderDetails; error?: string }>(response)
    if (!response.ok || !data.order) throw new Error(data.error || 'This order could not be loaded.')
    setOrder(data.order)
    setPollingError('')
    return data.order
  }, [orderId])

  useEffect(() => {
    let active = true
    setIsLoading(true)
    Promise.all([
      fetch('/api/payment/config', { cache: 'no-store' }).then(async response => {
        const data = await readResponse<{ config?: PaymentConfig; error?: string }>(response)
        if (!response.ok || !data.config) throw new Error(data.error || 'Payment details are unavailable.')
        if (active) setConfig(data.config)
      }),
      loadOrder()
    ]).catch(loadError => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load payment details.')
    }).finally(() => {
      if (active) setIsLoading(false)
    })
    return () => { active = false }
  }, [loadOrder])

  useEffect(() => {
    if (!order || order.paymentStatus !== 'pending' || order.orderStatus === 'cancelled') return
    let active = true
    let isLoadingStatus = false
    const timer = window.setInterval(() => {
      if (isLoadingStatus) return
      isLoadingStatus = true
      void loadOrder().catch(loadError => {
        if (active) setPollingError(loadError instanceof Error ? loadError.message : 'Order status could not be refreshed.')
      }).finally(() => { isLoadingStatus = false })
    }, 5000)
    return () => {
      active = false
      window.clearInterval(timer)
    }
  }, [loadOrder, order?.paymentStatus, order?.orderStatus])

  const surface = isDarkMode ? 'bg-[#1C1817] text-[#F3EBE6]' : 'bg-[#FAF7F2] text-[#2C2422]'
  const card = isDarkMode ? 'border-[#493936] bg-[#241D1B]' : 'border-[#E8D4CB] bg-white'
  const paymentVerified = order?.paymentStatus === 'paid'
  const paidAndConfirmed = paymentVerified && order?.orderStatus === 'confirmed'

  return <main className={`min-h-screen px-4 py-8 sm:px-6 sm:py-12 ${surface}`}>
    <div className="mx-auto max-w-5xl">
      <header className="mb-8 flex items-center justify-between border-b border-[#B36D6D]/15 pb-5">
        <button type="button" onClick={onContinueShopping} className="inline-flex items-center gap-2 text-sm text-[#9A6560]"><ArrowLeft className="h-4 w-4" /> AUREL</button>
        <span className="inline-flex items-center gap-2 text-xs text-[#8E7973]"><ShieldCheck className="h-4 w-4" /> Secure order status</span>
      </header>

      {isLoading ? <div className="flex min-h-64 items-center justify-center gap-3 text-sm text-[#8E7973]"><LoaderCircle className="h-5 w-5 animate-spin" /> Loading your order…</div>
        : error ? <section className={`rounded-3xl border p-6 text-center ${card}`}><CircleAlert className="mx-auto h-8 w-8 text-rose-600" /><p className="mt-3">{error}</p><button onClick={onContinueShopping} className="mt-5 rounded-full bg-[#B36D6D] px-5 py-3 text-sm font-medium text-white">Return to AUREL</button></section>
          : order && <>
            <section className={`rounded-3xl border p-5 sm:p-8 ${card}`}>
              <div className="mb-7 text-center">
                {paymentVerified ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" /> : <PackageCheck className="mx-auto h-12 w-12 text-[#B36D6D]" />}
                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#B36D6D]">{paymentVerified ? 'Verified by AUREL' : 'Order placed'}</p>
                <h1 className="mt-2 font-serif-title text-3xl sm:text-4xl">{paidAndConfirmed ? 'Thank You! Your Order Is Confirmed.' : paymentVerified ? `Your order is ${order.orderStatus?.replaceAll('_', ' ')}` : order.orderStatus === 'cancelled' ? 'This order was cancelled' : 'Complete your UPI payment'}</h1>
                <p className="mt-2 text-sm text-[#8E7973]">Order {order.orderId}</p>
              </div>

              <div className="grid gap-7 md:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <h2 className="mb-3 font-serif-title text-xl">Your order</h2>
                  <div className={`divide-y rounded-2xl border px-4 ${card}`}>
                    {order.items.map((item, index) => <div key={`${item.productId}-${index}`} className="flex justify-between gap-4 py-3 text-sm">
                      <span>{item.name}{item.variantName ? ` · ${item.variantName}` : ''} × {item.quantity}</span>
                      <span className="shrink-0">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                    </div>)}
                    <div className="space-y-2 py-4 text-sm">
                      <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal.toLocaleString('en-IN')}</span></div>
                      <div className="flex justify-between"><span>Delivery</span><span>{order.shipping ? `₹${order.shipping.toLocaleString('en-IN')}` : 'Complimentary'}</span></div>
                      <div className="flex justify-between border-t border-[#B36D6D]/15 pt-3 text-base font-semibold"><span>Total payable</span><span className="text-[#B36D6D]">₹{order.total.toLocaleString('en-IN')}</span></div>
                    </div>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-[#8E7973]">Delivering to {[order.address, order.city, order.state, order.postalCode].filter(Boolean).join(', ')}</p>
                  <p className="mt-2 text-xs"><strong>Payment:</strong> {order.paymentStatus === 'paid' ? 'Paid' : 'Awaiting Payment'} · <strong>Order:</strong> {order.orderStatus?.replaceAll('_', ' ')}</p>
                </div>

                {!paymentVerified && order.paymentStatus === 'pending' && order.orderStatus !== 'cancelled' && config && <>
                  <div className="hidden md:block">
                    <h2 className="mb-3 font-serif-title text-xl">Scan to pay</h2>
                    <div className={`mx-auto max-w-sm rounded-2xl border p-4 ${card}`}>
                      <img src="/payment/upi-qr.jpeg" alt="AUREL UPI payment QR code" className="mx-auto aspect-square w-full max-w-[300px] bg-white object-contain p-2" />
                      <p className="mt-3 text-center text-sm font-medium">{config.upiId}</p>
                      <p className="text-center text-xs text-[#8E7973]">Payee: {config.payeeName}</p>
                      <p className="mt-2 text-center font-serif-title text-2xl text-[#B36D6D]">₹{order.total.toLocaleString('en-IN')}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#8E7973]">Open any UPI app on your mobile, scan this QR code and complete your payment.</p>
                    <a href={createWhatsAppUrl(order, config)} target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-3.5 text-center text-sm font-semibold text-white">I&apos;ve Completed Payment <ArrowRight className="h-4 w-4" /></a>
                  </div>
                  <div className="md:hidden">
                    <h2 className="mb-3 font-serif-title text-xl">Pay using a UPI app</h2>
                    <div className={`rounded-2xl border p-5 text-center ${card}`}>
                      <p className="text-sm text-[#8E7973]">Pay AUREL · {config.upiId}</p>
                      <p className="mt-2 font-serif-title text-3xl text-[#B36D6D]">₹{order.total.toLocaleString('en-IN')}</p>
                      <a href={createUpiPaymentUrl(order, config)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-[#B36D6D] px-5 py-4 text-sm font-semibold text-white">Pay Using UPI App <ArrowRight className="h-4 w-4" /></a>
                    </div>
                    <a href={createWhatsAppUrl(order, config)} target="_blank" rel="noopener noreferrer" className="mt-4 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-5 py-4 text-center text-sm font-semibold text-white">I&apos;ve Completed Payment — Confirm on WhatsApp <ArrowRight className="h-4 w-4" /></a>
                  </div>
                </>}
              </div>
              {!paymentVerified && order.orderStatus !== 'cancelled' && <p className="mt-6 rounded-xl bg-amber-500/10 p-4 text-xs leading-5 text-amber-800 dark:text-amber-200">Your order stays pending until AUREL verifies the payment in its bank or UPI account. Opening UPI or WhatsApp does not confirm payment. Status checks automatically every 5 seconds.</p>}
              {pollingError && <p role="status" className="mt-3 text-xs text-[#8E7973]">Could not refresh status just now. We&apos;ll try again automatically. {pollingError}</p>}
              {paymentVerified && <p className="mt-6 rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-800 dark:text-emerald-200">{paidAndConfirmed ? 'Your payment has been verified and your order is confirmed.' : `Your payment is verified. Order status: ${order.orderStatus?.replaceAll('_', ' ')}.`}</p>}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                {paymentVerified && <button onClick={onViewOrders} className="flex-1 rounded-full bg-[#B36D6D] px-5 py-3 text-sm font-semibold text-white">View My Orders</button>}
                <button onClick={onContinueShopping} className="flex-1 rounded-full border border-[#B36D6D]/40 px-5 py-3 text-sm font-semibold text-[#9A6560]">Continue Shopping</button>
              </div>
            </section>
          </>}
    </div>
  </main>
}
