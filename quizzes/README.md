Quizzes folder layout

- Only the quiz files referenced by `daily_schedule.json` should live directly in this folder.
- `daily_schedule.json` is the app-facing daily schedule feed.
- There is no public website quiz catalog or `manifest.json`.

Daily schedule shape

```json
{
  "version": 1,
  "entries": [
    {
      "date": "2026-03-09",
      "id": "daily.general_knowledge_easy_04",
      "title": "General Knowledge Daily Challenge",
      "category": "General Knowledge",
      "difficulty": "Easy",
      "file": "general_knowledge_easy_04.json"
    }
  ]
}
```

Quiz JSON shape

```json
{
  "id": "general_knowledge_easy_04",
  "title": "General Knowledge Daily Challenge",
  "sections": [
    {
      "title": "General Knowledge",
      "items": [
        {
          "type": "multiple-choice",
          "q": "Question text?",
          "a": "Answer text.",
          "options": ["Answer text.", "Distractor 1", "Distractor 2", "Distractor 3"],
          "explanation": "Short explanation."
        }
      ]
    }
  ]
}
```

Locale-aware tagged text

- `q`, `a`, `options`, and `explanation` may contain inline locale-aware tags.
- Supported tags:
  - `{{measure|value|unit|precision}}`
  - `{{number|value|precision}}`
- Supported units:
  - `c`, `f`
  - `km`, `m`, `cm`, `mi`, `ft`, `in`
  - `kph`, `mph`
  - `kg`, `g`, `lb`, `oz`
  - `l`, `ml`, `gal`, `floz`
- Use tags for display measurements instead of hardcoding locale-facing units like `°C`, `miles`, `kg`, or `gallons`.
- Keep `a` identical to one of the stored `options`; grading uses the canonical raw value, not the rendered locale string.

Daily-feed quiz files must contain exactly 10 questions with this mix:

- 8 `multiple-choice`
- 2 `true-false`

Notes

- The app reads `quizzes/daily_schedule.json` and resolves the current daily by the device's local date.
- `validate_quizzes.py` validates the quiz files referenced by `daily_schedule.json`.
- The validator checks tag syntax, supported units, and locale-specific option collisions across representative locales.
- The daily feed should keep at least 14 entries and every entry must point to an existing quiz file in this folder.
