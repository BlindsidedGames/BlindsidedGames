# Blindsided Games — Agent Guidelines

- **Extensibility first.** Design systems so they can absorb new mechanics (prestige layers, automation, UI expansions) without rewrites. Prefer modular architecture, explicit versioning, and data schemas that document the contract between features.
- **Performance matters.** Favour efficient DOM updates, minimise allocations in hot paths, and keep storage interactions lightweight. Test assumptions when adding loops, timers, or large data structures.
- **No shortcuts.** Every feature should include thoughtful structure, error handling, and a path for future growth. Avoid quick hacks that add hidden coupling or technical debt.
- **Inline documentation.** As you implement code, leave concise comments explaining non-obvious intent, invariants, and extension seams. Comments should aid the next agent in understanding where to plug in new behaviour.
- **Consistency is key.** Follow existing patterns (naming, formatting, component structure) or improve them systematically. If you introduce a new pattern, explain why it exists and how to use it.
- **Validate changes.** Smoke-test new behaviour locally and note any gaps or follow-up tasks so momentum continues across sessions.
