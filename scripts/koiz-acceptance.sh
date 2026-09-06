#!/usr/bin/env bash
# Ворота приемки миссии: десять пунктов раздела «когда работа считается законченной»
# из docs/PROMPT-BUILD.md. Каждый судится командой, а не отметкой агента.
#
# Пишет только во временный каталог: живая база уроков читается, но не пачкается.
# Коды: 0 все зеленые · 1 есть красные.
#
# Шесть пунктов из десяти судят ОКРУЖЕНИЕ владельца: живой транскрипт, матрицу
# паритета, хранилище знаний, старый лог, хэндофф. На чужой машине этих входов
# нет, и раньше приёмка там просто краснела - изолированный прогон ворот выпуска
# ловил её как упавшую проверку. Теперь пункт без входа ПРОПУСКАЕТСЯ вслух и
# называет, чего не хватило. Пропуск не красит и не зеленит: он третье состояние,
# и его число печатается в итоге. Красит только пункт, который отработал и не
# сошёлся.
set -uo pipefail
KOIZ_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$KOIZ_ROOT"
K="$KOIZ_ROOT/scripts/koiz.mjs"
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
VAULT_DIR="$HOME/Мозг/08 AI и Инструменты/Уроки Койза"
fails=0
skips=0

say() { if [ "$1" = 0 ]; then printf '  ✓ %s\n' "$2"; else printf '  ✗ %s — %s\n' "$2" "${3:-нет доказательства}"; fails=$((fails+1)); fi }
skip() { printf '  · %s — пропущено: %s\n' "$1" "$2"; skips=$((skips+1)); }

# 1. Селфтест зелёный И судит логику: каждая из 16 мутаций обязана его уронить.
# Путь тут literal и относительный намеренно: изолированный прогон ворот читает
# строку глазами и по ней понимает, что этот файл ЗОВЁТ селфтест, а не отвечает
# на него сам. С путём в переменной он принимал приёмку за пробу и запускал её
# командой `koiz-acceptance.sh --selftest` на чистом HOME.
node scripts/koiz.mjs --selftest >/dev/null 2>&1; say $? "1а. селфтест зелёный"
mut=$(node scripts/koiz-mutate.mjs --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['survived'], d['total'])" 2>/dev/null || echo "9 0")
set -- $mut; [ "$1" = 0 ] && [ "${2:-0}" -ge 10 ]
say $? "1б. селфтест судит логику: мутаций $2, выжило $1"

# 2. Съём с ЖИВОЙ сессии: транскрипт с диска, без ручного набора.
TR=$(ls -t "$HOME"/.claude/projects/*/*.jsonl 2>/dev/null | head -1)
if [ -n "$TR" ]; then
  n=$(KOIZ_DB="$TMP/cap.jsonl" node "$K" capture --transcript "$TR" --project приемка --json 2>/dev/null \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['added'])+len(d['hits']))" 2>/dev/null || echo 0)
  [ "${n:-0}" -ge 1 ]; say $? "2. съём с живой сессии кладёт уроки в базу (снято: ${n:-0})" "транскрипт не дал ни одной улики"
else skip "2. съём с живой сессии" "на этой машине нет транскриптов ~/.claude/projects"; fi

# 3. Схлопывание: три похожих урока становятся одним правилом.
D3="$TMP/collapse.jsonl"
for t in "прибор назвал успехом то, чего не делал, судя по имени файла" \
         "гейт посчитал зелёным прогон, где проверка не запускалась" \
         "скрипт отрапортовал готово при пустом целевом каталоге"; do
  KOIZ_DB="$D3" node "$K" add --what "$t" --class pribor-vret --project приемка >/dev/null 2>&1
done
r=$(KOIZ_DB="$D3" node "$K" collapse --json 2>/dev/null | python3 -c "import json,sys; print(len(json.load(sys.stdin)['rules']))")
[ "${r:-0}" = 1 ]; say $? "3. три похожих урока схлопнулись в одно правило (правил: ${r:-0})"

# 4. Двувременность: закрытое уходит из выдачи и остаётся в истории.
ID=$(KOIZ_DB="$TMP/bt.jsonl" node "$K" add --what "урок про устаревший Xcode и его ключи" --class stale --project приемка --json 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin)['id'])")
KOIZ_DB="$TMP/bt.jsonl" node "$K" close --id "$ID" --why "инструмент больше не используется" >/dev/null 2>&1
out=$(KOIZ_DB="$TMP/bt.jsonl" node "$K" ask "Xcode" --json 2>/dev/null)
hist=$(KOIZ_DB="$TMP/bt.jsonl" node "$K" history --id "$ID" --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(int(any(o['op']=='add' for o in d) and any(o['op']=='close' and o.get('valid_to') for o in d)))")
{ [ "$out" = "[]" ] && [ "$hist" = 1 ]; }; say $? "4. закрытый датой урок не выдаётся, но лежит в истории"

# 5. Бюджет: переполнение заставляет схлопывать, а не расти молча.
D5="$TMP/budget.jsonl"
i=0; for t in "копия дома ушла в чужой каталог при сборке пакета" "сборка положила артефакт мимо целевой папки" "архив распакован не туда, куда указывал манифест" \
              "токены утекли в лог отладки при падении" "ключ попал в текст ошибки и уехал в чат" "пароль оказался в дампе состояния"; do
  i=$((i+1)); cls=$([ $i -le 3 ] && echo copy-home || echo secret-leak)
  KOIZ_DB="$D5" KOIZ_BUDGET=99 node "$K" add --what "$t" --class "$cls" --project "p$i" >/dev/null 2>&1
done
before=$(KOIZ_DB="$D5" node "$K" stats --json | python3 -c "import json,sys; print(json.load(sys.stdin)['active'])")
KOIZ_DB="$D5" KOIZ_BUDGET=4 node "$K" add --what "седьмая беда для проверки потолка базы" --class overflow --project p7 >/dev/null 2>&1
after=$(KOIZ_DB="$D5" node "$K" stats --json | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['active']+d['rules'])")
adds=$(grep -c '"op":"add"' "$D5")
{ [ "$before" = 6 ] && [ "$after" -le 4 ] && [ "$adds" = 7 ]; }
say $? "5. переполнение бюджета схлопнуло базу без потери данных (было $before, стало $after, записей $adds)"

# 6. Кросс-проектность: урок из одного дома находится из другого.
D6="$TMP/cross.jsonl"
( cd "$HOME/Проекты/adventure-book" 2>/dev/null || cd "$TMP"
  KOIZ_DB="$D6" node "$K" add --what "cat перезаписал лаунчер, пойдя по симлинку" --class symlink-write --project adventure-book >/dev/null 2>&1 )
p=$( cd "$HOME/Проекты/themis" 2>/dev/null || cd "$TMP"
  KOIZ_DB="$D6" node "$K" ask "симлинк" --json 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(d[0]['project'] if d else '')" )
[ "$p" = "adventure-book" ]; say $? "6. урок adventure-book найден запросом из themis (проект: ${p:-—})"

# 7. Матрица паритета зелёная у ворот Гелиоза.
PARITY_GATE="$HOME/Проекты/helioz/scripts/helioz-parity.mjs"
if [ -f "$PARITY_GATE" ] && [ -f "$KOIZ_ROOT/docs/PARITY.md" ]; then
  node "$PARITY_GATE" --file "$KOIZ_ROOT/docs/PARITY.md" >/dev/null 2>&1
  say $? "7. docs/PARITY.md зелёный у helioz-parity"
else skip "7. матрица паритета" "нет docs/PARITY.md или ворот helioz-parity"; fi

# 8. Мнемозина получила ноты, связи не битые, граф дома построен.
notes=$(ls "$VAULT_DIR"/*.md 2>/dev/null | wc -l | tr -d ' ')
broken=$(python3 - "$VAULT_DIR" <<'PY' 2>/dev/null || echo 999
import os, re, sys
d = sys.argv[1]
if not os.path.isdir(d): print(999); raise SystemExit
files = {os.path.splitext(f)[0] for f in os.listdir(d) if f.endswith('.md')}
bad = sum(1 for f in os.listdir(d) if f.endswith('.md')
          for l in re.findall(r'\[\[([^\]]+)\]\]', open(os.path.join(d, f), encoding='utf-8').read())
          if l not in files)
print(bad)
PY
)
if [ -d "$VAULT_DIR" ]; then
  { [ "${notes:-0}" -ge 10 ] && [ "${broken:-999}" = 0 ] && [ -f "$KOIZ_ROOT/graphify-out/graph.json" ]; }
  say $? "8. Мнемозина: $notes нот, битых связей ${broken}, граф дома построен"
else skip "8. Мнемозина" "на этой машине нет хранилища знаний"; fi

# 9. Старый лог перенесён целиком.
LES="$HOME/.claude/self-learning/lessons.md"
if [ -f "$LES" ]; then
  m=$(KOIZ_DB="$TMP/mig.jsonl" node "$K" migrate --file "$LES" --json 2>/dev/null \
      | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['sections'], d['records'], len(d['lost']))" 2>/dev/null || echo "0 0 1")
  set -- $m
  { [ "$1" -ge 13 ] && [ "$2" -ge 60 ] && [ "$3" = 0 ]; }
  say $? "9. перенос lessons.md: разделов $1, записей $2, потеряно $3"
else skip "9. перенос старого лога" "на этой машине нет ~/.claude/self-learning/lessons.md"; fi

# 10. Хэндофф написан и несёт обязательные разделы.
H="$KOIZ_ROOT/docs/HANDOFF.md"
if [ -f "$H" ]; then
  miss=0
  for sec in "Что сделано" "Что дальше" "Ключевое состояние"; do grep -q "$sec" "$H" || miss=1; done
  [ "$miss" = 0 ]; say $? "10. docs/HANDOFF.md на месте и полон"
else skip "10. хэндофф" "docs/HANDOFF.md в это дерево не входит"; fi

echo
if [ "$fails" != 0 ]; then echo "приёмка: красных пунктов $fails, пропущено $skips"; exit 1; fi
if [ "$skips" = 0 ]; then echo "приёмка: все десять пунктов зелёные"; exit 0; fi
echo "приёмка: красных нет, пропущено $skips из 10 - этих входов на машине нет"; exit 0
