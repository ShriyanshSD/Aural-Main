import { parsePhoneNumberFromString } from 'libphonenumber-js/min'

const disposableEmailDomains = new Set([
  '10minutemail.com',
  'dispostable.com',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  'throwawaymail.com',
  'yopmail.com'
])

export function isValidAccountEmail(value: string): boolean {
  const email = value.trim()
  if (email.length > 254 || !/^[^\s@]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(email)) {
    return false
  }

  const domain = email.slice(email.lastIndexOf('@') + 1).toLowerCase()
  return !disposableEmailDomains.has(domain)
}

export function normalizeValidPhoneNumber(value: string): string | null {
  const phone = parsePhoneNumberFromString(value.trim(), 'IN')
  return phone?.isValid() ? phone.format('E.164') : null
}
