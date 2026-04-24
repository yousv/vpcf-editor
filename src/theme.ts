export const color = {
  background:      '#000000',
  surface:         '#0a0a0a',
  surfaceRaised:   '#111111',
  surfaceActive:   '#181818',
  surfaceHigh:     '#222222',
  border:          '#222222',
  borderStrong:    '#333333',
  text:            '#ededed',
  textMuted:       '#666666',
  textFaint:       '#3d3d3d',
  white:           '#ffffff',
  focusRing:       '#6366f1',
  success:         '#22c55e',
  warning:         '#f59e0b',
  error:           '#ef4444',
  errorDark:       '#dc2626',
  backdrop:        'rgba(0,0,0,0.72)',
  unsaved:         '#f59e0b',
} as const;

export const font = {
  sans:           "'Geist', 'Inter', system-ui, sans-serif",
  mono:           "'Geist Mono', 'JetBrains Mono', 'Fira Code', monospace",
  sizeXs:         13,
  sizeSm:         14,
  sizeBase:       16,
  sizeMd:         17,
  sizeLg:         20,
  sizeXl:         22,
  size2xl:        26,
  weightRegular:  400,
  weightMedium:   500,
  weightSemiBold: 600,
  weightBold:     700,
} as const;

export const space = {
  xs:  5,
  sm:  7,
  md:  12,
  lg:  17,
  xl:  24,
  xxl: 34,
} as const;

export const radius = {
  sm:   4,
  md:   6,
  lg:   8,
  xl:   12,
  full: 9999,
} as const;

export const size = {
  sidebarMinWidth:     288,
  sidebarMaxWidth:     624,
  sidebarDefaultWidth: 336,

  tabBarHeight:    53,
  bottomBarHeight: 67,
  headerHeight:    58,

  rowHeight:    55,

  buttonXs:  29,
  buttonSm:  36,
  buttonMd:  41,
  buttonLg:  46,

  inputHeight:   38,
  inputHeightSm: 34,

  swatchSm:  29,
  swatchMd:  38,
  swatchLg:  48,
} as const;

export const transition = {
  quick:    'all 0.08s ease',
  standard: 'all 0.14s ease',
  gradual:  'all 0.22s ease',
} as const;

export const shadow = {
  sm:    '0 1px 2px rgba(0,0,0,0.5)',
  md:    '0 4px 16px rgba(0,0,0,0.6)',
  lg:    '0 8px 40px rgba(0,0,0,0.7)',
  focus: '0 0 0 2px rgba(99,102,241,0.4)',
} as const;

export const zIndex = {
  base:    1,
  overlay: 10,
  modal:   20,
  toast:   30,
} as const;
