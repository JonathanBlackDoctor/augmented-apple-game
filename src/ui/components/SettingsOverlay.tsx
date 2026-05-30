// ui/components/SettingsOverlay.tsx — settings modal (sound, AI difficulty,
// round time, board size, AI mini-view). State lives in the settings store and
// is persisted to localStorage. Reused by the home screen and the pause menu.
import {
  useSettingsStore,
  DURATION_OPTIONS,
  BOARD_PRESETS,
  APPLE_SIZE_PRESETS,
  type AiDifficultyPref,
} from '../../app/settingsStore';

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      className={`toggle${on ? ' on' : ''}`}
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
    >
      <span className="knob" />
    </button>
  );
}

function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const DIFF_OPTIONS: { value: AiDifficultyPref; label: string }[] = [
  { value: 'auto', label: '자동' },
  { value: 'easy', label: '쉬움' },
  { value: 'normal', label: '보통' },
  { value: 'hard', label: '어려움' },
];

export function SettingsOverlay({ onClose }: { onClose: () => void }) {
  const s = useSettingsStore();
  const boardValue = `${s.boardCols}x${s.boardRows}`;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="result-card settings-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="result-title">설정</h2>
        <div className="settings-list">
          <div className="set-row">
            <span className="set-label">사운드</span>
            <Toggle on={s.soundEnabled} onChange={s.setSoundEnabled} />
          </div>
          <div className="set-row">
            <span className="set-label">AI 미니화면</span>
            <Toggle on={s.showAiMiniboard} onChange={s.setShowAiMiniboard} />
          </div>
          <div className="set-row">
            <span className="set-label">AI 난이도</span>
            <Segmented value={s.aiDifficulty} options={DIFF_OPTIONS} onChange={s.setAiDifficulty} />
          </div>
          <div className="set-row">
            <span className="set-label">라운드 시간</span>
            <Segmented
              value={s.roundDurationMs}
              options={DURATION_OPTIONS.map((ms) => ({ value: ms, label: `${ms / 1000}초` }))}
              onChange={s.setRoundDurationMs}
            />
          </div>
          <div className="set-row">
            <span className="set-label">사과 개수</span>
            <Segmented
              value={boardValue}
              options={BOARD_PRESETS.map((p) => ({ value: `${p.cols}x${p.rows}`, label: p.label }))}
              onChange={(v) => {
                const p = BOARD_PRESETS.find((x) => `${x.cols}x${x.rows}` === v);
                if (p) s.setBoardSize(p.cols, p.rows);
              }}
            />
          </div>
          <div className="set-row">
            <span className="set-label">사과 크기</span>
            <Segmented
              value={s.appleScale}
              options={APPLE_SIZE_PRESETS.map((p) => ({ value: p.scale, label: p.label }))}
              onChange={(v) => s.setAppleScale(v)}
            />
          </div>
        </div>
        <p className="set-note">시간·사과 개수·사과 크기·AI 난이도는 다음 게임부터 적용돼요.</p>
        <div className="btn-row">
          <button className="btn ghost" onClick={() => s.reset()}>
            기본값
          </button>
          <button className="btn primary" onClick={onClose}>
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
