/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        terracota: {
          50: '#fbf3ef',
          100: '#f5e2d8',
          200: '#e9bfa8',
          300: '#dc9a78',
          400: '#d17a54',
          500: '#c45a3e',
          600: '#a84630',
          700: '#873627',
          800: '#5f2619',
          900: '#3c170f'
        },
        crema: {
          50: '#fffdf9',
          100: '#faf0e0',
          200: '#f5e6d0'
        },
        noche: {
          800: '#241d1a',
          900: '#160f0d'
        }
      },
      fontFamily: {
        display: ['"Fraunces"', 'ui-serif', 'Georgia', 'serif'],
        body: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 8px 30px -10px rgba(60, 23, 15, 0.25)'
      }
    }
  },
  plugins: []
}
