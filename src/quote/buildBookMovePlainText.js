/**
 * Plain-text booking email: vertical layout for copy/paste (minimal labeling).
 */
export function buildBookMovePlainText(contact, q) {
  const lines = []
  const name = contact.name?.trim() || '—'
  const email = contact.email?.trim() || ''
  const phone = contact.phone?.trim() || ''

  for (const d of q.destinations) {
    const a = typeof d.address === 'string' ? d.address.trim() : ''
    if (a) lines.push(a)
  }
  if (lines.length === 0) {
    lines.push('—')
  }

  lines.push('')
  lines.push(name)
  if (email) lines.push(email)
  if (phone) lines.push(phone)

  lines.push('')
  const n = Math.max(1, q.movers?.length || 1)
  lines.push(`${n} man`)

  const moverHours = (q.movers || []).map((m) => Number(m.hours) || q.MIN_HOURS_PER_MOVER)
  const firstH = moverHours[0] ?? q.MIN_HOURS_PER_MOVER
  if (moverHours.length <= 1) {
    lines.push(`${firstH} hr`)
  } else if (moverHours.every((h) => h === moverHours[0])) {
    lines.push(`${firstH} hr`)
  } else {
    for (const h of moverHours) {
      lines.push(`${h} hr`)
    }
  }

  lines.push('')
  if (q.requiresTruck && q.truck?.label) {
    lines.push(q.truck.label)
  } else {
    lines.push('')
  }

  const detailLines = []
  if (q.dateLine) detailLines.push(q.dateLine)
  const details = typeof q.moveDetails === 'string' ? q.moveDetails.trim() : ''
  if (details) {
    for (const part of details.split(/\r?\n/)) {
      const t = part.trim()
      if (t) detailLines.push(t)
    }
  }
  if (detailLines.length) {
    lines.push('')
    lines.push(...detailLines)
  }

  lines.push('')
  if (q.routeDistanceKm != null) {
    lines.push(`${Math.round(q.routeDistanceKm)} km`)
  }
  const totalNum = Number(q.total)
  lines.push(`$${Number.isFinite(totalNum) ? totalNum.toFixed(2) : '0.00'}`)

  return lines.join('\n')
}
