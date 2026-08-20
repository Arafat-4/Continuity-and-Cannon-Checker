from pathlib import Path
import re
import json
from collections import defaultdict

from fastapi import (
    FastAPI,
    UploadFile,
    File,
    HTTPException,
    Query
)

from fastapi.middleware.cors import CORSMiddleware

from pypdf import PdfReader

from fact_extractor import (
    extract_story_facts
)

from data.storage import (
    save_chapter_facts,
    load_chapter_facts
)

from canon_store import (
    build_canon
)

from continuity_checker import (
    check_continuity
)

from review_store import (
    generate_conflict_id,
    save_review,
    get_all_reviews
)


# ==================================================
# FASTAPI APPLICATION
# ==================================================

app = FastAPI(
    title="Continuity & Canon Checker"
)



# ==================================================
# CORS
# ==================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://continuity-canon-checker.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================================================
# ROOT
# ==================================================

@app.get("/")
def root():

    return {
        "message":
            "Continuity & Canon Checker API is running!"
    }


# ==================================================
# UPLOAD MANUSCRIPT
# ==================================================

@app.post("/upload")
async def upload_manuscript(
    file: UploadFile = File(...)
):

    if not file.filename:

        raise HTTPException(
            status_code=400,
            detail="No filename provided."
        )

    if not file.filename.lower().endswith(".pdf"):

        raise HTTPException(
            status_code=400,
            detail="Only PDF files are supported."
        )

    upload_dir = Path("uploads")

    upload_dir.mkdir(
        exist_ok=True
    )

    file_path = (
        upload_dir
        / file.filename
    )

    try:

        file_contents = await file.read()

        with file_path.open(
            "wb"
        ) as buffer:

            buffer.write(
                file_contents
            )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=(
                f"Could not save uploaded PDF: "
                f"{error}"
            )
        )

    print(
        f"\nUploaded manuscript: "
        f"{file.filename}"
    )

    try:

        reader = PdfReader(
            str(file_path)
        )

    except Exception as error:

        raise HTTPException(
            status_code=400,
            detail=(
                f"Could not read PDF: "
                f"{error}"
            )
        )

    pages_text = []

    for page in reader.pages:

        try:

            text = page.extract_text()

            if text:

                pages_text.append(
                    text
                )

        except Exception as error:

            print(
                f"Could not extract text "
                f"from a page: {error}"
            )

    full_text = "\n".join(
        pages_text
    )

    if not full_text.strip():

        raise HTTPException(
            status_code=400,
            detail=(
                "Could not extract text "
                "from the PDF."
            )
        )

    chapters = detect_chapters(
        full_text
    )

    if not chapters:

        raise HTTPException(
            status_code=400,
            detail=(
                "No chapters detected. "
                "Make sure your manuscript "
                "contains headings such as "
                "'Chapter 1', 'Chapter 2', etc."
            )
        )

    print(
        f"Detected "
        f"{len(chapters)} chapters."
    )

    analyzed_chapters = []

    successful_chapters = 0
    skipped_chapters = 0
    failed_chapters = 0

    quota_exhausted = False

    for chapter in chapters:

        chapter_number = (
            chapter["chapter_number"]
        )

        print(
            f"\nAnalyzing Chapter "
            f"{chapter_number} "
            f"of {len(chapters)}..."
        )

        try:

            existing_result = (
                load_chapter_facts(
                    file.filename,
                    chapter_number
                )
            )

        except Exception as error:

            print(
                f"Could not load existing "
                f"Chapter {chapter_number}: "
                f"{error}"
            )

            existing_result = None

        if (
            existing_result
            and existing_result.get(
                "status"
            ) == "success"
        ):

            print(
                f"Chapter "
                f"{chapter_number} "
                f"already analyzed. "
                f"Skipping Gemini."
            )

            analyzed_chapters.append(
                existing_result
            )

            # Already-successful chapters are still
            # counted as analyzed for the UI.
            successful_chapters += 1
            skipped_chapters += 1

            continue

        try:

            facts = extract_story_facts(
                chapter["text"],
                chapter_number
            )

            chapter_result = {

                "chapter_number":
                    chapter_number,

                "title":
                    chapter["title"],

                "status":
                    "success",

                "extraction_schema_version":
                    2,

                "facts":
                    facts.model_dump()
            }

            save_chapter_facts(
                file.filename,
                chapter_number,
                chapter_result
            )

            analyzed_chapters.append(
                chapter_result
            )

            successful_chapters += 1

            print(
                f"Chapter "
                f"{chapter_number} "
                f"analyzed and saved "
                f"successfully."
            )

        except RuntimeError as error:

            error_text = str(
                error
            ).lower()

            if (
                "quota"
                in error_text
                or
                "exhausted"
                in error_text
            ):

                print(
                    "\nGemini quota exhausted."
                )

                print(
                    "Stopping Gemini processing "
                    "without losing saved results."
                )

                quota_exhausted = True

                break

            print(
                f"Chapter "
                f"{chapter_number} "
                f"failed: "
                f"{error}"
            )

            failed_chapters += 1

            analyzed_chapters.append({

                "chapter_number":
                    chapter_number,

                "title":
                    chapter["title"],

                "status":
                    "failed",

                "facts":
                    None,

                "error":
                    str(error)
            })

        except Exception as error:

            print(
                f"Chapter "
                f"{chapter_number} "
                f"failed: "
                f"{error}"
            )

            failed_chapters += 1

            analyzed_chapters.append({

                "chapter_number":
                    chapter_number,

                "title":
                    chapter["title"],

                "status":
                    "failed",

                "facts":
                    None,

                "error":
                    str(error)
            })

    if quota_exhausted:

        message = (
            "Processing paused because "
            "Gemini API quota was exhausted. "
            "Successfully analyzed chapters "
            "were saved and can be resumed later."
        )

    else:

        message = (
            "Manuscript processing completed."
        )

    return {

        "filename":
            file.filename,

        "pages":
            len(reader.pages),

        "characters":
            len(full_text),

        "chapter_count":
            len(chapters),

        "successful_chapters":
            successful_chapters,

        "skipped_chapters":
            skipped_chapters,

        "failed_chapters":
            failed_chapters,

        "quota_exhausted":
            quota_exhausted,

        "chapters":
            analyzed_chapters,

        "message":
            message
    }


# ==================================================
# BUILD CANON
# ==================================================

@app.post(
    "/build-canon/{manuscript_name}"
)
def create_canon(
    manuscript_name: str
):

    try:

        canon = build_canon(
            manuscript_name
        )

        return {

            "message":
                "Canon built successfully.",

            "manuscript":
                manuscript_name,

            "character_count":
                len(
                    canon.get(
                        "characters",
                        {}
                    )
                ),

            "event_count":
                len(
                    canon.get(
                        "events",
                        []
                    )
                ),

            "location_count":
                len(
                    canon.get(
                        "locations",
                        {}
                    )
                ),

            "timeline_count":
                len(
                    canon.get(
                        "timeline",
                        []
                    )
                ),

            "relationship_count":
                len(
                    canon.get(
                        "relationships",
                        []
                    )
                )
        }

    except FileNotFoundError as error:

        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ==================================================
# GET CANON
# ==================================================

@app.get(
    "/canon/{manuscript_name}"
)
def get_canon(
    manuscript_name: str
):

    canon_path = (
        Path("data")
        / Path(manuscript_name).stem
        / "canon.json"
    )

    if not canon_path.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "Canon not found for this manuscript. "
                "Build the canon first."
            )
        )

    try:

        with canon_path.open(
            "r",
            encoding="utf-8"
        ) as file:

            canon = json.load(
                file
            )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )

    return {

        "manuscript":
            manuscript_name,

        "status":
            "success",

        "canon":
            canon
    }


# ==================================================
# GET CHAPTERS
# ==================================================

@app.get(
    "/chapters/{manuscript_name}"
)
def get_chapters(
    manuscript_name: str
):

    manuscript_dir = (
        Path("data")
        / Path(manuscript_name).stem
    )

    if not manuscript_dir.exists():

        raise HTTPException(
            status_code=404,
            detail=(
                "No stored analysis found "
                "for this manuscript."
            )
        )

    chapter_files = sorted(
        manuscript_dir.glob(
            "chapter_*_facts.json"
        )
    )

    if not chapter_files:

        raise HTTPException(
            status_code=404,
            detail=(
                "No analyzed chapters found "
                "for this manuscript."
            )
        )

    chapters = []

    for chapter_file in chapter_files:

        try:

            with chapter_file.open(
                "r",
                encoding="utf-8"
            ) as file:

                chapter_data = json.load(
                    file
                )

        except Exception:

            continue

        chapter_number = (
            chapter_data.get(
                "chapter_number"
            )
        )

        if chapter_number is None:

            match = re.search(
                r"chapter_(\d+)_facts",
                chapter_file.stem,
                re.IGNORECASE
            )

            if match:

                chapter_number = int(
                    match.group(1)
                )

        if chapter_number is None:

            continue

        chapters.append({

            "chapter_number":
                chapter_number,

            "title":
                chapter_data.get(
                    "title",
                    f"Chapter {chapter_number}"
                ),

            "status":
                chapter_data.get(
                    "status",
                    "unknown"
                ),

            "extraction_schema_version":
                chapter_data.get(
                    "extraction_schema_version"
                )
        })

    chapters.sort(
        key=lambda item:
            item["chapter_number"]
    )

    return {

        "manuscript":
            manuscript_name,

        "chapter_count":
            len(chapters),

        "chapters":
            chapters
    }


# ==================================================
# GET SINGLE CHAPTER
# ==================================================

@app.get(
    "/chapters/{manuscript_name}/{chapter_number}"
)
def get_single_chapter(
    manuscript_name: str,
    chapter_number: int
):

    if chapter_number < 1:

        raise HTTPException(
            status_code=400,
            detail=(
                "Chapter number must be "
                "greater than zero."
            )
        )

    chapter_data = load_chapter_facts(
        manuscript_name,
        chapter_number
    )

    if chapter_data is None:

        raise HTTPException(
            status_code=404,
            detail=(
                f"Chapter {chapter_number} "
                "analysis was not found."
            )
        )

    return {

        "manuscript":
            manuscript_name,

        "chapter":
            chapter_data
    }


# ==================================================
# CANON INTELLIGENCE HELPERS
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


def load_manuscript_canon(
    manuscript_name: str
):

    canon_path = (
        Path("data")
        / Path(manuscript_name).stem
        / "canon.json"
    )

    if not canon_path.exists():

        return None

    try:

        with canon_path.open(
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(
                file
            )

        if isinstance(
            data,
            dict
        ):

            return data

    except Exception:

        return None

    return None


def normalize_text(
    text
):

    if text is None:

        return ""

    text = str(
        text
    ).lower()

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


def fact_to_text(
    fact
):

    if fact is None:

        return ""

    if isinstance(
        fact,
        str
    ):

        return fact

    try:

        return json.dumps(
            fact,
            ensure_ascii=False
        )

    except Exception:

        return str(
            fact
        )


def get_evidence_chapters(
    conflict
):

    chapters = []

    evidence = conflict.get(
        "evidence",
        []
    )

    if not isinstance(
        evidence,
        list
    ):

        return chapters

    for item in evidence:

        if not isinstance(
            item,
            dict
        ):

            continue

        chapter = item.get(
            "chapter"
        )

        if chapter is None:

            continue

        try:

            chapter = int(
                chapter
            )

        except (
            TypeError,
            ValueError
        ):

            continue

        if chapter not in chapters:

            chapters.append(
                chapter
            )

    return sorted(
        chapters
    )


def extract_conflict_terms(
    conflict
):

    text_parts = []

    evidence = conflict.get(
        "evidence",
        []
    )

    if isinstance(
        evidence,
        list
    ):

        for item in evidence:

            if isinstance(
                item,
                dict
            ):

                detail = item.get(
                    "detail"
                )

                if detail:

                    text_parts.append(
                        str(detail)
                    )

    text = normalize_text(
        " ".join(
            text_parts
        )
    )

    if not text:

        return []

    important_phrases = [

        "first journey",
        "original journey",
        "first trip",
        "journey",
        "trip",
        "hyderabad",
        "bengaluru",
        "bangalore",
        "august",
        "january",
        "february",
        "march",
        "april",
        "may",
        "june",
        "july",
        "september",
        "october",
        "november",
        "december",
        "booked"
    ]

    terms = []

    for phrase in important_phrases:

        if phrase in text:

            terms.append(
                phrase
            )

    return terms


def extract_dates(
    text
):

    normalized = normalize_text(
        text
    )

    dates = []

    for month_name, month_number in (
        MONTHS.items()
    ):

        pattern = (
            rf"\b{month_name}\s+"
            rf"(20\d{{2}})\b"
        )

        matches = re.finditer(
            pattern,
            normalized
        )

        for match in matches:

            dates.append({

                "month":
                    month_number,

                "month_name":
                    month_name,

                "year":
                    int(
                        match.group(1)
                    )
            })

    return dates


def extract_years(
    text
):

    return [

        int(
            value
        )

        for value in re.findall(
            r"\b20\d{2}\b",
            str(text)
        )
    ]


# ==================================================
# FIND RELATED CHARACTERS
# ==================================================

def find_related_characters(
    canon,
    conflict
):

    characters = canon.get(
        "characters",
        {}
    )

    if not isinstance(
        characters,
        dict
    ):

        return []

    evidence_text = normalize_text(
        " ".join(

            str(
                item.get(
                    "detail",
                    ""
                )
            )

            for item in conflict.get(
                "evidence",
                []
            )

            if isinstance(
                item,
                dict
            )
        )
    )

    matches = []

    for character_name in (
        characters.keys()
    ):

        name_text = normalize_text(
            character_name
        )

        if (
            name_text
            and
            name_text in evidence_text
        ):

            matches.append(
                character_name
            )

    return matches


# ==================================================
# TIMELINE RELEVANCE
# ==================================================

def score_timeline_fact(
    fact,
    conflict_terms,
    evidence_chapters
):

    if not isinstance(
        fact,
        dict
    ):

        return 0

    chapter = fact.get(
        "chapter"
    )

    if chapter not in evidence_chapters:

        return 0

    text = normalize_text(
        fact_to_text(
            fact
        )
    )

    if not text:

        return 0

    score = 2

    for term in conflict_terms:

        if term not in text:

            continue

        if term in {
            "first journey",
            "original journey",
            "bengaluru",
            "bangalore"
        }:

            score += 4

        elif term in {
            "hyderabad",
            "journey",
            "trip",
            "booked"
        }:

            score += 2

        else:

            score += 1

    return score


# ==================================================
# FIND RELATED CANON
# ==================================================

def find_related_canon(
    manuscript_name,
    conflict
):

    canon = load_manuscript_canon(
        manuscript_name
    )

    if canon is None:

        return {

            "available":
                False,

            "sections":
                [],

            "characters":
                [],

            "evidence_chapters":
                [],

            "conflict_terms":
                [],

            "match_count":
                0,

            "matches":
                []
        }

    conflict_type = normalize_text(
        conflict.get(
            "type",
            ""
        )
    )

    evidence_chapters = (
        get_evidence_chapters(
            conflict
        )
    )

    conflict_terms = (
        extract_conflict_terms(
            conflict
        )
    )

    related_characters = (
        find_related_characters(
            canon,
            conflict
        )
    )

    matches = []

    # --------------------------------------------------
    # Timeline
    # --------------------------------------------------

    if "timeline" in conflict_type:

        timeline = canon.get(
            "timeline",
            []
        )

        if isinstance(
            timeline,
            list
        ):

            scored = []

            for index, fact in enumerate(
                timeline
            ):

                score = score_timeline_fact(
                    fact,
                    conflict_terms,
                    evidence_chapters
                )

                if score < 4:

                    continue

                scored.append({

                    "section":
                        "timeline",

                    "index":
                        index,

                    "chapter":
                        fact.get(
                            "chapter"
                        ),

                    "relevance_score":
                        score,

                    "fact":
                        fact
                })

            scored.sort(
                key=lambda item:
                    (
                        -item[
                            "relevance_score"
                        ],
                        item[
                            "index"
                        ]
                    )
            )

            matches.extend(
                scored
            )

    # --------------------------------------------------
    # Character
    # --------------------------------------------------

    elif (
        "character" in conflict_type
        or
        "age" in conflict_type
        or
        "identity" in conflict_type
    ):

        characters = canon.get(
            "characters",
            {}
        )

        if isinstance(
            characters,
            dict
        ):

            for character_name in (
                related_characters
            ):

                if character_name not in characters:

                    continue

                matches.append({

                    "section":
                        "characters",

                    "character":
                        character_name,

                    "fact":
                        characters[
                            character_name
                        ]
                })

    # --------------------------------------------------
    # Relationship
    # --------------------------------------------------

    elif "relationship" in conflict_type:

        relationships = canon.get(
            "relationships",
            []
        )

        if isinstance(
            relationships,
            list
        ):

            for index, fact in enumerate(
                relationships
            ):

                text = normalize_text(
                    fact_to_text(
                        fact
                    )
                )

                score = 0

                for character in (
                    related_characters
                ):

                    if normalize_text(
                        character
                    ) in text:

                        score += 3

                if score >= 3:

                    matches.append({

                        "section":
                            "relationships",

                        "index":
                            index,

                        "relevance_score":
                            score,

                        "fact":
                            fact
                    })

    # --------------------------------------------------
    # Events
    # --------------------------------------------------

    elif "event" in conflict_type:

        events = canon.get(
            "events",
            []
        )

        if isinstance(
            events,
            list
        ):

            for index, fact in enumerate(
                events
            ):

                if not isinstance(
                    fact,
                    dict
                ):

                    continue

                if (
                    fact.get(
                        "chapter"
                    )
                    not in evidence_chapters
                ):

                    continue

                text = normalize_text(
                    fact_to_text(
                        fact
                    )
                )

                score = 0

                for character in (
                    related_characters
                ):

                    if normalize_text(
                        character
                    ) in text:

                        score += 3

                if score >= 3:

                    matches.append({

                        "section":
                            "events",

                        "index":
                            index,

                        "chapter":
                            fact.get(
                                "chapter"
                            ),

                        "relevance_score":
                            score,

                        "fact":
                            fact
                    })

    # --------------------------------------------------
    # Locations
    # --------------------------------------------------

    elif "location" in conflict_type:

        locations = canon.get(
            "locations",
            {}
        )

        evidence_text = normalize_text(
            " ".join(

                str(
                    item.get(
                        "detail",
                        ""
                    )
                )

                for item in conflict.get(
                    "evidence",
                    []
                )

                if isinstance(
                    item,
                    dict
                )
            )
        )

        if isinstance(
            locations,
            dict
        ):

            for location_name, location_data in (
                locations.items()
            ):

                if normalize_text(
                    location_name
                ) in evidence_text:

                    matches.append({

                        "section":
                            "locations",

                        "location":
                            location_name,

                        "fact":
                            location_data
                    })

    # --------------------------------------------------
    # Remove duplicates
    # --------------------------------------------------

    unique_matches = []

    seen = set()

    for match in matches:

        identity = json.dumps(
            match,
            sort_keys=True,
            ensure_ascii=False
        )

        if identity in seen:

            continue

        seen.add(
            identity
        )

        unique_matches.append(
            match
        )

    section_counts = {}

    for match in unique_matches:

        section = match.get(
            "section"
        )

        section_counts[
            section
        ] = (
            section_counts.get(
                section,
                0
            )
            + 1
        )

    sections = [

        {
            "section":
                section,

            "matches":
                count
        }

        for section, count
        in section_counts.items()
    ]

    return {

        "available":
            True,

        "sections":
            sections,

        "characters":
            related_characters,

        "evidence_chapters":
            evidence_chapters,

        "conflict_terms":
            conflict_terms,

        "match_count":
            len(
                unique_matches
            ),

        "matches":
            unique_matches
    }


# ==================================================
# CONFLICT EXPLANATION
# ==================================================

def build_timeline_explanation(
    related_canon
):

    matches = related_canon.get(
        "matches",
        []
    )

    date_groups = defaultdict(
        list
    )

    for match in matches:

        fact = match.get(
            "fact",
            {}
        )

        text = fact_to_text(
            fact
        )

        dates = extract_dates(
            text
        )

        for date in dates:

            key = (
                date["month"],
                date["year"]
            )

            date_groups[
                key
            ].append(
                match
            )

    if len(
        date_groups
    ) < 2:

        return {

            "available":
                False,

            "text":
                (
                    "The related canon evidence "
                    "supports this conflict, but "
                    "there are not enough distinct "
                    "values to explain the contradiction."
                )
        }

    descriptions = []

    for (
        (month, year),
        group
    ) in sorted(
        date_groups.items(),
        key=lambda item:
            item[0][1]
    ):

        chapter_numbers = sorted({

            item.get(
                "chapter"
            )

            for item in group

            if item.get(
                "chapter"
            ) is not None
        })

        month_name = next(
            (
                name.title()

                for name, number
                in MONTHS.items()

                if number == month
            ),
            str(month)
        )

        chapters_text = ", ".join(
            f"Chapter {chapter}"
            for chapter
            in chapter_numbers
        )

        descriptions.append(
            f"{month_name} {year} "
            f"({chapters_text})"
        )

    return {

        "available":
            True,

        "text":
            (
                "The manuscript contains "
                "multiple dates for the same "
                "timeline concept: "
                +
                " versus ".join(
                    descriptions
                )
                +
                "."
            ),

        "date_groups": [

            {

                "month":
                    month,

                "year":
                    year,

                "chapters":
                    sorted({

                        item.get(
                            "chapter"
                        )

                        for item
                        in group

                        if item.get(
                            "chapter"
                        ) is not None
                    })
            }

            for (
                (month, year),
                group
            ) in sorted(
                date_groups.items(),
                key=lambda item:
                    item[0][1]
            )
        ]
    }


# ==================================================
# CONFLICT CONFIDENCE
# ==================================================

def calculate_confidence(
    conflict,
    related_canon
):

    evidence = conflict.get(
        "evidence",
        []
    )

    evidence_count = (
        len(evidence)
        if isinstance(
            evidence,
            list
        )
        else 0
    )

    matches = related_canon.get(
        "matches",
        []
    )

    match_count = len(
        matches
    )

    conflict_type = normalize_text(
        conflict.get(
            "type",
            ""
        )
    )

    score = 30

    if "timeline" in conflict_type:

        date_values = set()

        for match in matches:

            fact_text = fact_to_text(
                match.get(
                    "fact"
                )
            )

            for date in extract_dates(
                fact_text
            ):

                date_values.add(
                    (
                        date["month"],
                        date["year"]
                    )
                )

        if len(
            date_values
        ) >= 2:

            score = 70

            score += min(
                evidence_count * 5,
                20
            )

            score += min(
                match_count * 3,
                10
            )

        elif match_count > 0:

            score = 60

    else:

        if match_count >= 4:

            score = 90

        elif match_count >= 2:

            score = 75

        elif match_count == 1:

            score = 55

    score = min(
        score,
        100
    )

    if score >= 85:

        level = "high"

    elif score >= 60:

        level = "medium"

    else:

        level = "low"

    return {

        "score":
            score,

        "level":
            level,

        "label":
            f"{level.title()} Confidence"
    }


# ==================================================
# BUILD CONFLICT INTELLIGENCE
# ==================================================

def build_conflict_intelligence(
    conflict,
    related_canon
):

    conflict_type = normalize_text(
        conflict.get(
            "type",
            ""
        )
    )

    confidence = (
        calculate_confidence(
            conflict,
            related_canon
        )
    )

    if "timeline" in conflict_type:

        explanation = (
            build_timeline_explanation(
                related_canon
            )
        )

    elif "character" in conflict_type:

        explanation = {

            "available":
                bool(
                    related_canon.get(
                        "matches"
                    )
                ),

            "text":
                (
                    "Character-related evidence "
                    "conflicts with the established "
                    "character information in the canon."
                )
        }

    elif "relationship" in conflict_type:

        explanation = {

            "available":
                bool(
                    related_canon.get(
                        "matches"
                    )
                ),

            "text":
                (
                    "The relationship evidence "
                    "appears inconsistent with the "
                    "established relationship information."
                )
        }

    elif "location" in conflict_type:

        explanation = {

            "available":
                bool(
                    related_canon.get(
                        "matches"
                    )
                ),

            "text":
                (
                    "The location evidence appears "
                    "inconsistent with established "
                    "location information."
                )
        }

    else:

        explanation = {

            "available":
                bool(
                    related_canon.get(
                        "matches"
                    )
                ),

            "text":
                (
                    "The continuity checker found "
                    "evidence that may conflict with "
                    "the established canon."
                )
        }

    return {

        "confidence":
            confidence,

        "explanation":
            explanation,

        "evidence_count":
            len(
                conflict.get(
                    "evidence",
                    []
                )
            )
            if isinstance(
                conflict.get(
                    "evidence",
                    []
                ),
                list
            )
            else 0,

        "canon_match_count":
            related_canon.get(
                "match_count",
                0
            )
    }


# ==================================================
# ENRICH CONFLICT
# ==================================================

def enrich_conflict(
    manuscript_name,
    conflict
):

    enriched = dict(
        conflict
    )

    related_canon = (
        find_related_canon(
            manuscript_name,
            conflict
        )
    )

    intelligence = (
        build_conflict_intelligence(
            conflict,
            related_canon
        )
    )

    enriched[
        "related_canon"
    ] = related_canon

    enriched[
        "conflict_intelligence"
    ] = intelligence

    enriched[
        "confidence"
    ] = intelligence[
        "confidence"
    ]

    enriched[
        "explanation"
    ] = intelligence[
        "explanation"
    ]

    return enriched


# ==================================================
# ENRICH CONFLICTS WITH REVIEWS
# ==================================================

def enrich_conflicts(
    manuscript_name,
    conflicts
):

    review_data = get_all_reviews(
        manuscript_name
    )

    reviews = review_data.get(
        "reviews",
        {}
    )

    enriched_conflicts = []

    for conflict in conflicts:

        conflict_id = (
            generate_conflict_id(
                conflict
            )
        )

        conflict_copy = (
            enrich_conflict(
                manuscript_name,
                conflict
            )
        )

        conflict_copy[
            "conflict_id"
        ] = conflict_id

        saved_review = reviews.get(
            conflict_id
        )

        if saved_review:

            conflict_copy[
                "review_status"
            ] = saved_review.get(
                "status",
                "needs_review"
            )

            conflict_copy[
                "reviewed"
            ] = True

        else:

            conflict_copy[
                "review_status"
            ] = "needs_review"

            conflict_copy[
                "reviewed"
            ] = False

        enriched_conflicts.append(
            conflict_copy
        )

    return enriched_conflicts


# ==================================================
# CONTINUITY CHECK
# ==================================================

@app.post(
    "/check-continuity/{manuscript_name}"
)
def run_continuity_check(
    manuscript_name: str
):

    try:

        result = check_continuity(
            manuscript_name
        )

        conflicts = result.get(
            "conflicts",
            []
        )

        enriched_conflicts = (
            enrich_conflicts(
                manuscript_name,
                conflicts
            )
        )

        result[
            "conflicts"
        ] = enriched_conflicts

        result[
            "review_summary"
        ] = build_review_summary(
            enriched_conflicts
        )

        return result

    except FileNotFoundError as error:

        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ==================================================
# CREATE REVIEW
# ==================================================

@app.post(
    "/reviews/{manuscript_name}"
)
def create_review(
    manuscript_name: str,
    conflict: dict,
    status: str = Query(...)
):

    allowed_statuses = {

        "needs_review",
        "confirmed",
        "dismissed"
    }

    if status not in allowed_statuses:

        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid review status. "
                "Use needs_review, confirmed, "
                "or dismissed."
            )
        )

    try:

        review = save_review(
            manuscript_name,
            conflict,
            status
        )

        return {

            "message":
                "Review decision saved successfully.",

            "review":
                review
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ==================================================
# GET REVIEWS
# ==================================================

@app.get(
    "/reviews/{manuscript_name}"
)
def get_reviews(
    manuscript_name: str
):

    try:

        data = get_all_reviews(
            manuscript_name
        )

        reviews = data.get(
            "reviews",
            {}
        )

        return {

            "manuscript":
                manuscript_name,

            "review_count":
                len(
                    reviews
                ),

            "reviews":
                list(
                    reviews.values()
                )
        }

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ==================================================
# REVIEW SUMMARY
# ==================================================

@app.get(
    "/reviews/{manuscript_name}/summary"
)
def get_review_summary(
    manuscript_name: str
):

    try:

        result = check_continuity(
            manuscript_name
        )

        conflicts = result.get(
            "conflicts",
            []
        )

        enriched_conflicts = (
            enrich_conflicts(
                manuscript_name,
                conflicts
            )
        )

        summary = (
            build_review_summary(
                enriched_conflicts
            )
        )

        return {

            "manuscript":
                manuscript_name,

            "summary":
                summary
        }

    except FileNotFoundError as error:

        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ==================================================
# SINGLE REVIEW
# ==================================================

@app.get(
    "/reviews/{manuscript_name}/{conflict_id}"
)
def get_single_review(
    manuscript_name: str,
    conflict_id: str
):

    try:

        data = get_all_reviews(
            manuscript_name
        )

        review = (
            data
            .get(
                "reviews",
                {}
            )
            .get(
                conflict_id
            )
        )

        if not review:

            raise HTTPException(
                status_code=404,
                detail="Review not found."
            )

        return review

    except HTTPException:

        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ==================================================
# GET CONFLICTS
# ==================================================

@app.get(
    "/conflicts/{manuscript_name}"
)
def get_conflicts(
    manuscript_name: str
):

    try:

        result = check_continuity(
            manuscript_name
        )

        conflicts = result.get(
            "conflicts",
            []
        )

        enriched_conflicts = (
            enrich_conflicts(
                manuscript_name,
                conflicts
            )
        )

        return {

            "manuscript":
                manuscript_name,

            "conflict_count":
                len(
                    enriched_conflicts
                ),

            "conflicts":
                enriched_conflicts
        }

    except FileNotFoundError as error:

        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ==================================================
# DASHBOARD
# ==================================================

@app.get(
    "/dashboard/{manuscript_name}"
)
def get_dashboard(
    manuscript_name: str
):

    try:

        result = check_continuity(
            manuscript_name
        )

        conflicts = result.get(
            "conflicts",
            []
        )

        enriched_conflicts = (
            enrich_conflicts(
                manuscript_name,
                conflicts
            )
        )

        review_summary = (
            build_review_summary(
                enriched_conflicts
            )
        )

        total_conflicts = (
            review_summary[
                "total"
            ]
        )

        reviewed = (
            review_summary[
                "confirmed"
            ]
            +
            review_summary[
                "dismissed"
            ]
        )

        pending = (
            review_summary[
                "needs_review"
            ]
        )

        if total_conflicts:

            review_completion = round(
                (
                    reviewed
                    /
                    total_conflicts
                )
                * 100
            )

        else:

            review_completion = 100

        severity = {

            "high": 0,
            "medium": 0,
            "low": 0
        }

        conflict_types = {}

        chapter_impact = {}

        for conflict in enriched_conflicts:

            conflict_severity = str(
                conflict.get(
                    "severity",
                    "unknown"
                )
            ).lower()

            if conflict_severity in severity:

                severity[
                    conflict_severity
                ] += 1

            conflict_type = str(
                conflict.get(
                    "type",
                    "unknown"
                )
            ).lower()

            conflict_types[
                conflict_type
            ] = (
                conflict_types.get(
                    conflict_type,
                    0
                )
                + 1
            )

            evidence = conflict.get(
                "evidence",
                []
            )

            if not isinstance(
                evidence,
                list
            ):

                continue

            for item in evidence:

                if not isinstance(
                    item,
                    dict
                ):

                    continue

                chapter = item.get(
                    "chapter"
                )

                if chapter is None:

                    continue

                chapter_key = str(
                    chapter
                )

                chapter_impact[
                    chapter_key
                ] = (
                    chapter_impact.get(
                        chapter_key,
                        0
                    )
                    + 1
                )

        chapter_impact_list = [

            {

                "chapter":
                    int(chapter)
                    if chapter.isdigit()
                    else chapter,

                "conflict_count":
                    count
            }

            for chapter, count
            in chapter_impact.items()
        ]

        chapter_impact_list.sort(
            key=lambda item:
                (
                    item[
                        "conflict_count"
                    ],
                    str(
                        item[
                            "chapter"
                        ]
                    )
                ),
            reverse=True
        )

        if total_conflicts == 0:

            manuscript_status = (
                "consistent"
            )

        elif pending > 0:

            manuscript_status = (
                "needs_review"
            )

        else:

            manuscript_status = (
                "reviewed"
            )

        return {

            "manuscript":
                manuscript_name,

            "status":
                manuscript_status,

            "overview": {

                "total_conflicts":
                    total_conflicts,

                "confirmed":
                    review_summary[
                        "confirmed"
                    ],

                "dismissed":
                    review_summary[
                        "dismissed"
                    ],

                "needs_review":
                    pending,

                "reviewed":
                    reviewed,

                "review_completion":
                    review_completion
            },

            "severity":
                severity,

            "conflict_types":
                conflict_types,

            "chapter_impact":
                chapter_impact_list,

            "conflicts":
                enriched_conflicts
        }

    except FileNotFoundError as error:

        raise HTTPException(
            status_code=404,
            detail=str(error)
        )

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )


# ==================================================
# REVIEW SUMMARY HELPER
# ==================================================

def build_review_summary(
    conflicts
):

    summary = {

        "total":
            len(
                conflicts
            ),

        "needs_review":
            0,

        "confirmed":
            0,

        "dismissed":
            0
    }

    for conflict in conflicts:

        status = conflict.get(
            "review_status",
            "needs_review"
        )

        if status not in summary:

            status = "needs_review"

        summary[
            status
        ] += 1

    return summary


# ==================================================
# CHAPTER DETECTION
# ==================================================

def detect_chapters(
    full_text: str
):

    pattern = re.compile(
        r"(?im)^"
        r"(chapter\s+\d+"
        r"(?:\s*[—–\-:]\s*.*)?)"
        r"\s*$"
    )

    matches = list(
        pattern.finditer(
            full_text
        )
    )

    chapters = []

    for index, match in enumerate(
        matches
    ):

        title = (
            match.group(1)
            .strip()
        )

        start = match.end()

        if (
            index + 1
            <
            len(matches)
        ):

            end = matches[
                index + 1
            ].start()

        else:

            end = len(
                full_text
            )

        chapter_text = (
            full_text[
                start:end
            ]
            .strip()
        )

        number_match = re.search(
            r"\d+",
            title
        )

        if not number_match:

            continue

        chapter_number = int(
            number_match.group()
        )

        chapters.append({

            "chapter_number":
                chapter_number,

            "title":
                title,

            "text":
                chapter_text
        })

    return chapters