"use client";

import { PLUTCHIK_CORE, normalizeEmotionKey } from '../lib/plutchik';
import type { ConversationSession } from '../types/conversation';

export interface PlutchikWheelProps {
  sessions: ConversationSession[]; // selected subset (latest few)
}

export default function PlutchikWheel({ sessions }: PlutchikWheelProps) {
  const latest = sessions[0]; // assume sorted desc (latest first)
  const currentKey = normalizeEmotionKey(latest?.emotion_key ?? undefined);

  return (
    <div className="flex flex-col gap-3 items-center">
      <div className="relative" style={{ width: 260, height: 260 }}>
        {/* Placeholder wheel: 8 wedges represented by absolute colored blocks */}
        <div className="absolute inset-0 rounded-full border border-gray-300" />
        {Object.entries(PLUTCHIK_CORE).map(([key, info], idx) => {
          const active = currentKey === key;
          const size = active ? 115 : 95;
          const angle = info.angleDeg ?? (idx * 360) / 8;
          const rad = (angle * Math.PI) / 180;
          const cx = 130 + Math.cos(rad) * 60 - size / 2;
          const cy = 130 + Math.sin(rad) * 60 - size / 2;
          return (
            <div
              key={key}
              className="absolute rounded-xl flex items-center justify-center text-[10px] text-white shadow"
              style={{
                left: cx,
                top: cy,
                width: size,
                height: size,
                background: info.color,
                opacity: active ? 1 : 0.45,
                transition: 'all 200ms ease',
              }}
              title={info.labelJa}
            >
              {info.labelJa}
            </div>
          );
        })}
      </div>
      {/* Simple legend of selected sessions */}
      <div className="w-full max-w-md flex flex-col gap-2">
        {sessions.map((s) => (
          <div key={s.id} className="p-2 rounded border border-gray-200 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-medium">{s.emotion_name ?? '不明'}</span>
              <span className="text-gray-500">{new Date(s.started_at).toLocaleString()}</span>
            </div>
            {s.emotion_reason ? (
              <p className="text-gray-700 mt-1 line-clamp-3">{s.emotion_reason}</p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
