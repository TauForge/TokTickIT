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

## My Reflection
Draft to edit into my own words before submitting.

Specification agent: I did not accept the first plan. Asking "is everything as the file requires" twice found gaps
that a plain read missed, such as the dashboard mockups and the wording about assignees. The agent was good at turning
the handout into numbered rules and tests, but it only caught problems when I asked it to check again against the
PDF. The final check also found a structure mismatch with the handout's 11 required sections.

Coding agent: each task was built with tests written first, then an implementation, then a full test run. Two honest
limits: in the workflow task the new tests were written after the code, so I did not see them fail first, and the
agent made a few choices I only learned about from its report, such as treating Closed tickets as locked for Actions.
I should verify those choices rather than trust them.

What I would do differently: read each task report before starting the next one, run the app myself after every
task, and keep the review pull requests smaller so my friend can review them properly.
