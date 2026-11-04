"""Озвучка контента через Kokoro-82M — несколько наборов голосов на выбор.

Проходит по content/*/file-*.json, озвучивает:
  - все задания на аудирование (type: listening) — диалоги разными голосами;
  - примеры из теории (theory[].examples[].en).
Результат: public/audio/<имя>.mp3 и public/audio/manifest.json, где для каждого набора
голосов (VOICE_SETS) указано, какой файл отвечает за какой текст.

Приложение ищет файл по ключу — хешу текста (FNV-1a, такой же считает src/audio.ts).
Если текст изменился, ключ меняется и файл генерируется заново; для неизменённых
текстов файлы переиспользуются. Если в двух наборах реплики звучат одинаковыми
голосами, файл общий. Файлы, которые больше не нужны, удаляются.

Запуск: npm run audio            — все наборы
        npm run audio -- --sets uk,us
        npm run audio -- --dry-run
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "content"
OUT = ROOT / "public" / "audio"
SR = 24000
PAUSE_BETWEEN_LINES = 0.45  # секунды тишины между репликами

# Наборы голосов Kokoro. lang: "b" — британский английский, "a" — американский.
# Порядок голосов в списках — от лучших оценок к худшим. narrator читает теорию и тексты без говорящего.
VOICE_SETS = {
    "uk": {
        "label": "Британский: Emma, George и др.",
        "lang": "b",
        "female": ["bf_emma", "bf_isabella"],
        "male": ["bm_george", "bm_fable", "bm_lewis"],
        "narrator": "bf_emma",
    },
    "uk-male": {
        "label": "Британский, мужской диктор: George",
        "lang": "b",
        "female": ["bf_emma", "bf_isabella"],
        "male": ["bm_george", "bm_fable", "bm_lewis"],
        "narrator": "bm_george",
    },
    "us": {
        "label": "Американский: Heart, Michael и др.",
        "lang": "a",
        "female": ["af_heart", "af_bella"],
        "male": ["am_michael", "am_fenrir", "am_puck"],
        "narrator": "af_heart",
    },
}
DEFAULT_SET = "uk"

FEMALE_SPEAKERS = {
    "woman", "girl", "mum", "mother", "grandma", "kate", "anna", "ann", "sara", "lisa", "emma", "lena", "mia",
    "julia", "mrs wilson", "rita", "helen", "olga", "ella", "jo", "nurse", "fortune teller", "natalia", "carmen",
}
MALE_SPEAKERS = {
    "man", "boy", "dad", "father", "son", "grandson", "kid", "tom", "ben", "max", "ivan", "leo", "sam", "jack",
    "mark", "dan", "daniel", "paolo", "pavel", "igor", "oleg",
}


def fnv1a(text: str) -> str:
    """32-битный FNV-1a по UTF-8 — должен совпадать с fnv1a() в src/audio.ts."""
    h = 0x811C9DC5
    for byte in text.encode("utf-8"):
        h ^= byte
        h = (h * 0x01000193) & 0xFFFFFFFF
    return f"{h:08x}"


def listening_key(script: list[dict]) -> str:
    return fnv1a("L|" + "\n".join(f"{line.get('speaker') or ''}:{line['text']}" for line in script))


def phrase_key(text: str) -> str:
    return fnv1a("P|" + text)


CYRILLIC = re.compile(r"[А-Яа-яЁё]")


def speakable(text: str) -> str | None:
    """Готовит текст примера к озвучке. None — если озвучивать не нужно (там русский текст)."""
    text = re.sub(r"\([^)]*\)", lambda m: "" if CYRILLIC.search(m.group(0)) else m.group(0), text)
    if CYRILLIC.search(text):
        return None
    text = text.replace(" / ", ", ").replace("/", ", ").replace("—", ",").replace("…", "...")
    text = re.sub(r"\s+", " ", text).strip(" ,")
    return text or None


def assign_voices(script: list[dict], vs: dict) -> dict[str, str]:
    """Каждому говорящему — свой голос. Пол угадываем по имени/роли, остальных чередуем."""
    voices: dict[str, str] = {}
    used = {"f": 0, "m": 0}
    for line in script:
        name = line.get("speaker") or ""
        if name in voices:
            continue
        if not name:
            voices[name] = vs["narrator"]
            continue
        key = name.strip().lower()
        if key in FEMALE_SPEAKERS:
            gender = "f"
        elif key in MALE_SPEAKERS:
            gender = "m"
        else:
            gender = "f" if used["f"] <= used["m"] else "m"
        pool = vs["female"] if gender == "f" else vs["male"]
        voices[name] = pool[used[gender] % len(pool)]
        used[gender] += 1
    return voices


def collect_texts() -> list[dict]:
    """Все тексты для озвучки (без привязки к голосам)."""
    texts: dict[str, dict] = {}
    for path in sorted(CONTENT.glob("*/file-*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        sections = list(data.get("lessons", {}).values())
        sections += [s for s in (data.get("practicalEnglish"), data.get("reviseCheck")) if s]
        for section in sections:
            for ex in section.get("exercises", []):
                if ex["type"] == "listening":
                    texts[listening_key(ex["script"])] = {"kind": "listening", "script": ex["script"]}
            for block in section.get("theory", []):
                if isinstance(block, dict):
                    for example in block.get("examples", []):
                        text = speakable(example["en"])
                        if text:
                            texts[phrase_key(example["en"])] = {"kind": "phrase", "text": text}
    return [{"key": k, **v} for k, v in texts.items()]


def job_for(text: dict, vs: dict) -> dict:
    """Что именно и какими голосами озвучить; имя файла зависит от голосов, поэтому одинаковые озвучки общие."""
    if text["kind"] == "listening":
        voices = assign_voices(text["script"], vs)
        lines = [(voices[l.get("speaker") or ""], l["text"]) for l in text["script"]]
    else:
        lines = [(vs["narrator"], text["text"])]
    signature = f"{vs['lang']}|{PAUSE_BETWEEN_LINES}|" + ",".join(v for v, _ in lines) + "|" + text["key"]
    return {"key": text["key"], "kind": text["kind"], "lang": vs["lang"], "lines": lines, "file": f"{text['key']}-{fnv1a(signature)[:6]}.mp3"}


def migrate_v1(jobs: list[dict]) -> int:
    """Файлы первой версии генератора (только британский набор) переименовываем, чтобы не озвучивать заново."""
    old_config = "v1:" + ",".join(VOICE_SETS["uk"]["female"] + VOICE_SETS["uk"]["male"] + [VOICE_SETS["uk"]["narrator"]]) + f":{PAUSE_BETWEEN_LINES}"
    moved = 0
    for job in jobs:
        old = OUT / f"{job['key']}-{fnv1a(old_config + job['key'])[:6]}.mp3"
        new = OUT / job["file"]
        if old.exists() and not new.exists():
            os.replace(old, new)
            moved += 1
    return moved


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--sets", default=",".join(VOICE_SETS), help="какие наборы озвучивать, через запятую")
    parser.add_argument("--limit", type=int, default=0, help="озвучить не больше N новых файлов (для проверки)")
    parser.add_argument("--dry-run", action="store_true", help="только показать, что будет озвучено")
    args = parser.parse_args()
    selected = [s.strip() for s in args.sets.split(",") if s.strip()]
    unknown = [s for s in selected if s not in VOICE_SETS]
    if unknown:
        print(f"неизвестные наборы: {unknown}; есть: {list(VOICE_SETS)}")
        return 2

    OUT.mkdir(parents=True, exist_ok=True)
    texts = collect_texts()
    jobs_by_set = {name: [job_for(t, VOICE_SETS[name]) for t in texts] for name in VOICE_SETS}
    if "uk" in jobs_by_set:
        moved = migrate_v1(jobs_by_set["uk"])
        if moved:
            print(f"перенесено файлов первой версии: {moved}")

    # Уникальные файлы, которых ещё нет (общие для нескольких наборов озвучиваем один раз)
    todo: dict[str, dict] = {}
    for name in selected:
        for job in jobs_by_set[name]:
            if not (OUT / job["file"]).exists():
                todo.setdefault(job["file"], job)
    print(f"текстов: {len(texts)}; наборы: {', '.join(selected)}; нужно озвучить файлов: {len(todo)}")
    if args.dry_run:
        return 0
    todo_list = list(todo.values())[: args.limit] if args.limit else list(todo.values())

    if todo_list:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline

        pipelines: dict[str, KPipeline] = {}
        pause = np.zeros(int(PAUSE_BETWEEN_LINES * SR), dtype=np.float32)

        def synth(text: str, voice: str, lang: str) -> "np.ndarray":
            if lang not in pipelines:
                pipelines[lang] = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")
            parts = [a.numpy() if hasattr(a, "numpy") else a for _, _, a in pipelines[lang](text, voice=voice)]
            return np.concatenate(parts) if parts else np.zeros(0, dtype=np.float32)

        started = time.time()
        for i, job in enumerate(todo_list, 1):
            chunks = []
            for voice, text in job["lines"]:
                chunks.append(synth(text, voice, job["lang"]))
                if job["kind"] == "listening":
                    chunks.append(pause)
            tmp = OUT / (job["file"] + ".tmp")
            sf.write(tmp, np.concatenate(chunks), SR, format="MP3")
            os.replace(tmp, OUT / job["file"])
            if i % 25 == 0 or i == len(todo_list):
                eta = (time.time() - started) / i * (len(todo_list) - i)
                print(f"  {i}/{len(todo_list)}  осталось ~{eta / 60:.0f} мин", flush=True)

    # Манифест: для каждого набора — только те файлы, что реально есть
    sets = {}
    for name, vs in VOICE_SETS.items():
        items = {j["key"]: j["file"] for j in jobs_by_set[name] if (OUT / j["file"]).exists()}
        if items:
            sets[name] = {"label": vs["label"], "items": items}
    manifest = {"version": 2, "default": DEFAULT_SET, "sets": sets}
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=0), encoding="utf-8")

    # Удаляем файлы, на которые не ссылается ни один набор (только при полном прогоне всех наборов)
    removed = 0
    if not args.limit and set(selected) == set(VOICE_SETS):
        keep = {f for s in sets.values() for f in s["items"].values()}
        for f in OUT.glob("*.mp3"):
            if f.name not in keep:
                f.unlink()
                removed += 1
    for name, s in sets.items():
        print(f"набор {name}: {len(s['items'])} из {len(texts)}")
    print(f"удалено устаревших файлов: {removed}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
