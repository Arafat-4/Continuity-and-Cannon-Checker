import os
import time
from typing import List, Optional

from dotenv import load_dotenv
from google import genai
from pydantic import BaseModel, Field


load_dotenv()


api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError(
        "GEMINI_API_KEY is not configured."
    )


client = genai.Client(
    api_key=api_key
)


# ==================================================
# Pydantic Models
# ==================================================


class Character(BaseModel):

    name: str = Field(
        description="Name of the character."
    )

    details: List[str] = Field(
        description=(
            "Important character details "
            "explicitly stated in the chapter."
        )
    )


class Event(BaseModel):

    description: str = Field(
        description=(
            "A significant event that happens "
            "in the chapter."
        )
    )

    time_reference: str = Field(
        description=(
            "Date, year, season, relative time, "
            "or empty string if not stated."
        )
    )


class Location(BaseModel):

    name: str = Field(
        description="Name of the location."
    )

    context: str = Field(
        description=(
            "How the location is relevant "
            "to the story."
        )
    )


# ==================================================
# Point of View
# ==================================================


class PointOfView(BaseModel):

    type: str = Field(
        description=(
            "The dominant narrative point of view "
            "used in the chapter. Use one of: "
            "first_person, third_person_limited, "
            "third_person_omniscient, objective, "
            "mixed, or unknown."
        )
    )

    character: Optional[str] = Field(
        default=None,
        description=(
            "The primary character whose perspective "
            "the chapter follows, if identifiable. "
            "Use null if there is no identifiable "
            "POV character."
        )
    )

    evidence: List[str] = Field(
        description=(
            "One or two short pieces of evidence "
            "from the chapter supporting the POV "
            "classification. Do not invent evidence."
        )
    )


# ==================================================
# Narrative Tense
# ==================================================


class NarrativeTense(BaseModel):

    primary: str = Field(
        description=(
            "The dominant narrative tense of the "
            "chapter. Use one of: past, present, "
            "future, mixed, or unknown."
        )
    )

    secondary: Optional[str] = Field(
        default=None,
        description=(
            "A secondary tense that is meaningfully "
            "used in the chapter, such as past_perfect "
            "inside a predominantly past-tense chapter. "
            "Use null when there is no meaningful "
            "secondary tense."
        )
    )

    evidence: List[str] = Field(
        description=(
            "One or two short pieces of evidence "
            "from the chapter supporting the tense "
            "classification. Do not invent evidence."
        )
    )


# ==================================================
# Story Facts
# ==================================================


class StoryFacts(BaseModel):

    characters: List[Character]

    events: List[Event]

    locations: List[Location]

    timeline_facts: List[str]

    relationships: List[str]

    point_of_view: PointOfView

    narrative_tense: NarrativeTense


# ==================================================
# Gemini Fact Extraction
# ==================================================


def extract_story_facts(
    chapter_text: str,
    chapter_number: int,
    max_retries: int = 3
) -> StoryFacts:

    prompt = f"""
You are a continuity and canon extraction engine
for a fiction manuscript.

Analyze ONLY the chapter text provided below.

Your job is to extract facts that are explicitly stated
or strongly established by the chapter.

IMPORTANT RULES:

1. Do NOT invent information.

2. Do NOT correct contradictions.

3. Do NOT resolve contradictions yourself.

4. Record what the chapter actually states,
   even if it contradicts an earlier chapter.

5. Preserve important character details exactly.

6. If a character's age is explicitly stated,
   ALWAYS include it in that character's details.

7. If a character's age is expressed using words,
   preserve the wording.

   Example:
   "He was twenty-six years old."

   Extract:
   "Twenty-six years old"

8. If a character's age is expressed as a number,
   preserve the number.

   Example:
   "Arjun was 31."

   Extract:
   "31 years old"

9. Extract dates, years, months and relative time
   references into timeline_facts whenever they are
   explicitly stated.

10. Keep the chapter as the source of truth.
    Never use information from another chapter.

11. If a name appears in shortened form, preserve the
    name exactly as written in this chapter.
    Character-name normalization will happen later
    during canon construction.

Focus on:

- Characters and their stated details
- Character ages
- Important events
- Locations
- Dates and timeline information
- Character relationships
- Point of view
- Narrative tense

Do NOT infer an age merely from dates.

Do NOT assume that two characters are the same person
unless the chapter establishes that relationship.

Chapter number: {chapter_number}

CHAPTER TEXT:
----------------
{chapter_text}
----------------
"""

    for attempt in range(
        1,
        max_retries + 1
    ):

        try:

            print(
                f"  Gemini attempt "
                f"{attempt}/{max_retries} "
                f"for Chapter "
                f"{chapter_number}..."
            )

            response = client.models.generate_content(

                model="gemini-3.6-flash",

                contents=prompt,

                config={
                    "response_mime_type": (
                        "application/json"
                    ),

                    "response_json_schema": (
                        StoryFacts.model_json_schema()
                    ),
                },
            )

            return StoryFacts.model_validate_json(
                response.text
            )

        except Exception as error:

            error_text = str(error)

            # --------------------------------------
            # Quota error
            # --------------------------------------

            if (
                "RESOURCE_EXHAUSTED"
                in error_text
                or "429"
                in error_text
            ):

                print(
                    "  Gemini API quota "
                    "has been exhausted."
                )

                raise RuntimeError(
                    "Gemini API quota exhausted. "
                    "Processing should be resumed "
                    "after the quota becomes available."
                ) from error

            # --------------------------------------
            # Other temporary errors
            # --------------------------------------

            print(
                f"  Gemini request failed for "
                f"Chapter {chapter_number}: "
                f"{error}"
            )

            if attempt < max_retries:

                wait_time = 2 ** attempt

                print(
                    f"  Retrying in "
                    f"{wait_time} seconds..."
                )

                time.sleep(
                    wait_time
                )

            else:

                print(
                    f"  Chapter "
                    f"{chapter_number} failed "
                    f"after "
                    f"{max_retries} attempts."
                )

                raise