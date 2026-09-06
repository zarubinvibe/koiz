#!/usr/bin/env bash
# SessionEnd-хук: закрытие сессии кладет уроки в базу Койза без ручного набора.
# Контракт хука: stdin = JSON с transcript_path и cwd. Тихий и не падающий: хук,
# который ломает выход из сессии, хуже отсутствующего хука.
set -uo pipefail

# Прибор ищется рядом с хуком, а не по домашнему каталогу владельца: у чужой
# машины нет ~/Проекты, и клон лежит там, где его положили.
DOM="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KOIZ="${KOIZ_HOME:-$DOM}/scripts/koiz.mjs"
LOG="$HOME/.claude/koiz/capture.log"
[ -f "$KOIZ" ] || exit 0

IN=$(cat 2>/dev/null || true)
read -r TP CWD <<EOF
$(printf '%s' "$IN" | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(d.get('transcript_path', '-'), d.get('cwd', '-'))
except Exception:
    print('- -')
" 2>/dev/null || echo '- -')
EOF

[ -n "${TP:-}" ] && [ "$TP" != "-" ] && [ -f "$TP" ] || exit 0
PROJECT=$(basename "${CWD:-$PWD}")

mkdir -p "$(dirname "$LOG")"
{
  printf '── %s · %s\n' "$(date '+%F %T')" "$PROJECT"
  node "$KOIZ" capture --transcript "$TP" --project "$PROJECT" 2>&1
} >> "$LOG" 2>/dev/null || true
exit 0
