/**
 * Dual theme color system — Payrix FMS-inspired premium fintech aesthetic.
 *
 * Light: warm neutral palette (current brand)
 * Dark: deep forest-black with glowing mint accents
 */

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceContainer: string;
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  secondary: string;
  secondaryContainer: string;
  secondaryFixedDim: string;
  tertiaryFixedDim: string;
  onSurface: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  surfaceVariant: string;
  error: string;
  errorContainer: string;
}

export const lightColors: ThemeColors = {
  background: "#faf9f5",
  surface: "#ffffff",
  surfaceContainer: "#efeeea",
  primary: "#101814",
  onPrimary: "#ffffff",
  primaryContainer: "#242d28",
  secondary: "#006d36",
  secondaryContainer: "#89f6a6",
  secondaryFixedDim: "#6fdc8f",
  tertiaryFixedDim: "#e6c279",
  onSurface: "#1b1c1a",
  onSurfaceVariant: "#434845",
  outline: "#747874",
  outlineVariant: "#c3c8c3",
  surfaceVariant: "#e3e2df",
  error: "#ba1a1a",
  errorContainer: "#ffdad6",
};

export const darkColors: ThemeColors = {
  background: "#0a0f0d",
  surface: "#141c18",
  surfaceContainer: "#1a2420",
  primary: "#e8f5ec",
  onPrimary: "#0a0f0d",
  primaryContainer: "#1e2b25",
  secondary: "#7BE899",
  secondaryContainer: "#1a3d2a",
  secondaryFixedDim: "#4fd87a",
  tertiaryFixedDim: "#e6c279",
  onSurface: "#e8f0ec",
  onSurfaceVariant: "#9ca8a2",
  outline: "#3d4d45",
  outlineVariant: "#2a3832",
  surfaceVariant: "#1e2b25",
  error: "#ff6b6b",
  errorContainer: "#3d1a1a",
};
