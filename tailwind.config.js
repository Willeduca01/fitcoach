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
        }
      },
      boxShadow: {
        'soft-card': '0 8px 32px 0 rgba(0, 0, 0, 0.36)',
        'subtle': '0 2px 8px 0 rgba(0, 0, 0, 0.25)',
        'glow-subtle': '0 0 24px -6px rgba(52, 211, 153, 0.18)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
