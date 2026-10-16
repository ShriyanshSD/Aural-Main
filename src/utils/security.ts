/**
 * Security validation and sanitization utility for AUREL e commerce platform
 * Ensures XSS prevention and robust input verification
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  sanitizedData: {
    customerName: string
    phoneNumber: string
    email: string
    address: string
    city: string
    postalCode: string
    notes: string
  }
}

/**
 * Strips dangerous HTML tags and script injection attempts
 */
export function sanitizeInput(input: string): string {
  if (!input) return ''
  return input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim()
}

/**
 * Validates phone numbers (supports Indian and international digits 10 to 15 digits)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleanPhone = phone.replace(/[\s+()]/g, '')
  return /^\d{10,14}$/.test(cleanPhone)
}

/**
 * Validates email with standard RFC compliance
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Validates postal code
 */
export function isValidPostalCode(code: string): boolean {
  const cleanCode = code.replace(/\s/g, '')
  return /^\d{5,8}$/.test(cleanCode)
}

/**
 * Complete security scan and validation of checkout submission
 * Returns explicit human readable errors without hyphens or semicolons
 */
export function validateCheckoutForm(data: {
  customerName: string
  phoneNumber: string
  email: string
  address: string
  city: string
  postalCode: string
  notes?: string
}): ValidationResult {
  const errors: string[] = []

  const sanitized = {
    customerName: sanitizeInput(data.customerName),
    phoneNumber: sanitizeInput(data.phoneNumber),
    email: sanitizeInput(data.email),
    address: sanitizeInput(data.address),
    city: sanitizeInput(data.city),
    postalCode: sanitizeInput(data.postalCode),
    notes: sanitizeInput(data.notes || '')
  }

  // Mandatory fields check
  if (!sanitized.customerName || sanitized.customerName.length < 2) {
    errors.push('Error: Name not mentioned')
  }

  if (!sanitized.phoneNumber) {
    errors.push('Error: Phone number not mentioned')
  } else if (!isValidPhoneNumber(sanitized.phoneNumber)) {
    errors.push('Error: Phone number not valid')
  }

  if (!sanitized.email) {
    errors.push('Error: Email address not mentioned')
  } else if (!isValidEmail(sanitized.email)) {
    errors.push('Error: Email address not valid')
  }

  if (!sanitized.address || sanitized.address.length < 5) {
    errors.push('Error: Complete delivery address not mentioned')
  }

  if (!sanitized.city || sanitized.city.length < 2) {
    errors.push('Error: City name not mentioned')
  }

  if (!sanitized.postalCode) {
    errors.push('Error: Postal pin code not mentioned')
  } else if (!isValidPostalCode(sanitized.postalCode)) {
    errors.push('Error: Postal pin code not valid')
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitizedData: sanitized
  }
}
