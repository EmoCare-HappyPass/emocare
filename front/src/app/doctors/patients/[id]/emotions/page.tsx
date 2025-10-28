"use client";

import { useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TimelineSlider from '../../../../../../components/TimelineSlider';
import PlutchikWheel from '../../../../../../components/PlutchikWheel';
import EmotionLegend from '../../../../../../components/EmotionLegend';
import { usePatientEmotions } from '../../../../../../hooks/usePatientEmotions';
import type { ConversationSession } from '../../../../../../types/conversation';

interface PageProps { params: { id: string } }

export default function PatientEmotionsPage({ params }: PageProps) {
  const { id } = params;
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

  // Select nearest N sessions to cursor (or default latest N)
  const selected: ConversationSession[] = useMemo(() => {
    if (!data || data.length === 0) return [];
    const N = query.limit ?? 10;
    const sorted = [...data].sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
    if (!cursor) return sorted.slice(0, N);
    const withDist = sorted.map((s) => ({
      s,
      d: Math.abs(new Date(s.started_at).getTime() - cursor),
    }));
    withDist.sort((a, b) => a.d - b.d);
    return withDist.slice(0, N).map((x) => x.s);
  }, [data, cursor, query.limit]);

  // Update URL when changing limit/order
  function updateParam(name: string, value: string) {
    const next = new URL(window.location.href);
    next.searchParams.set(name, value);
    router.replace(next.pathname + next.search);
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <h1 className="text-xl font-semibold">患者の感情可視化（プルチック）</h1>

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
          min={range.min}
          max={range.max}
          value={cursor ?? range.max}
          onChange={setCursor}
          disabled={loading}
        />

        {loading && <div className="text-sm text-gray-600">読み込み中...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && !error && data && data.length === 0 && (
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
