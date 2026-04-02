import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        foodexpress: {
          primary: '#FF6B35',    // Laranja Vibrante - Velocidade e energia
          secondary: '#2E294E',  // Roxo Escuro - Confiabilidade
          'primary-light': '#FF8C5A',
          'primary-dark': '#E55A24',
          'secondary-light': '#3D3A5C',
          'secondary-dark': '#1F1B2E',
        }
      }
    },
  },
  plugins: [],
}

export default config


