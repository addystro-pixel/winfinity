import { isValidPhoneNumber } from 'libphonenumber-js'
import { COUNTRY_CODE_TO_ISO } from '../config/countries'

export function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email?.trim())
}

export function isValidGmail(email) {
  return isValidEmail(email) && /@gmail\.com$/i.test(email?.trim())
}

/**
 * Validates phone number for the selected country using libphonenumber.
 * Ensures the number format is valid for that country (e.g. India: 10 digits starting 6-9).
 */
export function isValidPhone(number, countryCode = '+1') {
  const cleaned = String(number || '').replace(/\D/g, '')
  if (!cleaned.length) return false
  const isoCountry = COUNTRY_CODE_TO_ISO[countryCode] || 'US'
  const fullNumber = `${countryCode.replace(/\s/g, '')}${cleaned}`
  return isValidPhoneNumber(fullNumber, isoCountry)
}
