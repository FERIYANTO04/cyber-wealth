/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Palette tokens live on :root in src/styles/global.css. Every entry here
      // carries the alpha placeholder so opacity modifiers compile.
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        'ink-quiet': 'rgb(var(--ink-quiet) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        signal: 'rgb(var(--signal) / <alpha-value>)',
        'signal-soft': 'rgb(var(--signal-soft) / <alpha-value>)',
        hold: 'rgb(var(--hold) / <alpha-value>)',
        'hold-soft': 'rgb(var(--hold-soft) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-sora)', 'var(--font-inter)', 'ui-sans-serif', 'sans-serif'],
        mono: ['var(--font-plex-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      spacing: {
        block: '0.75rem',
        stack: '1.25rem',
        section: '2.5rem',
        page: '1rem',
      },
      maxWidth: {
        console: '72rem',
      },
    },
  },
  plugins: [],
}
