let selectedFiles = [];
let ui = null;

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
            : '📁 Drag lambda-*.json files or click to browse (multiple OK)';
    }
    renderSelectedFiles();
}

function updateSchema() {
    const requiredSelect = ui && ui.requiredFields;
    const manualRequiredInput = ui && ui.manualRequiredFields;
    const schemaElement = ui && ui.schema;

    if (!requiredSelect || !schemaElement) {
        return;
    }

    const selected = Array.from(requiredSelect.selectedOptions).map(o => o.value.trim()).filter(Boolean);
    const manual = String((manualRequiredInput && manualRequiredInput.value) || '')
        .split(/[\n,]+/)
        .map(field => field.trim())
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
                    errors.push({
                        file: file.name,
                        index: idx,
                        path: err.instancePath,
                        message: err.message
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
                <tr><th>File</th><th>Record #</th><th>Field</th><th>Error</th></tr>
                ${allErrors
                    .slice(0, 50)
                    .map(e => `<tr><td>${e.file}</td><td>${e.index}</td><td>${e.path}</td><td>${e.message}</td></tr>`)
                    .join('')}
            </table>
        </div>

        <div class="card">
            <h3>⬇️ Downloads</h3>
            <button class="success" onclick="download('good-bids.json', ${JSON.stringify(allGood)})">✅ Good Records JSON</button>
            <button class="danger" onclick="download('bad-bids.json', ${JSON.stringify(allBad)})">❌ Bad Records JSON</button>
            <button onclick="download('errors.csv', toCSV(allErrors))">📊 Error Report CSV</button>
        </div>
    `;
}

function createItemValidator(schema) {
    return function validateItem(item) {
        const errors = [];

        if (!item || typeof item !== 'object' || Array.isArray(item)) {
            errors.push({ instancePath: '', message: 'must be object' });
            validateItem.errors = errors;
            return false;
        }

        const properties = (schema && schema.properties) || {};
        const required = Array.isArray(schema && schema.required) ? schema.required : [];

        required.forEach(field => {
            if (item[field] === undefined || item[field] === null) {
                errors.push({ instancePath: `/${field}`, message: "is required" });
            }
        });

        Object.entries(properties).forEach(([field, rules]) => {
            const value = item[field];
            if (value === undefined || value === null) {
                return;
            }

            const fieldPath = `/${field}`;

            if (rules.type === 'string') {
                if (typeof value !== 'string') {
                    errors.push({ instancePath: fieldPath, message: 'must be string' });
                    return;
                }

                if (typeof rules.minLength === 'number' && value.length < rules.minLength) {
                    errors.push({ instancePath: fieldPath, message: `must NOT have fewer than ${rules.minLength} characters` });
                }

                if (rules.pattern) {
                    const pattern = new RegExp(rules.pattern);
                    if (!pattern.test(value)) {
                        errors.push({ instancePath: fieldPath, message: `must match pattern ${rules.pattern}` });
                    }
                }

                if (Array.isArray(rules.enum) && !rules.enum.includes(value)) {
                    errors.push({ instancePath: fieldPath, message: `must be equal to one of the allowed values: ${rules.enum.join(', ')}` });
                }

                if (rules.format === 'uri') {
                    try {
                        const parsed = new URL(value);
                        if (!parsed.protocol || !parsed.host) {
                            errors.push({ instancePath: fieldPath, message: 'must match format "uri"' });
                        }
                    } catch {
                        errors.push({ instancePath: fieldPath, message: 'must match format "uri"' });
                    }
                }

                if (rules.format === 'date-time') {
                    const date = new Date(value);
                    if (Number.isNaN(date.getTime())) {
                        errors.push({ instancePath: fieldPath, message: 'must match format "date-time"' });
                    }
                }
            }
        });

        validateItem.errors = errors;
        return errors.length === 0;
    };
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

    return 'File,Record,Field,Error\n' + errors.map(e => `"${e.file}",${e.index},"${e.path}","${e.message}"`).join('\n');
}

window.download = download;
