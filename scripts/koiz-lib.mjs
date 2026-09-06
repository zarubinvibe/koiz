// Чистые функции Койза: нормализация, отпечаток, похожесть, фильтр секретов.
// Здесь нет ни диска, ни сети, ни состояния - поэтому это единственное место,
// которое можно судить селфтестом построчно, и его судят.

// Класс ошибки - ключ базы. Не имя репозитория: одна и та же беда в трёх проектах
// должна лечь в один класс, иначе кросс-проектность не работает по построению.
export const kebab = s => String(s || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 60)

// Стоп-слова выкидываем до сравнения: без них «не найден файл конфигурации» и
// «файл конфигурации не найден» - одно и то же, а с ними - разное.
const STOP = new Set(['и','в','на','с','по','из','что','это','для','не','а','но','же','ли','бы',
  'the','a','an','to','of','in','is','it','at','for','and','or','not','no'])

export const tokens = s => [...new Set(String(s || '')
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .split(' ')
  .filter(w => w.length > 2 && !STOP.has(w)))]

// Огрубление вместо стеммера: «установлено», «установку» и «установка» - одно слово для
// сравнения, но разные слова в тексте урока. Замерено: запрос «браузер не установлен» не
// находил урок, где написано «браузерный стек» и «на установку» - выдача врала пустотой.
// Полноценная морфология сюда не нужна: пять первых букв закрывают падежи и склонения,
// а стеммер - это зависимость, которой у приборов семейства нет.
export const stem = w => (w.length > 5 ? w.slice(0, 5) : w)
const stems = t => new Set(tokens(t).map(stem))

// Доля слов запроса, попавших в текст. В отличие от Жаккара не штрафует за длину второй
// стороны - именно это нужно, когда короткий запрос сверяют с классом урока.
export function covers(query, target) {
  const Q = stems(query), T = stems(target)
  if (!Q.size) return 0
  let hit = 0
  for (const t of Q) if (T.has(t)) hit++
  return hit / Q.size
}

export function jaccard(a, b) {
  const A = stems(a), B = stems(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const t of A) if (B.has(t)) inter++
  return inter / (A.size + B.size - inter)
}

// Отпечаток: та же ошибка с другими путями, числами и хешами обязана дать тот же
// отпечаток, иначе повтор не будет виден как повтор и долг никогда не всплывет.
export function normalize(text) {
  return String(text || '')
    .replace(/\S*\/\S*/g, '/PATH')
    .replace(/\b[0-9a-f]{7,64}\b/gi, 'HEX')
    .replace(/\b\d+(\.\d+)?\b/g, 'N')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export const fp = text => {
  const h = String(normalize(text))
  let x = 0n
  for (const ch of h) x = (x * 131n + BigInt(ch.codePointAt(0))) % (2n ** 64n)
  return x.toString(16).padStart(16, '0').slice(0, 12)
}

// Фильтр секретов. Уроки несут пути, куски команд и вывод - там встречаются ключи.
// Правило владельца: секрет не ложится ни в код, ни в git, ни в базу. Режем на записи,
// а не при выдаче: то, чего в файле нет, не утечет ни через какой канал.
const SECRETS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '***PRIVATE-KEY***'],
  [/sk-ant-[A-Za-z0-9_-]{12,}/g, 'sk-ant-***'],
  [/\bsk-[A-Za-z0-9]{20,}/g, 'sk-***'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}/g, 'gh_***'],
  [/\bglpat-[A-Za-z0-9_-]{12,}/g, 'glpat-***'],
  [/\bAKIA[0-9A-Z]{16}\b/g, 'AKIA***'],
  [/\bxox[baprs]-[A-Za-z0-9-]{12,}/g, 'xox-***'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}/g, 'jwt.***'],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi, 'Bearer ***'],
  [/((?:password|passwd|pwd|secret|token|api[_-]?key|access[_-]?key)\s*[=:]\s*)["']?[^\s"',;)]{6,}/gi, '$1***'],
]

export function redact(text) {
  let out = String(text ?? '')
  for (const [re, to] of SECRETS) out = out.replace(re, to)
  return out
}

export const PINS = ['hook', 'deny', 'прибор', 'тест', 'ничем']

// Развернуть ~ в домашний путь: закрепление называют человеческим путем.
export const expand = p => String(p || '').replace(/^~(?=\/|$)/, process.env.HOME || '')
