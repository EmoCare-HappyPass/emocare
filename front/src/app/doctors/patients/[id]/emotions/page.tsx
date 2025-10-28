"use client";
import { use } from 'react'; 
import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TimelineSlider from '@/components/TimelineSlider';
import PlutchikWheel from '@/components/PlutchikWheel';
import EmotionLegend from '@/components/EmotionLegend';
import EmotionSummary from '@/components/EmotionSummary';
import StatusChips from '@/components/StatusChips';
import EmotionFilter from '@/components/EmotionFilter';
import { usePatientEmotions } from '@/hooks/usePatientEmotions';
import type { ConversationSession } from '@/types/conversation';
import { PLUTCHIK_CORE } from '@/lib/plutchik';

interface PageProps { params: Promise<{ id: string }> }

export default function PatientEmotionsPage({ params }: PageProps) {
  const { id } = use(params);
  const search = useSearchParams();
  const router = useRouter();

  const initialLimit = Number(search.get('limit') ?? 10);
  const initialOrder = (search.get('order') ?? 'desc') as 'asc' | 'desc';

  const { data, loading, error, query, setQuery, range } = usePatientEmotions(id, {
    limit: initialLimit,
    order: initialOrder,
  });

  // slider selection (epoch ms)
  const [cursor, setCursor] = useState<number | null>(null);

  // Dev dummy data toggle
  const [devMode, setDevMode] = useState(false);
  const [devData, setDevData] = useState<ConversationSession[] | null>(null);

  function genDummy(): ConversationSession[] {
    const keys = Object.keys(PLUTCHIK_CORE);
    const now = Date.now();
    const out: ConversationSession[] = [];
    for (let i = 0; i < 20; i++) {
      const ts = new Date(now - i * 1000 * 60 * 60 * 6).toISOString(); // every 6h
      const key = keys[i % keys.length];
      const info = PLUTCHIK_CORE[key];
      out.push({
        id: `dummy-${i}`,
        patient: 'dummy-patient',
        patient_name: 'ダミー患者',
        started_at: ts,
        ended_at: ts,
        patient_text: `ダミー発話 ${i}`,
        ai_response_text: `ダミー応答 ${i}`,
        emotion: null,
        emotion_name: info.labelJa,
        emotion_key: key,
        emotion_reason: `ダミー理由 ${i}: ${info.labelJa} と判断。`,
        duration: 60,
        emotion_score: Math.round(((i % 10) / 10 + Math.random() * 0.3) * 100) / 100,
      });
    }
    return out;
  }

  // Select nearest N sessions to cursor (or default latest N)
  const baseData = devMode && devData ? devData : data;
  const [filter, setFilter] = useState<'all' | string>('all');
  const filtered = useMemo(() => {
    if (!baseData) return [] as ConversationSession[];
    if (filter === 'all') return baseData;
    return baseData.filter((s) => (s.emotion_key || '').toLowerCase() === filter);
  }, [baseData, filter]);
  const selected: ConversationSession[] = useMemo(() => {
    if (!Array.isArray(filtered) || filtered.length === 0) return [];
    const N = query.limit ?? 10;
    const sorted = Array.isArray(filtered) ? [...filtered].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()) : [];
    if (!cursor) return sorted.slice(0, N);
    const withDist = sorted.map((s) => ({
      s,
      d: Math.abs(new Date(s.started_at).getTime() - cursor),
    }));
    withDist.sort((a, b) => a.d - b.d);
    return withDist.slice(0, N).map((x) => x.s);
  }, [filtered, cursor, query.limit]);

  // Update URL when changing limit/order
  function updateParam(name: string, value: string) {
    const next = new URL(window.location.href);
    next.searchParams.set(name, value);
    router.replace(next.pathname + next.search);
  }

  return (
    <div className="p-6 flex flex-col gap-6 text-white min-h-screen bg-gradient-to-b from-black to-zinc-900">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">患者の感情可視化（プルチック）</h1>
       <button
          type="button"
          className={`text-xs px-2 py-1 rounded border ${
            devMode
              ? 'bg-yellow-500/30 border-yellow-400 text-white'
              : 'bg-zinc-800 border-zinc-600 text-white'
          }`}
          onClick={() => {
            if (!devMode) {
              const d = genDummy();
              setDevData(d);
              setCursor(new Date(d[0].started_at).getTime());
            }
            setDevMode((v) => !v);
          }}
          title="UI確認用のダミーデータを表示します"
        >
          ダミーデータ(開発用)
        </button>
      </div>

      <div className="flex flex-wrap gap-4 items-center">
        <StatusChips sessions={filtered} />
        <EmotionFilter sessions={baseData || []} value={filter} onChange={setFilter} />
        <div className="h-4 w-px bg-white/20" />
        <label className="text-sm">並び順</label>
        <select
          className="border rounded px-2 py-1 text-sm bg-zinc-900 border-zinc-600 text-white"
          value={query.order ?? 'desc'}
          onChange={(e) => {
            const v = e.target.value as 'asc' | 'desc';
            setQuery((q) => ({ ...q, order: v }));
            updateParam('order', v);
          }}
        >
          <option className="bg-zinc-900" value="desc">新しい順</option>
          <option className="bg-zinc-900" value="asc">古い順</option>
        </select>

        <label className="text-sm">件数</label>
        <select
          className="border rounded px-2 py-1 text-sm bg-zinc-900 border-zinc-600 text-white"
          value={String(query.limit ?? 10)}
          onChange={(e) => {
            const v = Number(e.target.value || 10);
            setQuery((q) => ({ ...q, limit: v }));
            updateParam('limit', String(v));
          }}
        >
          {[10, 25, 50].map((n) => (
            <option className="bg-zinc-900" key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-4">
        <TimelineSlider
          min={(devMode && devData && devData.length) ? Math.min(...devData.map((d) => new Date(d.started_at).getTime())) : range.min}
          max={(devMode && devData && devData.length) ? Math.max(...devData.map((d) => new Date(d.started_at).getTime())) : range.max}
          value={cursor ?? ((devMode && devData && devData.length) ? Math.max(...devData.map((d) => new Date(d.started_at).getTime())) : range.max)}
          onChange={setCursor}
          disabled={loading}
        />

        {loading && <div className="text-sm">読み込み中...</div>}
        {error && <div className="text-sm">{error}</div>}
        {!loading && !error && !devMode && data && data.length === 0 && (
          <div className="text-sm">データがありません</div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-8 items-start">
        <div className="flex flex-col gap-6">
          <PlutchikWheel sessions={selected} />
          <div className="flex flex-col gap-4">
            <h2 className="font-medium">凡例</h2>
            <EmotionLegend />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          <EmotionSummary sessions={baseData || []} title="感情サマリー（取得範囲）" />
          <EmotionSummary sessions={selected} title="感情サマリー（選択N件）" />
        </div>
      </div>
    </div>
  );
}
