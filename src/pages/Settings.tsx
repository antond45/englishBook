import { audioUrl, phraseKey, playFile, useVoiceSets } from '../audio';
import { BROWSER_VOICE, REPEATS, SPEEDS, updateSettings, useSettings } from '../settings';
import { speak, useEnglishVoice } from '../speech';

// Фраза для прослушивания голоса — она есть в теории A1 и озвучена во всех наборах
const PREVIEW = 'Nice to meet you.';

async function preview(voice: string) {
  const url = await audioUrl(phraseKey(PREVIEW), voice);
  if (url) playFile(url);
  else void speak([{ text: PREVIEW }]);
}

export function Settings() {
  const settings = useSettings();
  const sets = useVoiceSets();
  const browserVoice = useEnglishVoice();
  const voices = [...(sets ?? []), { id: BROWSER_VOICE, label: 'Голос браузера' }];

  return (
    <main className="page settings">
      <h1>Настройки озвучки</h1>
      <p className="lead">Настройки сохраняются в этом браузере и действуют на аудирования и примеры в теории.</p>

      <section className="settings-block">
        <h2>Голос</h2>
        <div className="voice-list" role="radiogroup" aria-label="Голос">
          {voices.map((v) => {
            const unavailable = v.id === BROWSER_VOICE && browserVoice === false;
            return (
              <label key={v.id} className={settings.voice === v.id ? 'voice-option selected' : 'voice-option'}>
                <input
                  type="radio"
                  name="voice"
                  checked={settings.voice === v.id}
                  disabled={unavailable}
                  onChange={() => updateSettings({ voice: v.id })}
                />
                <span className="voice-label">
                  {v.label}
                  {v.id === BROWSER_VOICE && (
                    <span className="file-topics">
                      {unavailable ? 'В этом браузере нет английского голоса' : 'Встроенный синтез речи; звучит проще, зато не нужны файлы'}
                    </span>
                  )}
                </span>
                {!unavailable && (
                  <button type="button" className="btn small" onClick={() => void preview(v.id)}>
                    🔊 Пример
                  </button>
                )}
              </label>
            );
          })}
        </div>
        {sets?.length === 0 && <p className="empty">Озвучка не найдена — будет использоваться голос браузера.</p>}
        <p className="hint">
          Если для какого-то текста нет файла в выбранном наборе, он будет прочитан основным британским голосом или голосом
          браузера.
        </p>
      </section>

      <section className="settings-block">
        <h2>Скорость по умолчанию</h2>
        <div className="options" role="radiogroup" aria-label="Скорость">
          {SPEEDS.map((s) => (
            <button key={s} role="radio" aria-checked={settings.speed === s} className={settings.speed === s ? 'option selected' : 'option'} onClick={() => updateSettings({ speed: s })}>
              {s === 1 ? 'обычная (1×)' : `${s}×`}
            </button>
          ))}
        </div>
        <p className="hint">Скорость можно поменять и прямо в плеере задания.</p>
      </section>

      <section className="settings-block">
        <h2>Громкость: {Math.round(settings.volume * 100)}%</h2>
        <input
          className="volume"
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(settings.volume * 100)}
          aria-label="Громкость"
          onChange={(e) => updateSettings({ volume: Number(e.target.value) / 100 })}
        />
      </section>

      <section className="settings-block">
        <h2>Автоповтор аудирования</h2>
        <div className="options" role="radiogroup" aria-label="Автоповтор">
          {REPEATS.map((r) => (
            <button key={r} role="radio" aria-checked={settings.repeat === r} className={settings.repeat === r ? 'option selected' : 'option'} onClick={() => updateSettings({ repeat: r })}>
              {r === 1 ? 'выключен' : `${r} раза подряд`}
            </button>
          ))}
        </div>
        <p className="hint">Аудирование проиграется нужное число раз с паузой полторы секунды.</p>
      </section>
    </main>
  );
}
