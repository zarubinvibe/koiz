#!/usr/bin/env node
// Мутационные ворота селфтеста: селфтест, не краснеющий от сломанного правила, ничего
// не проверяет. Та же логика, что у ворот задачи в Гелиозе (проба обязана покраснеть на
// сломанной копии), только объект - сам Койз.
//
// Повод измеренный: за сессию сборки 06.09.2026 мутации нашли четыре молчащих места -
// отчет миграции «не потеряно», схлопывание дублей, столкновение имен нот и связи по id
// вместо имени. Практика стала прибором, чтобы не зависеть от памяти следующей сессии.
//
// Работает на КОПИИ в TMPDIR, рабочие файлы не трогает. Коды: 0 все пойманы · 1 выжившие.
import { mkdtempSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'

const SRC = path.dirname(fileURLToPath(import.meta.url))
const json = process.argv.includes('--json')

// файл · что сломать · чем заменить · как это называется
const MUTS = [
  ['koiz.mjs', 'const twin = [...st.L.values()].find(l => l.fp === fpv)', 'const twin = null', 'повтор пишется второй записью, а не hit'],
  ['koiz.mjs', 'export const active = st => [...st.L.values()].filter(l => !l.closed)', 'export const active = st => [...st.L.values()]', 'закрытое датой остается в выдаче'],
  ['koiz.mjs', 'if (group.length < 3) continue', 'if (group.length < 99) continue', 'три похожих не поднимаются в правило'],
  ['koiz.mjs', 'if (jaccard(textOf(act[i]), textOf(act[j])) >= 0.8) {', 'if (false) {', 'дубли не схлопываются'],
  ['koiz.mjs', 'if (before <= budget) return { before, after: before, collapsed: false, overflow: false }', 'if (true) return { before, after: before, collapsed: false, overflow: false }', 'бюджет не заставляет схлопывать'],
  ['koiz.mjs', 'res.lost = lostSrcs(parsed.records, readOps(db))', 'res.lost = []', 'миграция теряет записи молча'],
  ['koiz.mjs', '} catch (e) { res.failed.push({ src: r.src, why: e.message }) }', '} catch (e) { res.added++ }', 'падение записи проглочено'],
  ['koiz.mjs', 'if (!existsSync(expand(f.pin_ref))) throw new Error', 'if (false) throw new Error', 'закрепление не проверяется на диске'],
  ['koiz.mjs', 'if (taken.has(safe(title))) title =', 'if (false) title =', 'имена нот сталкиваются и затирают друг друга'],
  ['koiz.mjs', 'links.map(x => `- [[${titles.get(x)}]]`)', 'links.map(x => `- [[koiz-${x}]]`)', 'связи ведут на id, который Obsidian не резолвит'],
  ['koiz.mjs', 'if (!f.src && session && st.seen.has(`${fpv}|${session}`)) {', 'if (false) {', 'съем не идемпотентен'],
  ['koiz.mjs', '.filter(x => x.s >= 0.45).sort((a, b) => b.s - a.s).slice(0, 3)', '.filter(x => false).slice(0, 3)', 'связи с соседями не ставятся'],
  ['koiz.mjs', "g.items.every(l => l.pin === 'ничем')", 'false', 'долг не считается'],
  ['koiz.mjs', "(l.acks || []).some(a => !a.until || a.until >= day)", '(l.acks || []).length > 0', 'отсрочка не имеет срока'],
  ['koiz.mjs', '+ 0.6 * covers(q, l.class.replace(/-/g, \' \'))', '+ 0', 'попадание запроса в класс не весит - выдача отдает случайное'],
  ['koiz.mjs', "for (const l of [...active(st), ...activeRules(st)]) {", "for (const l of [...active(st), ...activeRules(st)].slice(0, 1)) {", 'граф теряет уроки'],
  ['koiz.mjs', "edge(l.id, node(`pin:${l.pin}`", "edge(null, node(`pin:${l.pin}`", 'граф не показывает закрепление'],
  ['koiz.mjs', 'if (!COMMON_TOOLS.has(program)) return program', 'if (true) return program', 'подсказка путает git add с git grep'],
  ['koiz.mjs', '.filter(x => x.score >= min && (x.fix || x.why))', '.filter(x => true)', 'подсказка выдаёт всё подряд'],
  ['koiz-capture.mjs', 'красный:|FAIL\\s|', 'красный:|FAIL\\b|', 'маркер провала ловит счетчики вида FAIL=0'],
  ['koiz-capture.mjs', 'if (NOISE.test(String(what)) || THIN(what)) return', 'if (false) return', 'работа сторожа записывается уроком'],
  ['koiz-lib.mjs', 'const stems = t => new Set(tokens(t).map(stem))', 'const stems = t => new Set(tokens(t))', 'сравнение без огрубления - морфология ломает выдачу'],
  ['koiz-lib.mjs', 'for (const [re, to] of SECRETS) out = out.replace(re, to)', 'for (const [re, to] of []) out = out.replace(re, to)', 'фильтр секретов выключен'],
]

const tmp = mkdtempSync(path.join(os.tmpdir(), 'koiz-mutate-'))
const results = []
try {
  for (const [file, from, to, name] of MUTS) {
    cpSync(SRC, tmp, { recursive: true })
    const p = path.join(tmp, file)
    const src = readFileSync(p, 'utf8')
    if (!src.includes(from)) { results.push({ name, verdict: 'якорь не найден - мутация устарела' }); continue }
    writeFileSync(p, src.replace(from, to))
    let code = 0
    try { execFileSync('node', [path.join(tmp, 'koiz.mjs'), '--selftest'], { stdio: 'pipe', timeout: 120000 }) }
    catch { code = 1 }
    results.push({ name, verdict: code ? 'поймана' : 'ВЫЖИЛА' })
  }
} finally { rmSync(tmp, { recursive: true, force: true }) }

const bad = results.filter(r => r.verdict !== 'поймана')
if (json) console.log(JSON.stringify({ total: results.length, survived: bad.length, results }, null, 2))
else {
  for (const r of results) console.log(`  ${r.verdict === 'поймана' ? '✓' : '✗'} ${r.name} — ${r.verdict}`)
  console.log(bad.length ? `мутации: выжило ${bad.length} из ${results.length} - селфтест их не судит`
    : `мутации: все ${results.length} пойманы - селфтест судит логику, а не наличие функций`)
}
process.exit(bad.length ? 1 : 0)
