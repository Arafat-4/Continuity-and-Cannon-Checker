import json
from pathlib import Path


DATA_DIR = Path("data")


def _manuscript_dir(filename):
    return DATA_DIR / Path(filename).stem


def _chapter_path(filename, chapter_number):
    return (
        _manuscript_dir(filename)
        / f"chapter_{int(chapter_number):02d}_facts.json"
    )


# ==================================================
# CHAPTER FACTS — SAVE
# ==================================================

def save_chapter_facts(
    filename,
    chapter_number,
    facts
):
    """Save chapter analysis results to the JSON data store."""

    manuscript_dir = _manuscript_dir(filename)
    manuscript_dir.mkdir(parents=True, exist_ok=True)

    file_path = _chapter_path(
        filename,
        chapter_number
    )

    with file_path.open(
        "w",
        encoding="utf-8"
    ) as file:
        json.dump(
            facts,
            file,
            indent=2,
            ensure_ascii=False
        )

    return file_path


# ==================================================
# CHAPTER FACTS — LOAD
# ==================================================

def load_chapter_facts(
    filename,
    chapter_number
):
    """Load one chapter's analysis results from JSON."""

    file_path = _chapter_path(
        filename,
        chapter_number
    )

    if not file_path.exists():
        return None

    with file_path.open(
        "r",
        encoding="utf-8"
    ) as file:
        return json.load(file)


# ==================================================
# LOAD ALL CHAPTER FACTS
# ==================================================

def load_all_chapter_facts(
    filename
):
    """Load all stored chapter facts for a manuscript."""

    manuscript_dir = _manuscript_dir(filename)

    if not manuscript_dir.exists():
        return {}

    chapter_files = sorted(
        manuscript_dir.glob(
            "chapter_*_facts.json"
        ),
        key=lambda path: int(
            path.stem.split("_")[1]
        )
    )

    results = {}

    for file_path in chapter_files:
        chapter_number = int(
            file_path.stem.split("_")[1]
        )

        with file_path.open(
            "r",
            encoding="utf-8"
        ) as file:
            results[chapter_number] = json.load(file)

    return results