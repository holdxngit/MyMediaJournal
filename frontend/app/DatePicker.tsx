"use client";

import { useEffect, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { format, parseISO } from "date-fns";

type Props = {
  value: string; // YYYY-MM-DD or ""
  onChange: (value: string) => void;
  className?: string;
};

export function DatePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = value ? parseISO(value) : undefined;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleToggle = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setOpenUp(window.innerHeight - rect.bottom < 340);
    }
    setOpen((o) => !o);
  };

  return (
    <div className={`relative ${className ?? ""}`} ref={ref}>
      <button
        type="button"
        onClick={handleToggle}
        className="w-full rounded-xl border border-white/10 bg-[#1a1a2e] px-4 py-3 text-left text-white outline-none transition-all duration-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/30"
      >
        {selected ? (
          format(selected, "MMM d, yyyy")
        ) : (
          <span className="text-gray-500">Pick a date</span>
        )}
      </button>

      {open && (
        <div
          className={`absolute z-50 rounded-xl border border-white/10 bg-[#1a1a2e] p-2 shadow-[0_0_30px_rgba(0,0,0,0.5)] ${
            openUp ? "bottom-full mb-2" : "mt-2"
          }`}
        >
          <DayPicker
            mode="single"
            selected={selected}
            defaultMonth={selected}
            onSelect={(date) => {
              onChange(date ? format(date, "yyyy-MM-dd") : "");
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
