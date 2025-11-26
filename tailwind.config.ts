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
          bg: '#000000',
          card: '#121212',
          cardAlt: '#1c1c1c',
          blue: '#0095f6',
          border: '#262626',
          input: '#262626',
          text: {
            white: '#ffffff',
            light: '#e0e0e0',
            medium: '#a8a8a8',
          },
          gradient: {
            pink: '#f56040',
            orange: '#f77737',
            yellow: '#fcaf45',
            light: '#ffdc80',
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
        'instagram-gradient': 'linear-gradient(to right, #f56040, #f77737, #fcaf45, #ffdc80)',
        'story-gradient': 'linear-gradient(45deg, #f56040, #fcaf45, #ffdc80)',
      },
    },
  },
  plugins: [],
};

export default config;
