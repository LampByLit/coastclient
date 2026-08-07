/**
 * Plain-text booking email for Web3Forms message field.
 * Name, email, and phone are omitted here — Web3Forms shows them in separate fields.
 */

function money(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num.toFixed(2) : '0.00'
}

function getRouteStops(destinations) {
  const all = destinations || []
  return all
    .map((d, index) => ({
      address: typeof d.address === 'string' ? d.address.trim() : '',
      index,
      total: all.length,
    }))
    .filter((d) => d.address)
}

function getStopLabel(stop, filledCount) {
  if (filledCount === 1) return 'Service location'
  if (stop.index === 0) return 'Origin'
  if (stop.index === stop.total - 1) return 'Destination'
  return `Stop ${stop.index + 1}`
}

function formatStationAddress(station) {
  if (!station) return ''
  return [station.address_line1, station.address_locality, station.address_region]
    .filter(Boolean)
    .join(', ')
}

function formatFuelEstimate(q) {
  if (!q.hasApifyToken) return 'N/A (fuel lookup not configured)'
  const distKm = q.routeDistanceKm != null ? Math.round(q.routeDistanceKm) : null
  const fuelCost = Number(q.fuelCost)
  const lPerKm = q.fuelLperKm ?? 0.28
  if (distKm == null || distKm <= 0) return 'N/A (no route distance calculated)'
  if (!Number.isFinite(fuelCost) || fuelCost <= 0) return 'N/A (fuel price unavailable for this route)'
  const pricePart = q.formattedFuelPriceText ? ` at ${q.formattedFuelPriceText}` : ''
  return `${distKm} km × ${lPerKm} L/km${pricePart} = $${money(fuelCost)} (fuel allowance in quote)`
}

export function buildBookMovePlainText(_contact, q) {
  const lines = []
  const stops = getRouteStops(q.destinations)
  const laborCost = Number(q.laborCost)
  const movers = q.movers || []
  const moverCount = Math.max(1, movers.length)
  const moverHours = movers.map((m) => Number(m.hours) || q.MIN_HOURS_PER_MOVER)
  const laborRate = q.LABOR_RATE_PER_HOUR
  const perKmRate = q.PER_KM_RATE

  lines.push('MOVE DATE')
  lines.push(q.dateLine?.trim() || 'Not specified by customer')
  lines.push('')

  lines.push('ROUTE')
  if (stops.length === 0) {
    lines.push('—')
  } else {
    for (const stop of stops) {
      const label = getStopLabel(stop, stops.length)
      lines.push(`${label}: ${stop.address}`)
    }
    if (stops.length === 1) {
      lines.push(
        '(Only one address entered — treat as load-only, unload-only, or in-home move unless notes say otherwise.)'
      )
    }
  }
  lines.push('')

  lines.push('CREW')
  if (moverHours.length <= 1 || moverHours.every((h) => h === moverHours[0])) {
    const hours = moverHours[0] ?? q.MIN_HOURS_PER_MOVER
    lines.push(`${moverCount} mover${moverCount === 1 ? '' : 's'} × ${hours} hours each @ $${laborRate}/hr per mover`)
  } else {
    lines.push(`${moverCount} movers:`)
    for (let i = 0; i < moverHours.length; i += 1) {
      lines.push(`  Mover ${i + 1}: ${moverHours[i]} hours @ $${laborRate}/hr`)
    }
  }
  lines.push(`Labor subtotal: $${money(laborCost)}`)
  lines.push('(Labor does not include driving time.)')
  lines.push('')

  lines.push('── ACTION REQUIRED ──')
  if (q.requiresTruck) {
    const truckLabel = q.truck?.label || 'moving'
    lines.push(
      `TRUCK RENTAL: YES — Rent a ${truckLabel} truck (quoted base rental: $${money(q.rental)})`
    )
    lines.push('')
    lines.push('FUEL — Recommended station')
    if (q.fuelSearchLabel?.trim()) {
      lines.push(`Nearest to: ${q.fuelSearchLabel.trim()}`)
    }
    const station = q.firstFuelStation
    if (station?.name) {
      lines.push(`Station:  ${station.name}`)
      const stationAddress = formatStationAddress(station)
      if (stationAddress) lines.push(`Address:  ${stationAddress}`)
    } else {
      lines.push('Station:  Unavailable — no station returned for this destination')
    }
    if (q.formattedFuelPriceText) {
      lines.push(`Price:    ${q.formattedFuelPriceText}`)
    } else if (station) {
      lines.push('Price:    Unavailable')
    }
    lines.push(`Estimate: ${formatFuelEstimate(q)}`)
  } else {
    lines.push(
      'TRUCK RENTAL: NO — Customer is providing their own truck. You do not need to rent a truck for this job.'
    )
  }
  lines.push('')

  const details = typeof q.moveDetails === 'string' ? q.moveDetails.trim() : ''
  if (details) {
    lines.push('── CUSTOMER NOTES ──')
    lines.push(details)
    lines.push('')
  }

  lines.push('── QUOTE BREAKDOWN ──')
  lines.push(`Labor:          $${money(laborCost)}`)

  if (q.routeDistanceKm != null && q.routeDistanceKm > 0) {
    const km = Math.round(q.routeDistanceKm)
    lines.push(`Distance:       ${km} km × $${money(perKmRate)}/km = $${money(q.distanceFee)}`)
  } else if (stops.length === 1) {
    lines.push(`Distance:       Not calculated (single location) — $${money(q.distanceFee)} in quote`)
  } else {
    lines.push(`Distance:       Not calculated — $${money(q.distanceFee)} in quote`)
  }

  if (q.requiresTruck) {
    lines.push(`Truck rental:   $${money(q.rental)}`)
    const fuelCost = Number(q.fuelCost)
    if (q.hasApifyToken && Number.isFinite(fuelCost) && fuelCost > 0) {
      lines.push(`Fuel estimate:  $${money(fuelCost)}`)
    } else {
      lines.push('Fuel estimate:  N/A')
    }
  } else {
    lines.push('Truck rental:   $0.00 (customer truck)')
    lines.push('Fuel estimate:  N/A (customer truck)')
  }

  lines.push('─────────────────────')
  lines.push(`TOTAL QUOTED:   $${money(q.total)}`)

  return lines.join('\n')
}
