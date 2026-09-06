# Contributing

<p align="center"><img src="docs/assets/pantheon/doc-contributing.png" alt="A gold pin standing upright through the page of an open marble ledger beside a stack of thin marble leaves on a marble table" width="100%"></p>

Thank you for looking. This project is small on purpose: three files on bare Node, no dependencies, no build step. That is the constraint every change has to respect.

## The path

Fork the repository, create a branch, commit your change, push the branch, then open a Pull Request. Do not push directly to `main`; the release gate rejects it.

## Before you open the Pull Request

Run all three checks. They are fast and they are the whole review contract:

```bash
node scripts/koiz.mjs --selftest     # the logic of the instrument
node scripts/koiz-mutate.mjs         # 19 broken rules, every one must be caught
bash scripts/koiz-acceptance.sh      # the full acceptance, ten points
```

A red acceptance means the change is not ready. A green acceptance with an unchanged self-test after new logic means the self-test does not cover that logic yet, and the right answer is to add a mutation, not to celebrate.

## New logic arrives with its mutation

`scripts/koiz-mutate.mjs` breaks one rule at a time and demands that the self-test notice. If you add a branch, add the mutation that breaks it. A rule nobody can break on purpose is a rule nobody is checking.

## Style

Comments explain the reason, not the line. A measurement in a comment carries its number. Functions stay short, nesting stays shallow, early returns instead of a ladder of conditions. Russian in prose and comments, English in CLI commands and API names.

## What will be refused

A dependency. A build step. A rewrite of the journal format that breaks reading old records. A change that makes the instrument talk to the network. These are not style opinions: each one removes a property the project exists for.

## The carving font

The workflow diagram captions are cut by `podpisi_takta.py` using Cormorant (SIL Open Font License). The font is not committed here; install it from https://fonts.google.com/specimen/Cormorant into `~/Library/Fonts` if you need to regenerate the diagram.
