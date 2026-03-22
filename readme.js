async function loadReadme() {
    const status = document.getElementById('status');
    const content = document.getElementById('content');

    try {
        const response = await fetch('README.md', { cache: 'no-store' });
        if (!response.ok) {
            throw new Error('HTTP ' + response.status);
        }

        const markdown = await response.text();
        content.innerHTML = marked.parse(markdown);
        status.textContent = 'User Guide loaded';
    } catch (error) {
        content.innerHTML = '<h1>User Guide unavailable</h1><p>Could not load README.md. If you opened this file directly from disk, run a local server first (for example: <code>python3 -m http.server 8000</code>).</p>';
        status.textContent = 'Failed to load User Guide';
    }
}

const themeToggle = document.getElementById('themeToggle');
if (window.ThemeController && themeToggle) {
    window.ThemeController.init(themeToggle);
}

loadReadme();