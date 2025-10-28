"use client";

import { useMemo } from 'react';

export interface TimelineSliderProps {
  min: number | null; // epoch ms
  max: number | null; // epoch ms
  value: number | null;
  onChange: (v: number) => void;
  disabled?: boolean;
}

function fmt(ts: number | null) {
  if (!ts) return '-';
  const d = new Date(ts);
  return d.toLocaleString();
}

export default function TimelineSlider({ min, max, value, onChange, disabled }: TimelineSliderProps) {
  const clamped = useMemo(() => {
    if (min == null || max == null || value == null) return null;
    return Math.min(Math.max(value, min), max);
  }, [min, max, value]);

  if (min == null || max == null) {
    return (
      <div className="w-full text-sm text-white">データがありません</div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-2 text-white">
      <input
        type="range"
        min={min}
        max={max}
        value={clamped ?? min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-white"
        disabled={disabled}
      />
      <div className="flex justify-between text-xs">
        <span>{fmt(min)}</span>
        <span>{fmt(clamped)}</span>
        <span>{fmt(max)}</span>
      </div>
    </div>
  );
}
