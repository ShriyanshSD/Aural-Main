import * as nodemailer from 'nodemailer'
import { supabaseRequest } from './auth-handler.js'

type ConfirmationEmailStatus = 'pending' | 'sending' | 'sent' | 'failed'
type ConfirmationEmailResult =
  | { status: 'sent' | 'already_sent' | 'sending' }
  | { status: 'failed'; error: string }

interface ConfirmationOrder {
  id: number
  user_id: string
  order_id: string
  order_data: Record<string, unknown>
  created_at: string
  payment_status: string
  order_status: string
  confirmation_email_status: ConfirmationEmailStatus
  confirmation_email_sent_at: string | null
  confirmation_email_error: string | null
}

interface ConfirmationItem {
  name: string
  quantity: number
  price: number
}

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254

const escapeHtml = (value: string) => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#39;')

const requiredString = (value: unknown, label: string) => {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`The order is missing ${label}.`)
  return value.trim()
}

const requiredNumber = (value: unknown, label: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`The order is missing a valid ${label}.`)
  }
  return value
}

const formatCurrency = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
const displayDate = (value: string) => new Date(value).toLocaleDateString('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Asia/Kolkata'
})

const getOrder = async (id: number) => {
  const rows = await supabaseRequest<ConfirmationOrder[]>(
    'aurel_orders',
    new URLSearchParams({
      id: `eq.${id}`,
      select: 'id,user_id,order_id,order_data,created_at,payment_status,order_status,confirmation_email_status,confirmation_email_sent_at,confirmation_email_error',
      limit: '1'
    })
  )
  return rows[0]
}

export const getConfirmationEmailStatus = async (id: number) => {
  const order = await getOrder(id)
  if (!order) throw new Error('Order not found.')
  return {
    status: order.confirmation_email_status,
    sentAt: order.confirmation_email_sent_at,
    error: order.confirmation_email_error
  }
}

const buildEmailContent = (order: ConfirmationOrder, recipient: string) => {
  const data = order.order_data
  const orderNumber = requiredString(order.order_id, 'order number')
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(orderNumber)) throw new Error('The order number is invalid.')
  const customerName = requiredString(data.customerName, 'customer name')
  const address = [data.address, data.city, data.state, data.postalCode]
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .map(part => part.trim())
    .join(', ')
  if (!address) throw new Error('The order is missing the delivery address.')
  const phone = requiredString(data.phoneNumber, 'customer phone number')
  const subtotal = requiredNumber(data.subtotal, 'subtotal')
  const shipping = requiredNumber(data.shipping, 'delivery charge')
  const total = requiredNumber(data.total, 'total')
  if (!Array.isArray(data.items) || data.items.length === 0) throw new Error('The order has no items.')
  const items = data.items.map((item, index): ConfirmationItem => {
    if (!item || typeof item !== 'object') throw new Error(`Order item ${index + 1} is invalid.`)
    const record = item as Record<string, unknown>
    return {
      name: requiredString(record.name, `name for item ${index + 1}`),
      quantity: requiredNumber(record.quantity, `quantity for item ${index + 1}`),
      price: requiredNumber(record.price, `price for item ${index + 1}`)
    }
  })

  const appUrl = process.env.APP_URL?.trim()
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  if (!appUrl) throw new Error('APP_URL must be configured for order confirmation emails.')
  let ordersUrl: string
  try {
    const parsedUrl = new URL(appUrl)
    if (!['http:', 'https:'].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) throw new Error()
    const url = new URL('/', parsedUrl)
    url.searchParams.set('account', 'orders')
    ordersUrl = url.toString()
  } catch {
    throw new Error('APP_URL must be a valid website URL.')
  }

  const safe = {
    customerName: escapeHtml(customerName),
    orderId: escapeHtml(orderNumber),
    orderDate: escapeHtml(displayDate(order.created_at)),
    address: escapeHtml(address),
    phone: escapeHtml(phone),
    ordersUrl: escapeHtml(ordersUrl)
  }
  const itemRows = items.map(item => {
    const name = escapeHtml(item.name)
    const quantity = escapeHtml(String(item.quantity))
    const price = escapeHtml(formatCurrency(item.price))
    const lineTotal = escapeHtml(formatCurrency(item.price * item.quantity))
    return `<tr><td style="padding:12px 8px;border-bottom:1px solid #eee5df">${name}</td><td style="padding:12px 8px;border-bottom:1px solid #eee5df;text-align:center">${quantity}</td><td style="padding:12px 8px;border-bottom:1px solid #eee5df;text-align:right">${price}</td><td style="padding:12px 8px;border-bottom:1px solid #eee5df;text-align:right">${lineTotal}</td></tr>`
  }).join('')
  const paymentMethod = escapeHtml(typeof data.paymentMethod === 'string' ? data.paymentMethod.toUpperCase() : 'UPI')
  const subtotalLabel = formatCurrency(subtotal)
  const shippingLabel = shipping ? formatCurrency(shipping) : 'Complimentary'
  const totalLabel = formatCurrency(total)
  const itemText = items.map(item => `- ${item.name} × ${item.quantity}, ${formatCurrency(item.price)} each, ${formatCurrency(item.price * item.quantity)} subtotal`).join('\n')
  const text = [
    'AUREL',
    'Made With Love For You',
    '',
    'Your Order Is Confirmed!',
    `Dear ${customerName},`,
    '',
    'Thank you for choosing AUREL.',
    "We're delighted to let you know that your payment has been successfully verified and your order is now confirmed.",
    '',
    'YOUR ORDER DETAILS',
    `Order Number: ${orderNumber}`,
    `Order Date: ${displayDate(order.created_at)}`,
    '',
    'ITEMS ORDERED',
    itemText,
    '',
    'PAYMENT SUMMARY',
    `Subtotal: ${subtotalLabel}`,
    `Delivery Charges: ${shippingLabel}`,
    `Total Paid: ${totalLabel}`,
    `Payment Method: ${paymentMethod}`,
    'Payment Status: PAID',
    'Order Status: CONFIRMED',
    '',
    'DELIVERY DETAILS',
    `Customer Name: ${customerName}`,
    `Delivery Address: ${address}`,
    `Phone: ${phone}`,
    '',
    `View your orders: ${ordersUrl}`,
    '',
    "We'll keep you updated as your order progresses.",
    'Thank you for making AUREL a part of your special moments.',
    '',
    'With love,',
    'Team AUREL',
    'Made With Love For You'
  ].join('\n')
  const html = `<!doctype html><html><body style="margin:0;background:#f7f3ef;color:#302725;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f3ef;padding:32px 12px"><tr><td align="center"><table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #eadfd9;border-radius:20px;overflow:hidden"><tr><td style="padding:34px 32px;text-align:center;background:#f4ece7"><div style="font-family:Georgia,serif;font-size:30px;letter-spacing:5px;color:#8f5554">AUREL</div><div style="margin-top:8px;font-size:11px;letter-spacing:2px;color:#806b64">MADE WITH LOVE FOR YOU</div></td></tr><tr><td style="padding:32px"><h1 style="margin:0 0 16px;text-align:center;font-family:Georgia,serif;font-size:27px;font-weight:400;color:#352927">Your Order Is Confirmed!</h1><p style="font-size:15px;line-height:1.7">Dear ${safe.customerName},</p><p style="font-size:14px;line-height:1.7;color:#665650">Thank you for choosing AUREL. We’re delighted to let you know that your payment has been successfully verified and your order is now confirmed.</p><h2 style="margin:28px 0 10px;font-size:12px;letter-spacing:1.5px;color:#8f5554">YOUR ORDER DETAILS</h2><p style="font-size:13px;line-height:1.8"><strong>Order Number:</strong> ${safe.orderId}<br><strong>Order Date:</strong> ${safe.orderDate}</p><h2 style="margin:26px 0 10px;font-size:12px;letter-spacing:1.5px;color:#8f5554">ITEMS ORDERED</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:12px"><thead><tr style="color:#806b64"><th align="left" style="padding:8px">Item</th><th style="padding:8px">Qty</th><th align="right" style="padding:8px">Price</th><th align="right" style="padding:8px">Subtotal</th></tr></thead><tbody>${itemRows}</tbody></table><h2 style="margin:26px 0 10px;font-size:12px;letter-spacing:1.5px;color:#8f5554">PAYMENT SUMMARY</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:13px;line-height:1.8"><tr><td>Subtotal</td><td align="right">${escapeHtml(subtotalLabel)}</td></tr><tr><td>Delivery Charges</td><td align="right">${escapeHtml(shippingLabel)}</td></tr><tr><td style="padding-top:8px;border-top:1px solid #eee5df"><strong>Total Paid</strong></td><td align="right" style="padding-top:8px;border-top:1px solid #eee5df"><strong>${escapeHtml(totalLabel)}</strong></td></tr></table><p style="font-size:12px;line-height:1.8;color:#665650"><strong>Payment Method:</strong> ${paymentMethod}<br><strong>Payment Status:</strong> PAID ✓<br><strong>Order Status:</strong> CONFIRMED</p><h2 style="margin:26px 0 10px;font-size:12px;letter-spacing:1.5px;color:#8f5554">DELIVERY DETAILS</h2><p style="font-size:13px;line-height:1.8">${safe.customerName}<br>${safe.address}<br>${safe.phone}</p><div style="padding:18px 0;text-align:center"><a href="${safe.ordersUrl}" style="display:inline-block;padding:13px 24px;border-radius:999px;background:#a45f60;color:#fff;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:1px">VIEW MY ORDERS</a></div><p style="font-size:13px;line-height:1.8;color:#665650">We’ll keep you updated as your order progresses.<br>Thank you for making AUREL a part of your special moments.</p><p style="font-size:14px;line-height:1.8">With love,<br><strong>Team AUREL</strong><br><span style="font-size:11px;color:#806b64">Made With Love For You</span></p></td></tr></table></td></tr></table></body></html>`

  return {
    recipient,
    subject: `Your AUREL Order ${orderNumber} Is Confirmed!`,
    text,
    html
  }
}

const smtpFailureMessage = (error: unknown) => {
  const details = error && typeof error === 'object'
    ? error as { code?: unknown; responseCode?: unknown }
    : {}
  const code = typeof details.code === 'string' ? details.code : ''
  const responseCode = typeof details.responseCode === 'number' ? ` (${details.responseCode})` : ''
  const reason = error instanceof Error ? error.message : ''
  if (reason.includes('registered customer email')) return 'The registered customer email address is invalid. Update the account email before retrying.'
  if (reason.includes('GMAIL_USER') || reason.includes('GMAIL_APP_PASSWORD')) return 'Configure GMAIL_USER and GMAIL_APP_PASSWORD in the server environment before retrying.'
  if (reason.includes('APP_URL')) return 'APP_URL is missing or invalid in the server environment.'
  if (reason.includes('order')) return 'The saved order details are incomplete, so the confirmation email was not sent.'
  return `Email delivery failed${code ? ` (${code})` : ''}${responseCode}. Verify the server-side Gmail SMTP configuration and recipient address.`
}

export const sendOrderConfirmationEmail = async (id: number): Promise<ConfirmationEmailResult> => {
  const order = await getOrder(id)
  if (!order) throw new Error('Order not found.')
  if (order.payment_status !== 'paid' || !['confirmed', 'processing', 'shipped', 'delivered'].includes(order.order_status)) {
    throw new Error('Confirmation emails can only be sent for paid and confirmed orders.')
  }
  if (order.confirmation_email_status === 'sent') return { status: 'already_sent' }
  if (order.confirmation_email_status === 'sending') return { status: 'sending' }

  const claimed = await supabaseRequest<boolean>(
    'rpc/aurel_claim_confirmation_email',
    new URLSearchParams(),
    { method: 'POST', body: JSON.stringify({ p_order_id: id }) }
  )
  if (!claimed) {
    const latest = await getOrder(id)
    if (latest?.confirmation_email_status === 'sent') return { status: 'already_sent' }
    if (latest?.confirmation_email_status === 'sending') return { status: 'sending' }
    return { status: 'failed', error: latest?.confirmation_email_error || 'The email could not be claimed for sending. Refresh and retry.' }
  }

  try {
    requiredString(order.order_id, 'order number')
    const users = await supabaseRequest<Array<{ email: string }>>(
      'aurel_users',
      new URLSearchParams({ id: `eq.${order.user_id}`, select: 'email', limit: '1' })
    )
    const recipient = users[0]?.email?.trim()
    if (!recipient || !isValidEmail(recipient)) throw new Error('The registered customer email address is invalid.')
    const gmailUser = process.env.GMAIL_USER?.trim()
    const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, '')
    if (!gmailUser || !isValidEmail(gmailUser) || !appPassword) {
      throw new Error('GMAIL_USER and GMAIL_APP_PASSWORD must be configured on the backend.')
    }
    const content = buildEmailContent(order, recipient)
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 20000,
      auth: { user: gmailUser, pass: appPassword }
    })
    await transporter.sendMail({
      from: { name: 'AUREL', address: gmailUser },
      to: content.recipient,
      subject: content.subject,
      text: content.text,
      html: content.html
    })
  } catch (error) {
    const message = smtpFailureMessage(error)
    const errorCode = error && typeof error === 'object' && 'code' in error
      && typeof error.code === 'string' ? error.code : 'unknown'
    console.error('Order confirmation email failed.', { orderId: order.order_id, errorCode })
    try {
      await supabaseRequest('aurel_orders', new URLSearchParams({ id: `eq.${id}` }), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          confirmation_email_status: 'failed',
          confirmation_email_sent_at: null,
          confirmation_email_error: message
        })
      })
    } catch (statusError) {
      console.error('Could not record the failed order confirmation email status.', {
        orderId: order.order_id,
        errorCode: statusError && typeof statusError === 'object' && 'code' in statusError
          && typeof statusError.code === 'string' ? statusError.code : 'unknown'
      })
      throw new Error('Email delivery failed and its status could not be saved.')
    }
    return { status: 'failed', error: message }
  }

  try {
    await supabaseRequest('aurel_orders', new URLSearchParams({ id: `eq.${id}` }), {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        confirmation_email_status: 'sent',
        confirmation_email_sent_at: new Date().toISOString(),
        confirmation_email_error: null
      })
    })
  } catch (statusError) {
    console.error('Confirmation email was delivered but its sent status could not be saved.', {
      orderId: order.order_id,
      errorCode: statusError && typeof statusError === 'object' && 'code' in statusError
        && typeof statusError.code === 'string' ? statusError.code : 'unknown'
    })
    try {
      await supabaseRequest('aurel_orders', new URLSearchParams({ id: `eq.${id}` }), {
        method: 'PATCH',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({
          confirmation_email_error: 'Email was delivered, but the sent status could not be saved. Check the recipient inbox before attempting any manual retry.'
        })
      })
    } catch {
      console.error('Could not save the order confirmation email delivery warning.', { orderId: order.order_id })
    }
    throw new Error('Email was delivered, but its sent status could not be saved. Do not retry without checking the recipient inbox.')
  }
  return { status: 'sent' }
}
