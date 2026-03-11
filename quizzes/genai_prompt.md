# Canonical Quiz Generation Guide

This file is the canonical source of truth for quiz generation rules.

- Canonical path: `/Users/matthewrushworth/Projects/BlindsidedGames Website/quizzes/genai_prompt.md`
- Mirrored app path: `/Users/matthewrushworth/Projects/The Quiz/The Quiz/SeedData/genai_prompt.md`
- The app copy must be updated by the sync script, not hand-edited independently.
- Website quiz JSON in this repo is now used for the app-facing daily feed only, not for a public website quiz browser.

## Output Contract

1. Output valid JSON only. Do not wrap the response in markdown fences.
2. Raw JSON is the canonical output for this guide. If another workflow asks for a fenced `json` block, treat that as an app-import wrapper only.
3. Follow this schema exactly:
   - Root object includes `id`, `title`, and `sections`.
   - `sections` contains exactly one section object.
   - The section contains `title` and `items`.
   - `items` contains exactly 10 questions.
4. Each question must include:
   - `type`: one of `"multiple-choice"` or `"true-false"`
   - `q`: clear question text
   - `a`: answer text
   - `explanation`: a useful supporting fact not already stated by the question/answer pair
5. `options` rules:
   - Required for `multiple-choice`
   - Required for `true-false` and must be exactly `["True", "False"]`
6. For `multiple-choice` and `true-false`, `a` must exactly match one of the provided options.

## Locale-Aware Tagged Text

Use inline tags when a question, answer, option, or explanation contains user-facing measurements or locale-sensitive numeric display.

- Supported tags:
  - `{{measure|value|unit|precision}}`
  - `{{number|value|precision}}`
- `value` must use plain JSON number formatting with `.` as the decimal separator.
- `precision` is the number of fraction digits to render after locale conversion.
- Supported `unit` tokens only:
  - temperature: `c`, `f`
  - length: `km`, `m`, `cm`, `mi`, `ft`, `in`
  - speed: `kph`, `mph`
  - mass: `kg`, `g`, `lb`, `oz`
  - volume: `l`, `ml`, `gal`, `floz`

Authoring guidance:

1. Prefer metric source units for new generated content unless a specific source unit is essential to the fact.
2. Keep prose around the tag locale-neutral. Let the tag supply the visible unit.
3. Do not hardcode display units such as `°C`, `°F`, `miles`, `km/h`, `kg`, `lb`, `litres`, or `gallons` when a supported tag applies.
4. Distractors must remain distinct after conversion across common locales such as `en_US`, `en_GB`, `en_AU`, `en_CA`, `fr_FR`, and `ja_JP`.
5. Do not nest tags or invent new tag names.

## Multiple-Choice Distractor Rules

These are mandatory.

1. Every distractor must belong to the same fine-grained answer class as the correct answer, not just the same broad topic.
2. Distractors must be plausible but false, not random leftovers from other questions or categories.
3. Do not reuse another question's answer as a distractor unless it is still the same answer class and genuinely plausible.
4. Avoid one obvious outlier that makes the correct answer a giveaway.
5. After removing a leading article (`a`, `an`, `the`) and terminal punctuation, every option must still be unique.
6. Similar-looking distractors are allowed only when they remain clearly distinct after normalization. Do not allow effectively identical pairs such as `Atlantic Ocean` vs `The Atlantic Ocean` or `Grammy` vs `The Grammy Awards`.
7. If the question expects one answer, do not make the correct option the only pair, list, or multi-part answer.
8. When the question implies a typed answer, keep every option inside that type:
   - colors or color combinations
   - numbers or numeric values
   - years or decades
   - planets
   - countries, cities, states, territories, rivers, seas, oceans, deserts, mountain ranges, and similar geography classes
   - people
   - titles, works, or named documents
   - scientific terms, symbols, formulas, units, and processes
   - definition-style sentences
9. If a question asks for a definition, every option must also be a definition-style answer.
10. If a question asks for a person, every option must be a person. If it asks for a river, every option must be a river. If it asks for a sea, every option must be a sea. If it asks for a canal, every option must be a canal. Follow that same rule for every typed class.

## Required Question Mix

Every 10-question quiz must contain exactly:

- 8 `multiple-choice`
- 2 `true-false`

Do not cluster the same question types together unless a brief local grouping is unavoidable.

## Universal Quality Rules

These rules apply to every category.

1. Every question must be objectively answerable at the requested difficulty.
2. Every explanation must add value.
3. Do not use tautological explanations such as:
   - `X directed Y.`
   - `X created Y.`
   - `Y was released in 1995.`
   - `City is the capital of Country.`
4. Do not repeat the same fact within a quiz.
5. Do not repeat the same fact across the reviewed live catalog, even if the wording changes.
6. Treat near-equivalents as duplicates and avoid them:
   - release year vs release decade
   - premiere year vs premiere decade
   - director
   - creator
   - original network
   - capital city
   - currency
   - Australian state abbreviation
   - obvious location/capital variants
7. Do not use vague prompts with multiple reasonable answers unless the prompt explicitly defines the scope and the explanation names accepted answers.
8. Do not use unstable, disputed, or time-sensitive trivia unless the prompt anchors the metric, authority, or time period.
9. Do not include authoring notes, placeholders, internal comments, or markers such as `(set 2)`, `fix`, `draft`, `placeholder`, or similar text.
10. Keep wording clean and specific. Avoid trick phrasing and “gotcha” ambiguity.
11. When a fact depends on units or formatted numbers, use the locale-aware tag syntax instead of hardcoded display units.
12. Multiple-choice distractors must never be semantically unrelated filler.
13. Keep tone neutral. Do not pad questions or explanations with filler intensifiers such as `fundamentally`, `incredibly`, `profoundly`, `colossal`, `vast`, `harshly`, `brutally`, or similar wording unless the modifier is materially necessary to the fact.

## Variety Rules

Each quiz must feel varied, not mechanically repetitive.

1. Vary prompt forms across the 10 questions.
2. Do not over-concentrate on one trivia pattern such as:
   - capitals
   - currencies
   - release years
   - creators
   - directors
   - original networks
   - abbreviations
3. Do not repeat the same subtopic more than twice in a 10-question quiz unless the category itself is intentionally narrow.
4. Avoid answer streaks where the same type of answer or structure repeats several times in a row.
5. Prefer a spread of factual angles such as:
   - people
   - events
   - systems
   - objects
   - terminology
   - process
   - usage
   - cultural context

## Naming Guidance

1. JSON `id` and stored `title` may remain technical if needed for catalog management.
2. Do not optimize generated titles for user-facing numbering systems.
3. Do not include authoring-only labels meant to drive app UI naming such as `Set 1`, `Set A`, or similar.
4. User-facing app labels are resolved separately from the generated quiz file.

## Difficulty Guidance

- Easy: widely known facts with direct phrasing and minimal ambiguity.
- Medium: broader recall, common context, and some deeper but still mainstream knowledge.
- Hard: deeper factual knowledge, but still objective and fair without specialist trap wording.

Hard should mean deeper, not vaguer.

## Category Guardrails

### Trivia

Trivia must be broad and mixed.

- Each 10-question Trivia quiz should cover at least 5 distinct domains.
- No single domain may exceed 2 questions in one quiz.
- No single trivia pattern may exceed 2 questions in one quiz.
- Pure arithmetic should be rare in Trivia. Do not let worksheet-style calculation questions accumulate.
- Geography is allowed in Trivia, but it must remain a minority part of a genuinely mixed quiz.
- Geography-style content must not dominate through repetition of patterns such as:
  - capitals
  - currencies
  - countries
  - cities
  - states
  - territories
  - continents
  - oceans
  - rivers
  - mountains
  - deserts
  - flags
  - borders
  - location-identification questions
- Bad Trivia construction includes:
  - too many capitals
  - too many currencies
  - too many release years
  - too many creator, director, or network questions
  - too many one-country or one-region prompts

### Geography

Geography is where location, capital, and currency content belongs.

- Vary between capitals, physical geography, regions, maps, political geography, and human geography.
- Do not make a full quiz only capitals or only currencies.
- Avoid obvious school-test repetition.

### Entertainment

For broad Entertainment quizzes:

- Balance across film, television, music, and pop culture.
- Do not let any one of those four areas dominate the quiz.
- Use varied fact types, not just release year, actor, or chart-position recall.

For narrower entertainment subcategories such as Movies, TV Shows, Music, or Pop Culture:

- Keep internal variety within the subcategory.
- Avoid building a whole quiz around one franchise, one performer, one era, or one fact pattern.

### History

- Mix eras, regions, political history, social history, and notable events where appropriate.
- Do not over-focus on war dates, rulers, or treaty years alone.
- Anchor controversial questions carefully and avoid disputed nationalist framings.

### Science

- Mix disciplines where appropriate: physics, chemistry, biology, earth science, astronomy, and applied science.
- Avoid turning the whole quiz into terminology definitions only.
- Prefer clear, established scientific knowledge over edge-case exceptions unless the difficulty explicitly justifies it.

### Biology, Chemistry, Nature

- Keep questions category-true and avoid bleeding into generic geography or generic science trivia too heavily.
- Use a mix of concepts, processes, classification, and real-world examples.
- Avoid over-relying on Latin-name or rote-definition prompts.

### Mathematics

- Favour clear, answerable problems or concepts.
- Avoid questions that depend on ambiguous notation or unseen working unless the expected answer is still unambiguous.
- Mix arithmetic, algebra, geometry, number properties, and reasoning where appropriate.

### Languages

- Keep scope explicit: grammar, vocabulary, scripts, etymology, literary language, or translation conventions.
- Avoid prompts with multiple valid translations unless the accepted-answer scope is stated clearly.

### Sports

- Mix rules, competitions, athletes, teams, records, and terminology.
- Avoid unstable “current champion” style questions unless time-anchored.
- Avoid building the full quiz around one league or one country unless the category explicitly says so.

### Games

- Mix genres, platforms, mechanics, characters, studios, and landmark titles.
- Avoid over-concentrating on a single franchise, publisher, or release-year pattern.

### Hospitality

- Keep questions grounded in service, food and beverage, hotel operations, travel standards, and common industry knowledge.
- Avoid turning the category into generic geography or pure cuisine identification only.

## Adaptations, Revivals, And Versions

When a property has multiple major versions:

- Specify the medium and era clearly.
- Good: `Who revived Doctor Who for television in 2005?`
- Bad: `Who created Doctor Who?` when the intended answer is the revival rather than the original series.

## Review Checklist

Before a quiz is accepted into the reviewed catalog, confirm:

- The JSON matches the schema exactly.
- The question-type distribution is correct.
- Every question has a useful explanation.
- There are no duplicate facts within the quiz.
- The quiz is not dominated by one stale fact pattern.
- The category guardrails above are satisfied.
- Trivia is broad and mixed.
- No topic family dominates a Trivia quiz.
- No stale fact pattern repeats excessively in Trivia.
- Geography-style content in Trivia, if present, is limited and balanced by other domains.
- Multiple-choice options remain unique after article and punctuation normalization.
- No single-answer question hides the correct choice as the only pair, list, or multi-part option.
- Question and explanation wording stays neutral rather than inflated.
- The difficulty feels accurate and fair.
- The stored title is technical/neutral and not trying to drive UI naming.

## Example Output Structure

{
  "id": "biology_hard_01",
  "title": "Hard Biology Quiz 1",
  "sections": [
    {
      "title": "Biology",
      "items": [
        {
          "type": "multiple-choice",
          "q": "At standard atmospheric pressure, water boils at what temperature?",
          "a": "{{measure|100|c|0}}",
          "options": ["{{measure|90|c|0}}", "{{measure|95|c|0}}", "{{measure|100|c|0}}", "{{measure|110|c|0}}"],
          "explanation": "At lower air pressure, water boils at a lower temperature than {{measure|100|c|0}}."
        },
        {
          "type": "true-false",
          "q": "All mammals give birth to live young.",
          "a": "False",
          "options": ["True", "False"],
          "explanation": "Monotremes such as the platypus and echidna are egg-laying mammals."
        },
        {
          "type": "multiple-choice",
          "q": "What process converts light energy into chemical energy in plants?",
          "a": "Photosynthesis",
          "options": ["Respiration", "Photosynthesis", "Fermentation", "Transpiration"],
          "explanation": "Photosynthesis mainly takes place in chloroplasts, where chlorophyll helps capture light energy."
        }
      ]
    }
  ]
}

Generate one quiz JSON file at a time, following every rule in this guide.
