# Bid Data Validator

A browser-based validator for scraped bid JSON files.

This app lets you:
- Select required fields from a list (plus optional manual field names).
- Apply those required fields directly into the schema.
- Validate one or many JSON files in a single run.
- Review pass/fail summaries and top validation errors.
- Click any top error row to inspect the full JSON record.
- Export passing records, failing records, and CSV error reports.

## Quick 60-Second Start

1. Open the app at `https://SophanaSok.github.io/data-validator`.
2. The **Select Required Fields** list comes preselected with `AgentName`, `AgentID`, `LegacyAgentID`, and `ResourceURL`. Adjust if needed and click **Apply to Schema**.
3. Drag one or more JSON files into the drop zone.
4. Click **Validate Batch**.
5. Review pass rate and gate status.
6. Click a row in **Top Errors** to inspect the full JSON record.
7. Download `good-bids.json`, `bad-bids.json`, or `errors.csv`.

## What The App Does

The validator checks each input record against the schema found in the JSON Schema editor.

High-level flow:
1. You choose required fields and click **Apply to Schema**.
2. The app writes those fields into `schema.properties.Export.items.required`.
3. You load one or more JSON files.
4. The app validates every record and builds:
   - Good records
   - Bad records
   - Error details per failing field
5. The app shows a summary, top errors, and download buttons.

## Current Features

- Batch validation across multiple `.json` files.
- Drag-and-drop upload and click-to-browse upload.
- Selected-file list with per-file remove action.
- Editable schema text area.
- Required field selector (`Ctrl+Click` / `Cmd+Click` for multi-select).
- Manual required field input (comma or newline separated).
- Progress bar during validation.
- Validation dashboard:
  - Pass rate
  - Good records count
  - Bad records count
  - Total errors
- Pipeline gate status:
  - `Pipeline Ready` when pass rate is at least `95%`
  - `Gate Failed` when pass rate is below `95%`
- Top errors table (first 50 errors).
- Clickable top error rows with full JSON record viewer.
- Export buttons:
  - `good-bids.json`
  - `bad-bids.json`
  - `errors.csv`
- Light/Dark mode toggle.

## Required Fields Selector

The built-in required-field options include:

**Preselected by default (always at top):**
- `AgentName`
- `AgentID`
- `LegacyAgentID`
- `ResourceURL`

**Additional fields (sorted alphabetically):**
- `AwardDate`
- `BidDocuments[]`
- `BidStatus`
- `BidType`
- `BidURL`
- `Description`
- `DueDate`
- `Jurisdiction`
- `ProjectCode`
- `PublishedDate`
- `Title`

Notes:
- The four fields listed above are selected by default when the app loads.
- `BidDocuments[]` is normalized to `BidDocuments` when applied.
- Manual required fields are merged with selected fields.
- Duplicate field names are removed automatically.
- You can deselect any field using `Ctrl+Click` / `Cmd+Click` before applying to schema.

## Input JSON Shapes Supported

Each file can be one of these shapes:
1. Object with `Export` key:

```json
{
  "Export": [
    { "ProjectCode": "SRC1001" }
  ]
}
```

2. Top-level array:

```json
[
  { "ProjectCode": "SRC1001" }
]
```

3. Object where the first key contains the record array:

```json
{
  "SomeWrapper": [
    { "ProjectCode": "SRC1001" }
  ]
}
```

## Validation Behavior (Current Implementation)

The app uses a custom validator in `script.js` (not Ajv).

Supported checks from the schema:
- `type: object`, `array`, `string`
- `required`
- `minLength`
- `minItems`
- `pattern` (used here as non-empty check when pattern exists)
- `enum` (checked for required string fields)
- `format: uri` (checked for required string fields)
- `format: date-time` (checked for required string fields)

Important behavior details:
- Empty values are treated as missing for required checks when value is:
  - `undefined`
  - `null`
  - empty/whitespace string
  - empty array
- Invalid JSON files are skipped silently during batch parse.
- Top error table shows first 50 errors only.
- Full error data is still available in downloads.

## How To Use The App

### 1. Access the app via GitHub Pages

The app is hosted on GitHub Pages. Open:

```
https://SophanaSok.github.io/data-validator
```

The app will load directly in your browser—no installation required.

### 2. Choose required fields

1. The following four fields are **preselected by default**: `AgentName`, `AgentID`, `LegacyAgentID`, and `ResourceURL`.
2. Adjust the selection as needed using multi-select (`Ctrl+Click` / `Cmd+Click`).
3. Optionally add more names in **Manual Required Fields**.
4. Click **Apply to Schema**.
5. Confirm the success message with the count of required fields applied.

### 3. Review schema

- Verify schema JSON in the editor.
- Make additional edits if needed.
- Think of the schema like a set of nested folders the validator must open in order:
  `properties` -> `Export` -> `items`.
- If any one of those is missing, the app does not know where the "rules for each bid record" are stored, so validation cannot start.
- In plain terms: this is the exact location where the app expects the checklist for each bid.
- Minimum shape the schema must have:

```json
{
  "properties": {
    "Export": {
      "items": {}
    }
  }
}
```

### 4. Load files

- Drag files into the drop zone, or click to browse.
- Confirm file list appears.
- Remove files with the **Remove** button if needed.

### 5. Run validation

- Click **Validate Batch**.
- Wait for progress to complete.
- Review pass rate, gate status, and top errors.

### 6. Inspect full record from top errors

1. In **Top Errors**, click any row.
2. View full JSON in **Selected Error Record**.
3. Use this to debug exactly what failed in context.

### 7. Export outputs

- **Good Records JSON**: all passing records.
- **Bad Records JSON**: all failing records.
- **Error Report CSV**: flattened error details.

## Example Workflow

1. Select `ProjectCode`, `BidURL`, `PublishedDate`, and `ResourceURL`.
2. Click **Apply to Schema**.
3. Upload one or more `.json` files.
4. Click **Validate Batch**.
5. Open a top error row and inspect the full record.
6. Fix data upstream and rerun validation.
7. Export clean and error outputs.

## UI Guide

- **Theme Toggle**: switches between light and dark mode.
- **User Guide Link**: opens the GitHub-style README viewer page.
- **Validation Engine Badge**: currently indicates local validation.
- **Results Panel**: regenerated on each validation run.
- **Top Errors Table**:
  - Click row to load record detail panel.
  - Keyboard accessible with `Tab`, `Enter`, or `Space`.

## Troubleshooting

### "Invalid schema"

Cause:
- Schema text is not valid JSON.

Fix:
- Use double quotes for keys/strings.
- Remove trailing commas.
- Validate JSON syntax before running.

### "Schema must include properties.Export.items"

Cause:
- Schema structure is missing expected path.

Fix:
- Ensure schema contains:

```json
{
  "properties": {
    "Export": {
      "items": { "type": "object" }
    }
  }
}
```

### "Load JSON files"

Cause:
- No files selected.

Fix:
- Add files via drag-drop or picker.

### Many required-field failures

Cause:
- Selected/manual required fields are stricter than incoming data.

Fix:
- Revisit selected required fields.
- Confirm exact case-sensitive key names in data.

### URI/date-time errors are unexpected

Cause:
- `format` checks are only enforced when the field is required.

Fix:
- Ensure those fields are required if you want strict checks.
- Or update validator logic in `script.js` to enforce formats for optional fields too.

### Top error row click does nothing

Cause:
- No rows rendered (no errors) or selected index is unavailable.

Fix:
- Confirm there are failing rows in Top Errors.
- Re-run validation if results were cleared.

## Project Structure

- `index.html`: App layout, controls, and default schema.
- `styles.css`: Theme and component styling.
- `script.js`: State, validation flow, and rendering logic.
- `readme.html`: GitHub-style README viewer with theme toggle.
- `README.md`: Documentation and user guide.

## Development Notes

- No build step is required.
- No external runtime dependency is required for validation logic.
- `readme.html` uses CDN-hosted `marked` and `github-markdown-css` for README rendering.

## Known Limitations

- Validation focuses on a subset of JSON Schema behavior.
- Top errors panel is capped at 50 rows for readability.
- Invalid JSON files are skipped without detailed per-file parse messaging.

## License

No license file is currently defined in this repository.
