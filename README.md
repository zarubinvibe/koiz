# Koiz

Koiz keeps one lesson base for every project, and the work stops while the cause of a failure has no mechanism closing it.

[Русский](README.ru.md) · [中文](README.zh.md)

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE) [![Stars](https://img.shields.io/github/stars/zarubinvibe/koiz?style=flat&color=C9A87A)](https://github.com/zarubinvibe/koiz/stargazers) [![Status](https://img.shields.io/badge/status-in%20use-brightgreen.svg)](https://github.com/zarubinvibe/koiz) [![Olympuz](https://img.shields.io/badge/olympuz-family-B8D6EA.svg)](https://github.com/zarubinvibe/athena#olympuz-family)

<p align="center"><img src="docs/assets/pantheon/hero.png" alt="White marble Koios beside a classical column, the axis rod upright in his right hand and a gold pin driven through the open marble ledger on his palm, blue paths converging at his feet in daylight" width="100%"></p>

<!-- owner-welcome:start -->

> Hi. I am Fil.
>
> I built Koiz after stepping on the same rake in a third project in a row. The lesson had been written down. It sat in another repository, in another log, and nobody read it in time.
>
> Try it. If it breaks, write in Issues, I read them. If it helps, leave a star and show it to somebody who runs several projects at once. The rest of the Olympuz projects live here: https://zarubinvibe.com
>
> — Filipp Zarubin

<!-- owner-welcome:end -->

## Contents

- [What This Is](#what-this-is)
- [Why It Helps](#why-it-helps)
- [The Main Advantage](#the-main-advantage)
- [How It Works](#how-it-works)
- [Quickstart](#quickstart)
- [Simple Comparison](#simple-comparison)
- [Simple Words](#simple-words)
- [Safety And Privacy](#safety-and-privacy)
- [Limits](#limits)
- [Star And Contribute](#star-and-contribute)

<!-- beginner-readme:start -->

## What This Is

Koiz is a shared lesson base for all of your projects. One journal, one search key, one discipline.

A lesson arrives as a breakdown, not as a retelling: what broke, how to reproduce it, why it happened, and what closes it. That last field carries the weight. While it says "nothing", the lesson is unfinished.

## Why It Helps

A mistake is rarely new. It already happened, in another project, six months ago, and the conclusion was written down then. The note sits in that project's log while your hands are in a different repository today, and nobody remembers the note exists.

Then it gets worse. Lessons pile up, duplicates never merge, stale ones are never marked. In a year that is a wall of text nobody reads, which means it is not there at all.

## The Main Advantage

**Main advantage:** a lesson is closed by a mechanism, not by good intentions.

**Why this is better:** A rule written in prose gets read, agreed with, and quietly ignored. A mechanism gives no advice: a hook, a deny rule, an instrument or a test simply refuses to let the thing happen twice. Koiz demands the name of that mechanism when the lesson is written, and turns the gate red when an unpinned lesson shows up a second time.

## How It Works

The work runs in stages. The machine takes what the disk can prove, the agent adds only meaning, and pinning is checked apart from writing.

<!-- workflow-diagram:start -->

<p align="center"><img src="docs/assets/pantheon/takt-en.png" alt="Five marble plates in a row, each carved with one stage of the work, linked by a gold thread that comes in from the left edge" width="100%"></p>

<!-- workflow-diagram:end -->

| Stage | What happens |
|---|---|
| 1. Capture | The machine lifts the failure off the disk when the session closes, with nothing typed by hand. |
| 2. Cause | The agent adds the one thing the machine cannot know: why it happened. |
| 3. Pin | The lesson is tied to a mechanism that makes the repeat impossible. |
| 4. Collapse | Similar lessons merge into one rule in a pass of their own. |
| 5. Gate | An unpinned repeat stops the work instead of staying a note. |

### Step 1: Capture the failure

A `SessionEnd` hook hands the instrument the transcript of the session that just closed. The instrument takes only what the disk can prove: failed commands, exit codes, refused gates, the number of attempts.

The watchdog doing its job is not a failure. A blocker that fired, and any piece of evidence shorter than three meaningful words, never reach the base. Otherwise the debt would turn the gate red over nothing.

<p align="center"><img src="docs/assets/pantheon/stage-capture.png" alt="A marble table with a stack of thin marble sheets and blue paths arriving at it from the left edge" width="100%"></p>

**You get:** draft lessons collected without a single line typed by hand.

### Step 2: Find the cause

A captured draft has an empty "why". Until the cause is found, the lesson is unfinished and does not go out as ready.

The order matters and does not work in reverse. The machine takes the facts, a person or an agent adds the meaning. An agent that guesses facts writes convincing untruth.

<p align="center"><img src="docs/assets/pantheon/stage-cause.png" alt="Koios with the axis rod raised, looking down at the open marble ledger resting on his palm" width="100%"></p>

**You get:** a lesson with a cause instead of a description of the symptom.

### Step 3: Pin it to a mechanism

The pin field takes five values: `hook`, `deny`, an instrument, a test, and "nothing". Home-made values are refused, and a pin without a reference to a file or a command is not accepted at all.

"Nothing" is a legal value and an honest admission. It says the mechanism does not exist yet, and it is exactly what later raises the lesson as a debt.

<p align="center"><img src="docs/assets/pantheon/stage-pin.png" alt="A gold pin driven straight through the page of an open marble ledger, its head standing above the page" width="100%"></p>

**You get:** a record where you can see what closes the repeat.

### Step 4: Collapse into a rule

Merging on write is expensive and loses data, so it moved into a separate command. `collapse` finds three similar lessons, proposes a shared rule, and shows exactly what it merges.

A stale lesson is never erased. It is closed by date and stays in history. It is not a lie, it simply stopped applying.

<p align="center"><img src="docs/assets/pantheon/stage-collapse.png" alt="Three thin marble sheets converging into one thicker sheet on a marble table" width="100%"></p>

**You get:** one rule instead of three records, and a base that does not grow forever.

### Step 5: The gate holds the work

The `gate` command exits non-zero when a lesson came back and is still pinned to "nothing". In the owner's house that command stands in the nightly run, and it has already stopped it.

There are two ways out and both are honest: close it with a mechanism, or admit the rule does not work and close it by date. A deferral needs a date and a reason.

<p align="center"><img src="docs/assets/pantheon/stage-gate.png" alt="An upright marble plate with a clean rectangular opening cut through it, standing on a marble table" width="100%"></p>

**You get:** a repeat nobody can walk past in silence.

## Quickstart

You need Git, Node 20 or newer, and any one of three ways in: Claude Code, Codex CLI, or a plain terminal.

```bash
git clone https://github.com/zarubinvibe/koiz.git
cd koiz
bash install.sh

# без git, одним архивом:
curl -L https://github.com/zarubinvibe/koiz/archive/refs/heads/main.zip -o koiz.zip

# дальше открывайте, чем привычнее:
claude          # Claude Code: скажите /koiz-setup, установка пройдет разговором
codex           # Codex CLI: правила проекта уже лежат в AGENTS.md
code .          # VS Code: агент открывается внутри редактора
```

The three lines above are the whole install. `bash install.sh` creates the base and puts capture on session close, asking before every step. It needs no agent: a terminal is enough.

**Claude Code.** Run `claude` in this folder and say `/koiz-setup`. The install goes as a conversation, one question at a time.

**Codex CLI.** Run `codex` in the same place. The project rules already sit in `AGENTS.md`.

**No agent at all.** `node scripts/koiz.mjs ask "what has broken before"` shows what the base knows about your question and installs nothing.

Never done this before? [The onboarding](docs/ONBOARDING.md) walks the whole first run step by step and says what you see after every command.

**You get:** the base exists, capture runs on session close, and `node scripts/koiz.mjs debt` shows which lesson came back with nothing holding it.

## Simple Comparison

| Choice | What it is | Where lessons live | Reaches other projects | Demands a mechanism | Stops the work | Price |
|---|---|---|---|---|---|---|
| **Koiz** | A lesson base with mandatory pinning | One journal on your own disk | Yes, the key is the error class, not the repository name | Yes, the pin field is required | Yes, an unpinned repeat turns the gate red | Own tool, free |
| Writing it up by hand | A note after a bad session | Wherever you wrote it | No | No | No | Your hours, every time |
| `CLAUDE.md` and `AGENTS.md` | A rule as prose in the repository | In the project where it was written | No, the file lives in one tree | No | No | Free |
| Cursor Rules | Editor rules handed to the agent | In the project settings | No | No | No | Part of the subscription |
| mem0 | Agent memory for facts and preferences | Its own store or the cloud | Yes, if the projects share one memory | No | No | Open source, cloud is paid |
| Letta | An agent with memory and a bounded context block | Its own database | Partly | No | No | Open source |
| Zep and Graphiti | A memory graph where facts carry validity intervals | Its own service | Yes | No | No | Open source, cloud is paid |

Names belong to their owners. The table describes purpose, not a benchmark: other products change, and this page does not speak for them.

## Simple Words

| Word | Simple meaning |
|---|---|
| Repository | The project folder that Git stores and versions |
| Terminal | The window where you type commands |
| Command | One instruction you give the computer |
| Branch | A separate line of changes that does not touch `main` |
| Pull Request | A request to review your change and accept it |
| Lesson | One failure taken apart: the cause and the mechanism that closes the repeat |
| Pin | The named mechanism, a hook, a deny rule, an instrument or a test, that makes the repeat impossible |
| Collapse | A separate pass that merges similar lessons into one rule |

## Safety And Privacy

- Every lesson stays on your disk, in one file. Nothing leaves the machine: the instrument has no network and no dependencies.
- The secret filter sits on the write, not on the read. Tokens, keys and private keys are cut before the line reaches the journal.
- The base lives outside the project repository. Lessons carry paths and names from other people's work, and a public tree is the wrong place for them.
- The journal only appends. A wrong record is closed by date and stays in history together with the reason it was closed.
- The instrument runs from source with nothing installed: three files on bare Node.
- Capture reads the session transcript on your own machine and copies it nowhere.

What actually lands in the base and where to report a hole: [SECURITY.md](SECURITY.md).

## Limits

Status: in use every day. The owner's base holds more than eighty active lessons, and the gate stands in the nightly run, where it has already stopped the night on an unpinned repeat.

- A repeat is caught by the fingerprint of machine capture. Two lessons written as prose about the same thing in different words will not be merged.
- The cause is written by a person or an agent. The machine takes only what the disk shows: an exit code, a failed command, a refused gate.
- Collapse proposes a rule and leaves the decision to you: the merge runs as a separate pass and shows exactly what it merges.
- Capture is proven on Claude Code transcripts. Other agent CLIs write their journals differently and need their own reader.
- Windows is not tested yet.

Deeper: [the onboarding](docs/ONBOARDING.md) walks the first run step by step, and [how it works](docs/HOW-IT-WORKS.md) takes every stage apart.

## Star And Contribute

Useful? Give Koiz a star: [https://github.com/zarubinvibe/koiz](https://github.com/zarubinvibe/koiz). It takes a second and it decides whether other people ever find the project.

Want to change something? The path is short: fork the repository, create a branch, commit your change, push the branch, then open a Pull Request. Do not push directly to `main`; the release gate rejects it.

Found a problem instead? Open an issue at [https://github.com/zarubinvibe/koiz/issues](https://github.com/zarubinvibe/koiz/issues) and say what you ran and what happened.

<!-- beginner-readme:end -->

<!-- pantheon-family:start -->
## Olympuz family

This is one of the public [Olympuz projects](https://github.com/zarubinvibe/athena#olympuz-family). Each row opens the repository or downloads its source as a ZIP.

| Type | Name | What it does | Source |
|---|---|---|---|
| project | Athena | Portable agent OS that restores a complete Claude and Codex setup on a new Mac. | [Repository](https://github.com/zarubinvibe/athena) · [ZIP](https://github.com/zarubinvibe/athena/archive/refs/heads/main.zip) |
| project | Helioz | 24/7 agent work conveyor with verified completion markers and goal-based overnight decisions. | [Repository](https://github.com/zarubinvibe/helioz) · [ZIP](https://github.com/zarubinvibe/helioz/archive/refs/heads/main.zip) |
| project | Mnemazine | Local-first memory system that turns raw inputs into verified reusable knowledge. | [Repository](https://github.com/zarubinvibe/mnemazine) · [ZIP](https://github.com/zarubinvibe/mnemazine/archive/refs/heads/main.zip) |
| project | Themiz | Multi-agent assistant for Russian litigation with local OCR and review by a five-jurist council. | [Repository](https://github.com/zarubinvibe/themiz) · [ZIP](https://github.com/zarubinvibe/themiz/archive/refs/heads/main.zip) |
| project | Zeuz | Factory that turns an idea into a governed multi-agent workflow with gates, observability, and replay. | [Repository](https://github.com/zarubinvibe/zeuz) · [ZIP](https://github.com/zarubinvibe/zeuz/archive/refs/heads/main.zip) |
| project | Lynceuz | Collects public web evidence at zero cost and stops with an honest reason when the safe routes end. | [Repository](https://github.com/zarubinvibe/lynceuz) · [ZIP](https://github.com/zarubinvibe/lynceuz/archive/refs/heads/main.zip) |
| project | Iriz | macOS menu-bar dictation that decodes speech on your own Mac, fixes wrong keyboard layouts, and turns dictation into a ready task for an agent. | [Repository](https://github.com/zarubinvibe/iriz) · [ZIP](https://github.com/zarubinvibe/iriz/archive/refs/heads/main.zip) |
| project | Mantoz | Puts an idea in front of five hundred people who do not exist, then shows how each group answered. | [Repository](https://github.com/zarubinvibe/mantoz) · [ZIP](https://github.com/zarubinvibe/mantoz/archive/refs/heads/main.zip) |
| project | Koiz | A single lesson base for every project. Each failure is taken down to its cause, and the cause stays open until a hook, a gate or a test closes it. | [Repository](https://github.com/zarubinvibe/koiz) · [ZIP](https://github.com/zarubinvibe/koiz/archive/refs/heads/main.zip) |
<!-- pantheon-family:end -->

## License

The project is available under the [MIT License](LICENSE).
