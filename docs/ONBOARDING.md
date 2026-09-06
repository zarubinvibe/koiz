# Onboarding: the first run, step by step

<p align="center"><img src="assets/pantheon/doc-onboarding.png" alt="Koios standing behind a marble table with the open ledger on his palm and blue paths arriving from the left edge of the frame" width="100%"></p>

This page is for somebody who has never installed a tool from GitHub. Every step says what to type and what appears on screen afterwards. If a step shows something else, stop there and open an issue: a walkthrough that lies is worse than no walkthrough.

You need Git, Node 20 or newer, and a terminal. No agent is required.

1. **Check Node.** Type `node --version`. You should see something like `v22.14.0`. If the version starts with `v18` or lower, install a newer Node from https://nodejs.org before going on.

2. **Pick a folder and clone the project.** Type `git clone https://github.com/zarubinvibe/koiz.git` and then `cd koiz`. Git prints a few lines about counting and unpacking objects, and you end up inside a folder that holds `scripts`, `docs` and `install.sh`.

3. **Run the install.** Type `bash install.sh`. It asks one question: whether to put lesson capture on session close. Answer `y`. It prints the path of the lesson base, the line `хук вписан` with the path of your settings file, and then runs the self-test.

4. **Read the self-test line.** The last block starts with `selftest ok` and lists what was checked. If it says anything else, the install did not finish and nothing else on this page will work.

5. **Ask the empty base a question.** Type `node scripts/koiz.mjs ask "what has broken before"`. On a fresh install the base is empty, so it answers that it found nothing. That is the correct answer, and it proves the instrument reads its journal.

6. **Write your first lesson by hand.** Type this on one line:

   ```bash
   node scripts/koiz.mjs add --what "a script followed a symlink and overwrote the launcher" \
     --why "the path was taken on trust, without checking what it pointed at" \
     --pin тест --pin-ref scripts/koiz-mutate.mjs
   ```

   It prints the identifier of the new record. The `--pin` field is the point of the whole project: a lesson without a mechanism is a complaint.

7. **Find it from a different project.** Leave this folder, go to any other project of yours, and run the same `ask` command with a word from your lesson. The base is one for every project, so the answer comes back there too.

8. **Look at the debt.** Type `node scripts/koiz.mjs debt`. It lists lessons that came back and are still pinned to nothing. On a fresh base the list is empty, and that is what you want to see.

9. **Put the gate where it hurts.** Type `node scripts/koiz.mjs gate`. It exits with code 0 while there is no debt and with a non-zero code when a repeat is not pinned. Add that line to your nightly script or your pre-push hook, and the base starts holding you to your own conclusions.

10. **Close the session and let the machine work.** Exit your agent session normally. On close, the hook reads the transcript and writes the drafts by itself. Open `~/.claude/koiz/capture.log` to see what it took.

## Staying current

To pull the current version later, run `/koiz-update` in Claude Code. It shows what changed before touching anything, pulls fast-forward only, leaves your journal and your settings alone, and runs the self-test afterwards. Without an agent, `git pull --ff-only` in this folder does the same thing.

## If it helps

Give Koiz a star: https://github.com/zarubinvibe/koiz. It takes a second and it decides whether other people ever find the project.

Want to change something? The path is short: fork the repository, create a branch, commit your change, push the branch, then open a Pull Request. Do not push directly to `main`; the release gate rejects it.
