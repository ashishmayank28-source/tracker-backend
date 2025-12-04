/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#4f46e5", // Indigo-600
        secondary: "#9333ea", // Purple-600
        accent: "#f59e0b", // Amber-500
      },
    },
  },
  plugins: [],
};
