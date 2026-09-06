#!/usr/bin/env bash
# Установка Койза: поставить съём уроков на закрытие сессии и завести базу.
# Агент для этого не нужен - хватает терминала.
#
#   bash install.sh            # спрашивает перед каждым шагом
#   bash install.sh --yes      # без вопросов
#   bash install.sh --dry-run  # только показать, что будет сделано
set -euo pipefail

DOM="$(cd "$(dirname "$0")" && pwd)"
BEZ_VOPROSOV=0
TOLKO_POKAZAT=0
for arg in "$@"; do
  case "$arg" in
    --yes|-y) BEZ_VOPROSOV=1 ;;
    --dry-run|-n) TOLKO_POKAZAT=1 ;;
    *) echo "неизвестный ключ: $arg" >&2; exit 2 ;;
  esac
done

# Нет терминала - значит установка идет машиной: чистая проверка на чужом
# компьютере, CI, изолированный прогон. Тогда вопросы задавать некому, и
# ПРОПУСКАТЬ шаги нельзя: установщик, который в такой среде тихо ничего не делает
# и выходит нулем, доказывает не установку, а собственную вежливость.
if [ ! -t 0 ]; then
  BEZ_VOPROSOV=1
  echo "терминала нет: ставлю без вопросов"
fi

sprosit() {
  [ "$BEZ_VOPROSOV" -eq 1 ] && return 0
  printf '%s [y/N] ' "$1"
  read -r otvet </dev/tty || return 1
  case "$otvet" in y|Y|yes|Yes) return 0 ;; *) return 1 ;; esac
}

command -v node >/dev/null 2>&1 || { echo "нужен node 20 или новее" >&2; exit 1; }

BAZA="${KOIZ_DB:-$HOME/.claude/koiz}"
HUK="$DOM/scripts/koiz-session-end.sh"
NASTROYKI="$HOME/.claude/settings.json"

if [ "$TOLKO_POKAZAT" -eq 1 ]; then
  echo "завел бы базу уроков в $BAZA"
  echo "вписал бы SessionEnd-хук $HUK в $NASTROYKI"
  echo "прогнал бы селфтест: node $DOM/scripts/koiz.mjs --selftest"
  exit 0
fi

mkdir -p "$BAZA"
echo "база уроков: $BAZA"

# Хук вписывается прибором, а не руками: settings.json у каждого свой, и слепая
# перезапись чужих хуков хуже отсутствия съема.
if sprosit "поставить съём уроков на закрытие сессии Claude Code?"; then
  KOIZ_HOOK="$HUK" KOIZ_SETTINGS="$NASTROYKI" node -e '
const fs = require("fs"), path = require("path");
const file = process.env.KOIZ_SETTINGS, hook = process.env.KOIZ_HOOK;
fs.mkdirSync(path.dirname(file), { recursive: true });
let s = {};
if (fs.existsSync(file)) {
  const raw = fs.readFileSync(file, "utf8").trim();
  if (raw) {
    try { s = JSON.parse(raw) } catch (e) {
      console.error("settings.json не разбирается, ничего не трогаю: " + e.message);
      process.exit(1);
    }
  }
  fs.copyFileSync(file, file + ".bak-koiz");
}
s.hooks = s.hooks || {};
const list = Array.isArray(s.hooks.SessionEnd) ? s.hooks.SessionEnd : [];
const already = JSON.stringify(list).includes("koiz-session-end.sh");
if (already) { console.log("хук уже стоит, оставляю как есть"); process.exit(0) }
list.push({ hooks: [{ type: "command", command: hook }] });
s.hooks.SessionEnd = list;
fs.writeFileSync(file, JSON.stringify(s, null, 2) + "\n");
console.log("хук вписан: " + file);
'
else
  echo "хук не поставлен; позже: bash install.sh"
fi

echo
echo "Проверка прибора:"
( cd "$DOM" && node scripts/koiz.mjs --selftest )
echo
echo "Спросить базу перед работой:"
echo "  node $DOM/scripts/koiz.mjs ask \"о чём\""
