import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#0A0507',
          surface: '#130A0D',
          elevated: '#1B0F13',
          line: '#2B171C',
          text: '#FBEFF0',
          muted: '#BFA6AA',
          subtle: '#7E666B',
          red: '#FF1F4B',
          crimson: '#C8102E',
          orange: '#FF6A1A',
          amber: '#FFB23F',
          gold: '#F5C451',
          success: '#3DDC97',
        },
        instagram: {
          bg: '#f0f7ff',
          card: '#ffffff',
          cardAlt: '#f8fafc',
          blue: '#0ea5e9',
          border: '#bfdbfe',
          input: '#e0f2fe',
          text: {
            white: '#1e293b',
            light: '#334155',
            medium: '#64748b',
          },
          gradient: {
            pink: '#0ea5e9',
            orange: '#3b82f6',
            yellow: '#60a5fa',
            light: '#93c5fd',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'system-ui', 'sans-serif'],
        studio: ['var(--font-studio-sans)', 'Inter', 'system-ui', 'sans-serif'],
        display: ['var(--font-studio-display)', 'var(--font-studio-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'instagram': '22px',
      },
      keyframes: {
        'studio-shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'studio-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'studio-pulse-glow': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        'studio-shimmer': 'studio-shimmer 2.2s linear infinite',
        'studio-float': 'studio-float 6s ease-in-out infinite',
        'studio-pulse-glow': 'studio-pulse-glow 2.4s ease-in-out infinite',
      },
      backgroundImage: {
        'studio-fire': 'linear-gradient(135deg, #FF1F4B 0%, #FF4A2B 50%, #FF8A1F 100%)',
        'studio-fire-soft': 'linear-gradient(135deg, rgba(255,31,75,0.18) 0%, rgba(255,138,31,0.10) 100%)',
        'instagram-gradient': 'linear-gradient(to right, #0ea5e9, #3b82f6, #60a5fa, #93c5fd)',
        'story-gradient': 'linear-gradient(45deg, #0ea5e9, #3b82f6, #60a5fa)',
      },
    },
  },
  plugins: [],
};

export default config;
