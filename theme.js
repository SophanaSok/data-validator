(function () {
    const STORAGE_KEY = 'app-theme-mode';
    const MODES = ['system', 'dark', 'light'];
    const LABELS = {
        system: '🖥️ System',
        dark: '🌙 Dark',
        light: '☀️ Light'
    };

    let mediaQuery = null;
    let activeMode = 'system';
    let activeButton = null;

    function getStoredMode() {
        const saved = localStorage.getItem(STORAGE_KEY);
        return MODES.includes(saved) ? saved : 'system';
    }

    function getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function renderButton(button, mode) {
        if (!button) {
            return;
        }

        button.textContent = `Theme: ${LABELS[mode]}`;
        button.setAttribute('aria-label', `Theme mode is ${mode}. Click to switch mode.`);
        button.title = `Theme mode: ${mode}. Click to switch.`;
    }

    function applyMode(mode) {
        const safeMode = MODES.includes(mode) ? mode : 'system';
        const resolvedTheme = safeMode === 'system' ? getSystemTheme() : safeMode;

        activeMode = safeMode;
        document.documentElement.dataset.themeMode = safeMode;
        document.documentElement.dataset.theme = resolvedTheme;
        document.documentElement.style.colorScheme = resolvedTheme;

        renderButton(activeButton, safeMode);
    }

    function cycleMode() {
        const currentIndex = MODES.indexOf(activeMode);
        const nextMode = MODES[(currentIndex + 1) % MODES.length];
        localStorage.setItem(STORAGE_KEY, nextMode);
        applyMode(nextMode);
    }

    function handleSystemThemeChange() {
        if (activeMode === 'system') {
            applyMode('system');
        }
    }

    function init(button) {
        activeButton = button || null;
        applyMode(getStoredMode());

        if (activeButton) {
            activeButton.addEventListener('click', cycleMode);
        }

        if (!mediaQuery) {
            mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        }

        window.addEventListener('storage', e => {
            if (e.key === STORAGE_KEY) {
                applyMode(getStoredMode());
            }
        });

        return {
            get mode() {
                return activeMode;
            },
            setMode(mode) {
                localStorage.setItem(STORAGE_KEY, MODES.includes(mode) ? mode : 'system');
                applyMode(mode);
            },
            applyMode
        };
    }

    window.ThemeController = {
        init,
        applyMode,
        getCurrentMode: () => activeMode
    };
})();