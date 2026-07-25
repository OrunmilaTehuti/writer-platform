"use client";

import { createContext, useContext, useEffect, useState } from "react";

type FontChoice = "manuscript" | "modern" | "typewriter";

const LABELS: Record<FontChoice, string> = {
  manuscript: "Manuscript (Fraunces + Source Sans)",
  modern: "Modern (Playfair + Inter)",
  typewriter: "Typewriter (Courier Prime)",
};

const FontContext = createContext<{ font: FontChoice; setFont: (f: FontChoice) => void }>({
  font: "manuscript",
  setFont: () => {},
});

export function FontProvider({ children }: { children: React.ReactNode }) {
  const [font, setFontState] = useState<FontChoice>("manuscript");

  useEffect(() => {
    const stored = localStorage.getItem("font") as FontChoice | null;
    if (stored) {
      setFontState(stored);
      document.documentElement.setAttribute("data-font", stored);
    }
  }, []);

  function setFont(next: FontChoice) {
    setFontState(next);
    document.documentElement.setAttribute("data-font", next);
    localStorage.setItem("font", next);
  }

  return <FontContext.Provider value={{ font, setFont }}>{children}</FontContext.Provider>;
}

export function FontPicker() {
  const { font, setFont } = useContext(FontContext);
  return (
    <select
      value={font}
      onChange={(e) => setFont(e.target.value as FontChoice)}
      className="eyebrow"
      style={{ border: "1px solid var(--rule)", borderRadius: "var(--radius)", padding: "0.35em 0.5em" }}
    >
      {(Object.keys(LABELS) as FontChoice[]).map((key) => (
        <option key={key} value={key}>
          {LABELS[key]}
        </option>
      ))}
    </select>
  );
}
