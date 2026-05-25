// Design tokens matching the Receiptiles website + Stitch mockups
// Source: landing.html tailwind config + Stitch Material Design 3 palette

export const colors = {
  // Website brand colors (landing.html)
  brand: {
    dark: "#1C1C1A",
    cream: "#F7F6F2",
    green: "#242D28",
    forest: "#4A5D4E",
    sage: "#82907A",
    mint: "#7BE899",
    accent: "#E8C47B",
  },

  // Stitch Material Design 3 palette
  primary: "#101814",
  onPrimary: "#ffffff",
  primaryContainer: "#242d28",
  onPrimaryContainer: "#8b958e",

  secondary: "#006d36",
  onSecondary: "#ffffff",
  secondaryContainer: "#89f6a6",
  onSecondaryContainer: "#007238",
  secondaryFixed: "#8cf9a8",
  secondaryFixedDim: "#6fdc8f",

  tertiary: "#1f1500",
  tertiaryContainer: "#392800",
  tertiaryFixed: "#ffdfa0",
  tertiaryFixedDim: "#e6c279",
  onTertiaryContainer: "#ad8e4a",

  surface: "#faf9f5",
  surfaceBright: "#faf9f5",
  surfaceContainer: "#efeeea",
  surfaceContainerLow: "#f5f4f0",
  surfaceContainerHigh: "#e9e8e4",
  surfaceContainerHighest: "#e3e2df",
  surfaceContainerLowest: "#ffffff",
  surfaceVariant: "#e3e2df",
  surfaceDim: "#dbdad6",

  onSurface: "#1b1c1a",
  onSurfaceVariant: "#434845",
  onBackground: "#1b1c1a",
  background: "#faf9f5",

  outline: "#747874",
  outlineVariant: "#c3c8c3",

  error: "#ba1a1a",
  errorContainer: "#ffdad6",
  onError: "#ffffff",
  onErrorContainer: "#93000a",

  inverseSurface: "#30312e",
  inverseOnSurface: "#f2f1ed",
  inversePrimary: "#bfc9c1",

  // Semantic aliases
  success: "#006d36",
  warning: "#ad8e4a",
  danger: "#ba1a1a",
} as const;

export const spacing = {
  unit: 4,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 24,
  marginMobile: 20,
  marginDesktop: 64,
} as const;

export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
} as const;

export const typography = {
  displayLg: { fontSize: 48, lineHeight: 58, fontWeight: "400" as const, letterSpacing: -1 },
  displayLgMobile: { fontSize: 36, lineHeight: 43, fontWeight: "400" as const },
  headlineLg: { fontSize: 32, lineHeight: 40, fontWeight: "600" as const, letterSpacing: -0.5 },
  headlineMd: { fontSize: 24, lineHeight: 32, fontWeight: "600" as const, letterSpacing: -0.3 },
  bodyLg: { fontSize: 18, lineHeight: 28, fontWeight: "400" as const },
  bodyMd: { fontSize: 16, lineHeight: 24, fontWeight: "400" as const },
  labelMd: { fontSize: 14, lineHeight: 20, fontWeight: "500" as const, letterSpacing: 0.1 },
  labelSm: { fontSize: 12, lineHeight: 16, fontWeight: "600" as const, letterSpacing: 0.5 },
} as const;

export const shadows = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.04,
    shadowRadius: 30,
    elevation: 4,
  },
} as const;

export const categoryColors = [
  "#101814", // primary dark
  "#89f6a6", // mint
  "#e6c279", // gold
  "#c3c8c3", // sage gray
  "#6fdc8f", // green dim
  "#ffdfa0", // warm gold
  "#bfc9c1", // muted green
  "#434845", // dark gray
] as const;
