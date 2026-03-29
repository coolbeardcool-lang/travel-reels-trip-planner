# Examples

## Example 1: one reel, three cafes

### Input
Instagram reel showing:
- Cafe A interior
- Cafe B dessert
- Cafe C exterior sign
Caption mentions "京都咖啡三選"

### Expected handling
- classify source as `short_video`
- classify overall `content_kind` as `spot`
- create one source record
- create three separate spot items
- each cafe gets its own:
  - `name`
  - `item_kind=spot`
  - `category=咖啡`
  - `description`
  - `tags`
  - `area`
  - `best_time`
  - `stay_minutes`
  - `evidence`
  - `write_targets=["notion_spot"]`

### Wrong handling
- one combined item called "京都咖啡三選"

---

## Example 2: one short video mixing a market and a seasonal event

### Input
Video mentions:
- local night market
- weekend flower festival
- event date shown in video text

### Expected handling
- one source record
- one spot item for the market
- one event item for the flower festival
- market -> `write_targets=["notion_spot"]`
- festival -> `write_targets=["notion_event"]`
- if date text is partly unclear, set `needs_review=true` and keep the observed evidence

---

## Example 3: weak source with only a title and no clear place

### Input
A URL with title like "Tokyo hidden gems"
No readable description
No extractable place names
No notes

### Expected handling
- `content_kind="source_only"`
- no item creation
- source record only
- recommend `handoff` if user may need manual completion

---

## Example 4: article listing five restaurants with districts

### Input
Blog article with five restaurant headings and district names

### Expected handling
- source type = `article`
- content kind = `spot`
- one source record
- five separate spot items
- item order should follow article order
- use district names as `area`
- if map links exist, retain them