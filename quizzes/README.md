Quizzes data format

- Add a new quiz JSON file in this folder (e.g. `my-quiz.json`).
- Update `manifest.json` and add an entry with:
  - `id`: unique string ID
  - `title`: quiz title shown in the list
  - `description`: short optional description
  - `file`: the JSON filename

JSON shape

{
  "id": "my-quiz",
  "title": "My Quiz Title",
  "description": "Optional short blurb",
  "sections": [
    {
      "title": "Optional Section Name",
      "items": [
        { "q": "Question text?", "a": "Answer text." }
      ]
    }
  ]
}

Notes

- Progress is saved locally in the browser (localStorage) per quiz id.
- Nothing is selected by default. Select a quiz to load it.
- Use basic text in questions/answers. Simple HTML tags will render as text.

