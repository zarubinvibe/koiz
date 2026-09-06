// Съём: машина берет с диска то, что видно без агента. Транскрипт сессии и старый
// рукописный лог уроков - два входа, оба разбираются детерминированно.
//
// Граница проведена жестко: здесь НЕ рождается «почему». Машина видит, ЧТО упало,
// сколько раз и какой командой; причину знает только тот, кто там был. Поэтому все,
// что отсюда выходит, ложится в базу с пустым `why` и закреплением «ничем» - сырьем,
// которое агент обязан довести до урока.
import { kebab, normalize, fp, redact, tokens } from './koiz-lib.mjs'

const text = c => {
  if (typeof c === 'string') return c
  if (Array.isArray(c)) return c.map(b => (typeof b === 'string' ? b : b?.text || '')).join(' ')
  return ''
}

// Класс из текста ошибки: первые значимые слова нормализованного текста.
// Числа, пути и хеши нормализация уже съела, поэтому класс устойчив к месту падения.
//
// Служебные слова разбора («ошибка», «правило», «системное») выброшены отдельно, и это
// не косметика: без этого «**Ошибка → системное правило.**» из трех разных бед дает ОДИН
// класс, три несвязанные записи слипаются в мнимый повтор и поднимаются ложным долгом.
// Замерено на переносе старого лога 06.09.2026: три ложных долга из трех.
const META = new Set(['ошибка', 'ошибки', 'урок', 'уроки', 'правило', 'правила', 'системное',
  'системные', 'системный', 'причина', 'причины', 'починка', 'фикс', 'аудит', 'вывод', 'итог',
  'сессия', 'сессии', 'сессию', 'наблюдение', 'заметка', 'случай', 'случая', 'случаев'])

export function classOf(t) {
  const all = tokens(normalize(t))
  const meaty = all.filter(w => !META.has(w))
  // Если после чистки почти ничего не осталось, служебные слова возвращаем: класс из
  // одного слова хуже, чем класс со служебным словом, а «без-класса» - хуже обоих.
  const pick = (meaty.length >= 3 ? meaty : [...meaty, ...all.filter(w => !meaty.includes(w))]).slice(0, 5)
  return kebab(pick.join(' ')) || 'без-класса'
}

// Пробел после FAIL и регистр - оба значимы. `FAIL ` это маркер прибора, а `fail=0` -
// переменная счетчика в выводе того же прибора: со `\b` и флагом /i съем принял ее за
// провал и записал ложный урок (замерено на живой сессии 06.09.2026, запись закрыта датой).
const MARKERS = /(^|\n)\s*(красный:|FAIL\s|ВЕРДИКТ: красный|🛑|[а-яa-z]+: \d+ дыр|selftest: )/

// Сработавший сторож - не провал, а работа системы. Блок хука («PreToolUse:Bash hook
// error: ... BLOCKED»), запрет гарнесса и голый вердикт без текста несут ноль знания, но
// умеют накопить повторы и закрыть ночь долгом на ровном месте. Замерено 06.09.2026:
// пять первых долгов живой базы - четыре сторожа и один пустой «ВЕРДИКТ: красный».
const NOISE = /hook error:[\s\S]*(BLOCK|БЛОК)|<tool_use_error>\s*Blocked:|^\s*Blocked: /i

// Улика без содержания уликой не является: «ВЕРДИКТ: красный» повторится сто раз и
// ничему не научит. Порог - три значимых слова: ниже отсекается голый вердикт, выше
// начали бы теряться настоящие короткие отказы вроде «красный: план не по схеме».
const THIN = t => tokens(normalize(t)).length < 3

// Транскрипт сессии Claude Code (jsonl). Берем три класса улик:
//   1) отказ инструмента (tool_result с is_error) - прямой провал;
//   2) отказ ворот в выводе Bash - провал прибора, а не инструмента;
//   3) одна и та же команда, исполненная трижды - трата, которую агент не заметил.
export function captureTranscript(raw, { session = 'сессия', project = 'неизвестно', limit = 8 } = {}) {
  const uses = new Map()
  const found = new Map()
  const cmds = new Map()

  const push = (kind, what, repro, tool) => {
    if (NOISE.test(String(what)) || THIN(what)) return
    const key = fp(what)
    const prev = found.get(key)
    if (prev) { prev.count++; return }
    found.set(key, {
      kind, class: classOf(what), fp: key, count: 1, tool: tool || null,
      what: redact(String(what).replace(/\s+/g, ' ').trim()).slice(0, 300),
      repro: repro ? redact(String(repro).replace(/\s+/g, ' ').trim()).slice(0, 200) : null,
      project, session,
    })
  }

  for (const line of String(raw).split('\n')) {
    if (!line.trim()) continue
    let d
    try { d = JSON.parse(line) } catch { continue }
    const blocks = Array.isArray(d?.message?.content) ? d.message.content : []
    for (const b of blocks) {
      if (b?.type === 'tool_use') {
        const cmd = b.input?.command || b.input?.file_path || b.input?.pattern || ''
        uses.set(b.id, { name: b.name, cmd })
        if (b.name === 'Bash' && cmd) {
          const k = normalize(cmd)
          cmds.set(k, { n: (cmds.get(k)?.n || 0) + 1, cmd })
        }
      }
      if (b?.type === 'tool_result' && b.is_error) {
        const u = uses.get(b.tool_use_id) || {}
        push('провал инструмента', text(b.content) || 'ошибка без текста', u.cmd, u.name)
      }
    }
    const tr = d?.toolUseResult
    if (tr && typeof tr === 'object') {
      const out = `${tr.stdout || ''}\n${tr.stderr || ''}`
      if (MARKERS.test(out)) {
        const hit = out.split('\n').find(l => MARKERS.test(`\n${l}`)) || ''
        push('отказ ворот', hit, null, 'Bash')
      }
    }
  }

  for (const { n, cmd } of cmds.values()) {
    if (n >= 3) push('повтор команды', `одна команда исполнена ${n} раз подряд: ${cmd}`, cmd, 'Bash')
  }

  return [...found.values()].sort((a, b) => b.count - a.count).slice(0, limit)
}

const DATE = t => {
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`
  const ru = t.match(/(\d{2})\.(\d{2})\.(\d{4})/)
  if (ru) return `${ru[3]}-${ru[2]}-${ru[1]}`
  return null
}

// Имя проекта в заголовке пишут как придется - и латиницей, и кириллицей, и никак.
// Ищем известные дома по словарю: класс ошибки важнее проекта, но проект нужен для
// доказательства кросс-проектности, поэтому угадывать его наугад нельзя.
const HOMES = [
  ['olympuz', /olympuz|олимп/i], ['adventure-book', /adventure|adventure-book/i],
  ['helioz', /helioz|гелиоз/i], ['themis', /themis|фемид/i], ['mnemazine', /mnemaz|мнемаз/i],
  ['koiz', /\bkoiz\b|койз/i], ['iriz', /\biriz\b|ирис/i], ['metiz', /metiz|метиз/i],
  ['claude-os', /claude|конституц|правил/i],
]
const PROJECT = t => (HOMES.find(([, re]) => re.test(t)) || ['разное'])[0]

// Зачин абзаца в старом логе часто служебный - «Ошибка → правило», «Token-аудит».
// Такой зачин классом быть не может: он один на десятки разных бед и склеил бы их в
// одну кучу. Служебный зачин отбрасываем и берем первую содержательную фразу.
// Не всякая запись старого лога - провал. Токен-аудит, роутинг и заметки о владельце -
// наблюдения: у них нет причины, которую можно закрыть механизмом, и долгом они быть
// не могут. Иначе ворота красит расход токенов, а это не беда, а факт.
const OBSERVE = /(token|аудит|расход|доминант|routing|владельц|что сработало|подтвердилось|экономия)/i

const GENERIC = /^(ошибк|урок|правил|систем|причин|token|расход|routing|что |про |инцидент|оптимизац|вывод|итог|сработал|данные|наблюден|заметк|аудит|подтвердил|перв|втор|трет|четв|пят|\\d+[.)]|[-—·])/i

function leadOf(txt) {
  const head = (txt.match(/^\*\*([^*]+)\*\*/) || txt.match(/^### (.+)/) || [])[1] || txt.split('\n')[0]
  if (!GENERIC.test(head.trim())) return head.trim()
  const rest = txt.replace(/^\*\*[^*]+\*\*:?\s*/, '').replace(/^### .+\n/, '').replace(/\s+/g, ' ').trim()
  // Первое ПРЕДЛОЖЕНИЕ, а не первый обрывок: в старом логе абзац часто начинается с
  // номера списка («1.»), и без этого фильтра классом становится «ошибки-правила-1».
  const first = rest.split(/(?<=[.!?])\s/).find(x => tokens(x).length >= 4) || rest
  return (head.trim() + ' ' + first).replace(/\s+/g, ' ').slice(0, 220)
}

// Кусок «причина → правило» из рукописного лога. Разметка там свободная, поэтому
// разбираем по маркерам, а что не разобралось - кладем целиком в `what`: терять нельзя.
const AFTER = (body, res) => {
  for (const re of res) {
    const m = body.match(re)
    if (m) return m[1].replace(/\s+/g, ' ').trim().slice(0, 400)
  }
  return null
}

// Старый лог самообучения. Единица переноса - абзац с жирным зачином, а если их в
// разделе нет - весь раздел. Возвращаем еще и перепись разделов: миграция обязана
// доказать, что ни один не потерян, а не заявить это.
export function parseLessonsMd(raw, { file = 'lessons.md' } = {}) {
  const lines = String(raw).split('\n')
  const heads = []
  lines.forEach((l, i) => { if (/^## /.test(l)) heads.push({ line: i + 1, title: l.slice(3).trim() }) })

  const out = []
  heads.forEach((h, hi) => {
    const from = h.line
    const to = hi + 1 < heads.length ? heads[hi + 1].line - 1 : lines.length
    const body = lines.slice(from, to)
    const marks = []
    body.forEach((l, i) => { if (/^\*\*/.test(l) || /^### /.test(l)) marks.push(i) })
    const chunks = marks.length
      ? marks.map((m, i) => ({ at: from + m + 1, txt: body.slice(m, i + 1 < marks.length ? marks[i + 1] : body.length).join('\n') }))
      : [{ at: from, txt: body.join('\n') }]

    for (const c of chunks) {
      const txt = c.txt.trim()
      if (!txt) continue
      const lead = leadOf(txt)
      const why = AFTER(txt, [/\*\*Причина:?\*\*:?\s*([^\n]+)/i, /[-—·]\s*\*\*Причина:?\*\*\s*([^\n]+)/i, /Причина:\s*([^\n]+)/i])
      const fix = AFTER(txt, [/→\s*\*\*(?:Системное\s+)?[Пп]равило:?\*\*:?\s*([\s\S]{0,400}?)(?:\n\n|$)/,
        /\*\*Системное правило:?\*\*:?\s*([^\n]+)/i, /[Пп]равило:\s*([^\n]+)/, /→\s*([^\n]+)/])
      out.push({
        kind: OBSERVE.test(lead) ? 'наблюдение' : 'урок',
        class: classOf(lead),
        fp: fp(lead + ' ' + (why || '')),
        project: PROJECT(h.title),
        date: DATE(h.title),
        what: redact(lead).replace(/\s+/g, ' ').trim().slice(0, 300),
        body: redact(txt).slice(0, 1500),
        why: why ? redact(why) : null,
        fix: fix ? redact(fix) : null,
        src: `${file}:${c.at}`,
        section: h.title,
      })
    }
  })
  return { records: out, sections: heads.map(h => h.title) }
}
