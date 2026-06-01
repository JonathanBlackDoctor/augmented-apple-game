// ui/components/SettingsOverlay.tsx — settings modal (sound, apple size). State
// lives in the settings store and is persisted to localStorage. Reused by the
// home screen and the pause menu. (AI difficulty is chosen per-match on the
// level-select screen; apple count is fixed to medium; round time is fixed.)
import { useSettingsStore, APPLE_SIZE_PRESETS } from '../../app/settingsStore';
import { toast } from '../../app/toastStore';
import { isIOS, isStandalone, promptInstall } from '../../app/installPrompt';

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
  const ios = isIOS();
  const installed = isStandalone();

  const onInstall = async (): Promise<void> => {
    if (installed) {
      toast('이미 앱으로 실행 중이에요');
      return;
    }
    if (ios) {
      // iOS has no install API — guide the Safari "홈 화면에 추가" (바로가기) flow.
      toast('사파리 공유 버튼 → "홈 화면에 추가"를 눌러주세요');
      return;
    }
    const outcome = await promptInstall();
    if (outcome === 'accepted') toast('앱으로 추가했어요!');
    else if (outcome === 'unavailable')
      toast('브라우저 메뉴에서 "앱 설치" 또는 "홈 화면에 추가"를 선택하세요');
  };

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
            <span className="set-label">사과 크기</span>
            <Segmented
              value={s.appleScale}
              options={APPLE_SIZE_PRESETS.map((p) => ({ value: p.scale, label: p.label }))}
              onChange={(v) => s.setAppleScale(v)}
            />
          </div>
          <div className="set-row">
            <span className="set-label">앱으로 다운로드</span>
            <button type="button" className="btn ghost small" onClick={() => void onInstall()}>
              {installed ? '설치됨' : ios ? '바로가기 만들기' : '앱 설치'}
            </button>
          </div>
        </div>
        {ios && !installed && (
          <p className="set-note">
            아이폰·아이패드는 <b>사파리</b>에서 공유 버튼(⬆️) → <b>홈 화면에 추가</b>로 바로가기를
            만들 수 있어요.
          </p>
        )}
        <p className="set-note">사과 크기는 다음 게임부터 적용돼요.</p>
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
