/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19', // deep charcoal/navy
        surface: '#111827',
        surfaceHighlight: '#1F2937',
        accent: {
          blue: '#3b82f6', // electric blue
          violet: '#8b5cf6', // violet
          amber: '#f59e0b', // amber
          green: '#10b981', // green for success
          red: '#ef4444', // red for comparison
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
