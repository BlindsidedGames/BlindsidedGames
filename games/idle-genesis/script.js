(function bootstrapIdleGenesis() {
    const SAVE_VERSION = 4;
    // Surface build version alongside save versioning so UI badges stay in sync.
    const BUILD_VERSION = 'v0.3.0';
    const STORAGE_KEY = 'idleGenesis:save';
    const ENERGY_SCALING_FACTOR = 100n; // Store energy in hundredths to support partial yields.
    const BASE_ENERGY_PER_CLICK = 100n; // 1.00 energy when scaled by ENERGY_SCALING_FACTOR.
    const ENERGY_PER_CLICK_INCREMENT = 1n; // Represents +0.01 energy.
    const ENERGY_BOOST_UNLOCK_CLICKS = 0n; // Yield boosts are available immediately; raise to reintroduce a manual-activation gate.
    const ENERGY_ICON = '\u26A1';
    // Cost progression for the click-yield upgrade; BigInt keeps arithmetic consistent with stored values.
    const CLICK_UPGRADE_COSTS = Object.freeze([10n, 100n, 1000n, 10000n, 100000n]);
    const AUTO_CLICKER_COST_BASE = 50000n;
    const AUTO_CLICKER_COST = AUTO_CLICKER_COST_BASE * ENERGY_SCALING_FACTOR;
    // Manual input must complete within this window to be considered trusted.
    const ACTIVATION_WINDOW_MS = 1200;
    const SHOP_TABS = Object.freeze({
        clicks: 'clicks',
        energy: 'energy',
    });

    const DEFAULT_STATE = Object.freeze({
        version: SAVE_VERSION,
        systems: {
            core: {
                // Stored as a stringified BigInt scaled by ENERGY_SCALING_FACTOR.
                storedEnergy: '0',
                energyPerClick: BASE_ENERGY_PER_CLICK.toString(),
                energyYieldUpgradesPurchased: 0,
            },
            clicks: {
                balance: '0',
                upgradesPurchased: 0,
            },
            automation: {
                autoClicker: {
                    owned: false,
                },
            },
            stats: {
                manualClicks: '0',
            },
        },
    });

    const counterValueElement = document.getElementById('counterValue');
    const chargeButton = document.getElementById('chargeButton');
    const clickBalanceElement = document.getElementById('clickBalanceValue');
    const perClickValueElement = document.getElementById('perClickValue');
    const clickUpgradeButton = document.getElementById('clickUpgradeButton');
    const clickUpgradeStatusElement = document.getElementById('clickUpgradeStatus');
    const autoClickerButton = document.getElementById('autoClickerButton');
    const autoClickerStatusElement = document.getElementById('autoClickerStatus');
    const energyBoostButton = document.getElementById('energyBoostButton');
    const buildVersionElement = document.getElementById('buildVersion');
    const shopTabButtons = {
        clicks: document.querySelector('[data-shop-tab="clicks"]'),
        energy: document.querySelector('[data-shop-tab="energy"]'),
    };
    const shopPanels = {
        clicks: document.querySelector('[data-shop-panel="clicks"]'),
        energy: document.querySelector('[data-shop-panel="energy"]'),
    };

    if (
        !counterValueElement ||
        !chargeButton ||
        !clickBalanceElement ||
        !perClickValueElement ||
        !clickUpgradeButton ||
        !clickUpgradeStatusElement ||
        !autoClickerButton ||
        !autoClickerStatusElement ||
        !energyBoostButton ||
        !buildVersionElement ||
        !shopTabButtons.clicks ||
        !shopTabButtons.energy ||
        !shopPanels.clicks ||
        !shopPanels.energy
    ) {
        return;
    }

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

    function normaliseState(candidate) {
        const safeState = deepClone(DEFAULT_STATE);
        const candidateVersion = Number(candidate?.version ?? 0);

        const storedEnergy = normaliseEnergyValue(candidate?.systems?.core?.storedEnergy, candidateVersion);
        safeState.systems.core.storedEnergy = storedEnergy.toString();

        const yieldData = normaliseEnergyYieldData(candidate?.systems?.core, candidateVersion);
        safeState.systems.core.energyPerClick = yieldData.energyPerClick.toString();
        safeState.systems.core.energyYieldUpgradesPurchased = yieldData.energyYieldUpgradesPurchased;

        const clickBalance = coerceToBigIntString(candidate?.systems?.clicks?.balance);
        safeState.systems.clicks.balance = clickBalance;

        const upgrades = Number(candidate?.systems?.clicks?.upgradesPurchased);
        const boundedUpgrade = Number.isFinite(upgrades) ? Math.min(Math.max(0, Math.trunc(upgrades)), CLICK_UPGRADE_COSTS.length) : 0;
        safeState.systems.clicks.upgradesPurchased = boundedUpgrade;

        const autoOwned = candidate?.systems?.automation?.autoClicker?.owned === true;
        safeState.systems.automation.autoClicker.owned = autoOwned;

        const manualClicks = normaliseManualClicks(candidate?.systems?.stats?.manualClicks, candidateVersion);
        safeState.systems.stats.manualClicks = manualClicks.toString();

        safeState.version = SAVE_VERSION;
        return safeState;
    }

    function normaliseEnergyValue(candidateEnergy, candidateVersion) {
        const coerced = coerceToBigIntString(candidateEnergy);
        let scaledEnergy = BigInt(coerced);
        if (candidateVersion < 3) {
            scaledEnergy *= ENERGY_SCALING_FACTOR;
        }
        return scaledEnergy < 0n ? 0n : scaledEnergy;
    }

    function normaliseEnergyYieldData(coreCandidate, candidateVersion) {
        const energyPerClickValue = normaliseEnergyPerClick(coreCandidate?.energyPerClick, candidateVersion);
        let upgradesPurchased;
        if (candidateVersion >= 4) {
            upgradesPurchased = normaliseEnergyYieldUpgradeCount(coreCandidate?.energyYieldUpgradesPurchased);
        } else {
            upgradesPurchased = deriveEnergyYieldUpgradeCount(energyPerClickValue);
        }
        const normalisedEnergyPerClick =
            BASE_ENERGY_PER_CLICK + BigInt(upgradesPurchased) * ENERGY_PER_CLICK_INCREMENT;
        return {
            energyPerClick: normalisedEnergyPerClick,
            energyYieldUpgradesPurchased: upgradesPurchased,
        };
    }

    function normaliseEnergyPerClick(candidateEnergyPerClick, candidateVersion) {
        const coerced = coerceToBigIntString(candidateEnergyPerClick);
        let energyPerClick = BigInt(coerced);
        if (candidateVersion < 3 || energyPerClick === 0n) {
            energyPerClick = BASE_ENERGY_PER_CLICK;
        }
        return energyPerClick < BASE_ENERGY_PER_CLICK ? BASE_ENERGY_PER_CLICK : energyPerClick;
    }

    function normaliseEnergyYieldUpgradeCount(candidate) {
        const raw = Number(candidate);
        if (!Number.isFinite(raw) || raw < 0) {
            return 0;
        }
        return Math.trunc(raw);
    }

    function deriveEnergyYieldUpgradeCount(energyPerClickValue) {
        if (energyPerClickValue <= BASE_ENERGY_PER_CLICK) {
            return 0;
        }
        const delta = energyPerClickValue - BASE_ENERGY_PER_CLICK;
        if (delta <= 0n) {
            return 0;
        }
        const upgrades = delta / ENERGY_PER_CLICK_INCREMENT;
        const asNumber = Number(upgrades);
        if (!Number.isFinite(asNumber) || asNumber < 0) {
            return 0;
        }
        return Math.trunc(asNumber);
    }

    function normaliseManualClicks(candidateManualClicks, candidateVersion) {
        if (candidateVersion < 3) {
            return 0n;
        }
        const coerced = coerceToBigIntString(candidateManualClicks);
        const manualClicks = BigInt(coerced);
        return manualClicks < 0n ? 0n : manualClicks;
    }

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
            console.warn('Idle Genesis: invalid stored value detected, resetting to zero.', error);
        }
        return '0';
    }

    function deepClone(source) {
        if (typeof structuredClone === 'function') {
            return structuredClone(source);
        }
        return JSON.parse(JSON.stringify(source));
    }

    const storageBackend = resolveStorageBackend();
    const storageManager = new StorageManager(storageBackend, STORAGE_KEY, DEFAULT_STATE);
    let gameState = storageManager.getState();
    let activeShopTab = SHOP_TABS.clicks;
    let autoClickerIntervalId = null;
    // Tracks recently authorised user input so programmatic clicks can be ignored.
    let armedActivation = null;

    chargeButton.addEventListener('pointerdown', (event) => {
        if (!event.isTrusted) {
            return;
        }
        armActivation('pointer');
    });
    chargeButton.addEventListener('pointercancel', disarmActivation);
    chargeButton.addEventListener('pointerleave', (event) => {
        // Touch pointers fire pointerleave after pointerup, so only disarm when input is still active.
        if (event.pointerType === 'mouse') {
            disarmActivation();
            return;
        }
        if (event.buttons > 0) {
            disarmActivation();
        }
    });
    chargeButton.addEventListener('blur', disarmActivation);

    chargeButton.addEventListener('keydown', (event) => {
        if (!event.isTrusted) {
            return;
        }
        if (isClickKey(event.code)) {
            armActivation('keyboard');
        }
    });

    chargeButton.addEventListener('click', (event) => {
        if (!event.isTrusted) {
            return;
        }
        if (!isActivationValid()) {
            return;
        }
        disarmActivation();
        processManualClick();
    });

    clickUpgradeButton.addEventListener('click', purchaseClickUpgrade);
    autoClickerButton.addEventListener('click', purchaseAutoClicker);
    energyBoostButton.addEventListener('click', increaseEnergyYield);

    Object.entries(shopTabButtons).forEach(([tabKey, button]) => {
        button.addEventListener('click', () => {
            if (activeShopTab === tabKey) {
                return;
            }
            activeShopTab = tabKey;
            syncShopTabUI();
        });
    });

    buildVersionElement.textContent = `Idle Genesis ${BUILD_VERSION}`;
    syncShopTabUI();
    render(gameState);

    function processManualClick() {
        applyClick({ animate: true, source: 'manual' });
    }

    function processAutoClick() {
        applyClick({ animate: false, source: 'auto' });
    }

    function applyClick({ animate, source = 'manual' }) {
        gameState = storageManager.update((draft) => {
            applyClickToDraft(draft, source);
        });
        render(gameState);
        if (animate) {
            animateCounterButton(chargeButton);
        }
    }

    function applyClickToDraft(draft, source) {
        // Every click awards the configured energy yield, with manual inputs tracked for unlock logic.
        const currentEnergy = asBigInt(draft.systems.core.storedEnergy);
        draft.systems.core.storedEnergy = (currentEnergy + getEnergyPerClickValue(draft)).toString();

        if (source === 'manual') {
            const manualClicks = asBigInt(draft.systems.stats.manualClicks);
            draft.systems.stats.manualClicks = (manualClicks + 1n).toString();
        }

        const currentClicks = asBigInt(draft.systems.clicks.balance);
        draft.systems.clicks.balance = (currentClicks + getClicksPerPress(draft)).toString();
    }

    function purchaseClickUpgrade() {
        const level = getClickUpgradeLevel(gameState);
        if (level >= CLICK_UPGRADE_COSTS.length) {
            return;
        }

        const cost = CLICK_UPGRADE_COSTS[level];
        const balance = getClickBalance(gameState);
        if (balance < cost) {
            return;
        }

        gameState = storageManager.update((draft) => {
            const draftLevel = getClickUpgradeLevel(draft);
            if (draftLevel >= CLICK_UPGRADE_COSTS.length) {
                return;
            }

            const draftBalance = asBigInt(draft.systems.clicks.balance);
            const draftCost = CLICK_UPGRADE_COSTS[draftLevel];
            if (draftBalance < draftCost) {
                return;
            }

            draft.systems.clicks.balance = (draftBalance - draftCost).toString();
            draft.systems.clicks.upgradesPurchased = draftLevel + 1;
        });
        render(gameState);
    }

    function purchaseAutoClicker() {
        const owned = Boolean(gameState.systems.automation.autoClicker.owned);
        if (owned) {
            return;
        }

        const energy = getEnergy(gameState);
        if (energy < AUTO_CLICKER_COST) {
            return;
        }

        gameState = storageManager.update((draft) => {
            if (draft.systems.automation.autoClicker.owned) {
                return;
            }

            const draftEnergy = asBigInt(draft.systems.core.storedEnergy);
            if (draftEnergy < AUTO_CLICKER_COST) {
                return;
            }

            draft.systems.core.storedEnergy = (draftEnergy - AUTO_CLICKER_COST).toString();
            draft.systems.automation.autoClicker.owned = true;
        });
        render(gameState);
    }

    function increaseEnergyYield() {
        const manualClicks = getManualClickCount(gameState);
        if (manualClicks < ENERGY_BOOST_UNLOCK_CLICKS) {
            return;
        }

        gameState = storageManager.update((draft) => {
            const draftManualClicks = getManualClickCount(draft);
            if (draftManualClicks < ENERGY_BOOST_UNLOCK_CLICKS) {
                return;
            }

            const currentYield = getEnergyPerClickValue(draft);
            const nextYield = currentYield + ENERGY_PER_CLICK_INCREMENT;
            draft.systems.core.energyPerClick = nextYield.toString();
            const currentUpgrades = getEnergyYieldUpgradeCount(draft);
            draft.systems.core.energyYieldUpgradesPurchased = currentUpgrades + 1;
        });
        render(gameState);
        animateCounterButton(energyBoostButton);
    }

    function render(state) {
        const energyValue = getEnergy(state);
        const clickBalance = getClickBalance(state);
        const clicksPerPress = getClicksPerPress(state);
        const energyPerPress = getEnergyPerClickValue(state);
        const actionTerm = resolvePrimaryActionTerm();

        counterValueElement.textContent = formatEnergyValue(energyValue);
        clickBalanceElement.textContent = formatBigValue(clickBalance);
        perClickValueElement.textContent = `+${formatBigValue(clicksPerPress)}`;

        updateChargeButtonLabel(energyPerPress, actionTerm);
        updateEnergyBoostButton(state, actionTerm, energyPerPress);
        updateClickShop(state, clickBalance, clicksPerPress);
        updateEnergyShop(state, energyValue);

        syncShopTabUI();
        ensureAutoClickerLoop(state);
    }

    // Shared pulse effect so primary and boost actions respond consistently to manual activation.
    function animateCounterButton(target = chargeButton) {
        target.classList.add('counter-button--pulse');
        window.setTimeout(() => {
            target.classList.remove('counter-button--pulse');
        }, 150);
    }

    function updateClickShop(state, clickBalance, clicksPerPress) {
        const level = getClickUpgradeLevel(state);
        const maxLevel = CLICK_UPGRADE_COSTS.length;

        clickUpgradeStatusElement.textContent = `Level ${level}/${maxLevel} - ${formatBigValue(clicksPerPress)} per click`;

        if (level >= maxLevel) {
            clickUpgradeButton.textContent = 'Upgrade Maxed';
            clickUpgradeButton.disabled = true;
            return;
        }

        const cost = CLICK_UPGRADE_COSTS[level];
        clickUpgradeButton.textContent = `Increase Click Yield (+1) - Cost: ${formatBigValue(cost)} Clicks`;
        clickUpgradeButton.disabled = clickBalance < cost;
    }

    function updateEnergyShop(state, energyValue) {
        const owned = Boolean(state.systems.automation.autoClicker.owned);
        if (owned) {
            autoClickerButton.textContent = 'Auto Clicker Purchased';
            autoClickerButton.disabled = true;
            autoClickerStatusElement.textContent = 'Active - Adds your energy yield and one click every second.';
            return;
        }

        autoClickerButton.textContent = `Buy Auto Clicker - Cost: ${formatBigValue(AUTO_CLICKER_COST_BASE)} Energy`;
        autoClickerButton.disabled = energyValue < AUTO_CLICKER_COST;
        autoClickerStatusElement.textContent = 'Generates one automatic activation per second.';
    }

    function updateChargeButtonLabel(energyPerPress, actionTerm) {
        const energyLabel = formatEnergyValue(energyPerPress, {
            minimumFractionDigits: 2,
            trimTrailingZeros: false,
        });
        chargeButton.textContent = `+${ENERGY_ICON}${energyLabel}`;
        const ariaLabel = `Gain ${energyLabel} energy every ${actionTerm}.`;
        chargeButton.setAttribute('aria-label', ariaLabel);
        chargeButton.title = `Gain ${ENERGY_ICON}${energyLabel} energy every ${actionTerm}.`;
    }

    function updateEnergyBoostButton(state, actionTerm, currentYieldValue) {
        const manualClicks = getManualClickCount(state);
        const unlocked = manualClicks >= ENERGY_BOOST_UNLOCK_CLICKS;
        if (unlocked) {
            energyBoostButton.removeAttribute('hidden');
        } else {
            energyBoostButton.setAttribute('hidden', 'hidden');
            return;
        }

        const incrementLabel = formatEnergyValue(ENERGY_PER_CLICK_INCREMENT, {
            minimumFractionDigits: 2,
            trimTrailingZeros: false,
        });
        const currentYieldLabel = formatEnergyValue(currentYieldValue, {
            minimumFractionDigits: 2,
            trimTrailingZeros: false,
        });
        const nextYieldValue = currentYieldValue + ENERGY_PER_CLICK_INCREMENT;
        const nextYieldLabel = formatEnergyValue(nextYieldValue, {
            minimumFractionDigits: 2,
            trimTrailingZeros: false,
        });
        energyBoostButton.textContent = `+${ENERGY_ICON}${incrementLabel} Yield`;
        energyBoostButton.disabled = false;
        const ariaLabel = `Increase the energy gained per ${actionTerm} from ${currentYieldLabel} to ${nextYieldLabel} (+${incrementLabel}).`;
        energyBoostButton.setAttribute('aria-label', ariaLabel);
        energyBoostButton.title = `Adds ${ENERGY_ICON}${incrementLabel} per ${actionTerm}. Current yield ${ENERGY_ICON}${currentYieldLabel}.`;
    }

    function ensureAutoClickerLoop(state) {
        const owned = Boolean(state.systems.automation.autoClicker.owned);
        if (owned && autoClickerIntervalId === null) {
            autoClickerIntervalId = window.setInterval(processAutoClick, 1000);
        } else if (!owned && autoClickerIntervalId !== null) {
            window.clearInterval(autoClickerIntervalId);
            autoClickerIntervalId = null;
        }
    }

    function resolvePrimaryActionTerm() {
        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            try {
                if (window.matchMedia('(pointer: coarse)').matches) {
                    return 'tap';
                }
            } catch (error) {
                // Older browsers can throw if the query is unsupported; fall back to other heuristics.
            }
        }

        if (typeof navigator !== 'undefined') {
            if (Number.isFinite(navigator.maxTouchPoints) && navigator.maxTouchPoints > 0) {
                return 'tap';
            }
            if (navigator.userAgentData?.mobile === true) {
                return 'tap';
            }
        }

        return 'click';
    }

    function armActivation(type) {
        armedActivation = {
            type,
            timestamp: performance.now(),
        };
    }

    function disarmActivation() {
        armedActivation = null;
    }

    function isActivationValid() {
        if (!armedActivation) {
            return false;
        }
        if (performance.now() - armedActivation.timestamp > ACTIVATION_WINDOW_MS) {
            disarmActivation();
            return false;
        }
        return true;
    }

    function isClickKey(code) {
        return code === 'Space' || code === 'Enter';
    }

    function getEnergyPerClickValue(state) {
        const value = state?.systems?.core?.energyPerClick ?? BASE_ENERGY_PER_CLICK.toString();
        return asBigInt(value);
    }

    function getEnergyYieldUpgradeCount(state) {
        const raw = Number(state?.systems?.core?.energyYieldUpgradesPurchased ?? 0);
        if (!Number.isFinite(raw) || raw < 0) {
            return 0;
        }
        return Math.trunc(raw);
    }

    function getEnergy(state) {
        return asBigInt(state.systems.core.storedEnergy);
    }

    function getClickBalance(state) {
        return asBigInt(state.systems.clicks.balance);
    }

    function getManualClickCount(state) {
        const value = state?.systems?.stats?.manualClicks ?? '0';
        return asBigInt(value);
    }

    function getClicksPerPress(state) {
        const level = getClickUpgradeLevel(state);
        return 1n + BigInt(level);
    }

    function getClickUpgradeLevel(state) {
        const raw = Number(state?.systems?.clicks?.upgradesPurchased ?? 0);
        if (!Number.isFinite(raw)) {
            return 0;
        }
        return Math.min(Math.max(0, Math.trunc(raw)), CLICK_UPGRADE_COSTS.length);
    }

    function asBigInt(value) {
        return BigInt(coerceToBigIntString(value));
    }

    function formatEnergyValue(value, { minimumFractionDigits = 2, trimTrailingZeros = true } = {}) {
        // Energy values are persisted as scaled integers; normalise them into human-readable strings here.
        const scaleDigits = ENERGY_SCALING_FACTOR.toString().length - 1;
        const safeMinimum = Math.max(0, Math.min(scaleDigits, minimumFractionDigits));
        const divisor = ENERGY_SCALING_FACTOR;
        const isNegative = value < 0n;
        const absoluteValue = isNegative ? -value : value;
        const integerPart = absoluteValue / divisor;
        let fractionalString = (absoluteValue % divisor).toString().padStart(scaleDigits, '0');

        if (trimTrailingZeros) {
            fractionalString = fractionalString.replace(/0+$/, '');
        }
        if (fractionalString.length < safeMinimum) {
            fractionalString = fractionalString.padEnd(safeMinimum, '0');
        }
        const integerString = formatBigValue(integerPart);
        if (fractionalString.length === 0) {
            return `${isNegative ? '-' : ''}${integerString}`;
        }
        return `${isNegative ? '-' : ''}${integerString}.${fractionalString}`;
    }

    function formatBigValue(value) {
        // Use string-based grouping so formatting works in environments without BigInt-aware Intl.NumberFormat.
        const stringValue = value.toString();
        const sign = stringValue.startsWith('-') ? '-' : '';
        const digits = sign ? stringValue.slice(1) : stringValue;
        const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        return sign + grouped;
    }

    function syncShopTabUI() {
        Object.entries(shopTabButtons).forEach(([tabKey, button]) => {
            const isActive = tabKey === activeShopTab;
            button.classList.toggle('shop-tab--active', isActive);
            button.setAttribute('aria-selected', String(isActive));
            button.setAttribute('tabindex', isActive ? '0' : '-1');
        });

        Object.entries(shopPanels).forEach(([tabKey, panel]) => {
            if (tabKey === activeShopTab) {
                panel.removeAttribute('hidden');
            } else {
                panel.setAttribute('hidden', 'hidden');
            }
        });
    }

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

