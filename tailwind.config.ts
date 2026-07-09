import type { Config } from "tailwindcss";

// Palette pulled directly from the Life Lessons from a Baby ebook (Canva source),
// so the web app reads as a continuation of the book, not a separate product.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#FBF7F2",
        "pink-dusty": "#E8A0B8",
        "pink-deep": "#C76A8A",
        "pink-pale": "#F7E1E9",
        "blue-soft": "#E6F1FB",
        "green-soft": "#EAF3DE",
        gold: "#E5B94E",
        plum: "#4A2C3D",
        ink: "#3A3A3A",
      },
      fontFamily: {
        display: ["Georgia", "'Playfair Display'", "serif"],
        body: ["'Nunito'", "'Quicksand'", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
