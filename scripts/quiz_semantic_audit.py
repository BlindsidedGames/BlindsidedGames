from __future__ import annotations

from dataclasses import dataclass
import re

try:
    from .repair_quiz_distractors import (
        SUBTYPE_SUPERTYPE,
        existing_option_is_compatible,
        infer_subtype,
        is_definition_like,
        is_ship_like,
        is_title_like,
        normalized_key,
    )
except ImportError:
    from repair_quiz_distractors import (
        SUBTYPE_SUPERTYPE,
        existing_option_is_compatible,
        infer_subtype,
        is_definition_like,
        is_ship_like,
        is_title_like,
        normalized_key,
    )


BROAD_SUBTYPES = {
    "definition",
    "music_definition",
    "named_entity",
    "location",
    "term",
    "history_term",
    "map_or_geo_term",
    "event_or_conflict",
    "treaty_or_document",
    "organization",
}

PLANETS = {"mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune"}
RIVERS = {
    "danube", "nile river", "the nile", "amazon river", "the amazon river", "mekong river",
    "seine", "tigris", "oder river", "the congo", "the yangtze", "yellow river", "amur river",
    "the colorado river", "the niger", "the zambezi",
}
STRAITS = {"bering strait", "strait of dover", "the strait of hormuz", "bosphorus"}
SEAS = {"red sea", "the black sea", "the mediterranean sea", "arabian sea"}
OCEANS = {"pacific ocean", "atlantic ocean", "indian ocean", "arctic ocean", "oceans"}
LAKES = {"lake victoria", "lake titicaca", "lake baikal", "lake superior"}
CANALS = {"suez canal", "panama canal", "kiel canal", "corinth canal"}
CURRENTS = {"north atlantic drift", "gulf stream", "humboldt current", "kuroshio current"}
MOUNTAIN_RANGES = {"ural mountains", "the himalayas", "the andes", "the appalachian mountains", "alps"}
DESERTS = {"the sahara desert", "gobi desert", "the atacama desert", "kalahari desert"}
PEAKS = {"aconcagua", "mount everest", "k2", "mauna kea in hawaii"}
LEADING_ARTICLE_RE = re.compile(r"^(?:a|an|the)\s+", re.I)
TRAILING_PUNCTUATION_RE = re.compile(r"[.!?]+$")
PARENTHETICAL_RE = re.compile(r"\s*\([^)]*\)")
LOADED_WORDS_RE = re.compile(
    r"\b("
    r"fundamentally|incredibly|profoundly|colossal|brutally|harshly|violently|"
    r"terribly|shockingly|aggressively|immensely|practically"
    r")\b",
    re.I,
)
MULTI_ANSWER_MARKER_RE = re.compile(
    r"\b(which|what)\s+(two|three)\b|\bat least two\b|\bpair\b|\bpairs\b|\bboth\b|\bname two\b",
    re.I,
)
GENERIC_SUFFIX_RE = re.compile(r"\b(award|awards)\b", re.I)


@dataclass(frozen=True)
class AuditIssue:
    code: str
    message: str
    item_index: int


def _same_bucket(left: str, right: str) -> bool:
    return left == right or SUBTYPE_SUPERTYPE.get(left, left) == SUBTYPE_SUPERTYPE.get(right, right)


def _normalize_option(option: str) -> str:
    return normalized_key(option).rstrip(".")


def _normalized_option_identity(option: str) -> str:
    value = normalize_text(option).lower()
    value = LEADING_ARTICLE_RE.sub("", value)
    value = TRAILING_PUNCTUATION_RE.sub("", value)
    return re.sub(r"\s+", " ", value).strip()


def _normalized_parenthetical_identity(option: str) -> str:
    value = PARENTHETICAL_RE.sub("", normalize_text(option)).lower()
    value = LEADING_ARTICLE_RE.sub("", value)
    value = TRAILING_PUNCTUATION_RE.sub("", value)
    return re.sub(r"\s+", " ", value).strip()


def normalize_text(value: str) -> str:
    return value.replace("\u2019", "'").strip()


def _award_identity(option: str) -> str:
    value = GENERIC_SUFFIX_RE.sub("", _normalized_option_identity(option))
    return re.sub(r"\s+", " ", value).strip()


def _acronym_variant_is_too_close(answer: str, option: str) -> bool:
    answer_tokens = _normalized_option_identity(answer).split()
    option_tokens = _normalized_option_identity(option).split()
    if len(answer_tokens) != len(option_tokens):
        return False

    mismatches = [
        (left, right)
        for left, right in zip(answer_tokens, option_tokens)
        if left != right
    ]
    if len(mismatches) != 1:
        return False

    left, right = mismatches[0]
    return left.startswith(right) or right.startswith(left)


def _option_pair_is_too_close(answer: str, option: str, subtype: str) -> bool:
    if _normalized_parenthetical_identity(answer) == _normalized_parenthetical_identity(option):
        return True
    if subtype == "award_name" and _award_identity(answer) == _award_identity(option):
        return True
    if subtype == "acronym_expansion" and _acronym_variant_is_too_close(answer, option):
        return True
    return False


def _is_multi_answer_shape(option: str, subtype: str) -> bool:
    normalized = normalize_text(option)
    if "," in normalized or " or " in normalized.lower() or "/" in normalized:
        return True
    if subtype in {"who", "scientist", "historical_figure", "historical_ruler", "singer", "actor", "composer", "writer_creator"}:
        return " and " in normalized or "&" in normalized
    return False


def _has_loaded_wording(text: str) -> bool:
    return bool(LOADED_WORDS_RE.search(text))


def _looks_person_like(value: str) -> bool:
    parts = value.replace("’", "'").split()
    if len(parts) < 2 or len(parts) > 5 or "/" in value or "&" in value or value.startswith("The "):
        return False
    return sum(part[:1].isupper() for part in parts) >= max(2, len(parts) - 1)


def _looks_number_like(value: str) -> bool:
    stripped = value.strip().rstrip(".").lower()
    if "{{number|" in stripped or "{{measure|" in stripped:
        return True
    if stripped in {
        "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
        "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
        "seventeen", "eighteen", "nineteen", "twenty",
    }:
        return True
    return stripped.replace(",", "").replace(".", "", 1).isdigit()


def _option_matches(subtype: str, option: str, category: str) -> bool:
    normalized = _normalize_option(option)
    lower = normalized.lower()

    if subtype in {"color", "color_combo"}:
        return any(color in lower for color in ["red", "blue", "green", "yellow", "orange", "purple", "black", "white", "gold", "silver", "pink", "brown"])
    if subtype == "number":
        return _looks_number_like(option)
    if subtype == "planet":
        return lower in PLANETS
    if subtype == "river":
        return "river" in lower or lower in RIVERS
    if subtype == "strait":
        return "strait" in lower or lower in STRAITS
    if subtype == "sea":
        return "sea" in lower or lower in SEAS
    if subtype == "ocean":
        return "ocean" in lower or lower in OCEANS
    if subtype == "lake":
        return "lake" in lower or lower in LAKES
    if subtype == "canal":
        return "canal" in lower or lower in CANALS
    if subtype == "current":
        return "current" in lower or lower in CURRENTS
    if subtype == "mountain_range":
        return "mountains" in lower or "andes" in lower or lower in MOUNTAIN_RANGES
    if subtype == "desert":
        return "desert" in lower or lower in DESERTS
    if subtype == "peak":
        return lower in PEAKS or lower.startswith("mount ") or lower == "k2"
    if subtype in {"who", "scientist", "historical_figure", "singer", "actor", "composer", "writer_creator"}:
        return _looks_person_like(option)
    if subtype in {"definition", "music_definition"}:
        return is_definition_like(option)
    if subtype == "book_title":
        return is_title_like(option)
    if subtype == "historical_ship":
        return is_ship_like(option)
    return existing_option_is_compatible(option, subtype, category)


def audit_multiple_choice_item(
    *,
    category: str,
    item_index: int,
    question: str,
    answer: str,
    options: list[str],
    sibling_answers: dict[str, tuple[str, str]],
) -> list[AuditIssue]:
    issues: list[AuditIssue] = []
    subtype = infer_subtype(question, answer, category)
    normalized_options: dict[str, str] = {}

    for option in options:
        key = _normalized_option_identity(option)
        existing = normalized_options.get(key)
        if existing is not None and existing != option:
            issues.append(
                AuditIssue(
                    code="normalized_duplicate_option",
                    item_index=item_index,
                    message=f"Options '{existing}' and '{option}' collapse to the same normalized answer",
                )
            )
        normalized_options[key] = option

    for option in options:
        if option == answer:
            continue
        if _normalized_option_identity(option) == _normalized_option_identity(answer):
            issues.append(
                AuditIssue(
                    code="answer_option_collision",
                    item_index=item_index,
                    message=f"Distractor '{option}' collapses to the same normalized answer as the correct option",
                )
            )
        elif _option_pair_is_too_close(answer, option, subtype):
            issues.append(
                AuditIssue(
                    code="near_duplicate_option",
                    item_index=item_index,
                    message=f"Distractor '{option}' is too close to the correct answer for '{question}'",
                )
            )

    if not MULTI_ANSWER_MARKER_RE.search(question):
        list_like_options = [option for option in options if _is_multi_answer_shape(option, subtype)]
        if len(list_like_options) == 1 and list_like_options[0] == answer:
            issues.append(
                AuditIssue(
                    code="multi_answer_outlier",
                    item_index=item_index,
                    message=f"Correct option '{answer}' is the only multi-part answer in a single-answer question",
                )
            )
        elif len(list_like_options) == 1 and list_like_options[0] != answer:
            issues.append(
                AuditIssue(
                    code="multi_answer_outlier",
                    item_index=item_index,
                    message=f"Distractor '{list_like_options[0]}' is the only multi-part option in a single-answer question",
                )
            )

    distractors = [option for option in options if option != answer]
    for distractor in distractors:
        if not _option_matches(subtype, distractor, category):
            issues.append(
                AuditIssue(
                    code="option_type_mismatch",
                    item_index=item_index,
                    message=f"Distractor '{distractor}' does not match the expected answer class for '{question}'",
                )
            )

        sibling = sibling_answers.get(normalized_key(distractor))
        if sibling is None:
            continue
        sibling_answer, sibling_subtype = sibling
        if sibling_answer == answer:
            continue
        if subtype in BROAD_SUBTYPES or sibling_subtype in BROAD_SUBTYPES:
            continue
        if not _same_bucket(subtype, sibling_subtype):
            issues.append(
                AuditIssue(
                    code="same_quiz_answer_leakage",
                    item_index=item_index,
                    message=(
                        f"Distractor '{distractor}' matches another answer in the same quiz but belongs to a different answer class"
                    ),
                )
            )

    answer_is_definition = is_definition_like(answer)
    if answer_is_definition:
        for distractor in distractors:
            if not is_definition_like(distractor):
                issues.append(
                    AuditIssue(
                        code="sentence_length_outlier",
                        item_index=item_index,
                        message=f"Distractor '{distractor}' is not definition-like enough for '{question}'",
                    )
                )

    return issues


def audit_quiz_document(document: dict) -> list[AuditIssue]:
    issues: list[AuditIssue] = []
    for section in document.get("sections", []):
        category = section.get("title", "")
        items = section.get("items", [])
        sibling_answers = {
            normalized_key(item.get("a", "")): (item.get("a", ""), infer_subtype(item.get("q", ""), item.get("a", ""), category))
            for item in items
            if item.get("type") == "multiple-choice"
        }

        for item_index, item in enumerate(items):
            if _has_loaded_wording(item.get("q", "")):
                issues.append(
                    AuditIssue(
                        code="loaded_wording",
                        item_index=item_index,
                        message=f"Question wording contains loaded or unnecessary intensifier text: '{item.get('q', '')}'",
                    )
                )
            if _has_loaded_wording(item.get("explanation", "")):
                issues.append(
                    AuditIssue(
                        code="loaded_wording",
                        item_index=item_index,
                        message=f"Explanation wording contains loaded or unnecessary intensifier text: '{item.get('explanation', '')}'",
                    )
                )
            if item.get("type") != "multiple-choice":
                continue
            issues.extend(
                audit_multiple_choice_item(
                    category=category,
                    item_index=item_index,
                    question=item.get("q", ""),
                    answer=item.get("a", ""),
                    options=item.get("options", []),
                    sibling_answers=sibling_answers,
                )
            )

    deduped: list[AuditIssue] = []
    seen = set()
    for issue in issues:
        marker = (issue.code, issue.item_index, issue.message)
        if marker in seen:
            continue
        seen.add(marker)
        deduped.append(issue)
    return deduped
