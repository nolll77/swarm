# PR BUILDER (GITHUB INTEGRATION)

Automates the creation and documentation of Pull Requests.

---

## PR TEMPLATE
- **Title:** Derived from the GitHub issue.
- **Summary:** AI-generated executive summary of the changes.
- **Architectural Impact:** Explicitly list any changes to events, schemas, or dependencies.
- **Testing Proof:** Linked unit test results or simulated validation logs.

---

## METADATA
- Labels: `ai-bot-generated`, `needs-human-review`.
- Assignees: The original issue reporter + 1 Staff Engineer.
- References: Fixes #{issue_id}.

---

## POST-CREATION
Trigger the `ai-ci.yml` pipeline automatically on PR open.
