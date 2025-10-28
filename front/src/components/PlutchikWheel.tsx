"use client";

import { useMemo, useState } from 'react';
import { PLUTCHIK_CORE, normalizeEmotionKey } from '../lib/plutchik';
import type { ConversationSession } from '../types/conversation';
import Tooltip from './Tooltip';

export interface PlutchikWheelProps {
  sessions: ConversationSession[]; // selected subset (latest few), assume desc
}

const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const INNER_R = 60; // inner radius of the ring
const OUTER_R = 120; // outer radius of the ring

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

  function handleMarkerEnter(e: React.MouseEvent, s: ConversationSession) {
    const rect = (e.currentTarget as SVGCircleElement).ownerSVGElement?.getBoundingClientRect();
    const ptX = e.clientX - (rect?.left ?? 0);
    const ptY = e.clientY - (rect?.top ?? 0);
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
      const k = normalizeEmotionKey(s.emotion_key);
      const wedge = wedges.find((w) => w.key === k) || wedges[0];
      const angle = (wedge.start + wedge.end) / 2;
      const r = OUTER_R - 10 - (idx * (OUTER_R - INNER_R - 20)) / (maxN - 1 || 1);
      const pos = polarToCartesian(CX, CY, r, angle);
      return { s, x: pos.x, y: pos.y, color: PLUTCHIK_CORE[wedge.key].color };
    });
  }, [sessions, wedges]);

  return (
    <div className="relative" style={{ width: SIZE, height: SIZE }}>
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        {/* Base ring background */}
        <circle cx={CX} cy={CY} r={OUTER_R} fill="#f8fafc" stroke="#e2e8f0" />
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
            />
          );
        })}

        {/* Labels */}
        {wedges.map(({ key, info, start, end }) => {
          const angle = (start + end) / 2;
          const { x, y } = polarToCartesian(CX, CY, OUTER_R + 16, angle);
          return (
            <text key={`lbl-${key}`} x={x} y={y} fontSize={10} textAnchor="middle" dominantBaseline="middle" fill="#374151">
              {info.labelJa}
            </text>
          );
        })}

        {/* Session markers with tooltips */}
        {markers.map(({ s, x, y, color }) => (
          <circle
            key={s.id}
            cx={x}
            cy={y}
            r={5}
            fill={color}
            stroke="#111827"
            strokeWidth={0.5}
            onMouseEnter={(e) => handleMarkerEnter(e, s)}
            onMouseLeave={handleMarkerLeave}
          />
        ))}
      </svg>

      {/* Tooltip anchored within SVG box */}
      <Tooltip open={tip.open} x={tip.x} y={tip.y}>
        {tip.content}
      </Tooltip>
    </div>
  );
}
