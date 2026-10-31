# Lab 4 AI Use and Reflection

LLM used: Claude (Sonnet 5.5, via Claude Code). It acted as the specification agent while I set the direction and
checked the handout, and as the coding agent for each implementation task. I decided the order of work and the
review workflow, and I made it check its own work against the handout twice before any code was written.

| # | My prompt (summarized) | What I was checking or deciding | What I learned or changed |
|---|---|---|---|
| 1 | "Read the Lab 4 PDF, make a plan, and tell me whether you can continue from my TokTickIT repo." | Whether the Lab 3 code is a safe base for Lab 4 | The plan builds on the existing routes, screens and seed. Priority has only three levels and Reopened had no way forward, so those became explicit work items |
| 2 | "Is everything as the Lab 4 file requires?" | Whether the plan really covers every handout requirement | The first plan missed several handout items. The handout's assign, complete, cancel and inactive-assignee wording had to be mapped to Ticket Owner, Resolved, Cancelled and the existing invalid-owner error |
| 3 | "Read the file again completely, follow it, remember my rules, and make the plan again before starting." | Forcing a full re-read, including the dashboard mockups on pages 5-6 | Plan v2 has a section-by-section coverage table, and my standing rules (author as me, no co-author lines, no merging) were applied |
| 4 | "Do all the work first, and open the PRs for my friend to review at the end." | How to run peer review for a sprint this large | Stacked branches with all pull requests opened together. Merging and issue closing stay with my reviewer, not the AI |
| 5 | "Start." | Approving the contract-first approach | Contract documents and GitHub issues were written before any code, so every test traces to an acceptance criterion |
| 6 | "Recheck again, is it all matching what the file wants and meeting every requirement?" | An independent audit after the build | The specification had 12 sections where the handout fixes 11, so I had it renumbered. Part 6 still needs each of the four mapped actions demonstrated |
| 7 | "I don't understand what I should do next." | Making sure I understand the process, not just receive output | The remaining work is mostly mine: running the app, checking screenshots, the peer review with my friend, and writing this reflection |
| 8 | "Wait, you merged?" | Checking the AI had not merged anything itself | It had only merged branches locally to carry a fix up the stack. The merge button stays with my reviewer, and I now ask before anything that touches GitHub |
| 9 | "Is this the correct method?" (retargeting each PR) | Whether stacked PRs need manual changes every time | Stacked PRs are standard. The base must move to the staging branch after each merge, which is automatic if the reviewer deletes the merged branch |
| 10 | "My friend told me to bind the PR with an issue." | Why the issues were not shown as linked | A "Closes #N" in a PR into a staging branch only cross-references the issue. The real link and close happen when the release PR merges into main, so that PR lists every issue |

## My Reflection
I used Claude as the specification agent and the coding agent, and I treated it as a tool I had to direct and check,
not something that finishes the lab for me. The most useful things I did were small: asking "is everything as the file
requires?" twice, and asking for a full recheck against the PDF after the build. The first plan missed handout items,
and the recheck found that my specification had 12 sections where the handout fixes 11. Each time, the AI only found
the gap because I made it compare against the source document again.

Specification agent: it was fast at turning the handout into numbered rules, a status matrix and a test plan, and
writing the contract before the code made every test traceable to an acceptance criterion. What I learned is that it
reads ambiguous handout wording literally. The handout talks about assigning, completing and cancelling Actions, and I
had to decide what those mean in this design instead of letting it guess.

Coding agent: it wrote tests first for most tasks, but not all. In the workflow task the tests were written after the
code, so I did not see them fail first, and I recorded that instead of hiding it. The bigger lesson came from peer
review. My friend found real bugs in code that passed all of the AI's own tests: a ticket status check that was not in
the same transaction as the write, an idempotency key that was not scoped to its ticket, and a Reload button that let a
user silently overwrite someone else's edit. I would not have caught these by reading the green test output. Reviewing
the AI's code is a separate job from running its tests.

What I learned about the workflow: stacked pull requests keep each review small, but each merge needs the next PR
retargeted to the staging branch (or the merged branch deleted), and a PR into a staging branch is not linked to its
issue until the release PR into main merges. My friend also pointed out that each PR should be bound to its issue, so
the release PR lists every issue it closes.

What I would do differently: read every task report before starting the next one, run the app myself after each task,
and ask the AI to write the failing test before the fix for every review comment, which is what I did after the
review of the first pull request.
