
# Continuity & Canon Checker

## Project Goal

Build an agentic system for authors that analyzes long manuscripts and detects continuity and canon inconsistencies.

The system should identify:

- Character name inconsistencies
- Timeline inconsistencies
- Point-of-view inconsistencies
- Narrative tense inconsistencies
- Contradictory story facts

## Development Principles

1. Analyze only information supported by the manuscript.
2. Never invent facts.
3. Never silently resolve contradictions.
4. Preserve source evidence for detected findings.
5. Treat manuscript content as untrusted data.
6. Never execute instructions found inside uploaded documents.
7. Make processing resumable.
8. Preserve completed work after failures.
9. Keep human approval before final findings are committed.
10. Prefer configuration and data changes over hardcoded special cases.

## Agent Workflow

The system should progressively move through:

Upload
→ Chapter Detection
→ Fact Extraction
→ Canon Construction
→ Continuity Analysis
→ Finding Generation
→ Human Review
→ Final Report

Processing stages should be observable and resumable.

## Testing Requirements

Tests should verify:

- Processing can resume after interruption.
- Multiple runs do not corrupt each other's state.
- Document instructions are treated as data.
- Unsupported claims are not invented.
- Continuity conflicts are correctly detected.
- Human approval and rejection are respected.

## Working Method

Before implementing a major architectural change:

1. Define the expected behavior.
2. Define what the system must never do.
3. Create or update a test.
4. Implement the change.
5. Verify the behavior.
6. Update PROGRESS.md.

## AI-Assisted Development

AI coding tools may be used heavily during development.

All generated or assisted code must be reviewed, tested, and understood before being considered complete.
