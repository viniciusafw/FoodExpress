/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Poppins', 'sans-serif'],
        sans:    ['Inter', 'sans-serif'],
        mono:    ['Roboto Mono', 'monospace'],
      },
      colors: {
        primary:    '#FF6B35',
        secondary:  '#2E294E',
        accent:     '#1B998B',
        background: '#FFF8F5',
        text: {
          DEFAULT:   '#2D3436',
          primary:   '#2D3436',
          secondary: '#5A4F4A',
          muted:     '#8A7B74',
        },
        border:       '#EDE0D9',
        surface:  {
          DEFAULT: '#FFF8F5',
          2:       '#F5EDE8',
        },
        'primary-light': '#FFF0EB',
      },
      backgroundColor: {
        background:      '#FFF8F5',
        'primary-light': '#FFF0EB',
        'surface-2':     '#F5EDE8',
      },
      borderColor: {
        DEFAULT: '#EDE0D9',
        border:  '#EDE0D9',
      },
    },
  },
  plugins: [],
}
