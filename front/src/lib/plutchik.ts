// Minimal Plutchik mapping scaffold.
// TODO: Expand to full 32/48/52-emotion mapping as needed.

export type PlutchikKey =
  | 'joy'
  | 'trust'
  | 'fear'
  | 'surprise'
  | 'sadness'
  | 'disgust'
  | 'anger'
  | 'anticipation';

export interface PlutchikInfo {
  key: PlutchikKey | string; // extended keys allowed
  labelJa: string;
  color: string; // base color
  angleDeg?: number; // position for primary segments
}

export interface PlutchikIntensity {
  weak: { key: string; labelJa: string };
  base: { key: string; labelJa: string };
  strong: { key: string; labelJa: string };
}

// Primary 8 with angle positions and base colors
export const PLUTCHIK_CORE: Record<string, PlutchikInfo> = {
  joy: { key: 'joy', labelJa: '喜び', color: '#FFE066', angleDeg: 0 },
  trust: { key: 'trust', labelJa: '信頼', color: '#C7F464', angleDeg: 45 },
  fear: { key: 'fear', labelJa: '恐れ', color: '#88D8B0', angleDeg: 90 },
  surprise: { key: 'surprise', labelJa: '驚き', color: '#8EE3EF', angleDeg: 135 },
  sadness: { key: 'sadness', labelJa: '悲しみ', color: '#6C91BF', angleDeg: 180 },
  disgust: { key: 'disgust', labelJa: '嫌悪', color: '#9E7BB5', angleDeg: 225 },
  anger: { key: 'anger', labelJa: '怒り', color: '#FF6B6B', angleDeg: 270 },
  anticipation: { key: 'anticipation', labelJa: '期待', color: '#F4A259', angleDeg: 315 },
};

// Intensity mapping (classic Plutchik 24 emotions)
export const PLUTCHIK_INTENSITY: Record<PlutchikKey, PlutchikIntensity> = {
  joy: {
    weak: { key: 'serenity', labelJa: '平穏' },
    base: { key: 'joy', labelJa: '喜び' },
    strong: { key: 'ecstasy', labelJa: '恍惚' },
  },
  trust: {
    weak: { key: 'acceptance', labelJa: '受容' },
    base: { key: 'trust', labelJa: '信頼' },
    strong: { key: 'admiration', labelJa: '賞賛' },
  },
  fear: {
    weak: { key: 'apprehension', labelJa: '不安' },
    base: { key: 'fear', labelJa: '恐れ' },
    strong: { key: 'terror', labelJa: '戦慄' },
  },
  surprise: {
    weak: { key: 'distraction', labelJa: '注意散漫' },
    base: { key: 'surprise', labelJa: '驚き' },
    strong: { key: 'amazement', labelJa: '驚嘆' },
  },
  sadness: {
    weak: { key: 'pensiveness', labelJa: '沈思' },
    base: { key: 'sadness', labelJa: '悲しみ' },
    strong: { key: 'grief', labelJa: '深い悲しみ' },
  },
  disgust: {
    weak: { key: 'boredom', labelJa: '退屈' },
    base: { key: 'disgust', labelJa: '嫌悪' },
    strong: { key: 'loathing', labelJa: '嫌悪感' },
  },
  anger: {
    weak: { key: 'annoyance', labelJa: '苛立ち' },
    base: { key: 'anger', labelJa: '怒り' },
    strong: { key: 'rage', labelJa: '激怒' },
  },
  anticipation: {
    weak: { key: 'interest', labelJa: '関心' },
    base: { key: 'anticipation', labelJa: '期待' },
    strong: { key: 'vigilance', labelJa: '警戒' },
  },
};

export function normalizeEmotionKey(key?: string | null): string | null {
  if (!key) return null;
  return key.trim().toLowerCase();
}

export function keyToPrimary(key?: string | null): PlutchikKey | null {
  const k = normalizeEmotionKey(key);
  if (!k) return null;
  const entries = Object.entries(PLUTCHIK_INTENSITY) as [PlutchikKey, PlutchikIntensity][];
  for (const [p, intens] of entries) {
    if (intens.base.key === k || intens.weak.key === k || intens.strong.key === k || p === (k as PlutchikKey)) {
      return p;
    }
  }
  return null;
}

export function shadeColor(hex: string, amt: number) {
  // amt: -0.5..0.5 to darken/lighten
  const col = hex.replace('#', '');
  const num = parseInt(col, 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + Math.round(255 * amt)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + Math.round(255 * amt)));
  const b = Math.min(255, Math.max(0, (num & 0xff) + Math.round(255 * amt)));
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

