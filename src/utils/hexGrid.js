// Hex tile grid for world map cartogram
// [col, row] coordinates in offset grid format
// Layout inspired by After the Flood / Financial Times world hex tile grids
// Top-left origin (0,0); higher row = further south; higher col = further east

export const HEX_GRID = {
  // North America
  ca: [4, 0],
  us: [3, 3],
  mx: [3, 5],
  gt: [4, 6], bz: [5, 6],
  sv: [4, 7], hn: [5, 7], cu: [6, 6],
  ni: [5, 8], do: [7, 6], ht: [6, 7], jm: [7, 7],
  cr: [4, 8], pa: [5, 9],
  pr: [8, 7], tt: [8, 8],

  // South America
  co: [5, 9], ve: [6, 9],
  ec: [5, 10],
  pe: [5, 11], br: [7, 11], gy: [7, 9], sr: [7, 10], gf: [8, 10],
  bo: [6, 12],
  cl: [5, 13], py: [7, 12], uy: [7, 13],
  ar: [6, 14],

  // Europe (densely packed in the middle)
  is: [8, 0],
  ie: [8, 1], gb: [9, 1], no: [10, 0], se: [11, 0], fi: [12, 0],
  nl: [10, 2], be: [9, 2], lu: [10, 3], de: [11, 2], dk: [11, 1],
  fr: [9, 3], ch: [10, 3], at: [11, 3], cz: [12, 2], pl: [12, 1],
  pt: [8, 4], es: [9, 4], it: [10, 4], si: [11, 4], hr: [12, 4],
  ba: [12, 5], rs: [13, 4], me: [12, 5], al: [13, 5],
  mk: [13, 5], ro: [13, 3], hu: [12, 3], sk: [13, 2],
  by: [14, 1], ee: [13, 0], lv: [13, 1], lt: [13, 2],
  ua: [14, 2], md: [14, 3],
  gr: [14, 5], bg: [14, 4], tr: [15, 4],
  cy: [15, 5], mt: [11, 5],
  // Microstates
  ad: [9, 4], mc: [10, 4], sm: [10, 4], va: [10, 4], li: [11, 4],
  fo: [9, 0], gi: [8, 5],

  // Africa
  ma: [9, 5], dz: [10, 5], tn: [11, 5],
  ly: [11, 6], eg: [13, 6],
  mr: [9, 6], ml: [10, 6], ne: [11, 7], td: [12, 7], sd: [13, 7], er: [14, 7],
  sn: [8, 7], gm: [8, 7], gn: [9, 7], sl: [9, 7], lr: [9, 8], ci: [10, 7],
  bf: [10, 7], gh: [10, 8], tg: [11, 8], bj: [11, 8], ng: [11, 8],
  cm: [12, 8], cf: [12, 8], ss: [13, 8], et: [14, 8], so: [15, 8], dj: [15, 7],
  ga: [11, 9], cg: [12, 9], cd: [13, 9], ug: [14, 9], ke: [15, 9], rw: [13, 10], bu: [14, 10], bi: [14, 10], tz: [14, 10],
  ao: [12, 10], zm: [13, 11], mw: [14, 11], mz: [14, 12],
  na: [12, 11], bw: [13, 12], zw: [14, 11], mg: [15, 11],
  za: [13, 13], ls: [14, 13], sz: [14, 12],
  cv: [7, 7], st: [11, 9], gq: [11, 8],

  // Middle East
  sy: [15, 4], lb: [15, 5], il: [14, 6], ps: [14, 6], jo: [15, 5],
  iq: [16, 5], ir: [17, 5], sa: [16, 6], kw: [16, 5],
  ae: [17, 6], qa: [16, 6], bh: [16, 6], om: [17, 7], ye: [16, 7],
  af: [18, 4], pk: [18, 5],

  // Central / South Asia
  kz: [17, 2], uz: [17, 3], tm: [17, 4], kg: [18, 3], tj: [18, 4],
  in: [19, 6], np: [19, 5], bt: [20, 5], lk: [19, 8], mv: [19, 9],
  bd: [20, 6], mm: [20, 6],

  // East Asia
  mn: [19, 2], cn: [20, 3], jp: [22, 3], kr: [22, 4], kp: [22, 3],
  hk: [21, 5], tw: [22, 5], mo: [21, 5],

  // Southeast Asia
  th: [20, 7], la: [20, 6], kh: [21, 7], vn: [21, 6],
  my: [21, 8], sg: [21, 9], id: [22, 10], ph: [23, 7], bn: [22, 8],
  tl: [23, 10],

  // Oceania
  au: [22, 12], nz: [23, 14],
  pg: [23, 10], sb: [24, 10], vu: [24, 11], nc: [24, 12], fj: [25, 11],
  pf: [26, 12], ws: [25, 12], to: [25, 13],

  // Russia (spans a lot, place at central-Asian/Europe boundary)
  ru: [16, 1],
  ge: [16, 4], am: [16, 4], az: [17, 4],

  // Synthetic / aggregate
  eu: [10, 1], uk: [9, 1], xk: [13, 5],
}

export function getHexPosition(alpha2) {
  return HEX_GRID[alpha2] || null
}
