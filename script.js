const ajv = new Ajv({ allErrors: true, verbose: true });

function toggleTheme() {
    document.body.dataset.theme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
    document.querySelector('.theme-toggle').textContent = document.body.dataset.theme === 'dark' ? '☀️ Light' : '🌙 Dark';
}

const fileDrop = document.getElementById('fileDrop');
const fileInput = document.getElementById('jsonFile');
const fileList = document.getElementById('fileList');
let selectedFiles = [];

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
    if (!fileList) {
        return;
    }

    fileList.innerHTML = selectedFiles
        .map((file, index) => `
            <div class="file-list-item">
                <div class="file-meta">
                    <span class="file-name">${file.name}</span>
                    <span class="file-size">${formatBytes(file.size)}</span>
                </div>
                <button type="button" class="file-remove" data-index="${index}" aria-label="Remove ${file.name}">Remove</button>
            </div>
        `)
        .join('');
}

function setSelectedFiles(files) {
    selectedFiles = Array.from(files || []);
    if (fileDrop) {
        fileDrop.textContent = selectedFiles.length
            ? `${selectedFiles.length} files loaded`
            : '📁 Drag lambda-*.json files or click to browse (multiple OK)';
    }
    renderSelectedFiles();
}

if (fileDrop) {
    fileDrop.addEventListener('click', () => {
        if (fileInput) {
            fileInput.click();
        }
    });

    fileDrop.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (fileInput) {
                fileInput.click();
            }
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(event => {
        fileDrop.addEventListener(event, e => {
            e.preventDefault();
            e.stopPropagation();

            if (event === 'dragenter' || event === 'dragover') {
                fileDrop.classList.add('dragover');
            } else {
                fileDrop.classList.remove('dragover');
            }

            if (event === 'drop') {
                setSelectedFiles(e.dataTransfer.files);
            }
        });
    });
}

if (fileInput) {
    fileInput.addEventListener('change', e => {
        setSelectedFiles(e.target.files);
    });
}

['dragover', 'drop'].forEach(event => {
    document.addEventListener(event, e => {
        e.preventDefault();
    });
});

if (fileList) {
    fileList.addEventListener('click', e => {
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
        if (fileInput) {
            fileInput.value = '';
        }
    });
}

function updateSchema() {
    const selected = Array.from(document.getElementById('requiredFields').selectedOptions).map(o => o.value);
    if (!selected.length) {
        alert('Select required fields');
        return;
    }

    const schema = JSON.parse(document.getElementById('schema').value);
    schema.properties.Export.items.required = selected;
    document.getElementById('schema').value = JSON.stringify(schema, null, 2);
    alert(`✅ Set ${selected.length} required fields`);
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
    const progress = document.getElementById('progress');
    const progressBar = document.getElementById('progressBar');
    const results = document.getElementById('results');

    const schemaText = document.getElementById('schema').value;
    let schema;

    try {
        schema = JSON.parse(schemaText);
    } catch {
        alert('Invalid schema');
        return;
    }

    const files = selectedFiles.length ? selectedFiles : Array.from((fileInput && fileInput.files) || []);
    if (!files.length) {
        alert('Load JSON files');
        return;
    }

    progress.style.display = 'block';
    results.innerHTML = '<p>🔄 Validating...</p>';

    let allGood = [];
    let allBad = [];
    let allErrors = [];
    let totalRecords = 0;

    for (let i = 0; i < files.length; i++) {
        progressBar.style.width = `${((i + 1) / files.length) * 100}%`;
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

        const validateItem = ajv.compile(schema.properties.Export.items);
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

    progress.style.display = 'none';

    const passRate = totalRecords ? (allGood.length / totalRecords * 100).toFixed(1) : 0;
    const isPass = passRate >= 95;

    results.innerHTML = `
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

window.toggleTheme = toggleTheme;
window.updateSchema = updateSchema;
window.validateFiles = validateFiles;
window.download = download;
