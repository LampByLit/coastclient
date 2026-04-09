/**
 * Plain-text quote body for booking emails (mirrors print itemization, contact first).
 */
export function buildBookMovePlainText(contact, q) {
  const lines = []
  lines.push('Coast Team Moving')
  lines.push('Moving quote')
  lines.push('')
  lines.push('Contact')
  lines.push(`Name: ${contact.name.trim()}`)
  lines.push(`Email: ${contact.email.trim()}`)
  lines.push(contact.phone?.trim() ? `Phone: ${contact.phone.trim()}` : 'Phone: —')
  lines.push('')
  if (q.dateLine) {
    lines.push('Date')
    lines.push(q.dateLine)
    lines.push('')
  }
  lines.push('Route')
  q.destinations.forEach((d, i) => {
    const label =
      i === 0 ? 'Origin' : i === q.destinations.length - 1 ? 'Destination' : `Stop ${i + 1}`
    lines.push(`  ${label}: ${d.address?.trim() || '—'}`)
  })
  lines.push('')
  lines.push('Truck')
  lines.push(
    q.requiresTruck
      ? `${q.truck.label} (${q.truck.cubicFeet?.toLocaleString()} cu ft) — $${q.truck.baseRental.toFixed(2)} base rental`
      : 'Customer-provided truck (no rental)'
  )
  lines.push('')
  lines.push('Distance')
  lines.push(
    q.routeDistanceKm != null
      ? `${Math.round(q.routeDistanceKm)} km × $${q.PER_KM_RATE.toFixed(2)}/km = $${q.distanceFee.toFixed(2)}`
      : '—'
  )
  lines.push('')
  if (q.requiresTruck) {
    lines.push('Fuel')
    lines.push(`Nearest to: ${q.fuelSearchLabel || '—'}`)
    const fs = q.firstFuelStation
    if (fs) {
      lines.push(fs.name)
      const addr = [fs.address_line1, fs.address_locality, fs.address_region].filter(Boolean).join(', ')
      if (addr) lines.push(addr)
      if (q.formattedFuelPriceText) {
        lines.push(
          `${q.formattedFuelPriceText} × ${q.distanceKm.toFixed(0)} km × ${q.fuelLperKm} L/km = $${q.fuelCost.toFixed(2)}`
        )
      }
    }
    lines.push('')
  }
  lines.push('Labor')
  q.movers.forEach((m, i) => {
    const hrs = Number(m.hours) || q.MIN_HOURS_PER_MOVER
    const sub = hrs * q.LABOR_RATE_PER_HOUR
    lines.push(`  Mover ${i + 1}: ${hrs} hrs × $${q.LABOR_RATE_PER_HOUR}/hr = $${sub.toFixed(2)}`)
  })
  lines.push(`Labor total: $${q.laborCost.toFixed(2)}`)
  lines.push('')
  lines.push('Totals')
  if (q.requiresTruck) lines.push(`  Rental: $${q.rental.toFixed(2)}`)
  lines.push(`  Distance fee: $${q.distanceFee.toFixed(2)}`)
  if (q.requiresTruck) {
    const fuelCell = !q.hasApifyToken || q.fuelCost <= 0 ? '—' : `$${q.fuelCost.toFixed(2)}`
    lines.push(`  Fuel: ${fuelCell}`)
  }
  lines.push(`  Labor: $${q.laborCost.toFixed(2)}`)
  lines.push(`  Total: $${q.total.toFixed(2)}`)
  return lines.join('\n')
}
