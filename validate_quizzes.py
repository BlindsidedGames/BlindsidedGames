import json
import os
import re
import sys
from decimal import Decimal, InvalidOperation

from scripts.quiz_semantic_audit import audit_quiz_document

QUIZZES_DIR = "quizzes"
DAILY_SCHEDULE_PATH = os.path.join(QUIZZES_DIR, "daily_schedule.json")
ERRORS_PATH = "validation_errors.json"
WARNINGS_PATH = "validation_warnings.json"

BAD_STRINGS = [
    "Wait, fixing",
    "Wait, my generation",
    "Fix Gen",
    "Fix:",
    "Real:",
    "Fixing generation",
    "Fixing.",
    "Stopping.",
    "Wait, ",
]

FACT_PATTERNS = [
    ("release", re.compile(r"^In what year was (.+) released\?$", re.I)),
    ("release", re.compile(r"^Which decade was (.+) released in\?$", re.I)),
    ("directed_by", re.compile(r"^Who directed (.+)\?$", re.I)),
    ("created_by", re.compile(r"^Who created (.+)\?$", re.I)),
    ("premiere", re.compile(r"^In what year did (.+) premiere\?$", re.I)),
    ("premiere", re.compile(r"^Which decade did (.+) premiere in\?$", re.I)),
    ("original_network", re.compile(r"^Which network originally aired (.+)\?$", re.I)),
    ("capital_city", re.compile(r"^(?:What is|Name) the capital(?: city)? of (.+)\.?$", re.I)),
    ("capital_city", re.compile(r"^What is the capital city of (.+)\?$", re.I)),
    ("currency", re.compile(r"^Name the currency used in (.+)\.?$", re.I)),
    ("currency", re.compile(r"^What is the official currency of (.+)\?$", re.I)),
    ("state_abbrev", re.compile(r"^Which Australian state is abbreviated as (.+)\?$", re.I)),
    ("state_has_capital", re.compile(r"^Which Australian (?:state|territory) has (.+) as its capital\?$", re.I)),
    ("continent_capital", re.compile(r"^Which city is the administrative capital of South Africa\?$", re.I)),
]

RISKY_TRIVIA_PATTERN = re.compile(
    r"\b(largest|smallest|longest|shortest|highest|lowest|first|most|least|only|current|present|today|originally)\b",
    re.I,
)
RISKY_TRIVIA_ALLOWLIST = [
    "by land area",
    "by surface area",
    "by discharge",
    "above sea level",
    "at 0 degrees",
    "in 2005",
    "in 1957",
    "in 1992",
    "administrative capital",
    "judicial capital",
    "legislative capital",
]

SUPPORTED_UNITS = {
    "c",
    "f",
    "km",
    "m",
    "cm",
    "mi",
    "ft",
    "in",
    "kph",
    "mph",
    "kg",
    "g",
    "lb",
    "oz",
    "l",
    "ml",
    "gal",
    "floz",
}

REPRESENTATIVE_LOCALES = ["en_US", "en_GB", "en_AU", "en_CA", "fr_FR", "ja_JP"]
IMPERIAL_REGIONS = {"US", "LR", "MM"}
HARD_CODED_UNIT_PATTERNS = [
    re.compile(r"[-+]?\d[\d,]*(?:\.\d+)?\s*°\s*[CF]\b", re.I),
    re.compile(r"[-+]?\d[\d,]*(?:\.\d+)?\s*degrees?\s+(celsius|fahrenheit)\b", re.I),
    re.compile(r"\bkm/h\b", re.I),
    re.compile(r"\bmph\b", re.I),
    re.compile(
        r"[-+]?\d[\d,]*(?:\.\d+)?\s*(kilomet(?:er|re)s?|miles?|meters?|metres?|feet|foot|inches?|kilograms?|pounds?|liters?|litres?|gallons?)\b",
        re.I,
    ),
]


def dict_raise_on_duplicates(ordered_pairs):
    result = {}
    for key, value in ordered_pairs:
        if key in result:
            raise ValueError(f"Duplicate key: {key}")
        result[key] = value
    return result


def load_daily_schedule():
    with open(DAILY_SCHEDULE_PATH, "r", encoding="utf-8") as handle:
        data = json.load(handle)
    return data.get("entries", [])


def normalize_text(value):
    value = value.lower().replace("’", "'")
    value = re.sub(r"[^a-z0-9]+", " ", value)
    return " ".join(value.split())


def extract_fact_key(question):
    for relation, pattern in FACT_PATTERNS:
        match = pattern.match(question)
        if not match:
            continue
        entity = match.group(1) if match.groups() else question
        entity = re.sub(r"\s+\(set \d+\)$", "", entity, flags=re.I).strip().rstrip(".")
        return relation, normalize_text(entity)
    return None


def is_exact_tautology(question, answer, explanation):
    normalized_answer = answer.strip(". ")
    explanation_lower = explanation.lower()
    answer_lower = normalized_answer.lower()

    directed_or_created = re.match(r"^who (directed|created) (.+)\?$", question, re.I)
    if directed_or_created:
        verb = directed_or_created.group(1).lower()
        subject = directed_or_created.group(2).lower()
        pattern = rf"{re.escape(answer_lower)} (?:is credited with )?{verb} {re.escape(subject)}\.?"
        return re.fullmatch(pattern, explanation_lower) is not None

    release_or_premiere = re.match(r"^In what year (?:was|did) (.+) (released|premiere)\?$", question, re.I)
    if release_or_premiere:
        subject = release_or_premiere.group(1).lower()
        exact_matches = {
            f"{subject} was released in {answer_lower}",
            f"{subject} was released in {answer_lower}.",
            f"{subject} first aired in {answer_lower}",
            f"{subject} first aired in {answer_lower}.",
            f"{subject} premiered in {answer_lower}",
            f"{subject} premiered in {answer_lower}.",
        }
        return explanation_lower in exact_matches

    original_network = re.match(r"^Which network originally aired (.+)\?$", question, re.I)
    if original_network:
        subject = original_network.group(1).lower()
        return explanation_lower == f"{subject} originally aired on {answer_lower}."

    capital = re.match(r"^(?:What is|Name) the capital(?: city)? of (.+?)[\.\?]?$", question, re.I)
    if capital:
        subject = capital.group(1).lower()
        exact_matches = {
            f"{answer_lower} is the capital of {subject}",
            f"{answer_lower} is the capital of {subject}.",
        }
        return explanation_lower in exact_matches

    return False


def is_risky_trivia(question):
    question_lower = question.lower()
    if not RISKY_TRIVIA_PATTERN.search(question_lower):
        return False
    if any(allowed in question_lower for allowed in RISKY_TRIVIA_ALLOWLIST):
        return False
    if re.search(r"\b\d{4}\b", question_lower):
        return False
    return True


def append_issue(collection, filename, message):
    collection.setdefault(filename, []).append(message)


def parse_tagged_text(text):
    index = 0
    tokens = []

    while True:
        open_index = text.find("{{", index)
        if open_index == -1:
            trailing = text[index:]
            if "}}" in trailing:
                raise ValueError("Unmatched closing tag delimiter")
            return tokens

        if "}}" in text[index:open_index]:
            raise ValueError("Unmatched closing tag delimiter")

        close_index = text.find("}}", open_index + 2)
        if close_index == -1:
            raise ValueError("Unmatched opening tag delimiter")

        raw_content = text[open_index + 2:close_index]
        if "{{" in raw_content or "}}" in raw_content:
            raise ValueError("Nested tags are not supported")

        parts = raw_content.split("|")
        head = parts[0] if parts else ""

        if head == "measure" and len(parts) == 4:
            try:
                value = Decimal(parts[1])
            except InvalidOperation as exc:
                raise ValueError(f"Invalid measure value '{parts[1]}'") from exc

            unit = parts[2]
            if unit not in SUPPORTED_UNITS:
                raise ValueError(f"Unsupported unit '{unit}'")

            try:
                precision = int(parts[3])
            except ValueError as exc:
                raise ValueError(f"Invalid precision '{parts[3]}'") from exc

            if precision < 0 or precision > 6:
                raise ValueError(f"Invalid precision '{parts[3]}'")

            tokens.append(("measure", value, unit, precision))
        elif head == "number" and len(parts) == 3:
            try:
                value = Decimal(parts[1])
            except InvalidOperation as exc:
                raise ValueError(f"Invalid number value '{parts[1]}'") from exc

            try:
                precision = int(parts[2])
            except ValueError as exc:
                raise ValueError(f"Invalid precision '{parts[2]}'") from exc

            if precision < 0 or precision > 6:
                raise ValueError(f"Invalid precision '{parts[2]}'")

            tokens.append(("number", value, precision))
        else:
            raise ValueError(f"Invalid tag '{raw_content}'")

        index = close_index + 2


def region_from_locale(locale):
    parts = locale.replace("-", "_").split("_")
    return parts[1].upper() if len(parts) > 1 and parts[1] else "US"


def auto_measurement_preference(family, locale):
    region = region_from_locale(locale)
    if region in IMPERIAL_REGIONS:
        return "imperial"
    if region == "GB":
        return "imperial" if family in {"length", "speed"} else "metric"
    return "metric"


def measure_family(unit):
    if unit in {"c", "f"}:
        return "temperature"
    if unit in {"km", "m", "cm", "mi", "ft", "in"}:
        return "length"
    if unit in {"kph", "mph"}:
        return "speed"
    if unit in {"kg", "g", "lb", "oz"}:
        return "mass"
    if unit in {"l", "ml", "gal", "floz"}:
        return "volume"
    raise ValueError(f"Unsupported unit '{unit}'")


def target_unit_for_preference(unit, preference):
    if preference == "metric":
        if unit in {"c", "f"}:
            return "c"
        if unit in {"km", "mi"}:
            return "km"
        if unit in {"m", "ft"}:
            return "m"
        if unit in {"cm", "in"}:
            return "cm"
        if unit in {"kph", "mph"}:
            return "kph"
        if unit in {"kg", "lb"}:
            return "kg"
        if unit in {"g", "oz"}:
            return "g"
        if unit in {"l", "gal"}:
            return "l"
        if unit in {"ml", "floz"}:
            return "ml"

    if preference == "imperial":
        if unit in {"c", "f"}:
            return "f"
        if unit in {"km", "mi"}:
            return "mi"
        if unit in {"m", "ft"}:
            return "ft"
        if unit in {"cm", "in"}:
            return "in"
        if unit in {"kph", "mph"}:
            return "mph"
        if unit in {"kg", "lb"}:
            return "lb"
        if unit in {"g", "oz"}:
            return "oz"
        if unit in {"l", "gal"}:
            return "gal"
        if unit in {"ml", "floz"}:
            return "floz"

    return unit


def convert_measure(value, unit, target_unit):
    if unit == target_unit:
        return float(value)

    float_value = float(value)
    converters = {
        "c": lambda v: (v * 9 / 5) + 32,
        "f": lambda v: (v - 32) * 5 / 9,
        "km": lambda v: v * 0.621371192237334,
        "mi": lambda v: v / 0.621371192237334,
        "m": lambda v: v * 3.280839895013123,
        "ft": lambda v: v / 3.280839895013123,
        "cm": lambda v: v * 0.393700787401575,
        "in": lambda v: v / 0.393700787401575,
        "kph": lambda v: v * 0.621371192237334,
        "mph": lambda v: v / 0.621371192237334,
        "kg": lambda v: v * 2.204622621848776,
        "lb": lambda v: v / 2.204622621848776,
        "g": lambda v: v * 0.03527396194958,
        "oz": lambda v: v / 0.03527396194958,
        "l": lambda v: v * 0.264172052358148,
        "gal": lambda v: v / 0.264172052358148,
        "ml": lambda v: v * 0.033814022701843,
        "floz": lambda v: v / 0.033814022701843,
    }
    return converters[unit](float_value)


def format_number(value, precision, locale):
    formatted = f"{value:,.{precision}f}"
    if locale.startswith("fr_"):
        formatted = formatted.replace(",", "\u202f").replace(".", ",")
    return formatted


def format_measure(value, unit, precision, locale):
    formatted_number = format_number(value, precision, locale)
    suffix = {
        "c": "°C",
        "f": "°F",
        "km": " km",
        "m": " m",
        "cm": " cm",
        "mi": " mi",
        "ft": " ft",
        "in": " in",
        "kph": " km/h",
        "mph": " mph",
        "kg": " kg",
        "g": " g",
        "lb": " lb",
        "oz": " oz",
        "l": " L",
        "ml": " mL",
        "gal": " gal",
        "floz": " fl oz",
    }[unit]
    return f"{formatted_number}{suffix}"


def render_tagged_text(text, locale):
    if not isinstance(text, str) or "{{" not in text:
        return text

    parse_tagged_text(text)

    def replace(match):
        raw_content = match.group(1)
        parts = raw_content.split("|")
        head = parts[0]
        if head == "number":
            return format_number(float(Decimal(parts[1])), int(parts[2]), locale)

        value = Decimal(parts[1])
        unit = parts[2]
        precision = int(parts[3])
        preference = auto_measurement_preference(measure_family(unit), locale)
        target_unit = target_unit_for_preference(unit, preference)
        return format_measure(convert_measure(value, unit, target_unit), target_unit, precision, locale)

    return re.sub(r"\{\{([^{}]+)\}\}", replace, text)


def has_hardcoded_units(text):
    if not isinstance(text, str) or "{{measure|" in text:
        return False
    return any(pattern.search(text) for pattern in HARD_CODED_UNIT_PATTERNS)


def collect_quiz_documents(data, file_errors):
    variants = data.get("variants")
    if variants is None:
        return [("", data)]

    if "id" not in data:
        file_errors.append("Missing 'id'")
    if "title" not in data:
        file_errors.append("Missing 'title'")
    if "category" not in data:
        file_errors.append("Missing 'category'")
    if not isinstance(variants, dict):
        file_errors.append("Field 'variants' must be an object")
        return []

    expected = {"easy", "medium", "hard"}
    missing = sorted(expected - set(variants))
    extra = sorted(set(variants) - expected)
    for difficulty in missing:
        file_errors.append(f"Missing variant '{difficulty}'")
    for difficulty in extra:
        file_errors.append(f"Unexpected variant '{difficulty}'")

    documents = []
    for difficulty in ("easy", "medium", "hard"):
        variant = variants.get(difficulty)
        if not isinstance(variant, dict):
            continue
        documents.append((difficulty, variant))
    return documents


def validate_quiz_document(data, filename, label, file_errors, file_warnings, fact_occurrences):
    prefix = f"{label} " if label else ""

    if "id" not in data:
        file_errors.append(f"{prefix}missing 'id'")
    if "title" not in data:
        file_errors.append(f"{prefix}missing 'title'")
    if "sections" not in data:
        file_errors.append(f"{prefix}missing 'sections'")
        return

    multiple_choice_count = 0
    true_false_count = 0
    for section_index, section in enumerate(data["sections"]):
        if "title" not in section:
            file_errors.append(f"{prefix}section {section_index} missing 'title'")
        if "items" not in section:
            file_errors.append(f"{prefix}section {section_index} missing 'items'")
            continue

        for item_index, item in enumerate(section["items"]):
            item_label = f"{prefix}Item {item_index}"
            if "type" not in item:
                file_errors.append(f"{item_label} missing 'type'")
            if "q" not in item:
                file_errors.append(f"{item_label} missing 'q'")
            if "a" not in item:
                file_errors.append(f"{item_label} missing 'a'")
            if "explanation" not in item:
                file_errors.append(f"{item_label} missing 'explanation'")

            question = item.get("q", "")
            answer = item.get("a", "")
            explanation = item.get("explanation", "")

            for value, field_name in ((question, "q"), (answer, "a"), (explanation, "explanation")):
                if not isinstance(value, str):
                    continue
                for bad_string in BAD_STRINGS:
                    if bad_string.lower() in value.lower():
                        file_errors.append(f"{item_label} {field_name} contains AI artifact: '{bad_string}'")
                        break
                try:
                    parse_tagged_text(value)
                except ValueError as exc:
                    file_errors.append(f"{item_label} {field_name} has invalid locale tag markup: {exc}")
                if has_hardcoded_units(value):
                    file_warnings.append(f"{item_label} {field_name} hardcodes display units; prefer locale-aware tags")

            if "(set " in question.lower():
                file_errors.append(f"{item_label} q contains internal authoring marker")

            if is_exact_tautology(question, answer, explanation):
                file_errors.append(f"{item_label} explanation is an exact answer restatement")

            fact_key = extract_fact_key(question)
            if fact_key:
                fact_occurrences.setdefault(fact_key, []).append((filename, label, item_index, question))

            if is_risky_trivia(question):
                file_warnings.append(f"{item_label} q is risky trivia without an explicit metric, date, or authority")

            item_type = item.get("type")
            if item_type == "self-eval":
                file_errors.append(f"{item_label} uses retired type 'self-eval'")

            if item_type in {"multiple-choice", "true-false"}:
                options = item.get("options")
                if not isinstance(options, list):
                    file_errors.append(f"{item_label} missing 'options' for type {item_type}")
                else:
                    if any(not isinstance(option, str) for option in options):
                        file_errors.append(f"{item_label} options must all be strings")
                    elif answer not in options:
                        file_errors.append(f"{item_label} answer is not present in 'options'")
                    else:
                        for option_index, option in enumerate(options):
                            try:
                                parse_tagged_text(option)
                            except ValueError as exc:
                                file_errors.append(
                                    f"{item_label} option {option_index} has invalid locale tag markup: {exc}"
                                )
                            if has_hardcoded_units(option):
                                file_warnings.append(
                                    f"{item_label} option {option_index} hardcodes display units; prefer locale-aware tags"
                                )

                        if item_type == "multiple-choice":
                            for locale in REPRESENTATIVE_LOCALES:
                                rendered_options = [render_tagged_text(option, locale) for option in options]
                                if len(rendered_options) != len(set(rendered_options)):
                                    file_errors.append(
                                        f"{item_label} contains locale-colliding options for {locale}"
                                    )
                                    break

                if item_type == "true-false" and options != ["True", "False"]:
                    file_errors.append(f"{item_label} true-false options must be exactly ['True', 'False']")

                if item_type == "multiple-choice":
                    multiple_choice_count += 1
                else:
                    true_false_count += 1

    if multiple_choice_count != 8 or true_false_count != 2:
        file_errors.append(
            f"{prefix}quiz must contain exactly 8 multiple-choice and 2 true-false questions, found {multiple_choice_count} and {true_false_count}"
        )


def main():
    errors = {}
    warnings = {}
    fact_occurrences = {}
    scheduled_entries = load_daily_schedule()
    scheduled_files = [entry["file"] for entry in scheduled_entries if entry.get("file")]

    for index, entry in enumerate(scheduled_entries):
        filepath = entry.get("file")
        if not filepath:
            append_issue(errors, "daily_schedule.json", f"Entry {index} is missing 'file'")
            continue
        if not os.path.exists(os.path.join(QUIZZES_DIR, filepath)):
            append_issue(errors, "daily_schedule.json", f"Entry {index} points to missing file '{filepath}'")

    root_quiz_files = {
        name
        for name in os.listdir(QUIZZES_DIR)
        if name.endswith(".json") and name != "daily_schedule.json"
    }
    scheduled_file_set = set(scheduled_files)

    unexpected_files = sorted(root_quiz_files - scheduled_file_set)
    if unexpected_files:
        errors["daily_schedule.json"] = errors.get("daily_schedule.json", []) + [
            f"Unexpected quiz file present outside daily schedule: {name}" for name in unexpected_files
        ]

    for filename in scheduled_files:
        filepath = os.path.join(QUIZZES_DIR, filename)
        file_errors = []
        file_warnings = []

        try:
            with open(filepath, "r", encoding="utf-8") as handle:
                data = json.load(handle, object_pairs_hook=dict_raise_on_duplicates)
        except Exception as exc:
            errors[filename] = [f"JSON parsing error: {exc}"]
            continue

        documents = collect_quiz_documents(data, file_errors)
        for label, document in documents:
            validate_quiz_document(document, filename, label, file_errors, file_warnings, fact_occurrences)

        if file_errors:
            errors[filename] = file_errors
        if file_warnings:
            warnings[filename] = file_warnings

        if not file_errors:
            for label, document in documents:
                semantic_issues = audit_quiz_document(document)
                prefix = f"{label} " if label else ""
                for issue in semantic_issues:
                    append_issue(
                        errors,
                        filename,
                        f"{prefix}Item {issue.item_index} semantic audit [{issue.code}]: {issue.message}",
                    )

    for (relation, entity), occurrences in fact_occurrences.items():
        if len(occurrences) <= 1:
            continue
        for occurrence_filename, label, item_index, _question in occurrences:
            prefix = f"{label} " if label else ""
            append_issue(
                errors,
                occurrence_filename,
                f"{prefix}Item {item_index} duplicates canonical fact key '{relation}:{entity}'",
            )

    with open(ERRORS_PATH, "w", encoding="utf-8") as handle:
        json.dump(errors, handle, indent=2)
        handle.write("\n")

    with open(WARNINGS_PATH, "w", encoding="utf-8") as handle:
        json.dump(warnings, handle, indent=2)
        handle.write("\n")

    error_count = len(errors)
    warning_count = len(warnings)
    print(f"Validation complete, found errors in {error_count} files and warnings in {warning_count} files.")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
