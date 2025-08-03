/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Isso diz ao Tailwind para escanear todos os arquivos JS, JSX, TS, TSX dentro da pasta src/
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // Adiciona a fonte Inter
      },
    },
  },
  plugins: [],
}