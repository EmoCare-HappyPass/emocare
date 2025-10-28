"use client";
import { use } from 'react'; 
import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TimelineSlider from '@/components/TimelineSlider';
import PlutchikWheel from '@/components/PlutchikWheel';
import EmotionLegend from '@/components/EmotionLegend';
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
      });
    }
    return out;
  }

  // Select nearest N sessions to cursor (or default latest N)
  const baseData = devMode && devData ? devData : data;
  const selected: ConversationSession[] = useMemo(() => {
    if (!Array.isArray(baseData) || baseData.length === 0) return [];
    const N = query.limit ?? 10;
    const sorted = Array.isArray(baseData) ? [...baseData].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime()) : [];
    if (!cursor) return sorted.slice(0, N);
    const withDist = sorted.map((s) => ({
      s,
      d: Math.abs(new Date(s.started_at).getTime() - cursor),
    }));
    withDist.sort((a, b) => a.d - b.d);
    return withDist.slice(0, N).map((x) => x.s);
  }, [baseData, cursor, query.limit]);

  // Update URL when changing limit/order
  function updateParam(name: string, value: string) {
    const next = new URL(window.location.href);
    next.searchParams.set(name, value);
    router.replace(next.pathname + next.search);
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-semibold">患者の感情可視化（プルチック）</h1>
       <button
          type="button"
          className={`text-xs text-black px-2 py-1 rounded border ${
            devMode
              ? 'bg-yellow-100 border-yellow-300 text-black font-semibold'
              : 'bg-gray-50 border-gray-300'
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

      <div className="flex flex-wrap gap-3 items-center">
        <label className="text-sm">並び順</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={query.order ?? 'desc'}
          onChange={(e) => {
            const v = e.target.value as 'asc' | 'desc';
            setQuery((q) => ({ ...q, order: v }));
            updateParam('order', v);
          }}
        >
          <option value="desc">新しい順</option>
          <option value="asc">古い順</option>
        </select>

        <label className="text-sm">件数</label>
        <select
          className="border rounded px-2 py-1 text-sm"
          value={String(query.limit ?? 10)}
          onChange={(e) => {
            const v = Number(e.target.value || 10);
            setQuery((q) => ({ ...q, limit: v }));
            updateParam('limit', String(v));
          }}
        >
          {[10, 25, 50].map((n) => (
            <option key={n} value={n}>{n}</option>
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

        {loading && <div className="text-sm text-gray-600">読み込み中...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !error && !devMode && data && data.length === 0 && (
          <div className="text-sm text-gray-600">データがありません</div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
          <PlutchikWheel sessions={selected} />

          <div className="flex flex-col gap-4">
            <h2 className="font-medium">凡例</h2>
            <EmotionLegend />
          </div>
        </div>
      )}
    </div>
  );
}
