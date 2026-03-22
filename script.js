let selectedFiles = [];
let ui = null;
let lastValidationData = { good: [], bad: [], errors: [] };
let topErrorsPreview = [];

document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    ui = {
        themeToggle: document.getElementById('themeToggle'),
        applySchemaBtn: document.getElementById('applySchemaBtn'),
        validateBtn: document.getElementById('validateBtn'),
        fileDrop: document.getElementById('fileDrop'),
        fileInput: document.getElementById('jsonFile'),
        fileList: document.getElementById('fileList'),
        schema: document.getElementById('schema'),
        requiredFields: document.getElementById('requiredFields'),
        manualRequiredFields: document.getElementById('manualRequiredFields'),
        progress: document.getElementById('progress'),
        progressBar: document.getElementById('progressBar'),
        results: document.getElementById('results')
    };

    bindUIEvents();
}

function bindUIEvents() {
    if (ui.themeToggle) {
        ui.themeToggle.addEventListener('click', toggleTheme);
    }

    if (ui.applySchemaBtn) {
        ui.applySchemaBtn.addEventListener('click', updateSchema);
    }

    if (ui.validateBtn) {
        ui.validateBtn.addEventListener('click', validateFiles);
    }

    if (ui.fileDrop) {
        ui.fileDrop.addEventListener('click', openFilePicker);
        ui.fileDrop.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openFilePicker();
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
            ui.fileDrop.addEventListener(event, e => {
                e.preventDefault();
                e.stopPropagation();

                if (event === 'dragenter' || event === 'dragover') {
                    ui.fileDrop.classList.add('dragover');
                } else {
                    ui.fileDrop.classList.remove('dragover');
                }

                if (event === 'drop' && e.dataTransfer && e.dataTransfer.files) {
                    setSelectedFiles(e.dataTransfer.files);
                }
            });
        });
    }

    if (ui.fileInput) {
        ui.fileInput.addEventListener('change', e => {
            setSelectedFiles(e.target.files);
        });
    }

    if (ui.fileList) {
        ui.fileList.addEventListener('click', e => {
            const button = e.target.closest('.file-remove');
            if (!button) {
                return;
            }

            const index = Number(button.dataset.index);
            if (Number.isNaN(index)) {
                return;
            }

            selectedFiles.splice(index, 1);
            setSelectedFiles(selectedFiles);
            if (ui.fileInput) {
                ui.fileInput.value = '';
            }
        });
    }

    if (ui.results) {
        ui.results.addEventListener('click', handleTopErrorRowClick);
        ui.results.addEventListener('keydown', e => {
            const row = e.target.closest('.error-row');
            if (!row) {
                return;
            }

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showErrorRecord(row.dataset.errorIndex);
            }
        });
    }

    ['dragover', 'drop'].forEach(event => {
        document.addEventListener(event, e => {
            if (!ui.fileDrop || !ui.fileDrop.contains(e.target)) {
                e.preventDefault();
            }
        });
    });
}

function openFilePicker() {
    if (ui && ui.fileInput) {
        ui.fileInput.click();
    }
}

function toggleTheme() {
    document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    if (ui && ui.themeToggle) {
        ui.themeToggle.textContent = document.body.dataset.theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
    }
}

function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** exponent;
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function renderSelectedFiles() {
    if (!ui || !ui.fileList) {
        return;
    }

    ui.fileList.innerHTML = selectedFiles
        .map((file, index) => `
            <div class="file-list-item">
                <div class="file-meta">
                    <span class="file-name">${escapeHTML(file.name)}</span>
                    <span class="file-size">${formatBytes(file.size)}</span>
                </div>
                <button type="button" class="file-remove" data-index="${index}" aria-label="Remove ${escapeHTML(file.name)}">Remove</button>
            </div>
        `)
        .join('');
}

function escapeHTML(value) {
    return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function setSelectedFiles(files) {
    selectedFiles = Array.from(files || []);
    if (ui && ui.fileDrop) {
        ui.fileDrop.textContent = selectedFiles.length
            ? `${selectedFiles.length} files loaded`
            : '📁 Drag .json files or click to browse (multiple OK)';
    }
    renderSelectedFiles();
}

function handleTopErrorRowClick(e) {
    const row = e.target.closest('.error-row');
    if (!row) {
        return;
    }

    showErrorRecord(row.dataset.errorIndex);
}

function showErrorRecord(indexValue) {
    const index = Number(indexValue);
    if (Number.isNaN(index) || !topErrorsPreview[index] || !ui || !ui.results) {
        return;
    }

    const selected = topErrorsPreview[index];
    const summary = ui.results.querySelector('#errorRecordSummary');
    const content = ui.results.querySelector('#errorRecordContent');
    const rows = ui.results.querySelectorAll('.error-row');

    rows.forEach(row => {
        row.classList.toggle('active', Number(row.dataset.errorIndex) === index);
    });

    if (!summary || !content) {
        return;
    }

    summary.textContent = `${selected.file} | record ${selected.index} | ${selected.field} | ${selected.message}`;
    content.textContent = JSON.stringify(selected.record, null, 2);

    const selectedErrorCard = ui.results.querySelector('#selectedErrorRecord');
    if (selectedErrorCard) {
        selectedErrorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function updateSchema() {
    const requiredSelect = ui && ui.requiredFields;
    const manualRequiredInput = ui && ui.manualRequiredFields;
    const schemaElement = ui && ui.schema;

    if (!requiredSelect || !schemaElement) {
        return;
    }

    const selected = Array.from(requiredSelect.selectedOptions)
        .map(o => normalizeRequiredFieldName(o.value))
        .filter(Boolean);
    const manual = String((manualRequiredInput && manualRequiredInput.value) || '')
        .split(/[\n,]+/)
        .map(normalizeRequiredFieldName)
        .filter(Boolean);

    const requiredFields = Array.from(new Set([...selected, ...manual]));
    if (!requiredFields.length) {
        alert('Select required fields');
        return;
    }

    const schema = JSON.parse(schemaElement.value);
    if (!schema.properties || !schema.properties.Export || !schema.properties.Export.items) {
        alert('Schema must include properties.Export.items');
        return;
    }

    schema.properties.Export.items.required = requiredFields;
    schemaElement.value = JSON.stringify(schema, null, 2);
    alert(`✅ Set ${requiredFields.length} required fields`);
}

function unwrap(data) {
    if (data?.Export) {
        return data.Export;
    }

    if (Array.isArray(data)) {
        return data;
    }

    const key = Object.keys(data)[0];
    return data[key] || [];
}

async function validateFiles() {
    if (!ui || !ui.progress || !ui.progressBar || !ui.results || !ui.schema) {
        return;
    }

    const schemaText = ui.schema.value;
    let schema;

    try {
        schema = JSON.parse(schemaText);
    } catch {
        alert('Invalid schema');
        return;
    }

    const files = selectedFiles.length ? selectedFiles : Array.from((ui.fileInput && ui.fileInput.files) || []);
    if (!files.length) {
        alert('Load JSON files');
        return;
    }

    ui.progress.style.display = 'block';
    ui.results.innerHTML = '<p>🔄 Validating...</p>';

    const itemSchema = schema && schema.properties && schema.properties.Export && schema.properties.Export.items;
    if (!itemSchema) {
        ui.progress.style.display = 'none';
        alert('Schema must include properties.Export.items');
        return;
    }

    const validateItem = createItemValidator(itemSchema);

    let allGood = [];
    let allBad = [];
    let allErrors = [];
    let totalRecords = 0;

    for (let i = 0; i < files.length; i++) {
        ui.progressBar.style.width = `${((i + 1) / files.length) * 100}%`;
        const file = files[i];
        const jsonText = await file.text();
        let data;

        try {
            data = JSON.parse(jsonText);
        } catch {
            continue;
        }

        const records = unwrap(data);
        totalRecords += records.length;
        const good = [];
        const bad = [];
        const errors = [];

        records.forEach((item, idx) => {
            if (validateItem(item)) {
                good.push(item);
            } else {
                bad.push(item);
                validateItem.errors.forEach(err => {
                    const field = getFieldFromPath(err.instancePath);
                    errors.push({
                        file: file.name,
                        index: idx,
                        field,
                        path: err.instancePath,
                        value: getFieldValueByPath(item, err.instancePath),
                        message: err.message,
                        record: item
                    });
                });
            }
        });

        allGood.push(...good);
        allBad.push(...bad);
        allErrors.push(...errors);
    }

    ui.progress.style.display = 'none';

    const passRate = totalRecords ? (allGood.length / totalRecords * 100).toFixed(1) : 0;
    const isPass = passRate >= 95;

    // Store data globally for download button access
    lastValidationData = { good: allGood, bad: allBad, errors: allErrors };

    topErrorsPreview = allErrors.slice(0, 50);

    ui.results.innerHTML = `
        <div class="stats-grid">
            <div class="stat ${isPass ? 'pass' : 'fail'}">
                <h3>${passRate}%</h3>
                <p>Pass Rate</p>
            </div>
            <div class="stat">
                <h3>${allGood.length}</h3>
                <p>Good Records</p>
            </div>
            <div class="stat">
                <h3>${allBad.length}</h3>
                <p>Bad Records</p>
            </div>
            <div class="stat">
                <h3>${allErrors.length}</h3>
                <p>Errors Found</p>
            </div>
        </div>

        <div class="card">
            <h3>${isPass ? '✅ Pipeline Ready' : '❌ Gate Failed'}</h3>
            <p>${totalRecords} total records across ${files.length} files</p>
        </div>

        <div class="card">
            <h3>🔥 Top Errors</h3>
            <table>
                <thead>
                    <tr><th>File</th><th>Record #</th><th>Field</th><th>Value</th><th>Error</th></tr>
                </thead>
                <tbody>
                ${topErrorsPreview
                    .map((e, index) => `<tr class="error-row" data-error-index="${index}" tabindex="0" role="button" aria-label="View record ${e.index} from ${escapeHTML(e.file)}"><td>${escapeHTML(e.file)}</td><td>${e.index}</td><td>${escapeHTML(e.field)}</td><td>${escapeHTML(formatFieldValue(e.value))}</td><td>${escapeHTML(e.message)}</td></tr>`)
                    .join('')}
                </tbody>
            </table>
            <p class="error-row-hint">Click any error row to view the full JSON record.</p>
        </div>

        <div class="card" id="selectedErrorRecord">
            <h3>🧾 Selected Error Record</h3>
            <p id="errorRecordSummary">Select an error row above to inspect its full JSON payload.</p>
            <pre id="errorRecordContent" class="record-viewer">No record selected.</pre>
        </div>

        <div class="card">
            <h3>⬇️ Downloads</h3>
            <button class="success" onclick="download('good-bids.json', lastValidationData.good)">✅ Good Records JSON</button>
            <button class="danger" onclick="download('bad-bids.json', lastValidationData.bad)">❌ Bad Records JSON</button>
            <button onclick="download('errors.csv', toCSV(lastValidationData.errors))">📊 Error Report CSV</button>
        </div>
    `;
}

function getFieldFromPath(path) {
    if (!path) {
        return '(root)';
    }

    const tokens = String(path).split('/').filter(Boolean);
    if (!tokens.length) {
        return '(root)';
    }

    return tokens.reduce((acc, token) => {
        if (/^\d+$/.test(token)) {
            return `${acc}[${token}]`;
        }

        return acc ? `${acc}.${token}` : token;
    }, '');
}

function getFieldValueByPath(item, path) {
    if (!path) {
        return item;
    }

    const tokens = String(path).split('/').filter(Boolean);
    return tokens.reduce((current, token) => {
        if (current === undefined || current === null) {
            return undefined;
        }

        if (/^\d+$/.test(token)) {
            return Array.isArray(current) ? current[Number(token)] : undefined;
        }

        return current[token];
    }, item);
}

function formatFieldValue(value) {
    if (value === undefined || value === null) {
        return '(empty)';
    }

    if (typeof value === 'string') {
        return value.trim() ? value : '(empty)';
    }

    if (typeof value === 'object') {
        return JSON.stringify(value);
    }

    return String(value);
}

function createItemValidator(schema) {
    return function validateItem(item) {
        const errors = [];

        validateBySchema(item, schema, '', errors, []);

        validateItem.errors = errors;
        return errors.length === 0;
    };
}

function validateBySchema(value, schema, path, errors, requiredFields) {
    if (!schema || typeof schema !== 'object') {
        return;
    }
    // Try to parse stringified JSON if value is a string and schema expects array/object
    if (typeof value === 'string' && (schema.type === 'array' || schema.type === 'object')) {
        try {
            value = JSON.parse(value);
        } catch {
            // If parsing fails, continue with the string value and let validation handle it
        }
    }
    if (schema.type === 'object') {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            errors.push({ instancePath: path, message: 'must be object' });
            return;
        }

        const required = Array.isArray(schema.required) ? schema.required : [];
        required.forEach(field => {
            const fieldValue = value[field];
            const isEmpty = fieldValue === undefined || 
                           fieldValue === null ||
                           (typeof fieldValue === 'string' && !fieldValue.trim()) ||
                           (Array.isArray(fieldValue) && fieldValue.length === 0);
            
            if (isEmpty) {
                errors.push({ instancePath: `${path}/${field}`, message: 'is required' });
            }
        });

        const properties = schema.properties || {};
        Object.entries(properties).forEach(([field, childSchema]) => {
            if (value[field] === undefined || value[field] === null) {
                return;
            }

            const fieldIsRequired = required.includes(field);
            validateBySchema(value[field], childSchema, `${path}/${field}`, errors, fieldIsRequired ? required : []);
        });

        return;
    }

    if (schema.type === 'array') {
        if (!Array.isArray(value)) {
            errors.push({ instancePath: path, message: 'must be array' });
            return;
        }

        if (typeof schema.minItems === 'number' && value.length < schema.minItems) {
            errors.push({ instancePath: path, message: `must NOT have fewer than ${schema.minItems} items` });
        }

        if (schema.items) {
            value.forEach((entry, index) => {
                validateBySchema(entry, schema.items, `${path}/${index}`, errors, []);
            });
        }

        return;
    }

    if (schema.type === 'string') {
        if (typeof value !== 'string') {
            errors.push({ instancePath: path, message: 'must be string' });
            return;
        }

        if (typeof schema.minLength === 'number' && value.length < schema.minLength) {
            errors.push({ instancePath: path, message: `must NOT have fewer than ${schema.minLength} characters` });
        }

        if (schema.pattern && !value.trim()) {
            errors.push({ instancePath: path, message: 'must have a non-empty value' });
        }

        const isRequired = Array.isArray(requiredFields) && requiredFields.length > 0;
        if (isRequired) {
            if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
                errors.push({ instancePath: path, message: `must be equal to one of the allowed values: ${schema.enum.join(', ')}` });
            }

            if (schema.format === 'uri') {
                try {
                    const parsed = new URL(value);
                    if (!parsed.protocol || !parsed.host) {
                        errors.push({ instancePath: path, message: 'must match format "uri"' });
                    }
                } catch {
                    errors.push({ instancePath: path, message: 'must match format "uri"' });
                }
            }

            if (schema.format === 'date-time') {
                if (!isValidDateTimeValue(value)) {
                    errors.push({ instancePath: path, message: 'must match format "date-time"' });
                }
            }
        }
    }
}

function isValidDateTimeValue(value) {
    if (typeof value !== 'string') {
        return false;
    }

    const input = value.trim();
    if (!input) {
        return false;
    }

    // RFC3339-like date-time with timezone (strict)
    const isoDateTime = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;
    if (isoDateTime.test(input)) {
        const parsedIso = new Date(input);
        return !Number.isNaN(parsedIso.getTime());
    }

    // Accept ISO date-only and slash-separated date-only forms used in source data.
    const ymd = input.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymd) {
        return isValidDateParts(Number(ymd[1]), Number(ymd[2]), Number(ymd[3]));
    }

    const slashDate = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashDate) {
        const first = Number(slashDate[1]);
        const second = Number(slashDate[2]);
        const year = Number(slashDate[3]);

        // If one side is >12, disambiguate as D/M or M/D.
        if (first > 12 && second <= 12) {
            return isValidDateParts(year, second, first);
        }

        if (second > 12 && first <= 12) {
            return isValidDateParts(year, first, second);
        }

        // Ambiguous dates (e.g., 03/05/2026): accept if either interpretation is valid.
        return isValidDateParts(year, first, second) || isValidDateParts(year, second, first);
    }

    return false;
}

function isValidDateParts(year, month, day) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return false;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
        return false;
    }

    const utcDate = new Date(Date.UTC(year, month - 1, day));
    return utcDate.getUTCFullYear() === year
        && utcDate.getUTCMonth() === month - 1
        && utcDate.getUTCDate() === day;
}

function normalizeRequiredFieldName(field) {
    return String(field || '').trim().replace(/\[\]$/, '');
}

function download(filename, content) {
    const blob = new Blob(
        [typeof content === 'string' ? content : JSON.stringify(content, null, 2)],
        { type: filename.endsWith('.csv') ? 'text/csv' : 'application/json' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function toCSV(errors) {
    if (!errors.length) {
        return 'No errors';
    }

    return 'File,Record,Field,Value,Error\n' + errors
        .map(e => `"${e.file}",${e.index},"${e.field}","${formatFieldValue(e.value)}","${e.message}"`)
        .join('\n');
}

window.download = download;
window.toCSV = toCSV;
