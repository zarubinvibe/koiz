#!/usr/bin/env node
// Койз - дознаватель роя. Одна база уроков на все проекты владельца.
//
// Не память: память уже есть (Мнемозина). Дисциплина уроков: довести провал до причины
// и закрыть причину прибором. Центральное поле записи - «чем закреплено»; урок, который
// нечем закрепить, - жалоба, а не урок.
//
// Три вещи разведены сознательно, их путают все, и от этого база гниет:
//   съем       - дешево, детерминированно, машиной (koiz-capture.mjs);
//   хранение   - append-only, ничего не перезаписывается (как ушел mem0 от inline-слияния);
//   схлопывание - отдельный осознанный проход, не побочный эффект записи.
//
// Журнал: $KOIZ_DB, по умолчанию ~/.claude/koiz/lessons.jsonl - ВНЕ репозитория.
// Уроки несут пути, имена и куски команд; в git такому не место, а фильтр секретов
// стоит на записи (koiz-lib.mjs, redact) - того, чего в файле нет, не утечет никуда.
//
// Коды: 0 чисто · 1 красный (дыра, долг, переполнение) · 2 нет входа.
import { readFileSync, existsSync, appendFileSync, mkdirSync, writeFileSync, mkdtempSync, rmSync, readdirSync, realpathSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { fileURLToPath } from 'node:url'
import { kebab, tokens, jaccard, covers, normalize, fp, redact, PINS, expand } from './koiz-lib.mjs'
import { captureTranscript, parseLessonsMd, classOf } from './koiz-capture.mjs'

const DB = process.env.KOIZ_DB || path.join(os.homedir(), '.claude', 'koiz', 'lessons.jsonl')
const BUDGET = Number(process.env.KOIZ_BUDGET || 300)
const VAULT = process.env.KOIZ_VAULT || path.join(os.homedir(), 'Мозг', '08 AI и Инструменты', 'Уроки Койза')
const today = () => new Date().toISOString().slice(0, 10)
const now = () => new Date().toISOString()

// ── Хранение ───────────────────────────────────────────────────────────────────
export const readOps = (db = DB) => (existsSync(db) ? readFileSync(db, 'utf8').split('\n') : [])
  .filter(l => l.trim()).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean)

export function writeOps(db, ops) {
  mkdirSync(path.dirname(db), { recursive: true })
  appendFileSync(db, ops.map(o => JSON.stringify(o)).join('\n') + '\n')
  return ops
}

// Состояние - проигрывание журнала. Никакой строки журнала мы не трогаем: закрытие,
// связь и отсрочка - такие же дописанные операции, как и сам урок.
export function replay(ops) {
  const L = new Map(), R = new Map(), seen = new Set()
  const target = id => L.get(id) || R.get(id)
  for (const o of ops) {
    if (o.op === 'add') { L.set(o.id, { ...o, hits: [], links: new Set(o.links || []), closed: null, acks: [] }); seen.add(`${o.fp}|${o.session || ''}`) }
    else if (o.op === 'rule') R.set(o.id, { ...o, hits: [], links: new Set(), closed: null, acks: [] })
    else if (o.op === 'hit') { const t = L.get(o.ref); if (t) t.hits.push(o); seen.add(`${o.fp}|${o.session || ''}`) }
    else if (o.op === 'close') { const t = target(o.ref); if (t) t.closed = o }
    else if (o.op === 'ack') { const t = target(o.ref); if (t) t.acks.push(o) }
    // Закрепление дописывается операцией, а не правкой записи: журнал остаётся неизменяемым,
    // а история «сначала было ничем, потом закрыли хуком» - самое ценное, что в нём есть.
    else if (o.op === 'pin') { const t = target(o.ref); if (t) { t.pin = o.pin; t.pin_ref = o.pin_ref || null } }
    else if (o.op === 'link') { const a = L.get(o.ref), b = L.get(o.to); if (a) a.links.add(o.to); if (b) b.links.add(o.ref) }
  }
  return { L, R, seen }
}

export const state = (db = DB) => replay(readOps(db))
export const active = st => [...st.L.values()].filter(l => !l.closed)
export const activeRules = st => [...st.R.values()].filter(r => !r.closed)
export const occ = l => 1 + (l.hits?.length || 0)
// Воспроизведение входит в текст урока не для красоты: по команде и ищут. Без него запрос
// «cat > /usr/local/bin/tool» не находит урок, который ровно про эту команду и написан.
const textOf = l => [l.what, l.why, l.fix, l.repro].filter(Boolean).join(' ')
const ackLive = (l, day = today()) => (l.acks || []).some(a => !a.until || a.until >= day)

function nextId(st, prefix, fpv) {
  const base = `${prefix}-${today().replace(/-/g, '')}-${(fpv || '').slice(0, 4) || 'x'}`
  let id = base, n = 1
  while (st.L.has(id) || st.R.has(id)) id = `${base}-${++n}`
  return id
}

// ── Запись урока ───────────────────────────────────────────────────────────────
// Правило записи одно: ADD-only. Тот же отпечаток в новом прогоне дает не вторую
// запись, а `hit` к первой - иначе повтор не виден как повтор и долг не всплывает.
export function addLesson(f, db = DB) {
  if (!f.what || !String(f.what).trim()) throw new Error('нечего записывать: --what обязателен')
  const pin = f.pin || 'ничем'
  if (!PINS.includes(pin)) throw new Error(`закрепление «${pin}» не из списка: ${PINS.join(' · ')}`)
  if (pin !== 'ничем') {
    if (!f.pin_ref) throw new Error('закрепление названо, но не сказано чем: нужен --pin-ref <путь к механизму>')
    if (!existsSync(expand(f.pin_ref))) throw new Error(`механизма нет на диске: ${f.pin_ref} - закрепление показывают, а не заявляют`)
  }
  const st = state(db)
  const what = redact(f.what).trim()
  const why = f.why ? redact(f.why).trim() : null
  const fix = f.fix ? redact(f.fix).trim() : null
  const cls = kebab(f.class || classOf(what))
  const fpv = f.fp || fp(`${what} ${why || ''}`)
  const session = f.session || null

  // Тот же прогон уже это записал - молчим. Съем идет на каждом закрытии сессии и
  // обязан быть идемпотентным, иначе повторный хук надует базу мнимыми повторами.
  if (!f.src && session && st.seen.has(`${fpv}|${session}`)) {
    const t = [...st.L.values()].find(l => l.fp === fpv)
    return { op: 'seen', id: t?.id || null }
  }
  const twin = [...st.L.values()].find(l => l.fp === fpv)
  if (twin) {
    writeOps(db, [{ op: 'hit', ref: twin.id, at: now(), fp: fpv, project: f.project || null, session, src: f.src || null }])
    return { op: 'hit', id: twin.id, occ: occ(twin) + 1 }
  }

  const id = nextId(st, 'L', fpv)
  // Цеттелькастен: новая запись сама ищет соседей и правит их - дописанной связью,
  // а не переписью. Сосед узнает о новичке, не потеряв ни байта своей истории.
  const neigh = active(st)
    .map(l => ({ id: l.id, s: (l.class === cls ? 0.5 : 0) + jaccard(textOf(l), `${what} ${why || ''}`) }))
    .filter(x => x.s >= 0.45).sort((a, b) => b.s - a.s).slice(0, 3).map(x => x.id)

  const rec = {
    op: 'add', id, at: now(), fp: fpv, class: cls,
    project: f.project || 'разное', kind: f.kind || 'урок', origin: f.origin || 'агент',
    what, why, fix, repro: f.repro ? redact(f.repro) : null,
    pin, pin_ref: f.pin_ref || null,
    valid_from: f.valid_from || today(), valid_to: null,
    links: neigh, session, src: f.src || null, body: f.body ? redact(f.body) : null,
  }
  writeOps(db, [rec, ...neigh.map(n => ({ op: 'link', ref: n, to: id, at: now() }))])
  return { op: 'add', id, links: neigh }
}

// ── Двувременность ─────────────────────────────────────────────────────────────
// Устаревший урок не ложь и не мусор: он просто больше не действует. Закрываем датой,
// из выдачи убираем, из истории - никогда.
export function closeLesson(id, why, db = DB) {
  const st = state(db)
  const t = st.L.get(id) || st.R.get(id)
  if (!t) throw new Error(`нет такой записи: ${id}`)
  if (t.closed) return { op: 'уже закрыт', id, at: t.closed.at }
  writeOps(db, [{ op: 'close', ref: id, at: now(), valid_to: today(), why: why || 'без причины' }])
  return { op: 'close', id }
}

export function ackDebt(id, until, why, db = DB) {
  const st = state(db)
  if (!st.L.get(id) && !st.R.get(id)) throw new Error(`нет такой записи: ${id}`)
  writeOps(db, [{ op: 'ack', ref: id, at: now(), until: until || null, why: why || 'отсрочка без причины' }])
  return { op: 'ack', id, until }
}

// Закрепить УЖЕ записанный урок. Отдельная операция, а не новая запись: повтор той же беды
// второй записью ломает счёт повторов, ради которого база и заведена.
export function pinLesson(id, pin, ref, db = DB) {
  const st = state(db)
  const t = st.L.get(id) || st.R.get(id)
  if (!t) throw new Error(`нет такой записи: ${id}`)
  if (!PINS.includes(pin)) throw new Error(`закрепление «${pin}» не из списка: ${PINS.join(' · ')}`)
  if (pin !== 'ничем') {
    if (!ref) throw new Error('закрепление названо, но не сказано чем: нужен --pin-ref <путь к механизму>')
    if (!existsSync(expand(ref))) throw new Error(`механизма нет на диске: ${ref} - закрепление показывают, а не заявляют`)
  }
  writeOps(db, [{ op: 'pin', ref: id, at: now(), pin, pin_ref: ref || null, was: t.pin }])
  return { op: 'pin', id, pin, from: t.pin }
}

// Очередь на закрепление: что закрывать механизмом в первую очередь. Порядок не по вкусу -
// по цене повтора: сколько раз уже случалось, есть ли чем воспроизвести (значит, закрепимо
// тестом), и насколько беда разрушительна по глаголу команды.
const DESTRUCTIVE = /\b(rm|mv|cp|chmod|chown|git add|git reset|git checkout|push|drop|truncate|delete|перезапис|затёр|затер|стёр|стер|потер)/i

export function nextToPin({ db = DB, limit = 5 } = {}) {
  const st = state(db)
  return [...active(st), ...activeRules(st)]
    .filter(l => l.pin === 'ничем' && l.kind !== 'наблюдение' && (l.why || l.fix))
    .map(l => ({
      id: l.id, class: l.class, project: l.project, occ: occ(l),
      what: (l.what || l.text || '').slice(0, 160), fix: (l.fix || '').slice(0, 160), repro: l.repro || null,
      // Подсказка типа закрепления - от того, чем беда воспроизводится, а не от фантазии.
      suggest: l.repro ? 'тест' : (DESTRUCTIVE.test(`${l.what} ${l.repro || ''}`) ? 'hook' : 'прибор'),
      weight: occ(l) * 2 + (l.repro ? 1.5 : 0) + (DESTRUCTIVE.test(`${l.what} ${l.fix || ''}`) ? 2 : 0),
    }))
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .slice(0, limit)
}

// ── Выдача ─────────────────────────────────────────────────────────────────────
// Отбор как в generative_agents: релевантность + важность (сколько раз повторилось)
// + свежесть. Ключ поиска - класс ошибки, поэтому урок из adventure-book находится
// из themis: база одна, имя репозитория в ключ не входит.
export function ask(q, { project = null, cls = null, limit = 10, db = DB } = {}) {
  const st = state(db)
  const day = Date.now()
  const items = [...active(st), ...activeRules(st)]
  const scored = items.map(l => {
    const t = textOf(l)
    // Класс - выжимка урока, и попадание запроса в класс весит больше, чем совпадение
    // слов в длинном тексте: иначе урок «инструмент врёт не установлено» проигрывает
    // случайной записи, где слово «установка» встретилось в проходной фразе.
    const rel = q
      ? jaccard(q, t) + (normalize(t).includes(normalize(q)) ? 0.5 : 0) + 0.6 * covers(q, l.class.replace(/-/g, ' '))
      : 0.5
    const days = (day - Date.parse(l.at)) / 86400000
    const score = 0.6 * Math.min(rel, 1) + 0.25 * Math.min(occ(l) / 5, 1) + 0.15 / (1 + days / 90)
    return { l, rel, score }
  }).filter(x => (!q || x.rel > 0) && (!project || x.l.project === project) && (!cls || x.l.class === cls))
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(x => ({
    id: x.l.id, class: x.l.class, project: x.l.project, kind: x.l.op === 'rule' ? 'правило' : x.l.kind,
    occ: occ(x.l), pin: x.l.pin, pin_ref: x.l.pin_ref || null,
    what: x.l.what || x.l.text, why: x.l.why || null, fix: x.l.fix || null, repro: x.l.repro || null, score: +x.score.toFixed(3),
  }))
}

export const history = (id, db = DB) => readOps(db).filter(o => o.id === id || o.ref === id || o.to === id)

// Похожие записи в одну кучу: тот же класс ИЛИ достаточно общих слов. Одна функция на
// два вызова - схлопывание и поиск долга обязаны считать похожесть одинаково, иначе
// база схлопывает одно, а долгом называет другое.
export function cluster(items, threshold = 0.5) {
  const used = new Set(), groups = []
  for (const seed of items) {
    if (used.has(seed.id)) continue
    const g = items.filter(l => !used.has(l.id) && (l.class === seed.class || jaccard(textOf(seed), textOf(l)) >= threshold))
    g.forEach(l => used.add(l.id))
    groups.push(g)
  }
  return groups
}

// ── Долг ───────────────────────────────────────────────────────────────────────
// То, чего нет ни у одного источника: урок, повторившийся дважды и не закрепленный
// ничем, - это долг владельца. Либо механизм, либо признаем, что правило не работает.
export function debts({ db = DB, day = today() } = {}) {
  const st = state(db)
  // Долг считается только по провалам. Наблюдение (расход, роутинг, заметка о владельце)
  // механизмом не закрывается по природе, и требовать от него закрепления - шум в воротах.
  const fails = [...active(st), ...activeRules(st)].filter(l => l.kind !== 'наблюдение')
  // Повтор ищем кучей, а не точным совпадением класса: одна и та же беда в двух проектах
  // описана разными словами, и по точному классу она навсегда останется двумя одиночками.
  return cluster(fails, 0.55)
    .map(g => ({
      class: g[0].class, occ: g.reduce((a, l) => a + occ(l), 0), items: g,
      ids: g.map(l => l.id), projects: [...new Set(g.map(l => l.project || 'разное'))],
    }))
    .filter(g => g.occ >= 2 && g.items.every(l => l.pin === 'ничем') && !g.items.some(l => ackLive(l, day)))
    .map(({ items, ...rest }) => rest)
    .sort((a, b) => b.occ - a.occ)
}

// ── Схлопывание ────────────────────────────────────────────────────────────────
// Отдельный осознанный проход. На записи не сливаем ничего - именно от inline-слияния
// ушел mem0: оно дорогое и теряет данные. Здесь: дубли закрываются как дубли, три
// похожих урока поднимаются в правило (дерево рефлексии), правило само становится узлом.
export function collapse({ db = DB, apply = true } = {}) {
  const st = state(db)
  const act = active(st).sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const ops = [], dups = [], rules = []
  const dead = new Set()

  for (let i = 0; i < act.length; i++) {
    if (dead.has(act[i].id)) continue
    for (let j = i + 1; j < act.length; j++) {
      if (dead.has(act[j].id)) continue
      if (jaccard(textOf(act[i]), textOf(act[j])) >= 0.8) {
        dead.add(act[j].id); dups.push({ dup: act[j].id, of: act[i].id })
        ops.push({ op: 'close', ref: act[j].id, at: now(), valid_to: today(), why: `дубль ${act[i].id}` })
      }
    }
  }

  const left = act.filter(l => !dead.has(l.id))
  let n = st.R.size
  for (const group of cluster(left, 0.5)) {
    if (group.length < 3) continue
    const seed = group[0]
    const projects = [...new Set(group.map(l => l.project))]
    const why = group.map(l => l.why).filter(Boolean)[0] || 'причина не дознана'
    const fix = group.map(l => l.fix).filter(Boolean)[0] || 'починка не записана'
    const pin = group.every(l => l.pin !== 'ничем') ? group[0].pin : 'ничем'
    const id = `R-${String(++n).padStart(3, '0')}`
    // Правило обязано находиться теми же словами, что и члены: после схлопывания
    // члены закрыты, и если текст правила их слов не несет, запрос перестанет их видеть.
    const text = `${seed.class}: ${group.length} случая в проектах ${projects.join(', ')}. `
      + `Например: ${group.map(l => l.what).join(' | ')}. Причина: ${why} Починка: ${fix}`
    rules.push({ id, from: group.map(l => l.id), text, pin })
    ops.push({ op: 'rule', id, at: now(), class: seed.class, project: projects.join('+'), kind: 'правило',
      from: group.map(l => l.id), text, what: text, why, fix, pin, pin_ref: pin === 'ничем' ? null : group[0].pin_ref,
      valid_from: today(), valid_to: null, fp: fp(text) })
    for (const l of group) ops.push({ op: 'close', ref: l.id, at: now(), valid_to: today(), why: `схлопнут в ${id}` })
  }

  if (apply && ops.length) writeOps(db, ops)
  return { dups, rules, ops: ops.length, before: act.length, after: apply ? active(state(db)).length + activeRules(state(db)).length : act.length }
}

// ── Бюджет ─────────────────────────────────────────────────────────────────────
// Потолок как у letta: переполнение ЗАСТАВЛЯЕТ обобщать. Без потолка база растет вечно
// и через год превращается в стену текста, которую никто не читает, - то есть в ничто.
export function enforceBudget({ db = DB, budget = BUDGET } = {}) {
  const size = () => { const s = state(db); return active(s).length + activeRules(s).length }
  const before = size()
  if (before <= budget) return { before, after: before, collapsed: false, overflow: false }
  const c = collapse({ db, apply: true })
  const after = size()
  return { before, after, collapsed: true, rules: c.rules.length, dups: c.dups.length, overflow: after > budget }
}

// ── Съем с живой сессии ────────────────────────────────────────────────────────
// Закрытие сессии кладет в базу то, что видно с диска: отказы инструментов, отказы
// ворот, одну команду, повторенную трижды. Причину машина не выдумывает - `why` пуст,
// закрепление «ничем». Это сырье, и оно честно помечено сырьем.
export function captureSession({ transcript, project = null, db = DB, limit = 8 } = {}) {
  if (!transcript || !existsSync(transcript)) return { error: `нет транскрипта: ${transcript}`, code: 2 }
  const session = path.basename(transcript).replace(/\.jsonl$/, '')
  const obs = captureTranscript(readFileSync(transcript, 'utf8'), { session, project: project || 'разное', limit })
  const out = { session, seen: 0, added: [], hits: [] }
  for (const o of obs) {
    const r = addLesson({ ...o, origin: 'машина', kind: o.kind, pin: 'ничем', why: null, session }, db)
    if (r.op === 'add') out.added.push(r.id)
    else if (r.op === 'hit') out.hits.push(r.id)
    else out.seen++
  }
  out.budget = enforceBudget({ db })
  return out
}

// ── Миграция старого лога ──────────────────────────────────────────────────────
// Вход, а не мусор. Терять нельзя ни одной записи, и это проверяется, а не обещается:
// у каждой записи есть `src` вида `lessons.md:<строка>`, и после переноса мы требуем,
// чтобы КАЖДЫЙ исходный `src` нашелся в журнале.
// Что не доехало: исходные записи, чьего `src` нет в журнале. Отдельная чистая функция,
// потому что ее судят селфтестом в обе стороны - и когда все на месте, и когда потеряно.
export const lostSrcs = (records, ops) => {
  const srcs = new Set(ops.map(o => o.src).filter(Boolean))
  return records.filter(r => r.src && !srcs.has(r.src)).map(r => r.src)
}

export function migrate({ file, db = DB } = {}) {
  if (!file || !existsSync(file)) return { error: `нет файла: ${file}`, code: 2 }
  const parsed = parseLessonsMd(readFileSync(file, 'utf8'), { file: path.basename(file) })
  const session = `migrate:${path.basename(file)}`
  const res = { file, sections: parsed.sections.length, records: parsed.records.length, added: 0, hits: 0, failed: [], lost: [] }
  for (const r of parsed.records) {
    try {
      const out = addLesson({ ...r, origin: 'миграция', session, valid_from: r.date || today() }, db)
      if (out.op === 'add') res.added++; else res.hits++
    } catch (e) { res.failed.push({ src: r.src, why: e.message }) }
  }
  // Потерю ищем НЕ по счетчикам, а по диску: каждая исходная запись обязана найтись
  // в журнале своим `src`. Счетчик врет вместе с кодом, диск - нет.
  res.lost = lostSrcs(parsed.records, readOps(db))
  res.code = res.lost.length ? 1 : 0
  return res
}

// ── Мнемозина ──────────────────────────────────────────────────────────────────
// Вторую базу знаний не заводим: уроки уходят нотами в существующий vault, связи
// ставим wikilinks, граф строит Graphify. Пишем только в свою папку и только новое.
// В базу знаний уходит ЗНАНИЕ, а не сырье. Урок, снятый машиной, причины еще не имеет
// (why пуст) - ему в vault рано: нота без «почему» засоряет граф и врет полнотой.
// Уходят: правила, уроки с дознанной причиной, повторы и все закрепленное механизмом.
export function exportVault({ db = DB, dir = VAULT, minOcc = 2 } = {}) {
  const st = state(db)
  const rules = activeRules(st)
  const lessons = active(st).filter(l => l.origin !== 'машина' || occ(l) >= minOcc || l.pin !== 'ничем')
  mkdirSync(dir, { recursive: true })
  const safe = s => String(s).replace(/[\/\\:*?"<>|]/g, '-').slice(0, 70)
  const written = []

  // Имена считаем ДО записи: связь в Obsidian ведет по имени ноты, а не по id из
  // frontmatter. Без этой раскладки ссылки урок→урок битые, и граф рассыпается.
  const taken = new Set()
  const titles = new Map()
  for (const [l, kind] of [...rules.map(r => [r, 'Правило']), ...lessons.map(x => [x, 'Урок'])]) {
    let title = `${kind} — ${l.class}`
    if (taken.has(safe(title))) title = `${title} (${l.id})`
    taken.add(safe(title))
    titles.set(l.id, safe(title))
  }

  const note = (l, kind) => {
    const title = titles.get(l.id)
    const file = path.join(dir, `${title}.md`)
    const links = [...(l.links || []), ...(l.from || [])].filter(x => titles.has(x)).slice(0, 5)
    const body = `---
id: koiz-${l.id}
title: "${title.replace(/"/g, "'")}"
type: ${kind === 'Правило' ? 'concept' : 'reference'}
section: "08 AI и Инструменты"
tags:
  - "#койз"
  - "#уроки-роя"
  - "#${l.project || 'разное'}"
created: "${(l.at || now()).slice(0, 10)}"
source: "koiz:${l.id}"
source_type: "koiz-lesson"
verified: ${l.origin === 'машина' ? 'снято-машиной' : 'записано-агентом'}
---

# ${title}

## Что сломалось

${l.what || l.text}

## Почему

${l.why || 'Причина не дознана — урок не закончен.'}

## Починка

${l.fix || 'Починка не записана.'}

## Чем закреплено

\`${l.pin}\`${l.pin_ref ? ` → \`${l.pin_ref}\`` : ' — механизма нет, это долг.'}

${l.body ? `## Как было записано

${l.body}

` : ''}## Как это поможет мне

Класс ошибки \`${l.class}\` встречался ${occ(l)} раз (проект: ${l.project}). Перед работой того же
класса спроси базу: \`node scripts/koiz.mjs ask "${l.class}"\`. Если закрепление «ничем» — закрой
причину механизмом, а не обещанием.

## Связи

${links.length ? links.map(x => `- [[${titles.get(x)}]]`).join('\n') : '- [[Койз — уроки роя]]'}
`
    writeFileSync(file, body)
    written.push(file)
  }

  for (const r of rules) note(r, 'Правило')
  for (const l of lessons) note(l, 'Урок')

  const d = debts({ db })
  const index = `---
id: koiz-index
title: "Койз — уроки роя"
type: index
section: "08 AI и Инструменты"
tags:
  - "#койз"
  - "#уроки-роя"
created: "${today()}"
source: "koiz:${path.basename(db)}"
verified: снято-машиной
---

# Койз — уроки роя

База уроков всех проектов. Ключ — класс ошибки, а не имя репозитория: одна беда в трёх домах
ложится в один класс и находится из любого из них.

## Состояние на ${today()}

- активных уроков: ${active(st).length}
- правил после схлопывания: ${rules.length}
- долгов (повторилось дважды, не закреплено ничем): ${d.length}

## Долги

${d.length ? d.map(x => `- \`${x.class}\` — ${x.occ} раз, проекты: ${x.projects.join(', ')}`).join('\n') : '- долгов нет'}

## Ноты

${written.map(f => `- [[${path.basename(f, '.md')}]]`).join('\n') || '- пока пусто'}

## Как это поможет мне

Спросить базу перед работой: \`node ~/Проекты/koiz/scripts/koiz.mjs ask "<о чём>"\`.
Ночь Гелиоза не стартует, если долг не закрыт и не отсрочен — правило живёт в воротах.
`
  const ifile = path.join(dir, 'Койз — уроки роя.md')
  writeFileSync(ifile, index)
  written.push(ifile)
  return { dir, written: written.length, files: written }
}

// ── Граф уроков ────────────────────────────────────────────────────────────────
// Перечитывать базу целиком дорого: девяносто уроков прозой - это токены на каждый заход
// и время владельца на каждое объяснение. Граф снимает обе платы: по нему ходят обходом,
// без модели и без денег. Формат - тот же, что у Graphify (nodes/links), чтобы по графу
// умели ходить готовые инструменты, а не только Койз.
//
// Строится ВСЕГДА при записи, а не по памяти агента: правило, которое надо не забыть,
// исполняется вероятностно, а граф, собранный после каждой правки, свеж по построению.
const GRAPH_DIR = process.env.KOIZ_GRAPH || path.join(path.dirname(DB), 'graphify-out')

export function buildGraph(db = DB) {
  const st = state(db)
  const nodes = [], links = []
  const seen = new Set()
  const node = (id, label, kind, extra = {}) => {
    if (seen.has(id)) return id
    seen.add(id)
    nodes.push({ id, label, file_type: kind, source_file: path.basename(db), source_location: `L${nodes.length + 1}`, kind, ...extra })
    return id
  }
  const edge = (from, to, context) => { if (from && to) links.push({ source: from, target: to, context }) }

  for (const l of [...active(st), ...activeRules(st)]) {
    const isRule = l.op === 'rule'
    node(l.id, `${isRule ? 'правило' : 'урок'}: ${l.class}`, isRule ? 'rule' : 'lesson', {
      project: l.project, pin: l.pin, occ: occ(l), what: (l.what || l.text || '').slice(0, 200),
      why: l.why || null, fix: l.fix || null, at: l.at,
    })
    edge(l.id, node(`class:${l.class}`, l.class, 'class'), 'класс ошибки')
    edge(l.id, node(`project:${l.project || 'разное'}`, l.project || 'разное', 'project'), 'проект')
    edge(l.id, node(`pin:${l.pin}`, `закреплено: ${l.pin}`, 'pin'), l.pin === 'ничем' ? 'не закреплено' : 'закреплено')
    if (l.pin_ref) edge(l.id, node(`mech:${l.pin_ref}`, l.pin_ref, 'mechanism'), 'механизм')
    for (const to of l.links || []) if (st.L.has(to) && !st.L.get(to).closed) edge(l.id, to, 'сосед')
    for (const from of l.from || []) edge(l.id, from, 'схлопнут из')
  }
  return { directed: true, multigraph: false, graph: { name: 'koiz-lessons', built_at: now() }, nodes, links }
}

export function writeGraph({ db = DB, dir = GRAPH_DIR } = {}) {
  const g = buildGraph(db)
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, 'graph.json'), JSON.stringify(g, null, 2) + '\n')
  const byKind = g.nodes.reduce((a, n) => { a[n.kind] = (a[n.kind] || 0) + 1; return a }, {})
  const debtList = debts({ db })
  writeFileSync(path.join(dir, 'GRAPH_REPORT.md'), `# Граф уроков Койза

Собран ${today()}. Ходить по нему бесплатно: узлы и рёбра, ни одной модели.

- узлов: ${g.nodes.length} (${Object.entries(byKind).map(([k, v]) => `${k}: ${v}`).join(' · ')})
- рёбер: ${g.links.length}
- долгов: ${debtList.length}${debtList.length ? ` (${debtList.map(d => d.class).join(', ')})` : ''}

## Как читать

Узел урока связан со своим классом ошибки, проектом и закреплением. Правило связано с
теми уроками, из которых схлопнуто. Соседство ставится на записи, а не задним числом.

Чтобы перечитать всё про один класс, идут от узла \`class:<имя>\`, а не по всей базе.
`)
  return { dir, nodes: g.nodes.length, links: g.links.length }
}

// ── Подсказка в момент действия ─────────────────────────────────────────────────
// Урок, всплывающий на разборе сессии, опаздывает: беда уже случилась. Урок обязан всплывать
// ПЕРЕД действием того же класса - когда агент печатает ту самую команду. Отсюда guard:
// дешёвый запрос по тексту команды или пути, который либо молчит, либо кладёт в контекст
// одну-две записи с починкой.
//
// Порог не косметика. Слишком низкий - шум на каждой команде, и подсказку перестают читать;
// слишком высокий - молчание там, где урок был. 0.5 выбран замером на живой базе: ниже него
// в выдачу лезут записи, связанные с запросом одним общим словом.
const GUARD_SCORE = Number(process.env.KOIZ_GUARD_SCORE || 0.5)

// Имя программы - самый честный признак родства команды с уроком: «cat > …» и урок про `cat`
// связаны сильнее, чем любые общие слова в прозе. Поэтому совпадение первого слова весит
// отдельно, а не растворяется в мере похожести текстов.
const programOf = t => (String(t || '').trim().match(/^[\w./-]+/) || [''])[0].split('/').pop()

// У командных обёрток первое слово ничего не различает: `git` стоит в половине уроков, и по
// нему подсказка выдаёт случайное. Для таких берём два слова - «git add» против «git grep».
const COMMON_TOOLS = new Set(['git', 'node', 'npm', 'npx', 'bun', 'yarn', 'pnpm', 'python3', 'python', 'sh', 'bash', 'sudo', 'docker', 'brew'])
const signatureOf = text => {
  const parts = String(text || '').trim().split(/\s+/)
  const program = programOf(parts[0])
  if (!COMMON_TOOLS.has(program)) return program
  const second = (parts[1] || '').replace(/^-+/, '')
  return second ? `${program} ${second}` : program
}

export function guard(text, { db = DB, limit = 2, min = GUARD_SCORE } = {}) {
  const q = String(text || '').trim()
  if (q.length < 8) return []
  const program = signatureOf(q)
  return ask(q.slice(0, 400), { db, limit: limit * 4 })
    .map(x => {
      // Имя программы ищем и в воспроизведении, и в тексте урока: у перенесённых из старого
      // лога записей поля `repro` нет вовсе, а сама команда в тексте названа - «`cat >` пошёл
      // по симлинку». Терять их значит молчать ровно там, где урок и написан.
      const inRepro = program && signatureOf(x.repro) === program
      const inText = program && program.length >= 2
        && new RegExp(`(^|[^\\w])${program.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\w]|$)`)
          .test(`${x.what} ${x.why || ''} ${x.fix || ''}`)
      return { ...x, score: +(x.score + (inRepro ? 0.4 : (inText ? 0.3 : 0))).toFixed(3) }
    })
    .filter(x => x.score >= min && (x.fix || x.why))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export const guardText = (text, opts = {}) => guard(text, opts).map(x =>
  `· ${x.class} (${x.occ}×, закреплено: ${x.pin}): ${x.what}\n  починка: ${x.fix || x.why}`).join('\n')

// ── Ворота ─────────────────────────────────────────────────────────────────────
// Койз вызывается из helioz-start.sh как остальные ворота: класс ошибки, который уже
// случался и не закреплен ничем, обязан уметь красить ночь. Иначе урок снова текст.
export function gate({ db = DB, cls = null } = {}) {
  if (!existsSync(db)) return { code: 2, msg: `нет базы: ${db}` }
  if (cls) {
    const st = state(db)
    const hits = [...active(st), ...activeRules(st)].filter(l => l.class === kebab(cls))
    const un = hits.filter(l => l.pin === 'ничем' && !ackLive(l))
    return un.length
      ? { code: 1, msg: `класс «${cls}» уже случался (${un.reduce((a, l) => a + occ(l), 0)} раз) и не закреплен ничем`, ids: un.map(l => l.id) }
      : { code: 0, msg: hits.length ? `класс «${cls}» известен и закреплен` : `класс «${cls}» в базе не встречался` }
  }
  const d = debts({ db })
  return d.length
    ? { code: 1, msg: `долгов: ${d.length} — урок повторился и не закреплен ничем`, debts: d }
    : { code: 0, msg: 'долгов нет: всё повторяющееся закреплено или отсрочено' }
}

export function stats({ db = DB } = {}) {
  const st = state(db)
  const act = active(st), rules = activeRules(st)
  const byProject = {}, byPin = {}
  for (const l of [...act, ...rules]) {
    byProject[l.project] = (byProject[l.project] || 0) + 1
    byPin[l.pin] = (byPin[l.pin] || 0) + 1
  }
  return {
    db, ops: readOps(db).length, lessons_total: st.L.size, active: act.length, closed: st.L.size - act.length,
    rules: rules.length, budget: BUDGET, budget_used: `${Math.round((act.length + rules.length) / BUDGET * 100)}%`,
    debts: debts({ db }).length, projects: byProject, pins: byPin,
  }
}

// ── Селфтест ───────────────────────────────────────────────────────────────────
// Судит логику, а не наличие функций: каждый пункт красный, если правило сломать.
function selftest() {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'koiz-'))
  const db = path.join(tmp, 'lessons.jsonl')
  const ok = (c, m) => { if (!c) { console.error(`selftest: ${m}`); rmSync(tmp, { recursive: true, force: true }); process.exit(1) } }
  const raises = (f, re, m) => { try { f(); ok(false, m) } catch (e) { ok(re.test(e.message), `${m} (сказано: ${e.message})`) } }

  // 1. ADD-only: вход ничего не перезаписывает.
  addLesson({ what: 'запись через cat пошла по симлинку и переписала лаунчер', class: 'symlink-write', project: 'adventure-book' }, db)
  const first = readFileSync(db, 'utf8').split('\n')[0]
  addLesson({ what: 'ворота приняли пробу, зависящую только от окружения', class: 'probe-env', project: 'helioz' }, db)
  ok(readFileSync(db, 'utf8').split('\n')[0] === first, 'первая строка журнала не меняется от новой записи')

  // 2. Повтор дает hit к прежней записи, а не вторую запись: иначе повтор не виден.
  const rep = addLesson({ what: 'запись через cat пошла по симлинку и переписала лаунчер', class: 'symlink-write', project: 'themis' }, db)
  ok(rep.op === 'hit', 'тот же отпечаток дает hit, а не дубль')
  ok(readOps(db).filter(o => o.op === 'add').length === 2, 'повтор не плодит записей')

  // 3. Кросс-проектность: урок из adventure-book находится запросом, не знающим о нем.
  const found = ask('симлинк', { db })
  ok(found.length && found[0].project === 'adventure-book', 'урок другого проекта находится по классу ошибки')
  ok(found[0].occ === 2, 'важность считает повторы')

  // 3б. Морфология: урок написан одними формами слов, а спрашивают другими. Выдача,
  // которая этого не переживает, врет пустотой - и база молчит о том, что в ней есть.
  const dbm = path.join(tmp, 'morph.jsonl')
  addLesson({ what: 'браузерный стек считался не установленным, хотя бинарь лежал на диске', class: 'браузер', project: 'helioz' }, dbm)
  ok(ask('браузер не установлен', { db: dbm }).length === 1, 'урок находится другими формами тех же слов')
  ok(ask('установка браузеров', { db: dbm }).length === 1, 'падеж и число не мешают найти урок')
  // Класс - выжимка урока: запрос, попавший в класс, обязан обойти запись, где то же слово
  // мелькнуло в проходной фразе. Иначе выдача отдает случайное, и базе перестают верить.
  const dbr = path.join(tmp, 'rank.jsonl')
  addLesson({ what: 'бинарь лежал на диске и запускался, а инструмент утверждал обратное', class: 'браузер-не-установлен', project: 'helioz' }, dbr)
  addLesson({ what: 'установка браузеров с github предразрешена владельцем, порог свежести неделя', class: 'свежесть-способностей', project: 'разное' }, dbr)
  const rank = ask('браузер не установлен', { db: dbr })
  ok(rank[0] && rank[0].class === 'браузер-не-установлен',
     `первым идет урок своего класса, даже если слова запроса лежат в тексте другого (пришло: ${rank[0] && rank[0].class})`)

  // 4. Двувременность: закрытое уходит из выдачи, но остается в истории.
  const vid = found[0].id
  closeLesson(vid, 'механизм заменен, урок больше не действует', db)
  ok(!ask('симлинк', { db }).some(x => x.id === vid), 'закрытый урок не выдается')
  ok(history(vid, db).some(o => o.op === 'close' && o.valid_to), 'закрытие датировано и лежит в истории')
  ok(history(vid, db).some(o => o.op === 'add'), 'исходная запись из истории не исчезла')

  // 5. Схлопывание: три похожих урока поднимаются в одно правило.
  const db2 = path.join(tmp, 'collapse.jsonl')
  const trio = [
    'прибор назвал успехом то, чего не делал, потому что судил по имени файла',
    'гейт посчитал зеленым прогон, где проверка вообще не запускалась',
    'скрипт отрапортовал готово, хотя целевой каталог остался пустым',
  ]
  trio.forEach((t, i) => addLesson({ what: t, class: 'pribor-vret-imenem', project: ['olympuz', 'helioz', 'themis'][i] }, db2))
  const c = collapse({ db: db2, apply: true })
  ok(c.rules.length === 1, `три похожих дают одно правило (получено ${c.rules.length})`)
  ok(c.rules[0].from.length === 3, 'правило помнит, из чего сложено')
  ok(active(state(db2)).length === 0 && activeRules(state(db2)).length === 1, 'члены закрыты, правило активно')
  ok(readOps(db2).filter(o => o.op === 'add').length === 3, 'схлопывание не стирает исходные записи')
  ok(ask('прибор', { db: db2 }).some(x => x.kind === 'правило'), 'правило выдается как узел базы')

  // 5б. Дубли схлопываются как дубли: почти тот же урок не должен занимать две строки
  // выдачи. Закрывается младший, старший остается - и причина закрытия названа.
  const dbd = path.join(tmp, 'dups.jsonl')
  const keep = addLesson({ what: 'ворота приняли пробу, которая ничего не проверяла', class: 'probe-empty', project: 'a' }, dbd)
  const drop = addLesson({ what: 'ворота приняли пробу, которая совсем ничего не проверяла', class: 'probe-empty', project: 'b' }, dbd)
  const cd = collapse({ db: dbd, apply: true })
  ok(cd.dups.length === 1 && cd.dups[0].dup === drop.id && cd.dups[0].of === keep.id, 'почти одинаковые схлопнуты как дубль')
  ok(/^дубль /.test(state(dbd).L.get(drop.id).closed.why), 'причина закрытия названа дублем')
  ok(!state(dbd).L.get(keep.id).closed, 'старшая запись осталась активной')

  // 6. Бюджет: переполнение ЗАСТАВЛЯЕТ схлопывать, а не растить базу молча.
  const db3 = path.join(tmp, 'budget.jsonl')
  const six = [
    ['копия дома ушла в чужой каталог при сборке пакета', 'copy-home'],
    ['сборка положила артефакт мимо целевой папки проекта', 'copy-home'],
    ['архив распакован не туда, куда указывал манифест', 'copy-home'],
    ['токены утекли в лог отладки при падении задачи', 'secret-leak'],
    ['ключ попал в текст ошибки и уехал в телеграм', 'secret-leak'],
    ['пароль оказался в дампе состояния конвейера', 'secret-leak'],
  ]
  six.forEach(([w, k], i) => addLesson({ what: w, class: k, project: `p${i}` }, db3))
  ok(active(state(db3)).length === 6, 'до бюджета все шесть активны')
  const b = enforceBudget({ db: db3, budget: 4 })
  ok(b.collapsed === true, 'переполнение запускает схлопывание')
  ok(b.after <= 4, `после схлопывания влезли в бюджет (стало ${b.after})`)
  ok(b.overflow === false, 'бюджет удержан')
  ok(readOps(db3).filter(o => o.op === 'add').length === 6, 'бюджет не теряет данные, он их обобщает')
  ok(enforceBudget({ db: db3, budget: 99 }).collapsed === false, 'под потолком схлопывание не трогают')

  // 7. Долг: повтор без закрепления поднимается владельцу и красит ворота.
  const db4 = path.join(tmp, 'debt.jsonl')
  addLesson({ what: 'скилл выбран мимо подсказки роутера', class: 'routing-miss', project: 'a' }, db4)
  addLesson({ what: 'скилл выбран мимо подсказки роутера', class: 'routing-miss', project: 'b' }, db4)
  ok(debts({ db: db4 }).length === 1, 'повторившийся незакрепленный урок - долг')
  ok(gate({ db: db4 }).code === 1, 'долг красит ворота')
  ok(gate({ db: db4, cls: 'routing-miss' }).code === 1, 'спрос по классу краснеет: уже случалось и не закреплено')
  ok(gate({ db: db4, cls: 'никогда-не-было' }).code === 0, 'неизвестный класс ворота не красит')
  ackDebt(debts({ db: db4 })[0].ids[0], '2099-01-01', 'закрепление запланировано', db4)
  ok(debts({ db: db4 }).length === 0, 'отсрочка снимает долг')
  ok(debts({ db: db4, day: '2099-06-01' }).length === 1, 'просроченная отсрочка возвращает долг')
  addLesson({ what: 'один урок закреплен прибором', class: 'pinned', pin: 'прибор', pin_ref: db4, project: 'a' }, db4)
  addLesson({ what: 'ещё один урок закреплен прибором', class: 'pinned', pin: 'прибор', pin_ref: db4, project: 'b' }, db4)
  ok(!debts({ db: db4 }).some(d => d.class === 'pinned'), 'закрепленный повтор долгом не считается')

  // 8. Закрепление показывают, а не заявляют.
  raises(() => addLesson({ what: 'урок с выдуманным механизмом', pin: 'hook', pin_ref: '/нет/такого/хука.sh' }, db4),
    /механизма нет на диске/, 'закрепление без механизма на диске отвергается')
  raises(() => addLesson({ what: 'урок с закреплением без ссылки', pin: 'тест' }, db4), /не сказано чем/, 'закрепление без ссылки отвергается')
  raises(() => addLesson({ what: 'урок с самодельным закреплением', pin: 'обещание' }, db4), /не из списка/, 'самодельное закрепление отвергается')
  raises(() => addLesson({ what: '' }, db4), /нечего записывать/, 'пустая запись отвергается')

  // 9. Секреты в базу не попадают - режем на записи, а не при выдаче.
  const db5 = path.join(tmp, 'secret.jsonl')
  // Приманка собирается из кусков, а не лежит литералом: строка вида токена в
  // исходнике краснит и сторожа секретов, и ворота публикации, а проверка от
  // литерала не выигрывает - фильтру важна форма строки, а не место рождения.
  const primanka = 'ghp' + '_' + 'abcdefghijklmnopqrstuvwxyz0123'
  addLesson({ what: `токен ${primanka} утек в лог`, class: 'leak', project: 'a' }, db5)
  ok(!readFileSync(db5, 'utf8').includes(primanka), 'секрет не лег в журнал')
  ok(readFileSync(db5, 'utf8').includes('gh_***'), 'на месте секрета стоит метка')

  // 10. Цеттелькастен: новая запись связывает себя и правит соседа дописанной связью.
  const db6 = path.join(tmp, 'links.jsonl')
  const a1 = addLesson({ what: 'проба гейта оказалась тавтологичной и ничего не доказала', class: 'probe-taut', project: 'a' }, db6)
  const a2 = addLesson({ what: 'проба гейта прошла зеленой на сломанной копии дома', class: 'probe-taut', project: 'b' }, db6)
  ok(a2.links.includes(a1.id), 'новая запись сама нашла соседа')
  ok(state(db6).L.get(a1.id).links.has(a2.id), 'сосед узнал о новичке, ничего не потеряв')

  // 11. Съем идемпотентен: повторный хук не надувает базу мнимыми повторами.
  const tr = path.join(tmp, 'sess.jsonl')
  writeFileSync(tr, [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'node scripts/gate.mjs --check' } }] } }),
    JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 't1', is_error: true, content: 'команда упала: нет каталога queue' }] } }),
    JSON.stringify({ type: 'user', toolUseResult: { stdout: 'красный: план не по схеме', stderr: '' } }),
  ].join('\n'))
  const db7 = path.join(tmp, 'capture.jsonl')
  const cap1 = captureSession({ transcript: tr, project: 'helioz', db: db7 })
  ok(cap1.added.length === 2, `съем нашел оба класса улик (нашел ${cap1.added.length})`)
  const opsAfter = readOps(db7).length
  const cap2 = captureSession({ transcript: tr, project: 'helioz', db: db7 })
  ok(cap2.added.length === 0 && cap2.seen === 2, 'повторный съем той же сессии ничего не добавляет')
  ok(readOps(db7).length === opsAfter, 'журнал не вырос от повторного съема')
  ok(state(db7).L.values().next().value.why === null, 'машина не выдумывает причину - why пуст')
  ok([...state(db7).L.values()].every(l => l.pin === 'ничем' && l.origin === 'машина'), 'сырье честно помечено сырьем')

  // 11б. Регистр маркера значим: `FAIL ` - провал прибора, `fail=0` - счетчик в его же
  // выводе. Съем без этого различия записал ложный урок на живой сессии 06.09.2026.
  const noise = [
    JSON.stringify({ type: 'user', toolUseResult: { stdout: 'fail=0 проверок пройдено успешно, прогон чистый\nитог', stderr: '' } }),
    JSON.stringify({ type: 'user', toolUseResult: { stdout: 'FAIL=0 счетчик прибора, а не провал прогона\nитог', stderr: '' } }),
    JSON.stringify({ type: 'user', toolUseResult: { stdout: 'fail 0 ошибок в прогоне линтера, всё чисто\nитог', stderr: '' } }),
    JSON.stringify({ type: 'user', toolUseResult: { stdout: '  FAIL линтер: план не по схеме', stderr: '' } }),
  ].join('\n')
  const sniff = captureTranscript(noise, { session: 'n', project: 'p' })
  ok(sniff.length === 1 && /FAIL линтер/.test(sniff[0].what), `счетчик fail=0 не считается провалом (снято ${sniff.length})`)

  // 11в. Имя ноты не должно затирать соседа: два урока одного класса дают одно имя, и
  // без развода по id 64 записи ложились в 63 файла - молчаливая потеря знания.
  const db10 = path.join(tmp, 'export.jsonl')
  addLesson({ what: 'первый урок общего класса про ворота', class: 'общий-класс', why: 'причина одна', project: 'a' }, db10)
  addLesson({ what: 'второй урок общего класса про ворота', class: 'общий-класс', why: 'причина другая', project: 'b' }, db10)
  const vdir = path.join(tmp, 'vault')
  const ex = exportVault({ db: db10, dir: vdir, minOcc: 1 })
  ok(ex.written === 3, `записаны обе ноты и индекс (получено ${ex.written})`)
  ok(new Set(ex.files).size === ex.files.length, 'имена нот не столкнулись')
  const vfiles = new Set(readdirSync(vdir).map(f => f.replace(/\.md$/, '')))
  ok(vfiles.size === 3, 'на диске столько же файлов, сколько нот - ничего не затерто')
  // Связь в Obsidian ведет по ИМЕНИ ноты. Проверяем обе стороны: индекс и связь урок→урок,
  // иначе подмена имени на id остается незамеченной ровно там, где строится граф.
  const allLinks = readdirSync(vdir).flatMap(f =>
    [...readFileSync(path.join(vdir, f), 'utf8').matchAll(/\[\[([^\]]+)\]\]/g)].map(m => [f, m[1]]))
  ok(allLinks.length >= 3, `связи проставлены (найдено ${allLinks.length})`)
  ok(allLinks.every(([, w]) => vfiles.has(w)), 'все связи ведут на существующие ноты, а не на id из frontmatter')
  ok(allLinks.some(([f, w]) => f.startsWith('Урок') && w.startsWith('Урок')), 'урок ссылается на соседний урок, а не только на индекс')

  // 11г. Сработавший сторож и голый вердикт - не уроки. Иначе база копит повторы работы
  // системы и закрывает ночь долгом, которого нет.
  //
  // Пути в фикстурах намеренно с тильдой: этот файл уезжает в публичное дерево, а
  // абсолютный путь вида /Users/<имя> в отслеживаемом файле - жёсткий блокер ворот
  // выпуска. Проверке форма пути безразлична, воротам - нет.
  // Имя переменной не `guard`: так фикстура затеняла одноимённый прибор подсказки, и его
  // собственные проверки падали на «guard is not a function» - тень вместо беды.
  const guardNoise = [
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'g1', name: 'Bash', input: { command: 'rm -rf /' } }] } }),
    JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'g1', is_error: true, content: 'PreToolUse:Bash hook error: [bash "~/.claude/hooks/bash-guard.sh"]: [bash-guard] BLOCKED опасная команда' }] } }),
    JSON.stringify({ type: 'user', toolUseResult: { stdout: 'ВЕРДИКТ: красный', stderr: '' } }),
    JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'g2', name: 'Bash', input: { command: 'npx playwright test' } }] } }),
    JSON.stringify({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'g2', is_error: true, content: 'Error: Browser "chrome-for-testing" is not installed; expected executable at ~/Library/Caches' }] } }),
  ].join('\n')
  const g = captureTranscript(guardNoise, { session: 'g', project: 'p' })
  ok(g.length === 1, `сторож и пустой вердикт не идут в базу, настоящая беда идёт (снято ${g.length})`)
  ok(/chrome-for-testing/.test(g[0].what), 'снята именно настоящая беда')

  // 12б. Подсказка в момент действия: молчит на пустом и на чужом, говорит на своём и
  // никогда не выдаёт закрытое датой - иначе агента останавливает то, что уже не действует.
  const dbq = path.join(tmp, 'guard.jsonl')
  const q1 = addLesson({ what: 'запись через cat пошла по симлинку и переписала лаунчер', class: 'symlink-write',
    why: 'перенаправление не проверялось', fix: 'проверять test -L перед записью в bin',
    repro: 'cat > /usr/local/bin/tool', project: 'a' }, dbq)
  ok(guard('cat > /opt/homebrew/bin/maestro', { db: dbq }).length === 1, 'урок всплывает на команде своего класса')
  ok(guard('ls', { db: dbq }).length === 0, 'на короткой команде guard молчит')
  ok(guard('npm run build --workspace web', { db: dbq }).length === 0, 'на чужой команде guard молчит')
  ok(/починка: проверять test -L/.test(guardText('cat > /usr/local/bin/tool', { db: dbq })), 'подсказка несёт починку, а не только беду')
  // У обёрток вроде git первое слово не различает ничего: «git add» и «git grep» - разные беды.
  addLesson({ what: 'широкий git add затащил в дерево чужой файл', class: 'add-all',
    why: 'выборочность потерялась', fix: 'коммитить явными путями', repro: 'git add -A', project: 'b' }, dbq)
  addLesson({ what: 'отсутствие доказывали обёрнутым grep', class: 'grep-absence',
    why: 'exit 1 читается как «чисто»', fix: 'git grep или rg -a', repro: 'git grep -n нечто', project: 'c' }, dbq)
  const wide = guard('git add -A && git commit -m fix', { db: dbq })
  ok(wide.length === 1 && wide[0].class === 'add-all', `две буквы «git» не путают беды (пришло ${wide.map(x => x.class).join(', ')})`)
  ok(guard('git grep -n токен', { db: dbq })[0]?.class === 'grep-absence', 'соседняя подкоманда находит свой урок')
    closeLesson(q1.id, 'проверка: закрытое не подсказывается', dbq)
  ok(guard('cat > /opt/homebrew/bin/maestro', { db: dbq }).length === 0, 'закрытый датой урок в подсказке не всплывает')

  // 13. Граф уроков: собирается по журналу, покрывает КАЖДЫЙ активный урок и не тащит
  // закрытые. Граф, который забыл урок, врёт полнотой ровно там, где по нему пойдут.
  const dbg = path.join(tmp, 'graph.jsonl')
  const g1 = addLesson({ what: 'первый урок для графа про ворота', class: 'ворота', project: 'a' }, dbg)
  const g2 = addLesson({ what: 'второй урок для графа про съём', class: 'съём', project: 'b', pin: 'тест', pin_ref: dbg }, dbg)
  const gdir = path.join(tmp, 'graphout')
  const written = writeGraph({ db: dbg, dir: gdir })
  const graph = JSON.parse(readFileSync(path.join(gdir, 'graph.json'), 'utf8'))
  const lessons = graph.nodes.filter(n => n.kind === 'lesson').map(n => n.id)
  ok(lessons.length === 2 && lessons.includes(g1.id) && lessons.includes(g2.id), `граф несёт оба урока (несёт ${lessons.length})`)
  ok(graph.nodes.some(n => n.kind === 'class' && n.label === 'ворота'), 'класс ошибки стал узлом')
  ok(graph.nodes.some(n => n.kind === 'project' && n.label === 'b'), 'проект стал узлом')
  ok(graph.nodes.some(n => n.kind === 'mechanism'), 'механизм закрепления стал узлом')
  ok(graph.links.some(l => l.source === g2.id && l.context === 'закреплено'), 'закреплённый урок связан со своим закреплением')
  ok(graph.links.some(l => l.source === g1.id && l.context === 'не закреплено'), 'незакреплённый урок виден по ребру')
  ok(existsSync(path.join(gdir, 'GRAPH_REPORT.md')), 'сводка графа записана')
  ok(written.nodes === graph.nodes.length, 'отчёт о сборке не расходится с графом')
  // Закрытое из графа уходит: иначе обход выдаёт то, что больше не действует.
  closeLesson(g1.id, 'проверка двувременности в графе', dbg)
  writeGraph({ db: dbg, dir: gdir })
  const after = JSON.parse(readFileSync(path.join(gdir, 'graph.json'), 'utf8'))
  ok(!after.nodes.some(n => n.id === g1.id), 'закрытый датой урок из графа ушёл')
  ok(after.nodes.some(n => n.id === g2.id), 'живой урок в графе остался')

  // 12. Миграция: ни одна запись старого лога не теряется, и это проверено, не обещано.
  const md = path.join(tmp, 'old.md')
  writeFileSync(md, ['## 2026-01-02 · olympuz — первый разбор', '',
    '**Ошибка → правило.** Гейт считал тесты подстрочным фильтром. → **Правило: не доверять форме команды.**', '',
    '**Token-аудит.** Доминанта cache-read 96%.', '',
    '## 03.02.2026 · Фемида: второй разбор', '',
    'Свободный текст без жирного зачина, тоже урок.'].join('\n'))
  const db8 = path.join(tmp, 'migrate.jsonl')
  const m = migrate({ file: md, db: db8 })
  ok(m.sections === 2 && m.records === 3, `разобраны оба раздела и все три записи (${m.sections}/${m.records})`)
  ok(m.lost.length === 0 && m.code === 0, 'ни одна запись не потеряна')
  ok(lostSrcs(parseLessonsMd(readFileSync(md, 'utf8'), { file: 'old.md' }).records, readOps(db8)).length === 0,
     'сверка по диску независимо подтверждает полноту')
  // Обратная сторона: запись, которую записать НЕЛЬЗЯ, обязана быть названа потерей,
  // а не проглочена. Без этой проверки отчет «не потеряно» стоит ноль.
  const md2 = path.join(tmp, 'broken.md')
  writeFileSync(md2, ['## 2026-04-05 · helioz — раздел с битым абзацем', '',
    '**Настоящий урок.** Ворота пропустили пустую пробу.', '', '**   **', ''].join('\n'))
  const db9 = path.join(tmp, 'broken.jsonl')
  const m2 = migrate({ file: md2, db: db9 })
  ok(m2.records === 2 && m2.added === 1, 'разобраны обе записи, записана одна')
  ok(m2.lost.length === 1 && m2.code === 1, 'незаписанная запись названа потерей, а не проглочена')
  ok(m2.failed.length === 1 && /нечего записывать/.test(m2.failed[0].why), 'причина потери названа')
  ok(new Set([...state(db8).L.values()].map(l => l.project)).size === 2, 'проект восстановлен из заголовка раздела')
  ok([...state(db8).L.values()].some(l => /не доверять форме команды/.test(l.fix || '')), 'правило вытащено из текста')

  rmSync(tmp, { recursive: true, force: true })
  console.log('selftest ok - ADD-only, повтор как hit, кросс-проектность, двувременность, схлопывание в правило,')
  console.log('             бюджет, долг и ворота, закрепление с механизмом, фильтр секретов, связи, идемпотентный съем, миграция без потерь, граф уроков')
  return 0
}

// ── CLI ────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const argOf = n => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : null }
const has = n => args.includes(n)
const asJson = has('--json')
const out = (o, code = 0) => { console.log(asJson ? JSON.stringify(o, null, 2) : o); return code }
const cwdProject = () => path.basename(process.cwd())

const HELP = `Койз - дознаватель роя. База уроков всех проектов.

  add       --what "…" [--why …] [--fix …] [--class …] [--project …]
            [--pin hook|deny|прибор|тест|ничем] [--pin-ref <путь>] [--repro "…"]
  capture   --transcript <путь.jsonl> [--project …]   съем машиной с сессии
  ask       "<запрос>" [--class …] [--project …] [--limit N]
  pin       --id <ID> --pin <тип> --pin-ref <путь>      закрепить записанный урок
  next      [--limit N]                                 что закреплять в первую очередь
  close     --id <ID> --why "…"                        закрыть датой (не стереть)
  ack       --id <ID> [--until ГГГГ-ММ-ДД] --why "…"   отсрочить долг с датой
  collapse  [--dry]                                     схлопывание отдельным проходом
  debt                                                  что повторилось и не закреплено
  gate      [--class …]                                 ворота: красит ночь Гелиоза
  guard     --text "<команда или путь>"                 уроки этого класса ПЕРЕД действием
  graph     [--dir …]                                   граф уроков для обхода без модели
  stats · history --id <ID> · export [--dir …] · migrate --file <lessons.md>
  --selftest [--json]

  Журнал: ${DB}   Бюджет: ${BUDGET} активных   Vault: ${VAULT}`

// Команды, которые пишут. После каждой граф пересобирается: правило «не забыть собрать
// граф» текстом исполняется вероятностно, а собранный после записи граф свеж по построению.
const WRITING = new Set(['add', 'capture', 'migrate', 'collapse', 'close', 'ack', 'pin'])

function main() {
  const cmd = args.find(a => !a.startsWith('--')) || (has('--selftest') ? '--selftest' : 'help')
  try {
    switch (cmd) {
      case 'add': {
        const r = addLesson({
          what: argOf('--what'), why: argOf('--why'), fix: argOf('--fix'), class: argOf('--class'),
          project: argOf('--project') || cwdProject(), pin: argOf('--pin'), pin_ref: argOf('--pin-ref'),
          repro: argOf('--repro'), kind: argOf('--kind'),
        })
        const b = enforceBudget({})
        if (asJson) return out({ ...r, budget: b }, b.overflow ? 1 : 0)
        console.log(r.op === 'hit' ? `повтор: ${r.id} (уже ${r.occ} раз) - это кандидат в долг` : `записан ${r.id}${r.links.length ? `, связан с ${r.links.join(', ')}` : ''}`)
        if (b.collapsed) console.log(`бюджет: было ${b.before}, схлопнуто до ${b.after}`)
        return b.overflow ? 1 : 0
      }
      case 'capture': {
        const r = captureSession({ transcript: argOf('--transcript'), project: argOf('--project') || cwdProject() })
        if (r.error) { console.error(r.error); return 2 }
        if (asJson) return out(r)
        console.log(`съем ${r.session}: новых ${r.added.length}, повторов ${r.hits.length}, уже снято ${r.seen}`)
        if (r.added.length) console.log(`  сырье без причины: ${r.added.join(', ')} - агент обязан дознать «почему»`)
        return 0
      }
      case 'ask': {
        const q = args.find(a => !a.startsWith('--') && a !== 'ask') || null
        const r = ask(q, { project: argOf('--project'), cls: argOf('--class'), limit: Number(argOf('--limit') || 10) })
        if (asJson) return out(r)
        if (!r.length) { console.log('в базе такого класса нет'); return 0 }
        for (const x of r) {
          console.log(`${x.id} · ${x.class} · ${x.project} · ${x.occ}× · закреплено: ${x.pin}${x.pin_ref ? ` (${x.pin_ref})` : ''}`)
          console.log(`  ${x.what}`)
          if (x.why) console.log(`  почему: ${x.why}`)
          if (x.fix) console.log(`  починка: ${x.fix}`)
        }
        return 0
      }
      case 'close': return out(closeLesson(argOf('--id'), argOf('--why')))
      case 'pin': {
        const r = pinLesson(argOf('--id'), argOf('--pin'), argOf('--pin-ref'))
        return asJson ? out(r) : (console.log(`${r.id}: закрепление ${r.from} → ${r.pin}`), 0)
      }
      case 'next': {
        const r = nextToPin({ limit: Number(argOf('--limit') || 5) })
        if (asJson) return out(r)
        if (!r.length) { console.log('незакреплённых уроков с дознанной причиной нет'); return 0 }
        console.log(`закрепить в первую очередь (${r.length}):`)
        for (const x of r) {
          console.log(`  ${x.id} · ${x.class} · ${x.occ}× · предлагаю: ${x.suggest}`)
          console.log(`    ${x.what}`)
          if (x.fix) console.log(`    починка: ${x.fix}`)
        }
        return 0
      }
      case 'ack': return out(ackDebt(argOf('--id'), argOf('--until'), argOf('--why')))
      case 'collapse': {
        const r = collapse({ apply: !has('--dry') })
        if (asJson) return out(r)
        console.log(`схлопывание: дублей ${r.dups.length}, правил ${r.rules.length}, было активных ${r.before}, стало ${r.after}`)
        for (const x of r.rules) console.log(`  ${x.id} ← ${x.from.join(' + ')}\n    ${x.text}`)
        return 0
      }
      case 'debt': {
        const d = debts({})
        if (asJson) return out(d, d.length ? 1 : 0)
        if (!d.length) { console.log('долгов нет'); return 0 }
        console.log(`долгов: ${d.length} - повторилось и не закреплено ничем:`)
        for (const x of d) console.log(`  ${x.class} · ${x.occ}× · ${x.projects.join(', ')} · ${x.ids.join(', ')}`)
        return 1
      }
      case 'gate': {
        const g = gate({ cls: argOf('--class') })
        if (asJson) return out(g, g.code)
        console[g.code ? 'error' : 'log'](`койз: ${g.msg}`)
        for (const d of g.debts || []) console.error(`  · ${d.class} · ${d.occ}× · ${d.projects.join(', ')}`)
        if (g.code === 1) console.error('  закрепить механизмом (koiz add --pin …) либо отсрочить с датой (koiz ack --id … --until …)')
        return g.code
      }
      case 'stats': return out(stats({}))
      case 'history': return out(history(argOf('--id')))
      case 'export': {
        const r = exportVault({ dir: argOf('--dir') || VAULT })
        if (asJson) return out(r)
        console.log(`Мнемозина: ${r.written} нот в ${r.dir}`)
        return 0
      }
      case 'migrate': {
        const r = migrate({ file: argOf('--file') })
        if (r.error) { console.error(r.error); return 2 }
        if (asJson) return out(r, r.code)
        console.log(`миграция ${r.file}: разделов ${r.sections}, записей ${r.records}, новых ${r.added}, повторов ${r.hits}`)
        if (r.lost.length) { console.error(`ПОТЕРЯНО ${r.lost.length}: ${r.lost.slice(0, 5).join(', ')}`); return 1 }
        console.log('не потеряно ни одной записи (сверка по src каждой)')
        return 0
      }
      case 'guard': {
        const text = argOf('--text') || args.find(a => !a.startsWith('--') && a !== 'guard') || ''
        const hits = guard(text)
        if (asJson) return out(hits)
        if (hits.length) console.log(guardText(text))
        return 0
      }
      case 'graph': {
        const r = writeGraph({ dir: argOf('--dir') || GRAPH_DIR })
        return asJson ? out(r) : (console.log(`граф уроков: ${r.nodes} узлов, ${r.links} рёбер в ${r.dir}`), 0)
      }
      case '--selftest': return selftest()
      default: console.log(HELP); return 0
    }
  } catch (e) {
    console.error(`койз: ${e.message}`)
    return 1
  }
}

// Запуск ли это прибора или импорт его как модуля. Сравнивать надо РЕАЛЬНЫЕ пути:
// /tmp на macOS - симлинк на /private/tmp, и прямое сравнение строк давало ложное «меня
// импортировали» - прибор молча выходил нулем, ничего не сделав. Поймано мутационными
// воротами 06.09.2026: все 16 мутаций «выжили», потому что селфтест не запускался вовсе.
const runAsTool = () => {
  try { return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(process.argv[1] || '') }
  catch { return false }
}
if (runAsTool()) {
  const code = main()
  // Граф пересобирается ПОСЛЕ записи и не может её сорвать: беда графа не отменяет
  // записанный урок, поэтому она печатается предупреждением, а не роняет команду.
  if (WRITING.has(args.find(a => !a.startsWith('--')) || '')) {
    try { writeGraph({}) } catch (e) { console.error(`койз: граф не пересобран — ${e.message}`) }
  }
  process.exit(code)
}
