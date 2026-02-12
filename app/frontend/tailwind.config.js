export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#f3f4f6',
        sidebar: '#ffffff',

        'note-white': '#ffffff',
        'note-red': '#ffa5a5',
        'note-orange': '#ffd6a5',
        'note-yellow': '#fdffb6',
        'note-green': '#caffbf',
        'note-teal': '#9bf6ff',
        'note-blue': '#a0c4ff',
        'note-purple': '#bdb2ff',
        'note-pink': '#ffc6ff',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
