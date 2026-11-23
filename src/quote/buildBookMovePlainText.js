/**
 * Plain-text booking for Matt's calendar.
 * The subject and the first line are the same title.
 * Nothing in this text is shown to the customer.
 */

const PROVINCE = /^(AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT)(\b|\s)/i

function formatMoveDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || '').trim())
  if (!match) return String(iso || '').trim()
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return date.toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatBookingPhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  const local = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits
  if (local.length !== 10) return String(raw || '').trim()
  return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`
}

export function lastNameFrom(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  return parts.length ? parts[parts.length - 1] : ''
}

function cityFromFormatted(address) {
  const parts = String(address || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  const candidates = parts.length >= 2 ? parts.slice(1) : parts
  for (const part of candidates) {
    if (PROVINCE.test(part) || /^canada$/i.test(part) || /^\d/.test(part)) continue
    return part.replace(/\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d$/i, '').trim()
  }
  return ''
}

export function firstCity(destinations) {
  for (const stop of destinations || []) {
    const stored = typeof stop.city === 'string' ? stop.city.trim() : ''
    if (stored) return stored
    const parsed = cityFromFormatted(stop.address)
    if (parsed) return parsed
  }
  return ''
}

function addressLines(addresses) {
  if (addresses.length === 0) return []
  const lines = ['', 'From:', addresses[0]]
  if (addresses.length === 1) return lines
  for (let i = 1; i < addresses.length - 1; i += 1) {
    lines.push('', addresses[i])
  }
  lines.push('', 'To:', addresses[addresses.length - 1])
  return lines
}

function formatHours(hours) {
  const n = Number(hours)
  if (!Number.isFinite(n)) return '2'
  return Number.isInteger(n) ? String(n) : String(n)
}

function moveDetailsLines({ squareFootageLabel, isApartment, moveDetails }) {
  const sqFt = String(squareFootageLabel || '').trim()
  const notes = typeof moveDetails === 'string' ? moveDetails.trim() : ''
  const lines = ['Move Details:']
  if (sqFt) lines.push(sqFt)
  if (isApartment) lines.push('Apartment')
  if (notes) {
    lines.push('', notes)
  }
  return lines
}

export function buildBookingMessage({
  name,
  phone,
  email,
  moveDate,
  moverCount,
  hours,
  destinations,
  moveDetails,
  squareFootageLabel,
  isApartment,
}) {
  const fullName = String(name || '').trim()
  const lastName = lastNameFrom(fullName)
  const city = firstCity(destinations)
  const title = ['W', lastName, 'MOVE', city].filter(Boolean).join(' - ')
  const addresses = (destinations || [])
    .map((stop) => (typeof stop.address === 'string' ? stop.address.trim() : ''))
    .filter(Boolean)
  const phoneText = formatBookingPhone(phone)
  const emailText = String(email || '').trim()
  const dateText = formatMoveDate(moveDate)
  const contactLine = [phoneText, emailText].filter(Boolean).join('| ')
  const contactLines = [fullName, contactLine, dateText].filter(Boolean)

  const men = Math.max(1, Number(moverCount) || 1)
  const shownHours = Number.isFinite(Number(hours)) ? Number(hours) : Number(formatHours(hours))

  const lines = [
    title,
    '',
    `${men} man`,
    `${formatHours(shownHours)} hrs`,
    ...(contactLines.length ? ['', ...contactLines] : []),
    ...addressLines(addresses),
    '',
    ...moveDetailsLines({ squareFootageLabel, isApartment, moveDetails }),
  ]

  return { subject: title, body: lines.join('\n') }
}
