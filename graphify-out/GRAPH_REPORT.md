# Graph Report - zarubinvibe__koiz  (2026-09-07)

## Corpus Check
- 25 files · ~1,043,766 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 294 nodes · 436 edges · 24 communities (22 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d921af66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]

## God Nodes (most connected - your core abstractions)
1. `selftest()` - 25 edges
2. `main()` - 24 edges
3. `addLesson()` - 18 edges
4. `state()` - 16 edges
5. `collapse()` - 15 edges
6. `Koiz` - 14 edges
7. `Koiz` - 14 edges
8. `Койз` - 14 edges
9. `active()` - 11 edges
10. `debts()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `addLesson()` --calls--> `redact()`  [EXTRACTED]
  scripts/koiz.mjs → scripts/koiz-lib.mjs
- `addLesson()` --calls--> `kebab()`  [EXTRACTED]
  scripts/koiz.mjs → scripts/koiz-lib.mjs
- `addLesson()` --calls--> `classOf()`  [EXTRACTED]
  scripts/koiz.mjs → scripts/koiz-capture.mjs
- `addLesson()` --calls--> `fp()`  [EXTRACTED]
  scripts/koiz.mjs → scripts/koiz-lib.mjs
- `collapse()` --calls--> `jaccard()`  [EXTRACTED]
  scripts/koiz.mjs → scripts/koiz-lib.mjs

## Communities (24 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (49): ackDebt(), active(), activeRules(), addLesson(), argOf(), args, asJson, ask() (+41 more)

### Community 1 - "Community 1"
Cohesion: 0.14
Nodes (17): captureTranscript(), classOf(), HOMES, META, text(), THIN(), covers(), fp() (+9 more)

### Community 2 - "Community 2"
Cohesion: 0.1
Nodes (20): 目录, 第 1 步：采集失败, 快速开始, 简单对比, 简单词汇, 安全与隐私, 局限, 第 2 步：追出原因 (+12 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (20): code:bash (git clone https://github.com/zarubinvibe/koiz.git), Contents, How It Works, Koiz, License, Limits, Olympuz family, Quickstart (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.1
Nodes (20): Койз, Шаг 1: Съем провала, Быстрый старт, Простое сравнение, Простые слова, Безопасность и приватность, Ограничения, Шаг 2: Дознание причины (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (14): code:bash (node --version), code:bash (git clone https://github.com/zarubinvibe/koiz.git && cd koiz), code:bash (node scripts/koiz.mjs --selftest), code:bash (node scripts/koiz.mjs migrate --file ~/.claude/self-learning), code:bash (node scripts/koiz.mjs capture --transcript ~/.claude/project), code:bash (node scripts/koiz.mjs ask "what the lesson was about"), Getting Started In Chat, How To Use This (+6 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (14): Знакомство в чате, Шаг 1: смотрю, что уже есть на машине, Шаг 2: забираю дом, Как этим пользоваться, Шаг 3: проверяю, что приборы не врут, Шаг 4: завожу базу уроков, Шаг 5: ставлю съем на закрытие сессии, Шаг 6: спрашиваем базу и смотрим долги (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.18
Nodes (10): 第 1 步：先看清楚我们站在哪里, 第 2 步：决定教训库放在哪里, 第 3 步：把采集挂到会话结束上, 第 4 步：如果有旧教训，就搬过来, 第 5 步：写下第一条教训，并把闸门装上, code:bash (node --version), code:bash (bash install.sh), code:bash (node scripts/koiz.mjs migrate --file ~/.claude/self-learning) (+2 more)

### Community 8 - "Community 8"
Cohesion: 0.2
Nodes (9): 采集便宜、确定，而且只由机器做, 存储只追加, 归并是单独的、有意识的一趟, 固定，是工具和日记的分界, 闸门把库变成压力, 一份库，所有项目, 装了之后系统里多了什么, 为什么自检值得信 (+1 more)

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (8): 参与贡献, 新逻辑要带上自己的变异, 风格, 会被拒绝的改动, 刻字用的字体, 流程, code:bash (node scripts/koiz.mjs --selftest     # 仪器的逻辑), 开 Pull Request 之前

### Community 10 - "Community 10"
Cohesion: 0.22
Nodes (8): Before you open the Pull Request, code:bash (node scripts/koiz.mjs --selftest     # the logic of the inst), Contributing, New logic arrives with its mutation, Style, The carving font, The path, What will be refused

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (8): Как помочь проекту, Новая логика приходит со своей мутацией, Стиль, Что будет отклонено, Шрифт резьбы, Путь, code:bash (node scripts/koiz.mjs --selftest     # логика прибора), Перед тем как открыть Pull Request

### Community 12 - "Community 12"
Cohesion: 0.22
Nodes (8): Доктрина (нарушение = откат правки, не спор), Инварианты (живут в селфтесте, не в прозе), Проверка перед любой правкой, Стиль, Онбординг в чате, Публикация, code:bash (node scripts/koiz.mjs --selftest     # логика прибора), Koiz - правила репозитория

### Community 13 - "Community 13"
Cohesion: 0.22
Nodes (8): Как работает Койз, Хранение только дописывает, Схлопывание идет отдельным осознанным проходом, Закрепление отличает инструмент от дневника, Ворота превращают базу в давление, Одна база на все проекты, Почему селфтесту можно верить, Съем дешевый, детерминированный и машинный

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (8): Capture is cheap, deterministic and machine-only, Collapse is a separate, deliberate pass, How Koiz works, One base, every project, Pinning is what makes this a tool rather than a diary, Storage appends and never rewrites, The gate turns the base into pressure, Why the self-test is trusted

### Community 15 - "Community 15"
Cohesion: 0.25
Nodes (7): bad, json, MUTS, p, results, SRC, tmp

### Community 16 - "Community 16"
Cohesion: 0.29
Nodes (6): Безопасность и приватность, Что уходит с вашей машины, Секреты, Что прибор делает с вашей системой, Куда писать о найденной дыре, Что Койз хранит

### Community 17 - "Community 17"
Cohesion: 0.29
Nodes (6): 安全与隐私, 什么会离开你的机器, 密钥, 仪器会对你的系统做什么, 发现漏洞往哪里写, Koiz 保存什么

### Community 18 - "Community 18"
Cohesion: 0.29
Nodes (6): Reporting a hole, Secrets, Security and privacy, What Koiz keeps, What leaves your machine, What the instrument can do to your system

### Community 19 - "Community 19"
Cohesion: 0.4
Nodes (4): 上手引导：第一次运行，一步一步来, 怎么更新, 如果它有用, code:bash (node scripts/koiz.mjs add --what "脚本顺着符号链接走，把启动器覆盖了" \)

### Community 20 - "Community 20"
Cohesion: 0.4
Nodes (4): code:bash (node scripts/koiz.mjs add --what "a script followed a symlin), If it helps, Onboarding: the first run, step by step, Staying current

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (4): Онбординг: первый запуск по шагам, Как обновляться, Если пригодилось, code:bash (node scripts/koiz.mjs add --what "скрипт пошел по симлинку и)

## Knowledge Gaps
- **160 isolated node(s):** `BUDGET`, `GUARD_SCORE`, `COMMON_TOOLS`, `args`, `asJson` (+155 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `BUDGET`, `GUARD_SCORE`, `COMMON_TOOLS` to the rest of the system?**
  _160 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 4` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Community 5` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._