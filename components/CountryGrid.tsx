"use client";

import { useState } from "react";
import FlagImg from "@/components/FlagImg";

type Country = { code: string; count: number; name: string };

type Props = {
  countries: Country[];
  cap: number;
};

// app/growing/page.tsx is a server component and can't hold the expanded/
// collapsed toggle itself -- countryBreakdown is already the complete,
// correctly-sorted list computed there, this just controls how much of it
// is on screen.
export default function CountryGrid({ countries, cap }: Props) {
  const [expanded, setExpanded] = useState(false);
  const hiddenCount = countries.length - cap;
  const visible = expanded ? countries : countries.slice(0, cap);

  return (
    <div className="grid grid-cols-3 gap-x-3 gap-y-2 justify-items-center mt-4 max-w-sm mx-auto text-sm text-ink">
      {visible.map(({ code, count, name }) => (
        <span key={code} className="flex items-center gap-1.5">
          <FlagImg code={code} className="rounded-sm" />
          {name} · {count}
        </span>
      ))}
      {hiddenCount > 0 && !expanded && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="col-span-3 text-gray-400 hover:text-ink transition-colors"
        >
          +{hiddenCount} more countries
        </button>
      )}
      {hiddenCount > 0 && expanded && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="col-span-3 text-gray-400 hover:text-ink transition-colors"
        >
          Show less
        </button>
      )}
    </div>
  );
}
