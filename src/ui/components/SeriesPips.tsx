// ui/components/SeriesPips.tsx — best-of-N pip strip shared by the versus and
// online HUDs: filled for finished rounds (W/L/draw tint), hollow ahead.
export function SeriesPips({
  history,
  total,
}: {
  history: { winner: 'me' | 'opp' | 'draw' }[];
  total: number;
}) {
  return (
    <div className="series-pips">
      {Array.from({ length: total }).map((_, i) => {
        const r = history[i];
        const cls = !r ? '' : r.winner === 'me' ? 'me' : r.winner === 'opp' ? 'opp' : 'draw';
        return <span key={i} className={`pip ${cls}`} />;
      })}
    </div>
  );
}
