# Lab 3 AI Use and Reflection

LLM used: Claude (Sonnet 5, via Claude Code), running a spec-driven, subagent-per-task workflow
with an independent reviewer subagent after every task, continuing the same approach as Lab 2.

> **Note on coverage**: this log covers the prompts from the session(s) this record was written
> from — Tasks 30-34 (E2E + final integration), the sequential PR review/reply/fix cycle across
> PRs #34/#35/#37/#38/#39/#40, and the kanban/issue workflow. Tasks 1-29's implementation happened
> in an earlier session not visible to whichever session wrote this file; add those prompts here
> if you want the full Lab 3 history covered, the same way Lab 2's table covers its own full run.

| # | Prompt (summarized) | Purpose |
|---|---|---|
| 1 | "Write the Task 31-33 E2E specs (staff ticket lifecycle, admin user lifecycle, 3-viewport visual verification) per the plan doc, run them, and fix whatever's wrong." | e2e/lab-03/staff-ticket-flow.spec.ts, user-administration.spec.ts, visual-states.spec.ts |
| 2 | "Check stash and other local checkouts for the missing E2E work before doing it yourself." | Confirmed no existing work anywhere, avoided duplicating effort |
| 3 | "Review PR #34/#35/#37/#38/#39 and reply to the reviewer's comment." (repeated per PR) | Verified each finding against the actual code at the PR's head commit, fixed confirmed bugs, replied with reasoning |
| 4 | "My friend merged — update the kanban board, close the issue, and open the next issue's PR." (repeated per subsystem) | Sequential one-PR-at-a-time workflow across #29 through #33 |
| 5 | "Review my friend's separate PR (Bank848/toktickit #45) and approve it." | Dispatched a security-focused subagent review rather than rubber-stamping, since it touched auth/session/password code |
| 6 | "Check the .md docs and documentation for completeness before merging PR #40." | Found and fixed 2 real gaps: an unfinished visual-verification checklist and a stale Definition-of-Done status line |

## My Reflection

_(Fill in your own reflection here — what the agent got right, what it missed, anything you had
to push back on or correct. Lab 1's and Lab 2's ai-use.md both have a genuine first-person
reflection in this section; an AI session shouldn't write this part for you.)_
