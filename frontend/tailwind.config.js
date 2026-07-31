/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0B0D14',
        surface: '#12141F',
        'surface-2': '#181B2A',
        indigo: {
          DEFAULT: '#4F46E5',
          soft: '#6D64F0',
        },
        cyan: {
          DEFAULT: '#22D3EE',
        },
        amber: {
          DEFAULT: '#F5A623',
        },
        mist: '#C7CBE0',
        'mist-dim': '#7D82A0',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'nebula-gradient': 'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(79,70,229,0.35), transparent), radial-gradient(ellipse 60% 50% at 90% 10%, rgba(34,211,238,0.15), transparent)',
        'orbit-ring': 'conic-gradient(from 0deg, #4F46E5, #22D3EE, #F5A623, #4F46E5)',
      },
      boxShadow: {
        glass: '0 8px 32px rgba(0,0,0,0.35)',
        glow: '0 0 40px rgba(79,70,229,0.25)',
      },
      backdropBlur: {
        glass: '16px',
      },
      animation: {
        'spin-slow': 'spin 12s linear infinite',
        'spin-slower': 'spin 24s linear infinite',
        float: 'float 6s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
};
