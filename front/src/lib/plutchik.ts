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
  key: PlutchikKey | string; // allow extended keys
  labelJa: string;
  color: string; // CSS color
  // angle or segment index can be used to place in wheel
  angleDeg?: number;
}

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

export function normalizeEmotionKey(key?: string | null): string | null {
  if (!key) return null;
  return key.trim().toLowerCase();
}

