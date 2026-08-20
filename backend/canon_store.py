import json
from pathlib import Path


DATA_DIR = Path("data")


# ==================================================
# Character Name Normalization
# ==================================================

def normalize_character_name(
    name: str,
    known_characters: dict
):
    """
    Resolve short character names such as 'Arjun'
    to an already established full name such as
    'Arjun Mehta'.

    We only merge when the short name matches the
    first name of exactly one existing character.
    """

    clean_name = " ".join(
        str(name).strip().split()
    )

    if not clean_name:
        return clean_name

    # Exact existing name
    if clean_name in known_characters:
        return clean_name

    clean_lower = clean_name.lower()

    matches = []

    for existing_name in known_characters.keys():

        existing_parts = (
            existing_name.strip().split()
        )

        if not existing_parts:
            continue

        first_name = (
            existing_parts[0].lower()
        )

        if (
            clean_lower == first_name
            and len(existing_parts) > 1
        ):
            matches.append(existing_name)

    # Only merge if there is exactly one
    # unambiguous full-name match.
    if len(matches) == 1:
        return matches[0]

    return clean_name


# ==================================================
# Build Canon
# ==================================================

def build_canon(
    manuscript_name: str
):

    manuscript_dir = (
        DATA_DIR
        / Path(manuscript_name).stem
    )

    if not manuscript_dir.exists():

        raise FileNotFoundError(
            f"No analysis data found for "
            f"{manuscript_name}"
        )

    canon = {

        "manuscript": manuscript_name,

        "characters": {},

        "events": [],

        "locations": {},

        "timeline": [],

        "relationships": []
    }

    chapter_files = sorted(
        manuscript_dir.glob(
            "chapter_*_facts.json"
        ),
        key=lambda path: int(
            path.stem.split("_")[1]
        )
    )

    if not chapter_files:

        raise FileNotFoundError(
            f"No analyzed chapters found for "
            f"{manuscript_name}"
        )

    # ==================================================
    # Read Every Successfully Analyzed Chapter
    # ==================================================

    for file_path in chapter_files:

        with file_path.open(
            "r",
            encoding="utf-8"
        ) as file:

            chapter = json.load(file)

        # Ignore failed chapters
        if chapter.get("status") != "success":
            continue

        # ==================================================
        # IMPORTANT
        #
        # Chapter number comes from the filename:
        #
        # chapter_01_facts.json
        # chapter_02_facts.json
        #
        # It is NOT expected inside the JSON.
        # ==================================================

        try:

            chapter_number = int(
                file_path.stem.split("_")[1]
            )

        except (
            IndexError,
            ValueError
        ):

            print(
                f"Skipping invalid chapter file: "
                f"{file_path.name}"
            )

            continue

        # ==================================================
        # Support Both Data Formats
        # ==================================================

        # Current storage format:
        #
        # {
        #   "status": "success",
        #   "characters": [...],
        #   "events": [...]
        # }
        #
        # Older format:
        #
        # {
        #   "status": "success",
        #   "facts": {
        #       "characters": [...]
        #   }
        # }

        facts = chapter.get(
            "facts"
        )

        if not isinstance(
            facts,
            dict
        ):

            facts = chapter

        # ==================================================
        # Characters
        # ==================================================

        for character in facts.get(
            "characters",
            []
        ):

            if not isinstance(
                character,
                dict
            ):
                continue

            raw_name = character.get(
                "name",
                ""
            )

            if not raw_name:
                continue

            name = normalize_character_name(
                raw_name,
                canon["characters"]
            )

            # ----------------------------------------------
            # Create character if needed
            # ----------------------------------------------

            if name not in canon["characters"]:

                canon["characters"][name] = {

                    "name": name,

                    "aliases": [],

                    "details": [],

                    "appearances": []
                }

            # ----------------------------------------------
            # Store alias
            # ----------------------------------------------

            if (
                raw_name != name
                and raw_name not in
                canon["characters"][name]["aliases"]
            ):

                canon["characters"][name][
                    "aliases"
                ].append(
                    raw_name
                )

            # ----------------------------------------------
            # Character details
            # ----------------------------------------------

            details = character.get(
                "details",
                []
            )

            # Make sure details is iterable
            if not isinstance(
                details,
                list
            ):
                details = [details]

            for detail in details:

                if detail is None:
                    continue

                detail_entry = {

                    "detail": detail,

                    "chapter": chapter_number
                }

                already_exists = any(

                    existing["detail"] == detail
                    and
                    existing["chapter"] ==
                    chapter_number

                    for existing
                    in canon["characters"][name][
                        "details"
                    ]
                )

                if not already_exists:

                    canon["characters"][name][
                        "details"
                    ].append(
                        detail_entry
                    )

            # ----------------------------------------------
            # Character appearance
            # ----------------------------------------------

            if (
                chapter_number
                not in canon["characters"][name][
                    "appearances"
                ]
            ):

                canon["characters"][name][
                    "appearances"
                ].append(
                    chapter_number
                )

        # ==================================================
        # Events
        # ==================================================

        for event in facts.get(
            "events",
            []
        ):

            if not isinstance(
                event,
                dict
            ):
                continue

            canon["events"].append({

                "chapter": chapter_number,

                "description": event.get(
                    "description",
                    ""
                ),

                "time_reference": event.get(
                    "time_reference",
                    ""
                )
            })

        # ==================================================
        # Locations
        # ==================================================

        for location in facts.get(
            "locations",
            []
        ):

            if not isinstance(
                location,
                dict
            ):
                continue

            name = location.get(
                "name",
                ""
            )

            if not name:
                continue

            if name not in canon["locations"]:

                canon["locations"][name] = {

                    "name": name,

                    "contexts": [],

                    "appearances": []
                }

            context = location.get(
                "context",
                ""
            )

            context_entry = {

                "context": context,

                "chapter": chapter_number
            }

            already_exists = any(

                existing["context"] == context
                and
                existing["chapter"] ==
                chapter_number

                for existing
                in canon["locations"][name][
                    "contexts"
                ]
            )

            if (
                context
                and not already_exists
            ):

                canon["locations"][name][
                    "contexts"
                ].append(
                    context_entry
                )

            if (
                chapter_number
                not in canon["locations"][name][
                    "appearances"
                ]
            ):

                canon["locations"][name][
                    "appearances"
                ].append(
                    chapter_number
                )

        # ==================================================
        # Timeline
        # ==================================================

        for timeline_fact in facts.get(
            "timeline_facts",
            []
        ):

            canon["timeline"].append({

                "chapter": chapter_number,

                "fact": timeline_fact
            })

        # ==================================================
        # Relationships
        # ==================================================

        for relationship in facts.get(
            "relationships",
            []
        ):

            canon["relationships"].append({

                "chapter": chapter_number,

                "relationship": relationship
            })

    # ==================================================
    # Save Canon
    # ==================================================

    canon_path = (
        manuscript_dir
        / "canon.json"
    )

    with canon_path.open(
        "w",
        encoding="utf-8"
    ) as file:

        json.dump(
            canon,
            file,
            indent=2,
            ensure_ascii=False
        )

    return canon