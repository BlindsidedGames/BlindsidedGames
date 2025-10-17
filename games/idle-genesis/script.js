(function bootstrapIdleGenesis() {
    /**
     * Central configuration for save data.
     * Versioned shape protects us as the project grows (prestige, progress bars, etc).
     */
    const SAVE_VERSION = 1;
    const STORAGE_KEY = 'idleGenesis:save';
    const DEFAULT_STATE = Object.freeze({
        version: SAVE_VERSION,
        systems: {
            core: {
                storedEnergy: '0', // Stored as string for safe BigInt serialisation.
            },
        },
    });

    const counterValueElement = document.getElementById('counterValue');
    const chargeButton = document.getElementById('chargeButton');

    if (!counterValueElement || !chargeButton) {
        return;
    }

    /**
     * Handles persistence and future migrations for Idle Genesis save data.
     */
    class StorageManager {
        constructor(storage, storageKey, defaultState) {
            this.storage = storage;
            this.storageKey = storageKey;
            this.defaultState = defaultState;
            this.state = this.load();
        }

        getState() {
            return deepClone(this.state);
        }

        update(updateFn) {
            const draft = deepClone(this.state);
            updateFn(draft);
            this.state = normaliseState(draft);
            this.persist();
            return deepClone(this.state);
        }

        load() {
            try {
                const raw = this.storage.getItem(this.storageKey);
                if (!raw) {
                    return deepClone(this.defaultState);
                }
                const parsed = JSON.parse(raw);
                return normaliseState(parsed);
            } catch (error) {
                console.warn('Idle Genesis: failed to load save data, resetting to defaults.', error);
                return deepClone(this.defaultState);
            }
        }

        persist() {
            try {
                this.storage.setItem(this.storageKey, JSON.stringify(this.state));
            } catch (error) {
                console.warn('Idle Genesis: failed to persist save data.', error);
            }
        }
    }

    /**
     * Ensures state always matches the current schema and strips unsupported data
     * so future systems can confidently rely on the shape.
     */
    function normaliseState(candidate) {
        const safeState = deepClone(DEFAULT_STATE);
        const version = Number(candidate?.version);
        safeState.version = Number.isFinite(version) && version >= SAVE_VERSION ? SAVE_VERSION : SAVE_VERSION;

        const storedEnergy = coerceToBigIntString(candidate?.systems?.core?.storedEnergy);
        safeState.systems.core.storedEnergy = storedEnergy;

        return safeState;
    }

    /**
     * Converts user-land values (numbers, strings, BigInts) to a BigInt-backed string.
     * Guards against NaN, negative, and malformed inputs to keep the save durable.
     */
    function coerceToBigIntString(value) {
        try {
            if (typeof value === 'bigint') {
                return value < 0n ? '0' : value.toString();
            }

            if (typeof value === 'number') {
                if (!Number.isFinite(value)) {
                    return '0';
                }
                const safe = BigInt(Math.max(0, Math.floor(value)));
                return safe.toString();
            }

            if (typeof value === 'string') {
                const trimmed = value.trim();
                if (trimmed === '') {
                    return '0';
                }
                const parsed = BigInt(trimmed);
                return parsed < 0n ? '0' : parsed.toString();
            }
        } catch (error) {
            console.warn('Idle Genesis: invalid energy value detected, resetting to zero.', error);
        }
        return '0';
    }

    /**
     * Clones plain data structures without retaining references.
     * Uses structuredClone when available, falling back to JSON for legacy engines.
     */
    function deepClone(source) {
        if (typeof structuredClone === 'function') {
            return structuredClone(source);
        }
        return JSON.parse(JSON.stringify(source));
    }

    const storageBackend = resolveStorageBackend();
    const storageManager = new StorageManager(storageBackend, STORAGE_KEY, DEFAULT_STATE);
    const numberFormatter = new Intl.NumberFormat(undefined);
    let gameState = storageManager.getState();

    render(gameState);

    chargeButton.addEventListener('click', () => {
        gameState = storageManager.update((draft) => {
            const currentValue = BigInt(coerceToBigIntString(draft.systems.core.storedEnergy));
            draft.systems.core.storedEnergy = (currentValue + 1n).toString();
        });

        render(gameState);
        animateButton();
    });

    function render(state) {
        const energyValue = BigInt(state.systems.core.storedEnergy);
        counterValueElement.textContent = formatEnergy(energyValue);
    }

    function animateButton() {
        chargeButton.classList.add('counter-button--pulse');
        setTimeout(() => chargeButton.classList.remove('counter-button--pulse'), 150);
    }

    function formatEnergy(value) {
        try {
            return numberFormatter.format(value);
        } catch (error) {
            // Fallback for environments without BigInt-aware Intl.NumberFormat.
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
    }

    /**
     * Provides a robust storage interface that degrades gracefully if localStorage is blocked.
     */
    function resolveStorageBackend() {
        try {
            const { localStorage } = window;
            const probeKey = `${STORAGE_KEY}::probe`;
            localStorage.setItem(probeKey, '1');
            localStorage.removeItem(probeKey);
            return localStorage;
        } catch (error) {
            console.warn('Idle Genesis: falling back to in-memory storage. Progress will reset on refresh.', error);
            const memoryStore = new Map();
            return {
                getItem: (key) => (memoryStore.has(key) ? memoryStore.get(key) : null),
                setItem: (key, value) => memoryStore.set(key, String(value)),
                removeItem: (key) => memoryStore.delete(key),
            };
        }
    }
})();
