# Bid Data Validator

A browser-based validator for scraped bid JSON files.

Use it to:
- Select required fields from a list (plus optional manual field names).
- Apply those required fields directly into the schema.
- Validate one or many JSON files in a single run.
- Review pass/fail summaries and top validation errors.
- Use a side navigation in generated results to quickly jump between sections.
- Filter **All Errors** by field.
- Sort **All Errors** by clicking column headers.
- Click summary stat cards to open detailed insights (per-file pass/good/bad breakdowns).
- Click **Top Error Fields** chips to quickly filter the **All Errors** table.
- Click any error row to inspect the full JSON record (the page auto-scrolls to the record viewer).
- Expand collapsed **All Errors** section to review rows.
- Inspect selected records with JSON syntax highlighting plus field-key highlighting.
- Export passing records, failing records, and CSV error reports.

## Quick 60-Second Start

1. Open the app at `https://SophanaSok.github.io/data-validator`.
2. The **Select Required Fields** list comes preselected with `AgentName`, `AgentID`, `LegacyAgentID`, and `ResourceURL`. Adjust if needed and click **Apply to Schema**.
3. Drag one or more JSON files into the drop zone.
4. Click **Validate Batch**.
5. Review pass rate and gate status.
6. Optionally filter **All Errors** by field.
7. Optionally sort the table by clicking a column header (click again to reverse direction).
8. Click **Pass Rate**, **Good Records**, or **Bad Records** to open per-file insights in the summary panel.
9. Optionally click a **Top Error Fields** chip to filter **All Errors** by that field.
10. Click a row in **All Errors** to inspect the full JSON record.
11. Download `good-bids.json`, `bad-bids.json`, or `errors.csv`.

## How To Use The App

### 1. Access the app via GitHub Pages

The app is hosted on GitHub Pages. Open:

```
https://SophanaSok.github.io/data-validator
```

No installation is required.

### 2. Choose required fields

1. The following four fields are **preselected by default**: `AgentName`, `AgentID`, `LegacyAgentID`, and `ResourceURL`.
2. **Quickly select all fields**: Click the **Select All** button next to the label to select all available fields. Once all are selected, the label switches to **Deselect All** so you can clear all fields in one click.
3. Adjust the selection with normal clicks: click once to select, click again to deselect (no modifier keys required). Selecting fields will **not** jump the scroll position to the top.
4. Watch the live `Selected: field1, field2, field3...` indicator under the selector as you choose fields. It displays the actual names of all selected fields in real time.
5. Optionally add more names in **Manual Required Fields**.
6. Click **Apply to Schema**.
7. Confirm the top toast notification showing how many required fields were applied.

### 3. Review schema

- Verify schema JSON in the editor.
- Make additional edits if needed.
- Think of the schema like a set of nested folders the validator must open in order:
  `properties` -> `Export` -> `items`.
- If any one of those is missing, validation cannot start because the app cannot find per-record rules.
- In plain terms, this is where the app expects the checklist for each bid.
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
- The page auto-scrolls to generated results and the side navigation appears.
- Review pass rate, gate status, and all errors.

### 6. Inspect full record from error tables

1. In **All Errors**, click any row.
2. The page auto-scrolls to **Selected Error Record**.
3. The JSON key causing the validation error is highlighted in the record viewer and automatically brought into view.
4. JSON is syntax highlighted (keys, strings, numbers, booleans, and null) to improve readability.
5. Use this to quickly debug what failed in context.

### 6.1 Understand key highlighting

1. In **Selected Error Record**, look for the legend text: **Highlighted key = field causing the validation error**.
2. Highlighting follows the error path, including nested keys.
3. For nested paths that cannot be resolved exactly in rendered JSON (for example some `BidDocuments[]` nested errors), the viewer falls back to the nearest parent key so a relevant key is still highlighted.
4. For missing required fields, no key can be highlighted because the key is absent in the JSON object.
5. In that case, the record summary includes **key missing in record**.

### 6.2 Review uncapped errors

1. Expand **All Errors** in the results panel.
2. This table contains every error row found in the batch (not limited to 50 rows).
3. Optionally filter **All Errors** by field.
4. Click any row to load the full JSON record in **Selected Error Record**.

### 6.3 Understand in-app notifications

1. The app uses non-blocking toast notifications instead of browser alerts.
2. Success notifications are subtle and auto-dismiss.
3. Warning/error notifications stay visible longer and are announced with higher accessibility priority.

### 6.4 Use summary insights

1. In the summary area, click **Pass Rate**, **Good Records**, or **Bad Records** to open a detailed per-file insights panel.
2. The insights panel remains open until you close it with the **Close** button.
3. Click **Errors Found** to open a field distribution modal.
4. Click **Error Severity** to open error-type distribution and filter by type.
5. Use the **Top Error Fields** chips to jump directly to filtered **All Errors** results.

### 7. Export outputs

- **Good Records JSON**: all passing records.
- **Bad Records JSON**: all failing records.
- **Error Report CSV**: flattened error details.

## Example Workflow

1. Select `ProjectCode`, `BidURL`, `PublishedDate`, and `ResourceURL`.
2. Click **Apply to Schema**.
3. Upload one or more `.json` files.
4. Click **Validate Batch**.
5. Open an error row and inspect the full record.
6. Fix data upstream and rerun validation.
7. Export clean and error outputs.

## UI Guide

- **Theme Toggle**:
  - Default mode is **System**.
  - Clicking from **System** switches to the opposite of the current OS theme (to avoid no-op toggles).
  - Then cycles through explicit modes and back to `System`.
- **User Guide Link**: opens the GitHub-style README viewer page.
- **Validation Engine Badge**: includes a hover/focus tooltip explaining validation runs locally in-browser.
- **Results Panel**: regenerated on each validation run.
- **Results Side Navigation**: appears after validation and provides jump links to each generated section.
- **Summary Stats**:
  - **Pass Rate**, **Good Records**, and **Bad Records** are clickable and open per-file insights in an inline details panel.
  - Stats use a lightweight click animation to confirm interaction.
  - Details remain visible until closed with the panel close button.
- **Top Error Fields Insights**:
  - Shows top error-prone fields with count and percentage.
  - Clicking a field chip filters the **All Errors** table to that field.
- **All Errors Panel**:
  - Collapsed by default.
  - Optional filters for narrowing rows by error field and value text.
  - Sortable columns (`File`, `Record #`, `Field`, `Value`, `Error`) with ascending/descending toggle.
  - Expand to see every error row (uncapped).
  - Click row to load record detail panel and auto-scroll to it.
  - Keyboard accessible with `Tab`, `Enter`, or `Space`.

## What The App Does

The validator checks each input record against the schema in the JSON Schema editor.

Document URL rule:
- `BidDocuments[].URL`, `AddendumDocuments[].URL`, `BidTabulations[].URL`, and `AwardDocuments[].URL` must be valid URIs.
- The URL path must end with one of these file extensions: `.doc`, `.docx`, `.xls`, `.xlsx`, `.pdf`.
- Any other file extension (or no extension) fails validation.

Quick verification example:

```json
{
  "Export": [
    {
      "BidDocuments": [
        {
          "Title": "Specs",
          "URL": "https://example.com/files/specifications.pdf",
          "Hash": "ok"
        },
        {
          "Title": "Photo",
          "URL": "https://example.com/files/site-photo.jpg",
          "Hash": "bad"
        }
      ]
    }
  ]
}
```

Expected result:
- `.pdf` URL passes this rule.
- `.jpg` URL fails with: `must reference a .doc, .docx, .xls, .xlsx, or .pdf file`.

Regression check for `BidDocuments[].URL` value rendering:
1. Validate the sample above.
2. Open **All Errors**.
3. Locate the row where **Field** is `BidDocuments[].URL` and **Error** is `must reference a .doc, .docx, .xls, .xlsx, or .pdf file`.
4. Confirm **Value** shows `https://example.com/files/site-photo.jpg` (the mismatched URL), not `(empty)`.

High-level flow:
1. You choose required fields and click **Apply to Schema**.
2. The app writes those fields into `schema.properties.Export.items.required`.
3. You load one or more JSON files.
4. The app validates every record and builds:
   - Good records
   - Bad records
   - Error details per failing field
5. The app shows a summary, an **All Errors** panel (uncapped and collapsed by default), and download buttons.
6. The app also shows a side navigation for quick in-results section jumps.

## Current Features

- Batch validation across multiple `.json` files.
- Drag-and-drop upload and click-to-browse upload.
- Selected-file list with per-file remove action.
- Editable schema text area.
- Required field selector with click-to-toggle behavior (click to select, click again to deselect).
- Select-all control that toggles label/state between `Select All` and `Deselect All`.
- Live selected-count helper (`Selected: X fields`) below the required-field selector.
- Manual required field input (comma or newline separated).
- Progress bar during validation.
- Auto-scroll to generated validation results after validation completes.
- In-app toast notifications for success/warning/error feedback (instead of blocking browser alerts).
- Validation dashboard:
  - Pass rate
  - Good records count
  - Bad records count
  - Total errors
- Clickable summary insights panel for per-file breakdowns of pass rate, good records, and bad records.
- Error severity insight card with modal breakdown and type-based filtering.
- Top error fields insight chips with one-click filtering into **All Errors**.
- Pipeline gate status:
  - `Pipeline Ready` when pass rate is at least `95%`
  - `Gate Failed` when pass rate is below `95%`
- Collapsible **All Errors** table containing every error row (uncapped).
- Field filter for **All Errors** table.
- Sortable columns for **All Errors** table.
- Clickable all-error rows with the same full-record viewer behavior.
- Side navigation in results for quick jumps to summary, status, errors, selected record, and downloads.
- Syntax-highlighted JSON in Selected Error Record viewer.
- Selected record key highlighting for the exact field/path causing each error.
- Nested-path fallback highlighting that marks the nearest parent key when an exact nested match is not renderable (for example some `BidDocuments[]` errors).
- Document URL file-type validation for `BidDocuments[]`, `AddendumDocuments[]`, `BidTabulations[]`, and `AwardDocuments[]` (only `.doc`, `.docx`, `.xls`, `.xlsx`, `.pdf` are accepted).
- In-view legend text explaining highlighted key behavior.
- Missing-key summary hint for required-field errors when the key does not exist in the record.
- Export buttons:
  - `good-bids.json`
  - `bad-bids.json`
  - `errors.csv`
- Three-stage theme toggle with System-first behavior and opposite-theme first click from System mode.

## Required Fields Selector

The built-in required-field options include:

**Preselected by default (always at top):**
- `AgentName`
- `AgentID`
- `LegacyAgentID`
- `ResourceURL`

**Additional fields (sorted alphabetically):**
- `AwardDate`
- `AddendumDocuments[]`
- `AwardDocuments[]`
- `BidDocuments[]`
- `BidTabulations[]`
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
- `BidDocuments[]`, `AddendumDocuments[]`, `BidTabulations[]`, and `AwardDocuments[]` are normalized by removing `[]` when applied.
- Manual required fields are merged with selected fields.
- Duplicate field names are removed automatically.
- You can select or deselect any field with a single click before applying to schema.
- A live `Selected: X fields` helper shows the current selection count.

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
- The validator checks only fields included in `schema.required` at each object level.
- Optional (non-required) fields are ignored even when present in data.
- Empty values are treated as missing for required checks when value is:
  - `undefined`
  - `null`
  - empty/whitespace string
  - empty array
- Invalid JSON files are skipped silently during batch parse.
- The **All Errors** panel shows the uncapped full list in the UI.
- The **All Errors** table can also be filtered by field.
- Full error data is also available in downloads.
- `date-time` accepts:
  - Strict ISO datetime with timezone (for example `2026-03-05T14:30:00Z`)
  - ISO date-only (`2026-03-05`)
  - Slash date-only (`03/05/2026`, including ambiguous month/day forms)

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

Note:
- These messages are shown as in-app toast notifications.

### Many required-field failures

Cause:
- Selected/manual required fields are stricter than incoming data.

Fix:
- Revisit selected required fields.
- Confirm exact case-sensitive key names in the source data.

### URI/date-time errors are unexpected

Cause:
- `format` checks are only enforced when the field is required.

Fix:
- Ensure those fields are required if you want strict checks.
- Or update validator logic in `script.js` if you want format checks on optional fields too.

### Document array errors appear when not selected

Cause:
- The schema likely still marks one or more document arrays (`BidDocuments`, `AddendumDocuments`, `BidTabulations`, `AwardDocuments`) as required.

Fix:
- Deselect document array fields in required fields and click **Apply to Schema** again.
- Confirm those keys are not listed under `schema.properties.Export.items.required`.

### Error row click does nothing

Cause:
- No rows rendered (no errors) or selected index is unavailable.

Fix:
- Confirm there are failing rows in **All Errors**.
- Re-run validation if results were cleared.

### Key is not highlighted in Selected Error Record

Cause:
- The field is missing from the JSON object (common for `is required` errors).
- Or the error points to an array/container path instead of a concrete object key.

Fix:
- Check the summary line for **key missing in record**.
- Confirm the expected key exists at the correct nesting level.
- If needed, compare the row's `Field` value with the rendered object structure.

## Project Structure

- `index.html`: App layout, controls, and default schema.
- `styles.css`: App theme and component styling.
- `script.js`: App state, validation flow, and rendering logic.
- `theme.js`: Shared 3-mode theme controller (`System`, `Dark`, `Light`).
- `readme.html`: User guide viewer layout.
- `readme.css`: User guide styling.
- `readme.js`: User guide rendering logic.
- `README.md`: Documentation and user guide content source.

## Development Notes

- No build step is required.
- No external runtime dependency is required for validation logic.
- `readme.html` uses CDN-hosted `marked` and `github-markdown-css` for README rendering.
- User-guide CSS and JS are split into `readme.css` and `readme.js`.

## Known Limitations

- Validation focuses on a subset of JSON Schema behavior.
- Invalid JSON files are skipped without detailed per-file parse messages.

## What Changed Recently

- Added a collapsible **All Errors** panel with uncapped error rows.
- Added row-click support in **All Errors** to open **Selected Error Record**.
- Added key-level highlighting in **Selected Error Record** for the field/path causing the selected error.
- Added an inline legend and missing-key summary hint for required-field errors.
- Adjusted required-field behavior so unselected fields (such as document arrays) are not validated.
- Expanded date-time acceptance to include ISO date-only and slash date values (for example `03/05/2026`).
- Added inline UI guidance clarifying required-field validation behavior.
- Added field filter and sorting for the **All Errors** table.
- Updated theme behavior to a shared 3-mode toggle (`System`, `Dark`, `Light`) with system as default.
- Moved README viewer inline styles/scripts into `readme.css` and `readme.js`.

## License

No license file is currently defined in this repository.
