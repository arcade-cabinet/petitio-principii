export const THEME = {
  colors: {
    bgPrimary: "#05010A",
    bgPanel: "#12051F",
    textPrimary: "#C0C0FF",
    textHighlight: "#F5F0FF",
    accentViolet: "#7A5CFF",
    accentPink: "#FFD1FA",
    get accentSilver() {
      return this.textPrimary;
    },
  },
  fonts: {
    terminal: '"DM Mono", "IBM Plex Mono", "Courier New", monospace',
    ui: '"Space Grotesk", system-ui, sans-serif',
  },
  crt: {
    glowColor: "#C0C0FF",
    glowIntensity: "0 0 4px #C0C0FF, 0 0 12px #7A5CFF",
    scanlineOpacity: 0.03,
    flickerEnabled: true,
  },
} as const;
