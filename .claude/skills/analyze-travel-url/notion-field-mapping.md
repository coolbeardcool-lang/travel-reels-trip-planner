# Notion Field Mapping

This project currently writes confirmed analysis results into separate Notion data sources.

## 1) Source-level record
Use for every analyzed URL.

### Target
Notion Sources data source

### Current field mapping
- `Name` <- short display title derived from city + summary or platform + kind
- `SourceUrl` <- normalized source URL
- `Platform` <- source platform
- `SourceType` <- "活動資訊" | "景點美食" | "手動整理"
- `Status` <- current workflow status
- `Note` <- user notes or summary
- `CityHints` <- inferred city slug(s)
- `Published` <- boolean

### Skill-side source object fields
Use these field names in the analysis result:
- `source_title`
- `source_platform`
- `content_kind`
- `city_slug`
- `area`
- `confidence`
- `needs_review`
- `summary`
- `source_credibility`
- `review_reason`
- `write_targets`

## 2) Spot-level item
Use when the item is a stable place, venue, restaurant, cafe, shopping point, temple, museum, etc.

### Target
Notion Spots data source

### Current field mapping
- `Name` <- item name
- `Area` <- area or fallback city label
- `BestTime` <- best visit time
- `Category` <- category
- `City` <- city label
- `CitySlug` <- city slug
- `Description` <- short description
- `Lat` <- coordinate
- `Lng` <- coordinate
- `MapUrl` <- map link
- `Notes` <- reason / analyst note
- `Published` <- boolean
- `StayMinutes` <- stay estimate
- `Tags` <- joined tags
- `Thumbnail` <- emoji thumbnail

### Skill-side spot item fields
- `name`
- `item_kind` = `spot`
- `category`
- `description`
- `tags`
- `city_slug`
- `area`
- `best_time`
- `stay_minutes`
- `lat`
- `lng`
- `map_url`
- `thumbnail`
- `source_credibility`
- `item_confidence`
- `needs_review`
- `review_reason`
- `evidence`
- `reason`

## 3) Event-level item
Use when the item is date-bound, ticketed, time-limited, or clearly an event.

### Target
Notion Events data source

### Current field mapping
- `Name` <- item name
- `Area` <- area
- `Category` <- category
- `City` <- city label
- `CitySlug` <- city slug
- `Description` <- short description
- `StartTimeText` <- start time
- `EndTimeText` <- end time
- `StartsOn` <- start date
- `EndsOn` <- end date
- `Lat` <- coordinate
- `Lng` <- coordinate
- `MapUrl` <- map link
- `OfficialUrl` <- official or source URL
- `PriceNote` <- price note
- `Published` <- boolean
- `RecurringType` <- default recurrence
- `Status` <- workflow status
- `Tags` <- joined tags
- `TicketType` <- ticket mode
- `VenueName` <- venue name

### Skill-side event item fields
- `name`
- `item_kind` = `event`
- `category`
- `description`
- `tags`
- `city_slug`
- `area`
- `starts_on`
- `ends_on`
- `start_time`
- `end_time`
- `price_note`
- `ticket_type`
- `venue_name`
- `lat`
- `lng`
- `map_url`
- `official_url`
- `thumbnail`
- `source_credibility`
- `item_confidence`
- `needs_review`
- `review_reason`
- `evidence`
- `reason`

## 4) Current model gap to be aware of
The existing backend already supports:
- source-level `contentKind`
- item arrays
- spot/event-specific item properties
- Notion write-back by content kind

However, current analysis output should ideally be extended with:
- `item_kind`
- `source_credibility`
- `item_confidence`
- `evidence`
- `review_reason`

Recommend these only when needed. Do not force a schema rewrite if the current task can be completed safely without them.