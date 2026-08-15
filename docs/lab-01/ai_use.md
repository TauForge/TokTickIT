# AI Use and Reflection

## Tool and model

I used OpenAI Codex with GPT-5 as an AI coding assistant. I remained responsible for the repository decisions, GitHub actions, review communication, test verification, and final submission content. No `Co-authored-by` trailer was added to my commits.

## Selected prompts from the project workflow

| Prompt | How I used the result / reflection |
| --- | --- |
| “Before doing anything, read `Lab1_Labsheet.pdf` and `Lab1_Git_GitHub_CheatSheet.pdf` in full.” | Established the required order, branch policy, issue workflow, and submission evidence before implementation. |
| “Create a new public GitHub repo for this project ... init and push `main` and `lab1-staging`.” | Turned the labsheet workflow into a concrete repository setup and kept application work on feature branches. |
| “Continue to step 3” | Started Issue 1 only after the planning board and four issues were ready, so the foundation branch stayed scoped. |
| “Create the PR for Issue 2” | Used the accepted Issue 1 result as the base for the next feature branch and linked the PR to its issue. |
| “มีคนมารีวิว pr 6 แล้วแก้ไขอะไรตามรีวิว แล้วก็ตอบกลับคอมเมนต์ แล้วก็ merge ได้เลย” | Converted peer feedback into specific changes: configurable API URL, timeout handling, and an additional test. |
| “Create the PRs for Issues 3 and 4” | Repeated the issue -> feature branch -> review -> merge sequence without mixing later feature scope into earlier branches. |
| “Merge and work on the documents” | Switched from application delivery to evidence collection: tests, reviewer record, AI log, README, and final PDF. |
| “make it mine version ... use my friend pdf as my example” | Used the example for document organization only, then replaced its identity, links, review evidence, test results, and app screenshots with my own project facts. |

## Reflection

The most useful prompts were the ones that stated constraints and acceptance criteria explicitly. A short prompt such as “Continue to step 3” worked because the earlier conversation had already established the exact branch and issue scope. When a reviewer raised a concern on PR #6, a precise description of the requested behavior made it easier to implement and verify the fix rather than only changing the visible message. For the final document, I checked every required item against the labsheet and used actual GitHub and local runtime evidence instead of copying the partner's submission.
