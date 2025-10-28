"use client";

import { useMemo, useState } from 'react';
import { PLUTCHIK_CORE, PLUTCHIK_INTENSITY, normalizeEmotionKey, keyToPrimary, shadeColor } from '../lib/plutchik';
import type { ConversationSession } from '../types/conversation';
import Tooltip from './Tooltip';

export interface PlutchikWheelProps {
  sessions: ConversationSession[]; // selected subset (latest few), assume desc
}

const SIZE = 320;
const CX = SIZE / 2;
const CY = SIZE / 2;
const INNER_R = 60; // inner radius of the core ring
const OUTER_R = 115; // outer radius of the core ring
const OUTER2_R = 150; // outer radius of the sub ring
const SUB_BANDS = 3; // weak/base/strong

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, innerR: number, outerR: number, startAngle: number, endAngle: number) {
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  const p1 = polarToCartesian(cx, cy, outerR, startAngle);
  const p2 = polarToCartesian(cx, cy, outerR, endAngle);
  const p3 = polarToCartesian(cx, cy, innerR, endAngle);
  const p4 = polarToCartesian(cx, cy, innerR, startAngle);
  return [
    `M ${p1.x} ${p1.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4.x} ${p4.y}`,
    'Z',
  ].join(' ');
}

export default function PlutchikWheel({ sessions }: PlutchikWheelProps) {
  const latest = sessions[0];
  const currentKey = normalizeEmotionKey(latest?.emotion_key ?? undefined) || undefined;

  const wedges = useMemo(() => {
    const entries = Object.entries(PLUTCHIK_CORE);
    const span = 360 / entries.length;
    return entries.map(([key, info], i) => ({ key, info, start: i * span, end: (i + 1) * span }));
  }, []);

  // Tooltip state
  const [tip, setTip] = useState<{ open: boolean; x: number; y: number; content: React.ReactNode }>({
    open: false,
    x: 0,
    y: 0,
    content: null,
  });

  function handleMarkerEnter(e: React.MouseEvent | React.FocusEvent, s: ConversationSession) {
    const rect = (e.currentTarget as any).ownerSVGElement?.getBoundingClientRect();
    const clientX = 'clientX' in e ? e.clientX : (rect?.left ?? 0) + (e.target as any).cx.baseVal.value;
    const clientY = 'clientY' in e ? e.clientY : (rect?.top ?? 0) + (e.target as any).cy.baseVal.value;
    const ptX = clientX - (rect?.left ?? 0);
    const ptY = clientY - (rect?.top ?? 0);
    setTip({
      open: true,
      x: ptX,
      y: ptY,
      content: (
        <div>
          <div className="font-medium mb-1">{s.emotion_name ?? '不明'}</div>
          <div className="text-gray-200">{new Date(s.started_at).toLocaleString()}</div>
          {s.emotion_reason ? <div className="mt-1 whitespace-pre-wrap">{s.emotion_reason}</div> : null}
        </div>
      ),
    });
  }

  function handleMarkerLeave() {
    setTip((t) => ({ ...t, open: false }));
  }

  // marker radius per recency (latest inner)
  const markers = useMemo(() => {
    const maxN = Math.max(1, sessions.length);
    return sessions.map((s, idx) => {
      const kRaw = normalizeEmotionKey(s.emotion_key);
      const primary = keyToPrimary(kRaw) || (wedges[0].key as any);
      const wedge = wedges.find((w) => w.key === primary) || wedges[0];
      const angle = (wedge.start + wedge.end) / 2;
      const score = typeof s.emotion_score === 'number' ? Math.min(1, Math.max(0, s.emotion_score)) : undefined;
      const inner = INNER_R + 8;
      const outer = OUTER2_R - 8;
      const r = score != null
        ? inner + (outer - inner) * score
        : OUTER_R - 10 - (idx * (OUTER_R - INNER_R - 20)) / (maxN - 1 || 1);
      const pos = polarToCartesian(CX, CY, r, angle);
      return { s, x: pos.x, y: pos.y, color: PLUTCHIK_CORE[wedge.key].color };
    });
  }, [sessions, wedges]);

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Base ring background */}
        <circle cx={CX} cy={CY} r={OUTER2_R} fill="#f8fafc" stroke="#e2e8f0" />
        <circle cx={CX} cy={CY} r={INNER_R} fill="white" stroke="#e2e8f0" />

        {/* Wedges */}
        {wedges.map(({ key, info, start, end }) => {
          const active = currentKey === key;
          const d = arcPath(CX, CY, INNER_R, OUTER_R, start, end);
          return (
            <path
              key={key}
              d={d}
              fill={info.color}
              opacity={active ? 0.95 : 0.35}
              stroke={active ? '#111827' : 'white'}
              strokeWidth={active ? 2 : 1}
              style={{ transition: 'opacity 250ms ease, stroke-width 250ms ease' }}
            />
          );
        })}

        {/* Sub-emotion ring split into 3 radial bands per primary */}
        {wedges.map(({ key, info, start, end }) => {
          const intens = PLUTCHIK_INTENSITY[key as keyof typeof PLUTCHIK_INTENSITY];
          if (!intens) return null;
          const baseColor = info.color;
          const bands = [
            { level: 'weak', color: shadeColor(baseColor, 0.25) },
            { level: 'base', color: baseColor },
            { level: 'strong', color: shadeColor(baseColor, -0.15) },
          ] as const;
          return bands.map((b, i) => {
            const r1 = OUTER_R + 5 + (i * (OUTER2_R - OUTER_R - 10)) / SUB_BANDS;
            const r2 = OUTER_R + 5 + ((i + 1) * (OUTER2_R - OUTER_R - 10)) / SUB_BANDS;
            const d = arcPath(CX, CY, r1, r2, start, end);
            return (
              <path
                key={`${key}-${b.level}`}
                d={d}
                fill={b.color}
                opacity={0.45}
                stroke="white"
                strokeWidth={0.5}
                style={{ transition: 'opacity 250ms ease' }}
              />
            );
          });
        })}

        {/* Labels */}
        {wedges.map(({ key, info, start, end }) => {
          const angle = (start + end) / 2;
          const { x, y } = polarToCartesian(CX, CY, OUTER2_R + 18, angle);
          return (
            <g key={`label-group-${key}`}>
              <text
                key={`lbl-outline-${key}`}
                x={x}
                y={y}
                fontSize={11}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
                stroke="#000000"
                strokeWidth={2}
                paintOrder="stroke fill"
              >
                {info.labelJa}
              </text>
              <text
                key={`lbl-${key}`}
                x={x}
                y={y}
                fontSize={11}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ffffff"
              >
                {info.labelJa}
              </text>
            </g>
          );
        })}

        {/* Session markers with tooltips */}
        {markers.map(({ s, x, y, color }) => {
          const r = 4 + (typeof s.emotion_score === 'number' ? s.emotion_score * 6 : 0);
          const opacity = 0.6 + (typeof s.emotion_score === 'number' ? s.emotion_score * 0.4 : 0);
          return (
            <circle
              key={s.id}
              cx={x}
              cy={y}
              r={r}
              fill={color}
              opacity={opacity}
              stroke="#111827"
              strokeWidth={0.5}
              tabIndex={0}
              role="button"
              aria-label={`${s.emotion_name ?? '不明'}: ${new Date(s.started_at).toLocaleString()}`}
              onMouseEnter={(e) => handleMarkerEnter(e, s)}
              onMouseLeave={handleMarkerLeave}
              onFocus={(e) => handleMarkerEnter(e, s)}
              onBlur={handleMarkerLeave}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleMarkerEnter(e as any, s);
                }
              }}
              style={{ transition: 'r 200ms ease, opacity 200ms ease' }}
            />
          );
        })}
      </svg>

      {/* Tooltip anchored within SVG box */}
      <Tooltip open={tip.open} x={tip.x} y={tip.y}>
        {tip.content}
      </Tooltip>
    </div>
  );
}
