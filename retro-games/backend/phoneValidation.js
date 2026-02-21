import { isValidPhoneNumber } from 'libphonenumber-js'

// Map dial code to ISO country for libphonenumber validation
const COUNTRY_CODE_TO_ISO = {
  '+1': 'US',
  '+44': 'GB',
  '+91': 'IN',
  '+61': 'AU',
  '+81': 'JP',
  '+86': 'CN',
  '+49': 'DE',
  '+33': 'FR',
  '+39': 'IT',
  '+34': 'ES',
  '+31': 'NL',
  '+32': 'BE',
  '+41': 'CH',
  '+43': 'AT',
  '+46': 'SE',
  '+47': 'NO',
  '+45': 'DK',
  '+358': 'FI',
  '+353': 'IE',
  '+351': 'PT',
  '+48': 'PL',
  '+7': 'RU',
  '+82': 'KR',
  '+65': 'SG',
  '+60': 'MY',
  '+63': 'PH',
  '+66': 'TH',
  '+84': 'VN',
  '+62': 'ID',
  '+971': 'AE',
  '+966': 'SA',
  '+972': 'IL',
  '+20': 'EG',
  '+27': 'ZA',
  '+234': 'NG',
  '+254': 'KE',
  '+55': 'BR',
  '+52': 'MX',
  '+54': 'AR',
  '+57': 'CO',
  '+58': 'VE',
  '+51': 'PE',
  '+56': 'CL',
  '+593': 'EC',
  '+90': 'TR',
  '+98': 'IR',
  '+92': 'PK',
  '+880': 'BD',
  '+94': 'LK',
  '+977': 'NP',
  '+64': 'NZ',
}

/**
 * Validates phone number for the selected country.
 * Ensures the number format is valid for that country (e.g. India: 10 digits starting 6-9).
 */
export function isValidPhone(number, countryCode = '+1') {
  const cleaned = String(number || '').replace(/\D/g, '')
  if (!cleaned.length) return false
  const isoCountry = COUNTRY_CODE_TO_ISO[countryCode] || 'US'
  const fullNumber = `${String(countryCode || '+1').replace(/\s/g, '')}${cleaned}`
  return isValidPhoneNumber(fullNumber, isoCountry)
}

// Legacy export for backward compatibility (server may still import this)
export function getPhoneLengthForCountry(countryCode) {
  return { min: 7, max: 15 }
}
