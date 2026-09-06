# Getting Started In Chat

[Русский](ONBOARDING-CHAT.ru.md) · [中文](ONBOARDING-CHAT.zh.md)

<p align="center"><img src="assets/pantheon/doc-onboarding-chat.png" alt="Koios stands behind the marble table facing an empty seat for the guest, the open ledger on his palm and the axis rod in his hand, six short blue paths waiting in a row in front of the seat" width="100%"></p>

This page is read by an agent, not by you. The agent runs the conversation from it: it says what
it is about to do before doing it, and it stops wherever the choice is yours.

<!-- owner-greeting:start -->

> Hi. I am Fil.
>
> I built Koiz after the same mistake came back in three projects in a row. Every time I honestly
> wrote the lesson into a log. Every time the next session did not read it — because prose is not
> a gate, and a diary entry forbids nobody anything.
>
> Koiz stores a lesson only with the field that matters: what pins it. A hook, a deny rule, an
> instrument, or a test. A lesson nothing can pin is a complaint, not a lesson, and the base says
> so out loud.
>
> From here an agent talks to you. It installs nothing silently: before every step it says what
> changes on disk and what you get. If a step is not for you, say "skip".
>
> — Filipp Zarubin

<!-- owner-greeting:end -->

## How To Use This

Open the project folder in Claude Code, Codex, or another agent and say: "run the onboarding".
The agent walks the steps below, says each one before running it, and waits for your decision at
every fork.

## Step 1: I look at what your machine already has

**What I do:** check the Node version and that git is present.

**Why:** Koiz is a set of instruments on Node with zero dependencies. Node 20 or newer is enough;
nothing else will be installed, and that is worth confirming up front instead of midway.

**What changes on disk:** nothing. These two commands only read.

**What you get:** a plain "you can" or "update Node first", with no guessing.

```bash
node --version
git --version
```

## Step 2: I bring the house down to your machine

**What I do:** clone the repository into the folder you choose.

**Why:** everything else happens inside it: the instruments, the acceptance gate, and the mutation
gate all live there.

**What changes on disk:** one new folder appears. Nothing outside it is touched.

**What you get:** a complete local copy of the tool.

**Fork:** with git I use `git clone`, and updating later is one command. Without git I take the
archive, but then updating means downloading again.

```bash
git clone https://github.com/zarubinvibe/koiz.git && cd koiz
```

## Step 3: I check that the instruments do not lie

**What I do:** run the selftest, then the mutation gate: it breaks nineteen rules on a copy and
demands that each one fails the selftest.

**Why:** a selftest that stays green while a rule is broken checks nothing. Before you trust a
tool with your lessons, it is worth seeing that it judges itself seriously.

**What changes on disk:** nothing outside a temporary folder that removes itself.

**What you get:** two green lines. A red one means do not install: the tool does not behave here
the way it claims, and an issue is the right answer.

```bash
node scripts/koiz.mjs --selftest
node scripts/koiz-mutate.mjs
```

## Step 4: I set up the lesson base

**What I do:** create the lesson journal and, if you already keep a handwritten self-learning log,
migrate its entries with a check that not a single one was lost.

**Why:** the base lives OUTSIDE the repository, in `~/.claude/koiz/lessons.jsonl`. Lessons carry
paths, names, and fragments of commands, and git is no place for that. The journal is append-only:
nothing is overwritten and nothing is erased.

**What changes on disk:** one file appears in your home folder. Secrets do not reach it: the
filter sits on write, not on read.

**What you get:** a base keyed by error class rather than repository name — a lesson from one
project is found from another.

**Fork:** migrate an existing log (`--file <path>`) or start from an empty base. Migration spoils
nothing: it only appends, and at the end it verifies every record by its source.

```bash
node scripts/koiz.mjs migrate --file ~/.claude/self-learning/lessons.md
```

## Step 5: I put capture on session close

**What I do:** wire the `SessionEnd` hook that reads the transcript on exit and takes the failed
commands, the gate refusals, and the calls repeated three times.

**Why:** a lesson that has to be typed by hand does not get typed. The machine takes what is
visible without you and leaves you the one thing it cannot know — why it happened.

**What changes on disk:** one line in your agent settings. The hook is quiet and cannot fail:
it is unable to break the exit from a session.

**What you get:** a base that fills itself, and a list of raw material whose cause you still owe.

**Fork:** automatically through the hook, or by hand with `capture --transcript <file>` after a
session. The first is more reliable, the second leaves your settings untouched.

```bash
node scripts/koiz.mjs capture --transcript ~/.claude/projects/<project>/<session>.jsonl
```

## Step 6: we ask the base and look at the debt

**What I do:** ask the base a question in your own words and show you the debt gate.

**Why:** the base proves itself by an answer, not by an install. The gate answers a different
question: what has already repeated twice and is still pinned by nothing.

**What changes on disk:** nothing. Both commands only read.

**What you get:** results that carry the pin of every lesson, and an honest debt list. Exit code 1
from the gate means this error class will come back until a mechanism closes it.

```bash
node scripts/koiz.mjs ask "what the lesson was about"
node scripts/koiz.mjs debt
```
