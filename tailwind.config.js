/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border, 240 3.7% 15.9%))',
        input: 'hsl(var(--input, 240 3.7% 15.9%))',
        ring: 'hsl(var(--ring, 142.1 76.2% 36.3%))',
        background: 'hsl(var(--background, 240 10% 3.9%))',
        foreground: 'hsl(var(--foreground, 0 0% 98%))',
        primary: {
          DEFAULT: 'hsl(var(--primary, 142.1 76.2% 36.3%))',
          foreground: 'hsl(var(--primary-foreground, 355.7 100% 97.3%))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary, 240 3.7% 15.9%))',
          foreground: 'hsl(var(--secondary-foreground, 0 0% 98%))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive, 0 62.8% 30.6%))',
          foreground: 'hsl(var(--destructive-foreground, 0 0% 98%))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted, 240 3.7% 15.9%))',
          foreground: 'hsl(var(--muted-foreground, 240 5% 64.9%))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent, 240 3.7% 15.9%))',
          foreground: 'hsl(var(--accent-foreground, 0 0% 98%))',
        },
        card: {
          DEFAULT: 'hsl(var(--card, 240 10% 3.9%))',
          foreground: 'hsl(var(--card-foreground, 0 0% 98%))',
        },
        surface: {
          bg: '#09090b',       // Deep zinc-950
          card: 'rgba(24, 24, 27, 0.65)', // zinc-900 with alpha
          cardHover: 'rgba(39, 39, 42, 0.75)',
          border: 'rgba(255, 255, 255, 0.07)',
          borderHover: 'rgba(255, 255, 255, 0.14)',
          elevated: '#18181b',
        },
        brand: {
          emerald: '#10b981',
          lime: '#84cc16',
          accent: '#34d399',
          dark: '#064e3b',
        }
      },
      boxShadow: {
        'soft-card': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
        'subtle': '0 2px 8px 0 rgba(0, 0, 0, 0.25)',
        'glow-subtle': '0 0 24px -6px rgba(52, 211, 153, 0.18)',
        'glow-emerald': '0 0 35px -5px rgba(16, 185, 129, 0.3)',
        'glass': '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.12)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        }
      },
      animation: {
        "fade-in": "fade-in 0.3s ease-out forwards",
        "pulse-subtle": "pulse-subtle 3s ease-in-out infinite",
      }
    },
  },
  plugins: [],
}
