---
name: analyze-travel-url
description: Analyze a travel-related URL such as a reel, short video, blog post, event page, or map page; extract places or events; split multiple locations into separate items; and map the result to this project's Notion structure.
argument-hint: [url]
disable-model-invocation: true
user-invocable: true
---

# Analyze Travel URL

Use this skill when the input is a travel-related URL and the goal is to turn it into structured records for this project.

This project already has:
- `functions/api/analyze-url.js` for URL analysis
- `functions/api/confirm-analysis.js` for confirmed Notion write-back

Read these supporting files before deciding the final output:
- `notion-field-mapping.md`
- `output-schema.md`
- `extraction-checklist.md`

Use `examples.md` when the source contains multiple places, mixed spot/event content, or weak evidence.

## Input
Primary input: `$ARGUMENTS`

If `$ARGUMENTS` is empty, use the URL provided in the current user request.

## Goal
Produce a structured analysis result that:
1. aligns with the project's current analysis model
2. expands multiple places into separate items
3. distinguishes source-level information from item-level information
4. recommends whether the result should go to:
   - Notion Sources
   - Notion Spots
   - Notion Events
   - quick-access notes
   - handoff notes

## Required working order

### Step 1: Identify source type
Classify the URL as one of:
- short-form video
- article / blog
- event page
- map / directory page
- weak-information page

### Step 2: Collect evidence
Prefer evidence in this order:
1. structured page metadata
2. captions / subtitles
3. audio transcript
4. visible text in frames
5. title / description / user notes

If tool-assisted audio or visual extraction is unavailable in the current environment, explicitly mark the extraction as partial and continue with metadata plus notes.

Never pretend audio or visual evidence exists when it does not.

### Step 3: Extract source-level facts
Extract:
- source title
- source platform
- probable city slug
- probable area
- overall content kind
- source credibility
- concise summary
- whether review is required

### Step 4: Extract candidate items
Identify candidate places or events mentioned in the URL content.

For each candidate item, extract:
- name
- item kind
- category
- description
- tags
- city slug
- area
- best time or dates
- estimated stay or event duration clues
- map / official URL if available
- evidence
- source credibility
- item confidence
- review reason if uncertain

### Step 5: Expand multiple locations
If a single source contains multiple places, create one item per place.

Rules:
- do not merge different places into one record
- do not collapse multiple restaurants into a single “food list” item
- if the source mixes places and events, keep them as separate items
- if the source mentions an itinerary order, preserve that order in reasoning notes

### Step 6: Decide write targets
Always prepare:
- one source-level object
- zero or more item-level objects

Recommend write targets as follows:
- `notion_source`: always, unless the URL is invalid or unusable
- `notion_spot`: when an item is a stable place or store
- `notion_event`: when an item is date-bound or clearly an event
- `quick_access`: only when the source reveals a reusable rule, repeated extraction pattern, or structural learning worth preserving
- `handoff`: when ambiguity remains, manual review is needed, or follow-up enrichment is required

### Step 7: Recommend schema updates only when necessary
If the current project schema cannot faithfully represent the source, recommend the smallest useful schema change.

Prefer additive fields over renaming existing fields.

## Output contract
Return five sections in this order:

1. `extraction_summary`
2. `source_record`
3. `items`
4. `write_recommendations`
5. `schema_recommendations`

## Hard rules
- Split multiple locations into separate items.
- Do not invent coordinates, dates, or official URLs.
- If evidence is weak, set review flags rather than fabricating certainty.
- Use current project field names unless explicitly proposing schema upgrades.
- If the source is too weak to support item creation, return `source_only`.