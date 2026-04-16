/**
 * Compact plain-text quote for booking email (one block; contact embedded at top).
 */
export function buildBookMovePlainText(contact, q) {
  const lines = []
  const phone = contact.phone?.trim()
  const contactLine = phone
    ? `${contact.name.trim()} · ${contact.email.trim()} · ${phone}`
    : `${contact.name.trim()} · ${contact.email.trim()}`

  lines.push('Coast Team Moving — moving quote')
  lines.push(`Customer: ${contactLine}`)

  if (q.dateLine) {
    lines.push(`Date: ${q.dateLine}`)
  }

  const details = typeof q.moveDetails === 'string' ? q.moveDetails.trim() : ''
  if (details) {
    lines.push(`Move details: ${details}`)
  }

  const routeParts = q.destinations.map((d, i) => {
    const tag =
      i === 0 ? 'Origin' : i === q.destinations.length - 1 ? 'Destination' : `Stop ${i + 1}`
    return `${tag}: ${d.address?.trim() || '—'}`
  })
  lines.push(`Route: ${routeParts.join(' | ')}`)

  lines.push(
    q.requiresTruck
      ? `Truck: ${q.truck.label} (${q.truck.cubicFeet?.toLocaleString()} cu ft), rental $${q.truck.baseRental.toFixed(2)}`
      : 'Truck: customer-provided (no rental)'
  )

  lines.push(
    q.routeDistanceKm != null
      ? `Distance: ${Math.round(q.routeDistanceKm)} km × $${q.PER_KM_RATE.toFixed(2)}/km = $${q.distanceFee.toFixed(2)}`
      : 'Distance: —'
  )

  if (q.requiresTruck) {
    const fs = q.firstFuelStation
    let fuel = `Fuel (nearest ${q.fuelSearchLabel || '—'})`
    if (fs) {
      const addr = [fs.address_line1, fs.address_locality, fs.address_region].filter(Boolean).join(', ')
      fuel += `: ${fs.name}${addr ? `, ${addr}` : ''}`
      if (q.formattedFuelPriceText) {
        fuel += ` — ${q.formattedFuelPriceText} × ${q.distanceKm.toFixed(0)} km × ${q.fuelLperKm} L/km = $${q.fuelCost.toFixed(2)}`
      }
    }
    lines.push(fuel)
  }

  const laborBits = q.movers.map((m, i) => {
    const hrs = Number(m.hours) || q.MIN_HOURS_PER_MOVER
    const sub = hrs * q.LABOR_RATE_PER_HOUR
    return `M${i + 1} ${hrs}h×$${q.LABOR_RATE_PER_HOUR}=$${sub.toFixed(2)}`
  })
  lines.push(`Labor: ${laborBits.join('; ')} (total $${q.laborCost.toFixed(2)})`)

  const totalBits = []
  if (q.requiresTruck) totalBits.push(`rental $${q.rental.toFixed(2)}`)
  totalBits.push(`distance $${q.distanceFee.toFixed(2)}`)
  if (q.requiresTruck) {
    totalBits.push(
      !q.hasApifyToken || q.fuelCost <= 0 ? 'fuel —' : `fuel $${q.fuelCost.toFixed(2)}`
    )
  }
  totalBits.push(`labor $${q.laborCost.toFixed(2)}`)
  lines.push(`Totals: ${totalBits.join(' · ')} · TOTAL $${q.total.toFixed(2)}`)

  return lines.join('\n')
}
