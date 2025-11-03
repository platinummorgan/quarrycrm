/**
 * Phone number formatting utilities for click-to-call and SMS functionality
 */

/**
 * Format a phone number to (555) 555-5555 format
 */
export function formatPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '')
  
  // Handle different phone number lengths
  if (cleaned.length === 10) {
    // US format: (555) 555-5555
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  } else if (cleaned.length === 11 && cleaned[0] === '1') {
    // US with country code: 1 (555) 555-5555
    return `1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
  }
  
  // Return as-is if format is unrecognized
  return phone
}

/**
 * Get clean phone number (digits only) for tel: and sms: links
 */
export function getCleanPhoneNumber(phone: string | null | undefined): string {
  if (!phone) return ''
  return phone.replace(/\D/g, '')
}

/**
 * Generate tel: link for click-to-call
 */
export function getTelLink(phone: string | null | undefined): string {
  const cleaned = getCleanPhoneNumber(phone)
  return cleaned ? `tel:${cleaned}` : '#'
}

/**
 * Generate sms: link for click-to-text
 */
export function getSmsLink(phone: string | null | undefined): string {
  const cleaned = getCleanPhoneNumber(phone)
  return cleaned ? `sms:${cleaned}` : '#'
}

/**
 * Generate sms: link with pre-filled message body
 */
export function getSmsLinkWithMessage(phone: string | null | undefined, message: string): string {
  const cleaned = getCleanPhoneNumber(phone)
  if (!cleaned) return '#'
  
  // URL encode the message
  const encodedMessage = encodeURIComponent(message)
  
  // Different platforms use different parameters
  // iOS: sms:number&body=text
  // Android: sms:number?body=text
  // We'll use ? which works on both (Android standard)
  return `sms:${cleaned}?body=${encodedMessage}`
}
