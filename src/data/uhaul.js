// U-Haul base daily rental by truck size (approximate; adjust as needed)
// Volume from https://www.uhaul.com/Truck-Rentals/Moving-Truck-Sizes/
export const TRUCK_SIZES = [
  { id: '10', label: "10'", cubicFeet: 402, baseRental: 29.95, fuelLperKm: 0.26 },
  { id: '15', label: "15'", cubicFeet: 764, baseRental: 29.95, fuelLperKm: 0.28 },
  { id: '20', label: "20'", cubicFeet: 1016, baseRental: 39.95, fuelLperKm: 0.30 },
  { id: '26', label: "26'", cubicFeet: 1682, baseRental: 49.95, fuelLperKm: 0.32 },
]

const PER_KM_MIN = 1.09
const PER_KM_MAX = 1.29
export const PER_KM_RATE = (PER_KM_MIN + PER_KM_MAX) / 2

export const LABOR_RATE_PER_HOUR = 50
