# Bid Data Validator

Browser-based validator for scraped bid JSON files. This tool lets you validate one or many JSON files against a configurable schema, inspect failures, and export clean/error-separated outputs.

## Features

- Batch validation for multiple JSON files in one run.
- Drag-and-drop file upload or click-to-browse input.
- Editable JSON schema directly in the UI.
- Required field selector that updates schema requirements automatically.
- Record-level validation using Ajv (JSON Schema validator).
- Support for common input shapes:
	- Top-level `Export` array.
	- Raw top-level array.
	- First object key containing an array-like payload.
- Validation summary dashboard with:
	- Pass rate.
	- Good record count.
	- Bad record count.
	- Total errors found.
- Pipeline gate status:
	- `Pipeline Ready` when pass rate is at least `95%`.
	- `Gate Failed` when pass rate is below `95%`.
- Top 50 error table including file name, record index, field path, and error message.
- One-click exports:
	- `good-bids.json` (passing records)
	- `bad-bids.json` (failing records)
	- `errors.csv` (flat error report)
- Light/dark theme toggle.

## Tech Stack

- Plain HTML/CSS/JavaScript (no build step required).
- [Ajv v8](https://ajv.js.org/) via CDN for schema validation.
- [SortableJS](https://sortablejs.github.io/Sortable/) is included via CDN (currently not used by the page behavior).

## Quick Start

### 1. Clone and open

```bash
git clone https://github.com/SophanaSok/data-validator.git
cd data-validator
```

### 2. Run locally

You can either open `index.html` directly in a browser, or serve it with a local static server.

Option A: open file directly

- Open `index.html` in your browser.

Option B: serve over HTTP (recommended)

```bash
python3 -m http.server 8000
```

Then visit:

- `http://localhost:8000`

### 3. Validate data

1. Select required fields in the multi-select list.
2. Click `Apply to Schema` to update schema `required` rules.
3. Review/edit the schema JSON if needed.
4. Drag in one or more `.json` files (or click to browse).
5. Click `Validate Batch`.
6. Inspect pass rate, gate status, and top errors.
7. Download `good-bids.json`, `bad-bids.json`, and/or `errors.csv`.

## Input Expectations

- Files must be valid JSON.
- Each record is validated against `schema.properties.Export.items`.
- The default schema expects bid-like fields such as:
	- `ProjectCode` pattern `^SRC\d+$`
	- `BidStatus` enum values (`Active`, `Awarded`, `Closed`, `Cancelled`)
	- URI format for `BidURL`
	- Date-time format for fields like `PublishedDate` and `DueDate`

## Sample Data

### Example input (valid shape)

```json
{
	"Export": [
		{
			"ProjectCode": "SRC1001",
			"AgentID": "AG-7781",
			"Title": "Road Rehabilitation - Phase 2",
			"BidStatus": "Active",
			"BidURL": "https://procurement.example.org/bids/SRC1001",
			"PublishedDate": "2026-03-20T08:30:00Z",
			"DueDate": "2026-04-15T17:00:00Z",
			"AgentName": "City Procurement Office"
		},
		{
			"ProjectCode": "BAD-42",
			"AgentID": "",
			"Title": "Bid",
			"BidStatus": "InReview",
			"BidURL": "not-a-url",
			"PublishedDate": "03/20/2026",
			"DueDate": "tomorrow",
			"AgentName": ""
		}
	]
}
```

### Example outputs after validation

`good-bids.json` (records that pass schema rules)

```json
[
	{
		"ProjectCode": "SRC1001",
		"AgentID": "AG-7781",
		"Title": "Road Rehabilitation - Phase 2",
		"BidStatus": "Active",
		"BidURL": "https://procurement.example.org/bids/SRC1001",
		"PublishedDate": "2026-03-20T08:30:00Z",
		"DueDate": "2026-04-15T17:00:00Z",
		"AgentName": "City Procurement Office"
	}
]
```

`bad-bids.json` (records that fail one or more rules)

```json
[
	{
		"ProjectCode": "BAD-42",
		"AgentID": "",
		"Title": "Bid",
		"BidStatus": "InReview",
		"BidURL": "not-a-url",
		"PublishedDate": "03/20/2026",
		"DueDate": "tomorrow",
		"AgentName": ""
	}
]
```

`errors.csv` (flattened validation errors)

```csv
File,Record,Field,Error
lambda-sample.json,1,/ProjectCode,must match pattern "^SRC\\d+$"
lambda-sample.json,1,/AgentID,must NOT have fewer than 1 characters
lambda-sample.json,1,/Title,must NOT have fewer than 5 characters
lambda-sample.json,1,/BidStatus,must be equal to one of the allowed values
lambda-sample.json,1,/BidURL,must match format "uri"
lambda-sample.json,1,/PublishedDate,must match format "date-time"
lambda-sample.json,1,/DueDate,must match format "date-time"
```

## Notes

- Invalid JSON files are skipped during batch parsing.
- Errors are captured per failing record and field path.
- The error table displays only the first 50 errors for readability; full details are available in exported files.

## Troubleshooting

### "Invalid schema"

- Cause: malformed JSON in the schema editor.
- Fix:
	- Make sure keys and string values use double quotes.
	- Remove trailing commas.
	- Validate JSON with a formatter/linter before pasting.

### "Load JSON files"

- Cause: no files are currently selected.
- Fix:
	- Drag files onto the drop area again, or click and reselect files.
	- Confirm selected files have a `.json` extension.

### Many records fail required fields

- Cause: required field list was updated and schema now requires additional keys.
- Fix:
	- Re-check selected required fields and click `Apply to Schema` again.
	- Ensure incoming records include all required keys exactly (case-sensitive).

### Date/time fields fail validation

- Cause: values are not RFC 3339 date-time strings.
- Fix:
	- Use values like `2026-03-20T08:30:00Z`.
	- Avoid local formats like `03/20/2026` or natural language values like `tomorrow`.

### URL fields fail validation

- Cause: value is not a valid URI.
- Fix:
	- Include a full scheme such as `https://`.
	- Example valid format: `https://example.com/bid/123`.

### Records are not being picked up from file

- Cause: top-level JSON structure does not match expected shape.
- Fix:
	- Prefer `{ "Export": [ ... ] }`.
	- A top-level array is also accepted.
	- If using an object wrapper, ensure the first key points to an array of records.

## Project Structure

- `index.html`: Full application UI and logic.
- `README.md`: Project documentation.

## Future Improvements

- Add persisted schema profiles.
- Add field mapping and normalization helpers.
- Add per-file summary cards.
- Add test fixtures and automated browser tests.

## License

No license file is currently defined in this repository.