# Security and privacy

<p align="center"><img src="docs/assets/pantheon/doc-security.png" alt="A marble gate plate with a rectangular opening cut through it standing between the incoming blue paths and the stack of marble leaves on the table" width="100%"></p>

## What Koiz keeps

Koiz keeps one file: the lesson journal, at `~/.claude/koiz/lessons.jsonl`. Every line is one record with the text of the failure, the cause, the mechanism that closes it, the project name and a date. Nothing else is stored anywhere.

The journal lives outside the project repository on purpose. Lessons carry file paths, command lines and the names of other work, so a public tree is the wrong place for them. If you clone this repository, the journal that appears on your machine is yours alone and it is never committed.

## What leaves your machine

Nothing. The instrument has no network calls and no dependencies. It reads files, writes one file, and exits. Capture reads the transcript of a session that is already on your disk and copies it nowhere.

## Secrets

The secret filter runs on the write, not on the read. A token, an API key, an AWS access key or a PEM private key is replaced with a marker before the line reaches the journal. What is never written cannot be shown by accident later.

The filter is covered by the self-test and by a mutation: turning it off must make the self-test fail. If that mutation ever survives, the check has stopped checking, and that is treated as a defect.

## What the instrument can do to your system

`install.sh` writes two things: the directory `~/.claude/koiz` and one `SessionEnd` entry in `~/.claude/settings.json`. It backs up the settings file before touching it and refuses to write at all if the file does not parse. It asks before every step unless you pass `--yes`.

Nothing else on your system is modified. There is no daemon, no launch agent and no background process.

## Reporting a hole

Open an issue at https://github.com/zarubinvibe/koiz/issues and describe what you ran and what you saw. For anything that would expose someone else's data, write the report without the sensitive part and say that you have it; a maintainer will ask for a private channel.
