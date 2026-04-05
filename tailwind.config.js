/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx}', './index.html'],
  theme: {
    extend: {
      colors: {
        // Sidebar stays dark regardless of theme
        sidebar: '#1a2332',
        'sidebar-hover': '#243044',
        // Primary blue
        primary: '#3b82f6',
        'primary-dark': '#2563eb',
        // Theme-aware surfaces via CSS vars
        surface: 'var(--bg-card)',
        page: 'var(--bg-page)',
        header: 'var(--bg-header)',
        'theme-border': 'var(--border)',
        'text-1': 'var(--text-1)',
        'text-2': 'var(--text-2)',
        'text-3': 'var(--text-3)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
