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
    let isStorageListenerBound = false;

    function ensureDefaultMode() {
        if (!localStorage.getItem(STORAGE_KEY)) {
            localStorage.setItem(STORAGE_KEY, 'system');
        }
    }

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
        let nextMode;

        if (activeMode === 'system') {
            // Avoid a no-op by switching to the opposite of the current system theme.
            nextMode = getSystemTheme() === 'dark' ? 'light' : 'dark';
        } else {
            const currentIndex = MODES.indexOf(activeMode);
            nextMode = MODES[(currentIndex + 1) % MODES.length];
        }

        localStorage.setItem(STORAGE_KEY, nextMode);
        applyMode(nextMode);
    }

    function handleSystemThemeChange() {
        if (activeMode === 'system') {
            applyMode('system');
        }
    }

    function ensureThemeListeners() {
        if (!mediaQuery) {
            mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', handleSystemThemeChange);
        }

        if (!isStorageListenerBound) {
            window.addEventListener('storage', e => {
                if (e.key === STORAGE_KEY) {
                    applyMode(getStoredMode());
                }
            });
            isStorageListenerBound = true;
        }
    }

    function initializeTheme() {
        ensureDefaultMode();
        applyMode(getStoredMode());
        ensureThemeListeners();
    }

    function init(button) {
        activeButton = button || null;
        initializeTheme();

        if (activeButton) {
            activeButton.addEventListener('click', cycleMode);
        }

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

    // Apply the persisted or system-derived theme immediately on script load.
    initializeTheme();
})();