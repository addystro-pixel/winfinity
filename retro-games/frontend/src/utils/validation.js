export function isValidEmail(email) {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email?.trim())
}

export function isValidGmail(email) {
  return isValidEmail(email) && /@gmail\.com$/i.test(email?.trim())
}

export function isValidPhone(number, countryCode = '+1') {
  const cleaned = String(number || '').replace(/\D/g, '')
  const { min, max } = getPhoneLengthForCountry(countryCode)
  return cleaned.length >= min && cleaned.length <= max
}

const PHONE_LENGTHS = {
  '+1': { min: 10, max: 10 },
  '+7': { min: 10, max: 10 },
  '+20': { min: 9, max: 10 },
  '+61': { min: 9, max: 9 },
  '+27': { min: 9, max: 9 },
  '+31': { min: 9, max: 9 },
  '+32': { min: 8, max: 9 },
  '+33': { min: 9, max: 9 },
  '+34': { min: 9, max: 9 },
  '+39': { min: 9, max: 11 },
  '+41': { min: 9, max: 9 },
  '+43': { min: 10, max: 13 },
  '+44': { min: 10, max: 11 },
  '+45': { min: 8, max: 8 },
  '+46': { min: 9, max: 10 },
  '+47': { min: 8, max: 8 },
  '+48': { min: 9, max: 9 },
  '+49': { min: 10, max: 11 },
  '+51': { min: 9, max: 9 },
  '+52': { min: 10, max: 10 },
  '+54': { min: 10, max: 11 },
  '+55': { min: 10, max: 11 },
  '+56': { min: 9, max: 9 },
  '+57': { min: 10, max: 10 },
  '+58': { min: 10, max: 10 },
  '+60': { min: 9, max: 10 },
  '+62': { min: 10, max: 12 },
  '+63': { min: 10, max: 10 },
  '+64': { min: 9, max: 10 },
  '+65': { min: 8, max: 8 },
  '+66': { min: 9, max: 9 },
  '+81': { min: 10, max: 11 },
  '+82': { min: 9, max: 10 },
  '+84': { min: 9, max: 10 },
  '+86': { min: 11, max: 11 },
  '+90': { min: 10, max: 10 },
  '+91': { min: 10, max: 10 },
  '+92': { min: 10, max: 10 },
  '+94': { min: 9, max: 9 },
  '+971': { min: 9, max: 9 },
  '+966': { min: 9, max: 9 },
  '+972': { min: 9, max: 9 },
  '+977': { min: 10, max: 10 },
  '+98': { min: 10, max: 10 },
  '+234': { min: 10, max: 10 },
  '+254': { min: 9, max: 9 },
  '+351': { min: 9, max: 9 },
  '+353': { min: 9, max: 9 },
  '+358': { min: 9, max: 10 },
  '+593': { min: 9, max: 9 },
  '+880': { min: 10, max: 10 },
}

function getPhoneLengthForCountry(countryCode) {
  return PHONE_LENGTHS[countryCode || '+1'] || { min: 7, max: 15 }
}
