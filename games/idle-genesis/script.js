(function () {
    const storageKey = 'idleGenesis:coreCharge';
    const counterValueElement = document.getElementById('counterValue');
    const chargeButton = document.getElementById('chargeButton');

    if (!counterValueElement || !chargeButton) {
        return;
    }

    let coreCharge = readStoredCharge();
    updateDisplay(coreCharge);

    chargeButton.addEventListener('click', () => {
        coreCharge += 1;
        updateDisplay(coreCharge);
        persistCharge(coreCharge);
        animateButton();
    });

    function readStoredCharge() {
        try {
            const storedValue = localStorage.getItem(storageKey);
            const parsed = parseInt(storedValue, 10);
            return Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
        } catch (error) {
            console.warn('Idle Genesis: unable to load saved charge.', error);
            return 0;
        }
    }

    function persistCharge(value) {
        try {
            localStorage.setItem(storageKey, String(value));
        } catch (error) {
            console.warn('Idle Genesis: unable to save charge.', error);
        }
    }

    function updateDisplay(value) {
        counterValueElement.textContent = value.toLocaleString();
    }

    function animateButton() {
        chargeButton.classList.add('counter-button--pulse');
        setTimeout(() => chargeButton.classList.remove('counter-button--pulse'), 150);
    }
})();
