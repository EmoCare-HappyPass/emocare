export default function EmotionLegend() {
  const items = [
    { label: '喜び (joy)', color: '#FFE066' },
    { label: '信頼 (trust)', color: '#C7F464' },
    { label: '恐れ (fear)', color: '#88D8B0' },
    { label: '驚き (surprise)', color: '#8EE3EF' },
    { label: '悲しみ (sadness)', color: '#6C91BF' },
    { label: '嫌悪 (disgust)', color: '#9E7BB5' },
    { label: '怒り (anger)', color: '#FF6B6B' },
    { label: '期待 (anticipation)', color: '#F4A259' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-white">
      {items.map((i) => (
        <div key={i.label} className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full" style={{ background: i.color }} />
          <span className="text-xs text-white">{i.label}</span>
        </div>
      ))}
    </div>
  );
}
