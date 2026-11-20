export const TRUCK_SIZES = [
  { id: '10', label: "10'", cubicFeet: 402, baseRental: 29.95, fuelLperKm: 0.26 },
  { id: '15', label: "15'", cubicFeet: 764, baseRental: 29.95, fuelLperKm: 0.28 },
  { id: '20', label: "20'", cubicFeet: 1016, baseRental: 39.95, fuelLperKm: 0.3 },
  { id: '26', label: "26'", cubicFeet: 1682, baseRental: 49.95, fuelLperKm: 0.32 },
]

export const PER_KM_RATE = 1.29

export const LABOR_RATE_PER_HOUR = 70

export const MIN_MOVERS = 1
export const DEFAULT_MOVERS = 2
export const MIN_HOURS_PER_MOVER = 2

export const SQ_FT_BANDS = [
  { id: 'under-1000', label: '1–1,000 sq ft', hoursPerMover: 2 },
  { id: '1000-1500', label: '1,000–1,500 sq ft', hoursPerMover: 2.5 },
  { id: '1500-2000', label: '1,500–2,000 sq ft', hoursPerMover: 3 },
  { id: '2000-2500', label: '2,000–2,500 sq ft', hoursPerMover: 3.5 },
  { id: '2500-plus', label: '2,500+ sq ft', hoursPerMover: 4 },
]

export function getSqFtBand(bandId) {
  if (!bandId) return null
  return SQ_FT_BANDS.find((band) => band.id === bandId) ?? null
}

export function hoursPerMoverForSqFtBand(bandId) {
  const band = getSqFtBand(bandId)
  if (!band) return MIN_HOURS_PER_MOVER
  return Math.max(MIN_HOURS_PER_MOVER, band.hoursPerMover)
}
