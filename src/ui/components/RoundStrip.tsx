// ui/components/RoundStrip.tsx — per-round scoreboard for result screens:
// R1..Rn cards, each showing my:opp with a win/loss tint. Cards stagger in.
export function RoundStrip({
  history,
}: {
  history: { my: number; opp: number; winner: 'me' | 'opp' | 'draw' }[];
}) {
  return (
    <div className="round-strip">
      {history.map((r, i) => {
        const w = r.winner === 'me' ? 'w' : r.winner === 'opp' ? 'l' : 'd';
        return (
          <div key={i} className={`rstrip ${w}`} style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
            <div className="rstrip-r">R{i + 1}</div>
            <div className="rstrip-v">
              {r.my}:{r.opp}
            </div>
          </div>
        );
      })}
    </div>
  );
}
