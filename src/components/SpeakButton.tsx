import { phraseKey, playFile, useAudioUrl } from '../audio';
import { getSettings } from '../settings';
import { speak, useEnglishVoice } from '../speech';

// Кнопка «послушать» для примеров в теории: озвученный файл, а если его нет — голос браузера
export function SpeakButton({ text }: { text: string }) {
  const url = useAudioUrl(phraseKey(text));
  const browserVoice = useEnglishVoice(url === null);
  if (url === undefined || (url === null && !browserVoice)) return null;
  const play = () => {
    if (url) return playFile(url);
    const { speed, volume } = getSettings();
    void speak([{ text }], { rate: 0.95 * speed, volume });
  };
  return (
    <button className="speak" type="button" aria-label={`Послушать: ${text}`} title="Послушать" onClick={play}>
      🔊
    </button>
  );
}
