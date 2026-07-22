/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: ['media'],
  theme: {
    extend: {
      colors: {
        // Lavanda — color predominante. lavanda-700 es el único tono validado para CTAs
        // sólidas con texto blanco (5.76:1). Los tonos 300-500 son decorativos/superficie,
        // NUNCA como color de texto pequeño sobre fondos claros (fallan WCAG AA).
        lavanda: {
          50: '#F5EFFB',
          100: '#EFE4F9',
          200: '#E4D3F5',
          300: '#DCC6F0',
          400: '#C4A7E7',
          500: '#B57EDC',
          600: '#9C63CE',
          700: '#7C4DBC',
          800: '#63397D',
          900: '#442A54'
        },
        // Morado profundo — color de texto principal y base del modo oscuro.
        morado: {
          700: '#3D2555',
          800: '#33204A',
          900: '#2B1B3D',
          950: '#241533'
        },
        // Neutro cálido — nunca gris frío.
        crema: {
          50: '#FDFBF9',
          100: '#FAF6F1',
          200: '#F3ECE3'
        },
        // Único acento cálido. Regla fija: SIEMPRE con texto morado-900 encima, nunca blanco
        // (blanco-sobre-melocotón-600 falla AA, ver contraste verificado).
        melocoton: {
          300: '#FFD9B3',
          400: '#FFB37B',
          600: '#E8813F'
        }
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        soft: '0 10px 32px -12px rgba(43, 27, 61, 0.28)',
        glow: '0 0 0 1px rgba(181, 126, 220, 0.25), 0 12px 32px -14px rgba(124, 77, 188, 0.45)'
      },
      backgroundImage: {
        // Gradiente suave estilo Luma, solo para momentos hero (Inicio, onboarding) — no para
        // uso general de fondo, así no compite con la legibilidad del resto de la app.
        'lavanda-glow': 'radial-gradient(circle at 20% 0%, #EFE4F9 0%, #F5EFFB 45%, #FDFBF9 100%)'
      }
    }
  },
  plugins: []
}
