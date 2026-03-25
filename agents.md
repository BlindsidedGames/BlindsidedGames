# Blindsided Games — Agent Guidelines

- **Extensibility first.** Design systems so they can absorb new mechanics (prestige layers, automation, UI expansions) without rewrites. Prefer modular architecture, explicit versioning, and data schemas that document the contract between features.
- **Performance matters.** Favour efficient DOM updates, minimise allocations in hot paths, and keep storage interactions lightweight. Test assumptions when adding loops, timers, or large data structures.
- **No shortcuts.** Every feature should include thoughtful structure, error handling, and a path for future growth. Avoid quick hacks that add hidden coupling or technical debt.
- **Inline documentation.** As you implement code, leave concise comments explaining non-obvious intent, invariants, and extension seams. Comments should aid the next agent in understanding where to plug in new behaviour.
- **Consistency is key.** Follow existing patterns (naming, formatting, component structure) or improve them systematically. If you introduce a new pattern, explain why it exists and how to use it.
- **Validate changes.** Smoke-test new behaviour locally and note any gaps or follow-up tasks so momentum continues across sessions.
- **Canonical quiz prompt guide.** The canonical GenAI prompt guide lives at `quizzes/genai_prompt.md`. Do not maintain a separate rule set elsewhere.
- **Prompt sync rule.** When quiz-generation rules change, update `quizzes/genai_prompt.md` first, then run `npm run sync:genai-prompt` and `npm run check:genai-prompt`.
- **App mirror path.** The mirrored app copy lives at `/Users/matthewrushworth/Projects/The Quiz/The Quiz/SeedData/genai_prompt.md` and must not be hand-edited independently.
- **Cross-repo quiz workflow.** Any quiz-content or quiz-prompt edit must review both the app seed corpus and the website daily quiz pool defined in `quizzes/daily_schedule.json`.
