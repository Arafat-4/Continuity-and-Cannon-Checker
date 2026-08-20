from continuity_checker import check_continuity


MANUSCRIPT_NAME = (
    "SuperDocs_Continuity_Test_Manuscript.pdf"
)


print(
    "Running continuity checker..."
)


result = check_continuity(
    MANUSCRIPT_NAME
)


print(
    "\nContinuity Check Result"
)

print(
    "======================="
)

print(
    "Manuscript:",
    result["manuscript"]
)

print(
    "Status:",
    result["status"]
)

print(
    "Conflict count:",
    result["conflict_count"]
)


if result["conflicts"]:

    print(
        "\nConflicts:"
    )

    for conflict in result["conflicts"]:

        print(
            "\nType:",
            conflict["type"]
        )

        print(
            "Severity:",
            conflict["severity"]
        )

        print(
            "Message:",
            conflict["message"]
        )

else:

    print(
        "\nNo continuity conflicts found."
    )


print(
    "\nContinuity check completed."
)