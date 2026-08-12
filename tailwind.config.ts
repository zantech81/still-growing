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
        // Nav-only accents for Circle/Growing (components/AppNav.tsx), each
        // thematically matched rather than sharing one color: leaf (green)
        // for Growing -- literally a tree/growth feature -- and marigold
        // (orange) for Circle -- warm, community feeling. Neither reuses
        // pink (would duplicate the active-page pink-deep) or blue-soft/
        // gold (already mean something specific elsewhere -- "coming
        // soon", progress). leaf-soft is deliberately a cooler, more
        // minty green than green-soft's warmer sage tone -- the Library
        // page's "Available now" pill uses green-soft in its own content
        // area, and the two needed to read as clearly different colors,
        // not just two different pills that happen to both be pale green.
        leaf: "#5EA83F",
        "leaf-soft": "#A6E2BE",
        marigold: "#DD7E1E",
        "marigold-soft": "#FBE4C7",
      },
      fontFamily: {
        display: ["Georgia", "'Playfair Display'", "serif"],
        // Backed by app/layout.tsx's next/font/local Nunito loader --
        // was previously the literal name "Nunito", which only rendered
        // correctly on machines that happened to have it installed as a
        // system font, silently falling back to system-ui/sans-serif for
        // everyone else since it was never actually loaded as a web font.
        body: ["var(--font-nunito)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl2: "1.5rem",
      },
    },
  },
  plugins: [],
};
export default config;
