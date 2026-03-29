# Extraction Checklist

Use this checklist before finalizing the structured result.

## A. Source validation
- Is the URL valid and reachable?
- Is the source actually travel-related?
- Is there enough information to support item extraction?
- If not, should it remain `source_only`?

## B. Evidence collection
- Page title collected
- Meta description collected
- OG title / description collected
- User notes considered
- Captions / subtitles available
- Audio transcript available
- Visible text from frames available
- Dates / venue names / district names identified
- Unsupported evidence explicitly marked as unavailable

## C. Source-level analysis
- Source title normalized
- Platform identified
- Overall content kind chosen
- City slug inferred or left null
- Area inferred or left null
- Confidence set
- Review flag set
- Summary written

## D. Item expansion
- All distinct places expanded into separate items
- Mixed place/event content separated
- Duplicates merged only when truly the same entity
- Each item has at least:
  - name
  - category
  - description
  - city_slug or null
  - area or null
  - evidence
  - confidence
  - review flag

## E. Write target decision
- Source-level record marked for `notion_source`
- Stable locations marked for `notion_spot`
- Date-bound items marked for `notion_event`
- Reusable extraction pattern marked for `quick_access`
- Ambiguous / incomplete result marked for `handoff`

## F. Guardrails
- No invented dates
- No invented coordinates
- No invented official URLs
- No merged multi-location record
- No false certainty from weak evidence