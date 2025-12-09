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
      },
      borderRadius: {
        'instagram': '22px',
      },
      backgroundImage: {
        'instagram-gradient': 'linear-gradient(to right, #0ea5e9, #3b82f6, #60a5fa, #93c5fd)',
        'story-gradient': 'linear-gradient(45deg, #0ea5e9, #3b82f6, #60a5fa)',
      },
    },
  },
  plugins: [],
};

export default config;
