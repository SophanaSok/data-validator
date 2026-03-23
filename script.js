let selectedFiles = [];
let ui = null;
let lastValidationData = { good: [], bad: [], errors: [] };
let topErrorsPreview = [];
let allErrorsPreview = [];
let appNoticeTimeoutId = null;
let errorSortState = {
    top: { key: null, direction: 'asc' },
    all: { key: null, direction: 'asc' }
};
let statBreakdownState = {
    files: [],
    badRecordIndices: new Set(),
    errorsByFile: {},
    errorsByField: {}
};

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
        requiredSelectionCount: document.getElementById('requiredSelectionCount'),
        manualRequiredFields: document.getElementById('manualRequiredFields'),
        progress: document.getElementById('progress'),
        progressBar: document.getElementById('progressBar'),
        results: document.getElementById('results')
    };

    bindUIEvents();
}

function bindUIEvents() {
    if (window.ThemeController && ui.themeToggle) {
        window.ThemeController.init(ui.themeToggle);
    }

    if (ui.applySchemaBtn) {
        ui.applySchemaBtn.addEventListener('click', updateSchema);
    }

    if (ui.requiredFields) {
        enableOptionClickToggle(ui.requiredFields);
        ui.requiredFields.addEventListener('change', () => updateRequiredSelectionCount(ui.requiredFields));
        updateRequiredSelectionCount(ui.requiredFields);
    }

    const selectAllBtn = document.getElementById('selectAllBtn');
    if (selectAllBtn && ui.requiredFields) {
        selectAllBtn.addEventListener('click', () => {
            const allSelected = Array.from(ui.requiredFields.options).every(o => o.selected);
            Array.from(ui.requiredFields.options).forEach(o => {
                o.selected = !allSelected;
            });
            updateRequiredSelectionCount(ui.requiredFields);
            updateSelectAllButtonLabel(ui.requiredFields, selectAllBtn);
        });

        updateSelectAllButtonLabel(ui.requiredFields, selectAllBtn);
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
        ui.results.addEventListener('click', handleStatClick);
        ui.results.addEventListener('click', handleErrorSortHeaderClick);
        ui.results.addEventListener('click', handleTopErrorRowClick);
        ui.results.addEventListener('keydown', e => {
            const stat = e.target.closest('.stat');
            if (stat && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                stat.click();
                return;
            }

            const sortHeader = e.target.closest('.sortable-header');
            if (sortHeader && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                sortHeader.click();
                return;
            }

            const row = e.target.closest('.error-row');
            if (!row) {
                return;
            }

            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showErrorRecord(row.dataset.errorIndex, row.dataset.errorSource);
            }
        });
        ui.results.addEventListener('mouseover', handleStatHover);
        ui.results.addEventListener('mouseout', handleStatHoverEnd);
        ui.results.addEventListener('change', handleErrorFieldFilterChange);
    }

    ['dragover', 'drop'].forEach(event => {
        document.addEventListener(event, e => {
            if (!ui.fileDrop || !ui.fileDrop.contains(e.target)) {
                e.preventDefault();
            }
        });
    });
}

function enableOptionClickToggle(selectElement) {
    selectElement.addEventListener('mousedown', e => {
        const option = e.target.closest('option');
        if (!option) {
            return;
        }

        // Preserve scroll position when toggling option selection.
        const scrollTop = selectElement.scrollTop;
        
        // Prevent the browser's default selection handling so each click toggles one option.
        e.preventDefault();
        
        // Temporarily suppress scroll behavior by disabling overflow.
        const originalOverflow = selectElement.style.overflow;
        selectElement.style.overflow = 'hidden';
        
        option.selected = !option.selected;
        
        // Restore overflow and scroll position using multiple timing strategies.
        selectElement.style.overflow = originalOverflow;
        selectElement.scrollTop = scrollTop;
        
        // Use multiple timing mechanisms to ensure scroll position persists.
        requestAnimationFrame(() => {
            selectElement.scrollTop = scrollTop;
            setTimeout(() => {
                selectElement.scrollTop = scrollTop;
            }, 0);
        });
        
        updateRequiredSelectionCount(selectElement);
    });
}

function updateRequiredSelectionCount(selectElement) {
    if (!ui || !ui.requiredSelectionCount || !selectElement) {
        return;
    }

    const selected = Array.from(selectElement.options).filter(option => option.selected);
    const count = selected.length;
    
    if (count === 0) {
        ui.requiredSelectionCount.textContent = 'No fields selected';
    } else {
        const fieldNames = selected.map(o => o.textContent).join(', ');
        ui.requiredSelectionCount.textContent = `Selected: ${fieldNames}`;
    }

    updateSelectAllButtonLabel(selectElement);
}

function updateSelectAllButtonLabel(selectElement, selectAllBtn = document.getElementById('selectAllBtn')) {
    if (!selectElement || !selectAllBtn) {
        return;
    }

    const hasOptions = selectElement.options.length > 0;
    const allSelected = hasOptions && Array.from(selectElement.options).every(option => option.selected);
    const buttonText = allSelected ? 'Deselect All' : 'Select All';
    const actionLabel = allSelected ? 'Deselect all required fields' : 'Select all required fields';

    selectAllBtn.textContent = buttonText;
    selectAllBtn.setAttribute('aria-label', actionLabel);
    selectAllBtn.setAttribute('title', actionLabel);
}

function handleErrorFieldFilterChange(e) {
    const filter = e.target.closest('.error-field-filter');
    if (!filter) {
        return;
    }

    applyErrorFieldFilter(filter.dataset.filterSource, filter.value);
}

function applyErrorFieldFilter(source, selectedField) {
    if (!ui || !ui.results) {
        return;
    }

    const sourceKey = source === 'all' ? 'all' : 'top';
    const sourceErrors = sourceKey === 'all' ? allErrorsPreview : topErrorsPreview;
    const filteredEntries = filterErrorsByField(sourceErrors, selectedField);
    const sortedEntries = sortErrorEntries(filteredEntries, sourceKey);

    const tableBody = ui.results.querySelector(sourceKey === 'all' ? '#allErrorsBody' : '#topErrorsBody');
    if (tableBody) {
        tableBody.innerHTML = renderErrorRowsForTable(sortedEntries, sourceKey);
    }

    const tableHead = ui.results.querySelector(sourceKey === 'all' ? '#allErrorsHead' : '#topErrorsHead');
    if (tableHead) {
        tableHead.innerHTML = renderErrorTableHead(sourceKey);
    }

    const countText = `${filteredEntries.length} of ${sourceErrors.length}`;
    const countTarget = ui.results.querySelector(sourceKey === 'all' ? '#allErrorsCount' : '#topErrorsCount');
    if (countTarget) {
        countTarget.textContent = countText;
    }
}

function handleErrorSortHeaderClick(e) {
    const header = e.target.closest('.sortable-header');
    if (!header || !ui || !ui.results) {
        return;
    }

    const source = header.dataset.sortSource === 'all' ? 'all' : 'top';
    const sortKey = header.dataset.sortKey;
    if (!sortKey) {
        return;
    }

    const state = errorSortState[source];
    if (state.key === sortKey) {
        state.direction = state.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.key = sortKey;
        state.direction = 'asc';
    }

    const filterElement = ui.results.querySelector(source === 'all' ? '#allErrorFieldFilter' : '#topErrorFieldFilter');
    const selectedField = filterElement ? filterElement.value : '';
    applyErrorFieldFilter(source, selectedField);
}

function renderErrorTableHead(source) {
    const sourceKey = source === 'all' ? 'all' : 'top';
    const state = errorSortState[sourceKey];
    const columns = [
        { key: 'file', label: 'File' },
        { key: 'index', label: 'Record #' },
        { key: 'field', label: 'Field' },
        { key: 'value', label: 'Value' },
        { key: 'message', label: 'Error' }
    ];

    return `<tr>${columns
        .map(column => {
            const isActive = state.key === column.key;
            const ariaSort = isActive ? (state.direction === 'asc' ? 'ascending' : 'descending') : 'none';
            const indicator = isActive ? (state.direction === 'asc' ? ' ▲' : ' ▼') : '';

            return `<th scope="col" class="sortable-header${isActive ? ' is-sorted' : ''}" data-sort-source="${sourceKey}" data-sort-key="${column.key}" aria-sort="${ariaSort}" tabindex="0" role="button">${column.label}${indicator}</th>`;
        })
        .join('')}</tr>`;
}

function sortErrorEntries(entries, source) {
    const sourceKey = source === 'all' ? 'all' : 'top';
    const state = errorSortState[sourceKey];
    if (!state || !state.key) {
        return entries;
    }

    const directionMultiplier = state.direction === 'asc' ? 1 : -1;
    return [...entries].sort((left, right) => {
        const leftValue = getSortableErrorValue(left.error, state.key);
        const rightValue = getSortableErrorValue(right.error, state.key);

        if (state.key === 'index') {
            return (Number(leftValue) - Number(rightValue)) * directionMultiplier;
        }

        const compared = String(leftValue).localeCompare(String(rightValue), undefined, {
            numeric: true,
            sensitivity: 'base'
        });

        if (compared !== 0) {
            return compared * directionMultiplier;
        }

        return (left.index - right.index) * directionMultiplier;
    });
}

function getSortableErrorValue(error, key) {
    switch (key) {
        case 'file':
            return error.file || '';
        case 'index':
            return Number(error.index) || 0;
        case 'field':
            return error.field || '';
        case 'value':
            return formatFieldValue(error.value);
        case 'message':
            return error.message || '';
        default:
            return '';
    }
}

function buildErrorFieldBreakdown(errors) {
    const fieldCounts = {};
    (errors || []).forEach(err => {
        const field = err.field || '(root)';
        fieldCounts[field] = (fieldCounts[field] || 0) + 1;
    });

    return Object.entries(fieldCounts)
        .map(([field, count]) => ({ field, count, percent: ((count / errors.length) * 100).toFixed(1) }))
        .sort((a, b) => b.count - a.count);
}

function buildPerFileBreakdown(errors, allErrors) {
    const fileBreakdown = {};
    (errors || []).forEach(err => {
        const file = err.file || '(unknown)';
        if (!fileBreakdown[file]) {
            fileBreakdown[file] = 0;
        }
        fileBreakdown[file]++;
    });

    const sorted = Object.entries(fileBreakdown)
        .map(([file, count]) => ({ file, count, percent: ((count / allErrors.length) * 100).toFixed(1) }))
        .sort((a, b) => b.count - a.count);

    return { breakdown: sorted, total: errors.length };
}

function handleStatClick(e) {
    const stat = e.target.closest('.stat');
    if (!stat || !ui || !ui.results) {
        return;
    }

    const label = stat.querySelector('p');
    if (!label) {
        return;
    }

    const statType = label.textContent.trim().toLowerCase();

    if (statType.includes('bad record')) {
        filterErrorsByBadRecords();
    } else if (statType.includes('error') && statType.includes('found')) {
        showErrorFieldBreakdown();
    }
}

function handleStatHover(e) {
    const stat = e.target.closest('.stat');
    if (!stat) {
        return;
    }

    const label = stat.querySelector('p');
    if (!label) {
        return;
    }

    const statType = label.textContent.trim().toLowerCase();
    const fileBreakdown = statBreakdownState.errorsByFile;
    if (Object.keys(fileBreakdown).length === 0) {
        return;
    }

    let tooltipContent = '';
    if (statType.includes('pass rate')) {
        tooltipContent = buildStatTooltip('Pass Rate by File', statBreakdownState.files.map(f => ({
            file: f,
            good: fileBreakdown[f]?.good || 0,
            total: fileBreakdown[f]?.total || 0,
            rate: fileBreakdown[f] ? (((fileBreakdown[f].good) / fileBreakdown[f].total) * 100).toFixed(1) : '0'
        })));
    } else if (statType.includes('good record')) {
        tooltipContent = buildStatTooltip('Good Records by File', statBreakdownState.files.map(f => ({
            file: f,
            count: fileBreakdown[f]?.good || 0
        })));
    } else if (statType.includes('bad record')) {
        tooltipContent = buildStatTooltip('Bad Records by File', statBreakdownState.files.map(f => ({
            file: f,
            count: fileBreakdown[f]?.bad || 0
        })));
    } else if (statType.includes('error') && statType.includes('found')) {
        tooltipContent = buildStatTooltip('Errors by File', statBreakdownState.files.map(f => ({
            file: f,
            count: fileBreakdown[f]?.errors || 0
        })));
    }

    if (tooltipContent) {
        showStatTooltip(stat, tooltipContent);
    }
}

function handleStatHoverEnd(e) {
    const stat = e.target.closest('.stat');
    if (stat) {
        removeStatTooltip(stat);
    }
}

function buildStatTooltip(title, data) {
    const lines = [title, '---'];
    data.forEach(item => {
        if (item.rate !== undefined) {
            lines.push(`${item.file}: ${item.good}/${item.total} (${item.rate}%)`);
        } else if (item.count !== undefined) {
            lines.push(`${item.file}: ${item.count}`);
        }
    });
    return lines.join('\n');
}

function showStatTooltip(stat, content) {
    removeStatTooltip(stat);
    const tooltip = document.createElement('div');
    tooltip.className = 'stat-tooltip';
    tooltip.textContent = content;
    stat.appendChild(tooltip);
}

function removeStatTooltip(stat) {
    const existingTooltip = stat.querySelector('.stat-tooltip');
    if (existingTooltip) {
        existingTooltip.remove();
    }
}

function filterErrorsByBadRecords() {
    if (!ui || !ui.results || statBreakdownState.badRecordIndices.size === 0) {
        return;
    }

    const allErrorsPanel = ui.results.querySelector('#resultsAllErrors');
    if (!allErrorsPanel) {
        return;
    }

    const details = allErrorsPanel.querySelector('details');
    if (details && !details.open) {
        details.open = true;
    }

    const filterSelect = ui.results.querySelector('#allErrorFieldFilter');
    if (filterSelect) {
        filterSelect.value = '';
        filterSelect.dispatchEvent(new Event('change'));
    }

    const tableBody = ui.results.querySelector('#allErrorsBody');
    if (tableBody) {
        const badRecordErrors = allErrorsPreview.filter((err, idx) => 
            statBreakdownState.badRecordIndices.has(idx)
        );
        
        const entries = badRecordErrors.map((error, index) => ({ error, index }));
        const sortedEntries = sortErrorEntries(entries, 'all');
        tableBody.innerHTML = renderErrorRowsForTable(sortedEntries, 'all');
        
        showAppNotice(`Filtered to ${badRecordErrors.length} errors from bad records.`, 'info');
    }

    // Smooth scroll to All Errors section
    setTimeout(() => {
        allErrorsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
}

function showErrorFieldBreakdown() {
    if (!ui || !ui.results) {
        return;
    }

    const fieldBreakdown = buildErrorFieldBreakdown(allErrorsPreview);
    if (fieldBreakdown.length === 0) {
        return;
    }

    let existingModal = document.getElementById('fieldBreakdownModal');
    if (existingModal) {
        existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'fieldBreakdownModal';
    modal.className = 'field-breakdown-modal';
    modal.innerHTML = `
        <div class="field-breakdown-content">
            <button class="field-breakdown-close" aria-label="Close field breakdown">&times;</button>
            <h3>Error Distribution by Field</h3>
            <div class="field-breakdown-list">
                ${fieldBreakdown.map(item => `
                    <div class="field-breakdown-item" data-field="${escapeHTML(item.field)}">
                        <span class="field-name">${escapeHTML(item.field)}</span>
                        <span class="field-stats">
                            <span class="field-count">${item.count}</span>
                            <span class="field-percent">${item.percent}%</span>
                        </span>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.field-breakdown-close');
    closeBtn.addEventListener('click', () => modal.remove());

    const items = modal.querySelectorAll('.field-breakdown-item');
    items.forEach(item => {
        item.addEventListener('click', () => {
            const field = item.dataset.field;
            modal.remove();
            filterAllErrorsByField(field);
        });
    });

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

function filterAllErrorsByField(field) {
    const filterSelect = ui.results.querySelector('#allErrorFieldFilter');
    if (filterSelect) {
        filterSelect.value = field === '(root)' ? '' : field;
        // Dispatch change event on the select element itself, not on results container
        // (change events on select don't bubble, so listeners on parent won't catch them)
        filterSelect.dispatchEvent(new Event('change', { bubbles: true }));
        
        const allErrorsPanel = ui.results.querySelector('#resultsAllErrors');
        if (allErrorsPanel) {
            const details = allErrorsPanel.querySelector('details');
            if (details && !details.open) {
                details.open = true;
            }
            setTimeout(() => {
                allErrorsPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
    }
}

function openFilePicker() {
    if (ui && ui.fileInput) {
        ui.fileInput.click();
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

function ensureAppNoticeElement() {
    let notice = document.getElementById('appNotice');
    if (notice) {
        return notice;
    }

    notice = document.createElement('div');
    notice.id = 'appNotice';
    notice.className = 'app-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.setAttribute('aria-atomic', 'true');
    document.body.appendChild(notice);
    return notice;
}

function showAppNotice(message, type = 'info') {
    const notice = ensureAppNoticeElement();
    const isAssertive = type === 'warning' || type === 'error';

    notice.setAttribute('role', isAssertive ? 'alert' : 'status');
    notice.setAttribute('aria-live', isAssertive ? 'assertive' : 'polite');
    notice.textContent = message;
    notice.className = `app-notice app-notice-${type} is-visible`;

    if (appNoticeTimeoutId) {
        clearTimeout(appNoticeTimeoutId);
    }

    appNoticeTimeoutId = setTimeout(() => {
        notice.classList.remove('is-visible');
    }, 3600);
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

    showErrorRecord(row.dataset.errorIndex, row.dataset.errorSource);
}

function showErrorRecord(indexValue, source = 'top') {
    const index = Number(indexValue);
    if (Number.isNaN(index) || !ui || !ui.results) {
        return;
    }

    const list = source === 'all' ? allErrorsPreview : topErrorsPreview;
    const selected = list[index];
    if (!selected) {
        return;
    }

    const summary = ui.results.querySelector('#errorRecordSummary');
    const content = ui.results.querySelector('#errorRecordContent');
    const rows = ui.results.querySelectorAll('.error-row');

    rows.forEach(row => {
        row.classList.toggle(
            'active',
            Number(row.dataset.errorIndex) === index && (row.dataset.errorSource || 'top') === source
        );
    });

    if (!summary || !content) {
        return;
    }

    const renderedRecord = renderRecordWithHighlightedKey(selected.record, selected.path);
    const keyMissingNote = !renderedRecord.foundHighlight
        && selected.path
        && /required/i.test(String(selected.message || ''))
        ? ' | key missing in record'
        : '';

    summary.textContent = `${selected.file} | record ${selected.index} | ${selected.field} | ${selected.message}${keyMissingNote}`;
    content.innerHTML = renderedRecord.html;

    const selectedErrorCard = ui.results.querySelector('#selectedErrorRecord');
    if (selectedErrorCard) {
        selectedErrorCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Scroll to the highlighted key if one was found in the rendered content.
    if (renderedRecord.foundHighlight) {
        requestAnimationFrame(() => {
            const highlightedKey = content.querySelector('.record-key-highlight');
            if (highlightedKey) {
                highlightedKey.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
    }
}

function getUniqueErrorFields(errors) {
    return Array.from(new Set((errors || []).map(err => err.field || '(root)'))).sort((a, b) =>
        String(a).localeCompare(String(b))
    );
}

function buildErrorFieldFilterOptions(errors) {
    return ['<option value="">All fields</option>']
        .concat(getUniqueErrorFields(errors).map(field => `<option value="${escapeHTML(field)}">${escapeHTML(field)}</option>`))
        .join('');
}

function filterErrorsByField(errors, selectedField) {
    const expectedField = String(selectedField || '');
    return (errors || [])
        .map((error, index) => ({ error, index }))
        .filter(({ error }) => !expectedField || error.field === expectedField);
}

function renderErrorRowsForTable(entries, source) {
    if (!entries.length) {
        return '<tr><td colspan="5">No errors match the selected field.</td></tr>';
    }

    return entries
        .map(({ error, index }) => `
            <tr class="error-row" data-error-index="${index}" data-error-source="${source}" tabindex="0" role="button" aria-label="View record ${error.index} from ${escapeHTML(error.file)}">
                <td>${escapeHTML(error.file)}</td>
                <td>${error.index}</td>
                <td>${escapeHTML(error.field)}</td>
                <td>${escapeHTML(formatFieldValue(error.value))}</td>
                <td>${escapeHTML(error.message)}</td>
            </tr>
        `)
        .join('');
}

function parsePathTokens(path) {
    return String(path || '').split('/').filter(Boolean);
}

function stripTrailingNumericTokens(tokens) {
    const copy = [...tokens];
    while (copy.length && /^\d+$/.test(copy[copy.length - 1])) {
        copy.pop();
    }
    return copy;
}

function tokensEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }

    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
            return false;
        }
    }

    return true;
}

function renderPrimitiveJsonValue(value) {
    if (typeof value === 'string') {
        return `<span class="json-string">${escapeHTML(JSON.stringify(value))}</span>`;
    }

    if (typeof value === 'number') {
        return `<span class="json-number">${escapeHTML(JSON.stringify(value))}</span>`;
    }

    if (typeof value === 'boolean') {
        return `<span class="json-boolean">${escapeHTML(JSON.stringify(value))}</span>`;
    }

    if (value === null) {
        return '<span class="json-null">null</span>';
    }

    return `<span class="json-null">${escapeHTML(String(value))}</span>`;
}

function renderRecordWithHighlightedKey(record, errorPath) {
    const rawTokens = parsePathTokens(errorPath);
    const targetTokens = stripTrailingNumericTokens(rawTokens);

    // Try the most specific target first, then progressively fall back to parent keys.
    // This keeps highlighting useful when nested paths point inside stringified JSON values.
    for (let i = targetTokens.length; i >= 0; i--) {
        const candidateTokens = targetTokens.slice(0, i);
        const rendered = renderJsonNodeWithHighlight(record, candidateTokens, [], 0);
        if (rendered.foundHighlight || candidateTokens.length === 0) {
            return {
                html: rendered.html,
                foundHighlight: rendered.foundHighlight
            };
        }
    }

    return { html: renderPrimitiveJsonValue(record), foundHighlight: false };
}

function renderJsonNodeWithHighlight(value, targetTokens, currentTokens, depth) {
    const indent = '  '.repeat(depth);
    const nextIndent = '  '.repeat(depth + 1);

    if (Array.isArray(value)) {
        if (!value.length) {
            return { html: '[]', foundHighlight: false };
        }

        const lines = ['['];
        let foundHighlight = false;

        value.forEach((entry, index) => {
            const child = renderJsonNodeWithHighlight(entry, targetTokens, [...currentTokens, String(index)], depth + 1);
            foundHighlight = foundHighlight || child.foundHighlight;
            const suffix = index < value.length - 1 ? ',' : '';
            lines.push(`${nextIndent}${child.html}${suffix}`);
        });

        lines.push(`${indent}]`);
        return { html: lines.join('\n'), foundHighlight };
    }

    if (value && typeof value === 'object') {
        const entries = Object.entries(value);
        if (!entries.length) {
            return { html: '{}', foundHighlight: false };
        }

        const lines = ['{'];
        let foundHighlight = false;

        entries.forEach(([key, childValue], index) => {
            const keyPath = [...currentTokens, key];
            const isTargetKey = targetTokens.length > 0 && tokensEqual(keyPath, targetTokens);
            const keyText = escapeHTML(JSON.stringify(key));
            const keyWithSyntax = `<span class="json-key">${keyText}</span>`;
            const renderedKey = isTargetKey
                ? `<span class="record-key-highlight">${keyWithSyntax}</span>`
                : keyWithSyntax;

            const child = renderJsonNodeWithHighlight(childValue, targetTokens, keyPath, depth + 1);
            foundHighlight = foundHighlight || child.foundHighlight || isTargetKey;

            const suffix = index < entries.length - 1 ? ',' : '';
            lines.push(`${nextIndent}${renderedKey}: ${child.html}${suffix}`);
        });

        lines.push(`${indent}}`);
        return { html: lines.join('\n'), foundHighlight };
    }

    return {
        html: renderPrimitiveJsonValue(value),
        foundHighlight: false
    };
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
        showAppNotice('Select required fields before applying to schema.', 'warning');
        return;
    }

    let schema;
    try {
        schema = JSON.parse(schemaElement.value);
    } catch {
        showAppNotice('Schema JSON is invalid. Fix it and try again.', 'error');
        return;
    }

    if (!schema.properties || !schema.properties.Export || !schema.properties.Export.items) {
        showAppNotice('Schema must include properties.Export.items.', 'error');
        return;
    }

    schema.properties.Export.items.required = requiredFields;
    schemaElement.value = JSON.stringify(schema, null, 2);
    showAppNotice(`Applied ${requiredFields.length} required fields to schema.`, 'success');
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
        showAppNotice('Invalid schema JSON. Fix it and validate again.', 'error');
        return;
    }

    const files = selectedFiles.length ? selectedFiles : Array.from((ui.fileInput && ui.fileInput.files) || []);
    if (!files.length) {
        showAppNotice('Load one or more JSON files before validating.', 'warning');
        return;
    }

    ui.progress.style.display = 'block';
    ui.results.innerHTML = '<p>🔄 Validating...</p>';

    const itemSchema = schema && schema.properties && schema.properties.Export && schema.properties.Export.items;
    if (!itemSchema) {
        ui.progress.style.display = 'none';
        showAppNotice('Schema must include properties.Export.items.', 'error');
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
    allErrorsPreview = allErrors;
    errorSortState = {
        top: { key: null, direction: 'asc' },
        all: { key: null, direction: 'asc' }
    };

    // Build stat breakdown state for interactive features
    const fileSet = new Set();
    const badRecordIndices = new Set();
    const errorsByFile = {};
    const errorsByField = {};

    allErrors.forEach((err, idx) => {
        const file = err.file || '(unknown)';
        fileSet.add(file);
        
        if (!errorsByFile[file]) {
            errorsByFile[file] = { good: 0, bad: 0, errors: 0, total: 0 };
        }
        errorsByFile[file].errors++;

        const field = err.field || '(root)';
        errorsByField[field] = (errorsByField[field] || 0) + 1;
    });

    // Count good/bad records per file
    allGood.forEach(record => {
        const errorsForRecord = allErrors.filter(e => e.record === record);
        const file = errorsForRecord.length > 0 ? errorsForRecord[0].file : files[0]?.name || '(unknown)';
        if (errorsByFile[file]) {
            errorsByFile[file].good++;
            errorsByFile[file].total++;
        }
    });

    allBad.forEach((record, badIdx) => {
        const errorsForRecord = allErrors.filter(e => e.record === record);
        const file = errorsForRecord.length > 0 ? errorsForRecord[0].file : files[0]?.name || '(unknown)';
        if (errorsByFile[file]) {
            errorsByFile[file].bad++;
            errorsByFile[file].total++;
        }
        badRecordIndices.add(badIdx);
    });

    statBreakdownState = {
        files: Array.from(fileSet).sort(),
        badRecordIndices,
        errorsByFile,
        errorsByField
    };

    const topFieldOptions = buildErrorFieldFilterOptions(topErrorsPreview);
    const allFieldOptions = buildErrorFieldFilterOptions(allErrorsPreview);

    ui.results.innerHTML = `
        <div class="results-layout">
            <aside class="results-side-nav" aria-label="Validation results navigation">
                <p class="results-side-nav-title">Jump to</p>
                <a href="#resultsSummary" class="results-side-link">Summary</a>
                <a href="#resultsGateStatus" class="results-side-link">Gate Status</a>
                <a href="#resultsTopErrors" class="results-side-link">Top Errors</a>
                <a href="#resultsAllErrors" class="results-side-link">All Errors</a>
                <a href="#selectedErrorRecord" class="results-side-link">Selected Record</a>
                <a href="#resultsDownloads" class="results-side-link">Downloads</a>
            </aside>

            <div class="results-main">
                <section id="resultsSummary" class="stats-grid">
                    <div class="stat ${isPass ? 'pass' : 'fail'}" role="button" tabindex="0" data-stat-type="pass-rate">
                        <h3>${passRate}%</h3>
                        <p>Pass Rate</p>
                    </div>
                    <div class="stat" role="button" tabindex="0" data-stat-type="good-records">
                        <h3>${allGood.length}</h3>
                        <p>Good Records</p>
                    </div>
                    <div class="stat" role="button" tabindex="0" data-stat-type="bad-records">
                        <h3>${allBad.length}</h3>
                        <p>Bad Records</p>
                    </div>
                    <div class="stat" role="button" tabindex="0" data-stat-type="errors-found">
                        <h3>${allErrors.length}</h3>
                        <p>Errors Found</p>
                    </div>
                </section>

                <div id="resultsGateStatus" class="card">
                    <h3>${isPass ? '✅ Pipeline Ready' : '❌ Gate Failed'}</h3>
                    <p>${totalRecords} total records across ${files.length} files</p>
                </div>

                <div id="resultsTopErrors" class="card">
                    <details class="all-errors-panel">
                        <summary>🔥 Top Errors (${topErrorsPreview.length})</summary>
                        <p class="error-row-hint">Click any error row to view the full JSON record.</p>
                        <div class="error-filter-row">
                            <label for="topErrorFieldFilter">Filter by field</label>
                            <select id="topErrorFieldFilter" class="error-field-filter" data-filter-source="top">
                                ${topFieldOptions}
                            </select>
                            <span id="topErrorsCount" class="error-filter-count">${topErrorsPreview.length} of ${topErrorsPreview.length}</span>
                        </div>
                        <table>
                            <thead id="topErrorsHead">
                                ${renderErrorTableHead('top')}
                            </thead>
                            <tbody id="topErrorsBody">
                            ${renderErrorRowsForTable(filterErrorsByField(topErrorsPreview, ''), 'top')}
                            </tbody>
                        </table>
                    </details>
                </div>

                <div id="resultsAllErrors" class="card">
                    <details class="all-errors-panel">
                        <summary>📚 All Errors (${allErrors.length})</summary>
                        <p class="error-row-hint">This section includes every error row (not capped). Click any row to inspect the full JSON record.</p>
                        <div class="error-filter-row">
                            <label for="allErrorFieldFilter">Filter by field</label>
                            <select id="allErrorFieldFilter" class="error-field-filter" data-filter-source="all">
                                ${allFieldOptions}
                            </select>
                            <span id="allErrorsCount" class="error-filter-count">${allErrorsPreview.length} of ${allErrorsPreview.length}</span>
                        </div>
                        <div class="all-errors-table-wrap">
                            <table>
                                <thead id="allErrorsHead">
                                    ${renderErrorTableHead('all')}
                                </thead>
                                <tbody id="allErrorsBody">
                                ${renderErrorRowsForTable(filterErrorsByField(allErrorsPreview, ''), 'all')}
                                </tbody>
                            </table>
                        </div>
                    </details>
                </div>

                <div class="card" id="selectedErrorRecord">
                    <h3>🧾 Selected Error Record</h3>
                    <p class="error-row-hint">Highlighted key = field causing the validation error.</p>
                    <p id="errorRecordSummary">Select an error row above to inspect its full JSON payload.</p>
                    <pre id="errorRecordContent" class="record-viewer">No record selected.</pre>
                </div>

                <div id="resultsDownloads" class="card">
                    <h3>⬇️ Downloads</h3>
                    <button class="success" onclick="download('good-bids.json', lastValidationData.good)">✅ Good Records JSON</button>
                    <button class="danger" onclick="download('bad-bids.json', lastValidationData.bad)">❌ Bad Records JSON</button>
                    <button onclick="download('errors.csv', toCSV(lastValidationData.errors))">📊 Error Report CSV</button>
                </div>
            </div>
        </div>
    `;

    requestAnimationFrame(() => {
        const summarySection = ui.results.querySelector('#resultsSummary');
        if (summarySection) {
            summarySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            ui.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
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
            const fieldIsRequired = required.includes(field);
            if (!fieldIsRequired) {
                return;
            }

            if (value[field] === undefined || value[field] === null) {
                return;
            }

            validateBySchema(value[field], childSchema, `${path}/${field}`, errors, required);
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
