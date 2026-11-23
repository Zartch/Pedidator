// Pedidator company theme derivation. Pure, no dependencies. Same code runs in the app (shared/theme.ts) and in the ThemeStudio preview.
var PedidatorTheme = (function () {
  var INK = '#1b1d1f', WHITE = '#ffffff';
  function hexToRgb(hex) {
    var h = String(hex).trim().replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return null;
    return [0, 2, 4].map(function (i) { return parseInt(h.slice(i, i + 2), 16) / 255; });
  }
  function toLin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function toGam(c) { return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function rgbToOklch(rgb) {
    var r = toLin(rgb[0]), g = toLin(rgb[1]), b = toLin(rgb[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    var L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
    var A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
    var B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
    return [L, Math.sqrt(A * A + B * B), Math.atan2(B, A)];
  }
  function oklchToLinRgb(L, C, H) {
    var A = C * Math.cos(H), B = C * Math.sin(H);
    var l = Math.pow(L + 0.3963377774 * A + 0.2158037573 * B, 3);
    var m = Math.pow(L - 0.1055613458 * A - 0.0638541728 * B, 3);
    var s = Math.pow(L - 0.0894841775 * A - 1.291485548 * B, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
  }
  function oklchToHex(L, C, H) {
    var c = C, rgb = oklchToLinRgb(L, c, H), n = 0;
    while (n++ < 40 && rgb.some(function (v) { return v < -0.0005 || v > 1.0005; })) { c *= 0.92; rgb = oklchToLinRgb(L, c, H); }
    return '#' + rgb.map(function (v) {
      var x = Math.round(Math.min(1, Math.max(0, toGam(Math.min(1, Math.max(0, v))))) * 255);
      return (x < 16 ? '0' : '') + x.toString(16);
    }).join('');
  }
  function luminance(hex) { var c = hexToRgb(hex).map(toLin); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; }
  function contrast(a, b) { var x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); }
  function darkenUntil(L, C, H, test) { var l = L, hex = oklchToHex(l, C, H); while (l > 0.12 && !test(hex)) { l -= 0.01; hex = oklchToHex(l, C, H); } return { L: l, hex: hex }; }

  function derive(input) {
    var rgb = hexToRgb(input);
    if (!rgb) return null;
    var lch = rgbToOklch(rgb), L = lch[0], C = lch[1], H = lch[2];
    var source = oklchToHex(L, C, H), brand, onBrand, adjusted = false, brandL = L;
    if (contrast(WHITE, source) >= 4.5) { brand = source; onBrand = WHITE; }
    else if (L < 0.72) { var d = darkenUntil(L, C, H, function (h) { return contrast(WHITE, h) >= 4.5; }); brand = d.hex; brandL = d.L; onBrand = WHITE; adjusted = true; }
    else { brand = source; onBrand = INK; }
    var soft = oklchToHex(0.955, Math.min(C * 0.3, 0.035), H);
    var strong = darkenUntil(Math.min(brandL - 0.07, 0.5), C, H, function (h) { return contrast(h, soft) >= 4.5; }).hex;
    var hueDeg = ((H * 180 / Math.PI) % 360 + 360) % 360;
    return {
      source: source, adjusted: adjusted,
      brand: brand, onBrand: onBrand, brandStrong: strong, brandSoft: soft,
      nearDanger: C > 0.08 && (hueDeg < 45 || hueDeg > 350),
      checks: { onBrand: contrast(onBrand, brand), strongOnSoft: contrast(strong, soft), strongOnWhite: contrast(strong, WHITE) }
    };
  }
  return { derive: derive, contrast: contrast };
})();
if (typeof module !== 'undefined') module.exports = PedidatorTheme;
