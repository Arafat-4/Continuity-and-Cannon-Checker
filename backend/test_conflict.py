from data.storage import save_chapter_facts
from continuity_checker import check_continuity


MANUSCRIPT_NAME = (
    "SuperDocs_Continuity_Test_Manuscript.pdf"
)


# ==================================================
# Create deliberately conflicting Chapter 2
# ==================================================

chapter_2 = {

    "chapter_number": 2,

    "title": "Chapter 2 — Bengaluru",

    "status": "success",

    "facts": {

        "characters": [

            {
                "name": "Arjun Mehta",

                "details": [
                    "Thirty-one years old"
                ]
            }
        ],

        "events": [],

        "locations": [],

        "timeline_facts": [],

        "relationships": []
    }
}


# ==================================================
# Save Chapter 2
# ==================================================

print(
    "Saving deliberately conflicting Chapter 2..."
)


save_chapter_facts(
    MANUSCRIPT_NAME,
    2,
    chapter_2
)


print(
    "Chapter 2 saved."
)


# ==================================================
# Rebuild Canon
# ==================================================

from canon_store import build_canon


print(
    "\nRebuilding Canon..."
)


build_canon(
    MANUSCRIPT_NAME
)


print(
    "Canon rebuilt."
)


# ==================================================
# Run Continuity Checker
# ==================================================

print(
    "\nRunning continuity checker..."
)


result = check_continuity(
    MANUSCRIPT_NAME
)


# ==================================================
# Display Result
# ==================================================

print(
    "\nContinuity Check Result"
)

print(
    "======================="
)

print(
    "Status:",
    result["status"]
)

print(
    "Conflict count:",
    result["conflict_count"]
)


for conflict in result["conflicts"]:

    print(
        "\n--------------------------------"
    )

    print(
        "Type:",
        conflict["type"]
    )

    print(
        "Severity:",
        conflict["severity"]
    )

    print(
        "Character:",
        conflict.get("character")
    )

    print(
        "Message:",
        conflict["message"]
    )

    print(
        "Values:",
        conflict.get("values")
    )


print(
    "\nTest completed."
)