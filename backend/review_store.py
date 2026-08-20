import json
import hashlib
from pathlib import Path
from typing import Any, Dict, Optional


DATA_DIR = Path("data")


# ==================================================
# Internal Helpers
# ==================================================

def _manuscript_dir(manuscript_name: str) -> Path:
    return DATA_DIR / Path(manuscript_name).stem


def _review_file(manuscript_name: str) -> Path:
    return (
        _manuscript_dir(manuscript_name)
        / "review_decisions.json"
    )


# ==================================================
# Generate Stable Conflict ID
# ==================================================

def generate_conflict_id(
    conflict: Dict[str, Any]
) -> str:

    normalized = {
        "type": conflict.get("type"),
        "message": conflict.get("message"),
        "character": conflict.get("character"),
        "evidence": conflict.get("evidence", [])
    }

    raw = json.dumps(
        normalized,
        sort_keys=True,
        ensure_ascii=False
    )

    return hashlib.sha256(
        raw.encode("utf-8")
    ).hexdigest()[:16]


# ==================================================
# Load Review Decisions
# ==================================================

def load_review_decisions(
    manuscript_name: str
) -> Dict[str, Any]:

    review_path = _review_file(
        manuscript_name
    )

    if not review_path.exists():

        return {
            "manuscript": manuscript_name,
            "reviews": {}
        }

    try:

        with review_path.open(
            "r",
            encoding="utf-8"
        ) as file:

            data = json.load(file)

        if not isinstance(data, dict):

            return {
                "manuscript": manuscript_name,
                "reviews": {}
            }

        if "reviews" not in data:

            data["reviews"] = {}

        return data

    except Exception:

        return {
            "manuscript": manuscript_name,
            "reviews": {}
        }


# ==================================================
# Save Review Decisions
# ==================================================

def save_review_decisions(
    manuscript_name: str,
    data: Dict[str, Any]
):

    manuscript_dir = _manuscript_dir(
        manuscript_name
    )

    manuscript_dir.mkdir(
        parents=True,
        exist_ok=True
    )

    review_path = _review_file(
        manuscript_name
    )

    with review_path.open(
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            data,
            file,
            indent=2,
            ensure_ascii=False
        )


# ==================================================
# Save Single Review
# ==================================================

def save_review(
    manuscript_name: str,
    conflict: Dict[str, Any],
    status: str
) -> Dict[str, Any]:

    allowed_statuses = {
        "needs_review",
        "confirmed",
        "dismissed"
    }

    if status not in allowed_statuses:

        raise ValueError(
            "Invalid review status. "
            "Allowed values: "
            "needs_review, confirmed, dismissed."
        )

    data = load_review_decisions(
        manuscript_name
    )

    conflict_id = generate_conflict_id(
        conflict
    )

    data["manuscript"] = manuscript_name

    data["reviews"][conflict_id] = {

        "conflict_id":
            conflict_id,

        "status":
            status,

        "type":
            conflict.get("type"),

        "severity":
            conflict.get("severity"),

        "message":
            conflict.get("message"),

        "character":
            conflict.get("character"),

        "evidence":
            conflict.get(
                "evidence",
                []
            )
    }

    save_review_decisions(
        manuscript_name,
        data
    )

    return data["reviews"][conflict_id]


# ==================================================
# Get Single Review
# ==================================================

def get_review(
    manuscript_name: str,
    conflict: Dict[str, Any]
) -> Optional[Dict[str, Any]]:

    data = load_review_decisions(
        manuscript_name
    )

    conflict_id = generate_conflict_id(
        conflict
    )

    return data["reviews"].get(
        conflict_id
    )


# ==================================================
# Get All Reviews
# ==================================================

def get_all_reviews(
    manuscript_name: str
) -> Dict[str, Any]:

    return load_review_decisions(
        manuscript_name
    )