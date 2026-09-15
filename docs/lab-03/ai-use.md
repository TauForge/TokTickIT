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

Written from the agent's side of this session, at the student's request, since the sessions that
did Tasks 1-29 aren't visible here to draw a first-person account from directly.

The pattern that repeated across every subsystem PR review was the same: verify a reviewer's
claim against the code at the PR's actual head commit, not the local branch, which had usually
already drifted ahead. That distinction mattered concretely — on #35 it separated a real bug
(`MyTickets.tsx` still calling `/api/tickets`) from claims that could have looked "already fixed"
if checked against the wrong commit. Skipping that step would have either missed a real bug or
wasted time re-litigating one that was already gone.

The two bugs that mattered most, the CORS wildcard-origin misconfiguration and the mobile CSS
rule hiding the entire ticket table, both shared a cause: nothing before Task 30-34 had actually
driven the app through a real browser. Every prior Lab 3 subsystem PR passed its own unit and API
tests cleanly, because none of those test layers touch CORS enforcement or rendered CSS at all.
The lesson isn't "write more tests," it's that a suite can be green at every individual layer and
still hide a bug that only exists at the seam between layers, in this case, browser+cookie+CORS
behavior and breakpoint CSS. Getting Tasks 30-34 to actually pass, not just exist, is what
surfaced both.

The kanban board issue is worth calling out separately from the code: after moving issue #33 to
"Started," the board's own Auto-close workflow closed it immediately, unprompted, revealing a
misconfigured project automation rather than any mistake in the git/PR workflow itself. Reopening
it and asking before continuing was the right call, since retrying the same edit blind could have
triggered the same automation again without ever finding the actual cause. Separately, an
`item-edit` call that returns no error doesn't guarantee the field value actually changed:
issues #29-#32 stayed at "Started" in the underlying GraphQL data despite earlier edits reporting
success, and this only surfaced days later during the final documentation check, not immediately.
Silent success from a tool is not the same as a verified state change, and for anything
downstream of that call (like whether it's safe to say "all done"), it's worth re-querying rather
than trusting the first successful-looking response.

One thing this session did not do on its own: silently invent numbers for the responsive/visual
checklist or the Definition of Done. Both had checkboxes that were technically easy to just tick,
and both were left unchecked with an explicit reason until the screenshots were actually opened
and looked at, or the real PR/merge state was actually true. The instinct to mark something done
because the surrounding work is done is exactly the kind of shortcut a checklist exists to catch.
