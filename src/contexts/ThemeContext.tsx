import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type Theme = "dark" | "light" | "system";
type FontFamily = "inter" | "roboto" | "open-sans" | "lato" | "montserrat";
type FontSize = "small" | "medium" | "large" | "extra-large";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const fontFamilyMap: Record<FontFamily, string> = {
  inter: "'Inter', system-ui, -apple-system, sans-serif",
  roboto: "'Roboto', system-ui, -apple-system, sans-serif",
  "open-sans": "'Open Sans', system-ui, -apple-system, sans-serif",
  lato: "'Lato', system-ui, -apple-system, sans-serif",
  montserrat: "'Montserrat', system-ui, -apple-system, sans-serif",
};

const fontSizeMap: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
  "extra-large": "20px",
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem("theme") as Theme) || "dark";
  });
  
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => {
    return (localStorage.getItem("fontFamily") as FontFamily) || "inter";
  });
  
  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem("fontSize") as FontSize) || "medium";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.body.style.fontFamily = fontFamilyMap[fontFamily];
    localStorage.setItem("fontFamily", fontFamily);
  }, [fontFamily]);

  useEffect(() => {
    document.documentElement.style.fontSize = fontSizeMap[fontSize];
    localStorage.setItem("fontSize", fontSize);
  }, [fontSize]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontFamily, setFontFamily, fontSize, setFontSize }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
