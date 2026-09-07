# How Koiz works

<p align="center"><img src="assets/pantheon/doc-how-it-works.png" alt="Four objects in a row on a marble table: a stack of thin marble leaves, the open ledger with a gold pin through its page, one thicker leaf, and the gate plate with a rectangular opening" width="100%"></p>

Three things are kept apart on purpose, because mixing them is what makes lesson bases rot.

## Capture is cheap, deterministic and machine-only

When a session closes, a `SessionEnd` hook hands the instrument the transcript that is already on your disk. The instrument reads it for the things a disk can prove: commands that failed, exit codes, gates that refused, how many attempts a task took.

Two kinds of noise never reach the base. A watchdog that did its job is not a failure, so a blocker that fired is skipped. Evidence shorter than three meaningful words is skipped as well: an unpinned lesson built from a fragment would later stop a night run over nothing.

Capture is idempotent. Reading the same transcript twice does not double the records, because each candidate carries a fingerprint and a repeat raises a counter instead of adding a line.

Capture works with two hands. The first one runs at session close: it reads the transcript
and pulls out failed commands, gate refusals and repeats. The second sits on every tool and
fires in the second something breaks — right where you say "oops, my mistake, fixing it now".
The difference is not convenience: at the review the cause is already forgotten, and one
second after the fall it is still in your head and costs one question.

Both hands stay quiet when a guard did its job or when the evidence is shorter than three
meaningful words. A guard that fired is not trouble, and a non-zero exit code on its own is
not evidence: grep with no match, diff and test all return one.

## Storage appends and never rewrites

The journal at `~/.claude/koiz/lessons.jsonl` is append-only. The state of the base is the result of replaying the journal from the beginning, which means every record keeps its history and nothing is silently edited away.

A record carries what broke, how to reproduce it, why it happened, what closes it, the project, the date and a validity interval. A lesson that stopped applying is closed by date rather than deleted. It is not a lie, it simply no longer holds, and the reason it was closed stays readable next to it.

The base has a budget, three hundred active lessons by default. The ceiling is the point: without one, a base grows forever and nobody ever collapses anything.

## Collapse is a separate, deliberate pass

Merging on write is expensive and loses data, so it is a command of its own. `collapse` looks for lessons that repeat the same shape, proposes one rule that covers them, and shows exactly which records it would fold. `collapse --dry` shows the proposal and changes nothing.

## Pinning is what makes this a tool rather than a diary

Every record has a pin field with five legal values: `hook`, `deny`, an instrument, a test, or nothing. Home-made values are refused. A pin without a reference to a file or a command is refused too, because a mechanism nobody can open is not a mechanism.

"Nothing" is legal and honest. It means the mechanism does not exist yet.

## The gate turns the base into pressure

`node scripts/koiz.mjs gate` exits non-zero when a lesson came back and is still pinned to nothing. Put it in a nightly script or a pre-push hook and the base starts holding you to your own conclusions. There are two honest ways out: close the repeat with a mechanism, or admit the rule does not work and close it by date. A deferral needs a date and a reason.

## One base, every project

The key is the class of the error, not the name of the repository. A lesson captured while you worked on a mobile app is found from a legal-practice project, because the thing that broke was the path handling, not the app.

That is why the journal lives outside any project tree. A base that sits inside one repository only ever warns the people already standing in that repository, which is the one place the lesson is least needed.

## Why the self-test is trusted

`scripts/koiz-mutate.mjs` breaks nineteen rules of the instrument one at a time and demands that the self-test fail every single time. A mutation that survives means the check was not checking. The first run of that gate found a real defect: the instrument exited zero on a symlinked path instead of refusing.
