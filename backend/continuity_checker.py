import json
import re
from pathlib import Path


DATA_DIR = Path("data")


# ==================================================
# Load Canon
# ==================================================

def load_canon(manuscript_name: str) -> dict:

    manuscript_dir = (
        DATA_DIR
        / Path(manuscript_name).stem
    )

    canon_path = manuscript_dir / "canon.json"

    if not canon_path.exists():
        raise FileNotFoundError(
            f"Canon not found for {manuscript_name}"
        )

    with canon_path.open(
        "r",
        encoding="utf-8"
    ) as file:

        return json.load(file)


# ==================================================
# Text Utilities
# ==================================================

def normalize_text(value: str) -> str:

    return (
        str(value)
        .strip()
        .lower()
    )


def clean_text(value: str) -> str:

    text = normalize_text(value)

    text = re.sub(
        r"[^a-z0-9\s]",
        " ",
        text
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text.strip()


# ==================================================
# Number Words
# ==================================================

NUMBER_WORDS = {

    "zero": 0,
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
    "seven": 7,
    "eight": 8,
    "nine": 9,
    "ten": 10,

    "eleven": 11,
    "twelve": 12,
    "thirteen": 13,
    "fourteen": 14,
    "fifteen": 15,
    "sixteen": 16,
    "seventeen": 17,
    "eighteen": 18,
    "nineteen": 19,

    "twenty": 20,
    "thirty": 30,
    "forty": 40,
    "fifty": 50,
    "sixty": 60,
    "seventy": 70,
    "eighty": 80,
    "ninety": 90
}


def word_to_number(text: str):

    text = (
        text
        .lower()
        .replace("-", " ")
    )

    words = text.split()

    total = 0
    found_number = False

    for word in words:

        if word in NUMBER_WORDS:

            total += NUMBER_WORDS[word]

            found_number = True

    if found_number:
        return total

    return None


# ==================================================
# Character Age
# ==================================================

def extract_age(detail: str):

    text = normalize_text(detail)

    numeric_match = re.search(
        r"\b(\d{1,3})\s*(?:year|years)\s*old\b",
        text
    )

    if numeric_match:

        return int(
            numeric_match.group(1)
        )

    written_match = re.search(
        r"\b([a-z]+(?:\s+[a-z]+)?(?:-[a-z]+)?)"
        r"\s*(?:year|years)\s*old\b",
        text
    )

    if written_match:

        return word_to_number(
            written_match.group(1)
        )

    return None


# ==================================================
# Character Age Conflicts
# ==================================================

def check_character_age_conflicts(
    characters: dict
) -> list[dict]:

    conflicts = []

    for character_name, character_data in characters.items():

        details = character_data.get(
            "details",
            []
        )

        age_entries = []

        for detail_entry in details:

            if isinstance(
                detail_entry,
                dict
            ):

                detail = detail_entry.get(
                    "detail",
                    ""
                )

                chapter = detail_entry.get(
                    "chapter"
                )

            else:

                detail = str(
                    detail_entry
                )

                chapter = None

            age = extract_age(
                detail
            )

            if age is not None:

                age_entries.append({

                    "age": age,

                    "detail": detail,

                    "chapter": chapter
                })

        unique_ages = sorted(
            {
                entry["age"]
                for entry in age_entries
            }
        )

        if len(unique_ages) > 1:

            conflicts.append({

                "type":
                    "character_age_conflict",

                "severity":
                    "high",

                "character":
                    character_name,

                "message":
                    (
                        f"{character_name} "
                        f"has conflicting ages."
                    ),

                "evidence":
                    age_entries
            })

    return conflicts


# ==================================================
# Date Extraction
# ==================================================

MONTHS = {

    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12
}


def extract_year(text: str):

    match = re.search(
        r"\b(19\d{2}|20\d{2})\b",
        text
    )

    if match:

        return int(
            match.group(1)
        )

    return None


def extract_month_year(text: str):

    text_lower = normalize_text(
        text
    )

    year = extract_year(
        text_lower
    )

    if year is None:
        return None

    for month_name, month_number in MONTHS.items():

        if month_name in text_lower:

            return (
                month_number,
                year
            )

    return None


# ==================================================
# Timeline Subject Extraction
# ==================================================

STOP_WORDS = {

    "the",
    "a",
    "an",
    "his",
    "her",
    "their",
    "this",
    "that",
    "was",
    "were",
    "is",
    "are",
    "had",
    "has",
    "have",
    "in",
    "on",
    "at",
    "to",
    "from",
    "for",
    "of",
    "and",
    "with",
    "according",
    "memory",
    "record",
    "date",
    "year",
    "month",
    "journey",
    "trip",
    "event",
    "happened",
    "occurred",
    "took",
    "taken",
    "booked",
    "scheduled",
    "original",
    "first"
}


def extract_named_entities(
    text: str
) -> list[str]:

    entities = []

    pattern = re.compile(
        r"\b(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b"
    )

    for match in pattern.finditer(
        text
    ):

        value = match.group(
            0
        ).strip()

        if value not in entities:

            entities.append(
                value
            )

    return entities


def timeline_subject_key(
    text: str
) -> str:

    cleaned = clean_text(
        text
    )

    cleaned = re.sub(
        r"\b(?:19|20)\d{2}\b",
        " ",
        cleaned
    )

    for month in MONTHS:

        cleaned = re.sub(
            rf"\b{month}\b",
            " ",
            cleaned
        )

    words = [
        word
        for word in cleaned.split()
        if word not in STOP_WORDS
    ]

    if not words:
        return ""

    entities = extract_named_entities(
        text
    )

    entity_words = []

    for entity in entities:

        entity_words.extend(
            clean_text(
                entity
            ).split()
        )

    important_words = []

    for word in words:

        if (
            len(word) >= 3
            and word not in important_words
        ):

            important_words.append(
                word
            )

    combined = (
        entity_words
        + important_words
    )

    unique_words = []

    for word in combined:

        if word not in unique_words:

            unique_words.append(
                word
            )

    return " ".join(
        sorted(
            unique_words
        )
    )


# ==================================================
# Timeline Similarity
# ==================================================

def timeline_similarity(
    first: str,
    second: str
) -> float:

    first_words = set(
        timeline_subject_key(
            first
        ).split()
    )

    second_words = set(
        timeline_subject_key(
            second
        ).split()
    )

    if not first_words or not second_words:

        return 0.0

    intersection = (
        first_words
        & second_words
    )

    union = (
        first_words
        | second_words
    )

    return (
        len(intersection)
        /
        len(union)
    )


# ==================================================
# Generic Timeline Conflict Detection
# ==================================================

def check_timeline_conflicts(
    timeline: list
) -> list[dict]:

    conflicts = []

    timeline_entries = []

    for item in timeline:

        if isinstance(
            item,
            dict
        ):

            detail = item.get(
                "fact",
                item.get(
                    "description",
                    item.get(
                        "detail",
                        ""
                    )
                )
            )

            chapter = item.get(
                "chapter"
            )

        else:

            detail = str(
                item
            )

            chapter = None

        if not detail:
            continue

        date_value = extract_month_year(
            detail
        )

        if date_value is None:
            continue

        subject_key = timeline_subject_key(
            detail
        )

        if not subject_key:
            continue

        timeline_entries.append({

            "detail":
                detail,

            "chapter":
                chapter,

            "month":
                date_value[0],

            "year":
                date_value[1],

            "subject_key":
                subject_key
        })

    groups = []

    for entry in timeline_entries:

        matched_group = None

        for group in groups:

            similarity = max(

                timeline_similarity(
                    entry["detail"],
                    existing["detail"]
                )

                for existing in group
            )

            if similarity >= 0.45:

                matched_group = group

                break

        if matched_group is None:

            groups.append([
                entry
            ])

        else:

            matched_group.append(
                entry
            )

    for group in groups:

        if len(group) < 2:
            continue

        unique_dates = sorted(
            {
                (
                    entry["month"],
                    entry["year"]
                )

                for entry in group
            }
        )

        if len(unique_dates) <= 1:
            continue

        evidence = []

        for entry in group:

            evidence.append({

                "detail":
                    entry["detail"],

                "chapter":
                    entry["chapter"],

                "month":
                    entry["month"],

                "year":
                    entry["year"]
            })

        message = (
            "Related timeline facts contain "
            "conflicting dates."
        )

        entities = extract_named_entities(
            group[0]["detail"]
        )

        if entities:

            if len(entities) == 1:

                message = (
                    f"Timeline information "
                    f"about {entities[0]} "
                    f"contains conflicting dates."
                )

        conflicts.append({

            "type":
                "timeline_conflict",

            "severity":
                "high",

            "message":
                message,

            "evidence":
                evidence
        })

    return conflicts


# ==================================================
# Relationship Conflict Detection
# ==================================================

def check_relationship_conflicts(
    relationships: list
) -> list[dict]:

    conflicts = []

    younger_sister = []
    older_sister = []

    for item in relationships:

        if isinstance(
            item,
            dict
        ):

            relationship = item.get(
                "relationship",
                ""
            )

            chapter = item.get(
                "chapter"
            )

        else:

            relationship = str(
                item
            )

            chapter = None

        relationship_lower = normalize_text(
            relationship
        )

        if "younger sister" in relationship_lower:

            younger_sister.append({

                "relationship":
                    relationship,

                "chapter":
                    chapter
            })

        if "older sister" in relationship_lower:

            older_sister.append({

                "relationship":
                    relationship,

                "chapter":
                    chapter
            })

    if younger_sister and older_sister:

        conflicts.append({

            "type":
                "relationship_conflict",

            "severity":
                "high",

            "message":
                (
                    "A character is described "
                    "as both a younger and older "
                    "sister."
                ),

            "evidence": {

                "younger_sister":
                    younger_sister,

                "older_sister":
                    older_sister
            }
        })

    return conflicts


# ==================================================
# Location Conflict Detection
# ==================================================

def check_location_conflicts(
    locations: dict
) -> list[dict]:

    conflicts = []

    return conflicts


# ==================================================
# Chapter Data Extraction
# ==================================================

def extract_chapter_data(
    canon: dict
) -> list[dict]:

    manuscript_name = canon.get(
        "manuscript",
        ""
    )

    manuscript_dir = (
        DATA_DIR
        / Path(manuscript_name).stem
    )

    chapter_files = sorted(
        manuscript_dir.glob(
            "chapter_*_facts.json"
        )
    )

    chapters = []

    for file_path in chapter_files:

        try:

            with file_path.open(
                "r",
                encoding="utf-8"
            ) as file:

                chapter = json.load(
                    file
                )

        except Exception:

            continue

        if chapter.get(
            "status"
        ) != "success":

            continue

        chapters.append({

            "chapter":
                chapter.get(
                    "chapter_number"
                ),

            "facts":
                chapter.get(
                    "facts",
                    {}
                )
        })

    return chapters


# ==================================================
# POV Helpers
# ==================================================

def normalize_pov_type(
    pov_type: str
) -> str:

    value = normalize_text(
        pov_type
    )

    value = value.replace(
        "-",
        "_"
    ).replace(
        " ",
        "_"
    )

    return value


def is_first_person(
    pov_type: str
) -> bool:

    value = normalize_pov_type(
        pov_type
    )

    return (
        "first_person" in value
        or value == "first"
    )


def is_third_person(
    pov_type: str
) -> bool:

    value = normalize_pov_type(
        pov_type
    )

    return (
        "third_person" in value
        or value == "third"
    )


# ==================================================
# POV Conflict Detection
# ==================================================

def check_pov_conflicts(
    chapters: list
) -> list[dict]:

    conflicts = []

    pov_entries = []

    for chapter in chapters:

        if not isinstance(
            chapter,
            dict
        ):
            continue

        chapter_number = chapter.get(
            "chapter"
        )

        facts = chapter.get(
            "facts",
            {}
        )

        pov = facts.get(
            "point_of_view"
        )

        if not isinstance(
            pov,
            dict
        ):
            continue

        pov_type = normalize_pov_type(
            pov.get(
                "type",
                ""
            )
        )

        character = pov.get(
            "character"
        )

        if not pov_type:
            continue

        pov_entries.append({

            "chapter":
                chapter_number,

            "type":
                pov_type,

            "character":
                character,

            "evidence":
                pov.get(
                    "evidence",
                    []
                )
        })

    if len(pov_entries) < 2:
        return conflicts

    # --------------------------------------------------
    # First-person vs third-person
    # --------------------------------------------------

    first_person_entries = [
        entry
        for entry in pov_entries
        if is_first_person(
            entry["type"]
        )
    ]

    third_person_entries = [
        entry
        for entry in pov_entries
        if is_third_person(
            entry["type"]
        )
    ]

    if (
        first_person_entries
        and third_person_entries
    ):

        conflicts.append({

            "type":
                "pov_conflict",

            "severity":
                "medium",

            "message":
                (
                    "The manuscript switches "
                    "between first-person and "
                    "third-person narration."
                ),

            "evidence":
                (
                    first_person_entries
                    +
                    third_person_entries
                )
        })

        return conflicts

    # --------------------------------------------------
    # Third-person limited POV rotation
    # --------------------------------------------------
    #
    # Multiple third-person limited characters
    # are NOT automatically considered a conflict.
    #
    # A novel may intentionally rotate POV.
    #
    # We only report this as a possible issue when
    # the POV character changes in consecutive
    # chapters without an objective/structural
    # explanation.
    # --------------------------------------------------

    limited_entries = [

        entry

        for entry in pov_entries

        if (
            entry["type"]
            == "third_person_limited"
        )
    ]

    if len(limited_entries) < 3:
        return conflicts

    consecutive_switches = []

    ordered_entries = sorted(
        limited_entries,
        key=lambda item: (
            item["chapter"]
            if item["chapter"] is not None
            else 0
        )
    )

    for index in range(
        1,
        len(ordered_entries)
    ):

        previous = ordered_entries[
            index - 1
        ]

        current = ordered_entries[
            index
        ]

        previous_character = normalize_text(
            previous.get(
                "character",
                ""
            )
        )

        current_character = normalize_text(
            current.get(
                "character",
                ""
            )
        )

        if (
            previous_character
            and current_character
            and previous_character
            != current_character
        ):

            consecutive_switches.append({

                "from_chapter":
                    previous["chapter"],

                "from_character":
                    previous["character"],

                "to_chapter":
                    current["chapter"],

                "to_character":
                    current["character"]
            })

    # --------------------------------------------------
    # Do NOT flag normal multi-POV novels.
    #
    # Only flag if every adjacent chapter changes
    # POV character AND there is a very strong pattern
    # suggesting an accidental switch.
    #
    # This avoids the false-positive behavior we had
    # previously.
    # --------------------------------------------------

    if (
        len(consecutive_switches) >= 3
        and len(consecutive_switches)
        == len(ordered_entries) - 1
    ):

        conflicts.append({

            "type":
                "pov_rotation_warning",

            "severity":
                "low",

            "message":
                (
                    "The manuscript changes "
                    "third-person limited POV "
                    "character in consecutive "
                    "chapters."
                ),

            "evidence":
                consecutive_switches
        })

    return conflicts


# ==================================================
# Narrative Tense Conflict Detection
# ==================================================

def check_tense_conflicts(
    chapters: list
) -> list[dict]:

    conflicts = []

    tense_entries = []

    for chapter in chapters:

        if not isinstance(
            chapter,
            dict
        ):
            continue

        chapter_number = chapter.get(
            "chapter"
        )

        facts = chapter.get(
            "facts",
            {}
        )

        tense = facts.get(
            "narrative_tense"
        )

        if not isinstance(
            tense,
            dict
        ):
            continue

        primary = normalize_text(
            tense.get(
                "primary",
                ""
            )
        )

        if not primary:
            continue

        tense_entries.append({

            "chapter":
                chapter_number,

            "primary":
                primary,

            "secondary":
                tense.get(
                    "secondary"
                ),

            "evidence":
                tense.get(
                    "evidence",
                    []
                )
        })

    if len(tense_entries) < 2:
        return conflicts

    # --------------------------------------------------
    # Only PRIMARY tense matters here.
    #
    # Secondary tenses such as past_perfect are normal
    # in a past-tense narrative and must NOT create
    # a conflict.
    # --------------------------------------------------

    unique_primary_tenses = sorted(
        {
            entry["primary"]
            for entry in tense_entries
        }
    )

    if len(unique_primary_tenses) <= 1:
        return conflicts

    # --------------------------------------------------
    # Find actual primary-tense transitions
    # --------------------------------------------------

    transitions = []

    ordered_entries = sorted(
        tense_entries,
        key=lambda item: (
            item["chapter"]
            if item["chapter"] is not None
            else 0
        )
    )

    for index in range(
        1,
        len(ordered_entries)
    ):

        previous = ordered_entries[
            index - 1
        ]

        current = ordered_entries[
            index
        ]

        if (
            previous["primary"]
            != current["primary"]
        ):

            transitions.append({

                "from_chapter":
                    previous["chapter"],

                "from_tense":
                    previous["primary"],

                "to_chapter":
                    current["chapter"],

                "to_tense":
                    current["primary"],

                "from_evidence":
                    previous["evidence"],

                "to_evidence":
                    current["evidence"]
            })

    if transitions:

        conflicts.append({

            "type":
                "narrative_tense_conflict",

            "severity":
                "medium",

            "message":
                (
                    "The manuscript changes its "
                    "primary narrative tense "
                    "between chapters."
                ),

            "evidence":
                transitions
        })

    return conflicts


# ==================================================
# Main Continuity Checker
# ==================================================

def check_continuity(
    manuscript_name: str
) -> dict:

    canon = load_canon(
        manuscript_name
    )

    # ==================================================
    # Character Age Conflicts
    # ==================================================

    character_conflicts = (
        check_character_age_conflicts(
            canon.get(
                "characters",
                {}
            )
        )
    )

    # ==================================================
    # Relationship Conflicts
    # ==================================================

    relationship_conflicts = (
        check_relationship_conflicts(
            canon.get(
                "relationships",
                []
            )
        )
    )

    # ==================================================
    # Timeline Conflicts
    # ==================================================

    timeline_conflicts = (
        check_timeline_conflicts(
            canon.get(
                "timeline",
                []
            )
        )
    )

    # ==================================================
    # Location Conflicts
    # ==================================================

    location_conflicts = (
        check_location_conflicts(
            canon.get(
                "locations",
                {}
            )
        )
    )

    # ==================================================
    # Chapter-Level Data
    # ==================================================

    chapter_data = extract_chapter_data(
        canon
    )

    # ==================================================
    # POV Conflicts
    # ==================================================

    pov_conflicts = (
        check_pov_conflicts(
            chapter_data
        )
    )

    # ==================================================
    # Narrative Tense Conflicts
    # ==================================================

    tense_conflicts = (
        check_tense_conflicts(
            chapter_data
        )
    )

    # ==================================================
    # Combine
    # ==================================================

    all_conflicts = (
        character_conflicts
        + relationship_conflicts
        + timeline_conflicts
        + location_conflicts
        + pov_conflicts
        + tense_conflicts
    )

    # ==================================================
    # Status
    # ==================================================

    status = (
        "conflicts_found"
        if all_conflicts
        else "consistent"
    )

    # ==================================================
    # Final Result
    # ==================================================

    result = {

        "manuscript":
            manuscript_name,

        "status":
            status,

        "conflict_count":
            len(all_conflicts),

        "conflicts":
            all_conflicts
    }

    # ==================================================
    # Save Report
    # ==================================================

    manuscript_dir = (
        DATA_DIR
        / Path(manuscript_name).stem
    )

    manuscript_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    report_path = (
        manuscript_dir
        / "continuity_report.json"
    )

    with report_path.open(
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            result,
            file,
            indent=2,
            ensure_ascii=False
        )

    return result