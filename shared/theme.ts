// Typed copy of docs/design/derive-brand.js. Pure, no Intl.
const INK = '#1b1d1f'
const WHITE = '#ffffff'

type Rgb = [number, number, number]

function hexToRgb(hex: string): Rgb | null {
  let h = String(hex).trim().replace('#', '')
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return null
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Rgb
}
const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const toGam = (c: number) =>
  c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055

function rgbToOklch(rgb: Rgb): [number, number, number] {
  const r = toLin(rgb[0]),
    g = toLin(rgb[1]),
    b = toLin(rgb[2])
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return [L, Math.sqrt(A * A + B * B), Math.atan2(B, A)]
}

function oklchToLinRgb(L: number, C: number, H: number): number[] {
  const A = C * Math.cos(H),
    B = C * Math.sin(H)
  const l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3)
  const m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3)
  const s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3)
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
}

function oklchToHex(L: number, C: number, H: number): string {
  let c = C
  let rgb = oklchToLinRgb(L, c, H)
  let n = 0
  while (n++ < 40 && rgb.some((v) => v < -0.0005 || v > 1.0005)) {
    c *= 0.92
    rgb = oklchToLinRgb(L, c, H)
  }
  return (
    '#' +
    rgb
      .map((v) => {
        const x = Math.round(Math.min(1, Math.max(0, toGam(Math.min(1, Math.max(0, v))))) * 255)
        return (x < 16 ? '0' : '') + x.toString(16)
      })
      .join('')
  )
}

function luminance(hex: string): number {
  const c = (hexToRgb(hex) as Rgb).map(toLin)
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
function contrast(a: string, b: string): number {
  const x = luminance(a),
    y = luminance(b)
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
function darkenUntil(L: number, C: number, H: number, test: (hex: string) => boolean) {
  let l = L
  let hex = oklchToHex(l, C, H)
  while (l > 0.12 && !test(hex)) {
    l -= 0.01
    hex = oklchToHex(l, C, H)
  }
  return { L: l, hex }
}

export type DerivedBrand = {
  brand: string
  onBrand: string
  brandStrong: string
  brandSoft: string
  adjusted: boolean
  nearDanger: boolean
}

export function deriveBrand(hex: string): DerivedBrand | null {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const [L, C, H] = rgbToOklch(rgb)
  const source = oklchToHex(L, C, H)
  let brand: string
  let onBrand: string
  let adjusted = false
  let brandL = L
  if (contrast(WHITE, source) >= 4.5) {
    brand = source
    onBrand = WHITE
  } else if (L < 0.72) {
    const d = darkenUntil(L, C, H, (h) => contrast(WHITE, h) >= 4.5)
    brand = d.hex
    brandL = d.L
    onBrand = WHITE
    adjusted = true
  } else {
    brand = source
    onBrand = INK
  }
  const soft = oklchToHex(0.955, Math.min(C * 0.3, 0.035), H)
  const strong = darkenUntil(Math.min(brandL - 0.07, 0.5), C, H, (h) => contrast(h, soft) >= 4.5).hex
  const hueDeg = (((H * 180) / Math.PI) % 360 + 360) % 360
  return {
    brand,
    onBrand,
    brandStrong: strong,
    brandSoft: soft,
    adjusted,
    nearDanger: C > 0.08 && (hueDeg < 45 || hueDeg > 350),
  }
}
