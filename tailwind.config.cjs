module.exports = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}", "./components/**/*.{ts,tsx,js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f5f7ff",
          100: "#eef2ff",
          500: "#4f46e5"
        }
      }
    }
  },
  plugins: []
};
