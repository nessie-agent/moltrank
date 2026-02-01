/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        molt: {
          50: '#fef7ee',
          100: '#fdecd8',
          200: '#fad6b0',
          300: '#f6b87e',
          400: '#f1914a',
          500: '#ed7426',
          600: '#de5a1c',
          700: '#b84319',
          800: '#93371c',
          900: '#772f1a',
          950: '#40150b',
        },
      },
    },
  },
  plugins: [],
}
