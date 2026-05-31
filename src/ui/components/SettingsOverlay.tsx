// ui/components/SettingsOverlay.tsx — settings modal (sound, round time, apple
// size). State lives in the settings store and is persisted to localStorage.
// Reused by the home screen and the pause menu. (AI difficulty is chosen
// per-match on the level-select screen; apple count is fixed to medium.)
import { useSettingsStore, DURATION_OPTIONS, APPLE_SIZE_PRESETS } from '../../app/settingsStore';
import { toast } from '../../app/toastStore';

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

export function SettingsOverlay({ onClose }: { onClose: () => void }) {
  const s = useSettingsStore();
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
            <span className="set-label">라운드 시간</span>
            <Segmented
              value={s.roundDurationMs}
              options={DURATION_OPTIONS.map((ms) => ({ value: ms, label: `${ms / 1000}초` }))}
              onChange={s.setRoundDurationMs}
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
        <p className="set-note">라운드 시간·사과 크기는 다음 게임부터 적용돼요.</p>
        <div className="btn-row">
          <button
            className="btn ghost"
            onClick={() => {
              s.reset();
              toast('기본값으로 되돌렸어요');
            }}
          >
            기본값
          </button>
          <button
            className="btn primary"
            onClick={() => {
              toast('설정을 저장했어요');
              onClose();
            }}
          >
            완료
          </button>
        </div>
      </div>
    </div>
  );
}
