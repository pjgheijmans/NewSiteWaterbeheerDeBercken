/**
 * Display a status message in the application header.
 * @param {string} tekst - The message text to show.
 * @param {'succes'|'fout'|''} type - The message type for styling and timeouts.
 */
function toonBericht(tekst, type) {
        const element = document.getElementById('statusBericht');
        if (!element) return;

        if (berichtTimer) clearTimeout(berichtTimer);
        element.style.color = '';
        element.innerText = tekst;
        element.className = 'status-melding ' + type;

        if (type === 'fout') {
            element.style.color = '#ff9800'; // Oranje waarschuwing
            berichtTimer = setTimeout(() => { resetBerichtBox(element); }, 5000);
        } else if (type === 'succes') {
            berichtTimer = setTimeout(() => { resetBerichtBox(element); }, 5000);
        } else if (tekst !== '') {
            element.style.color = '#dc3545'; // Rode kritieke fout (geen timer)
        }
    }

/**
 * Reset the status message box to its default hidden/neutral state.
 * @param {HTMLElement} element - The DOM element containing the status message.
 */
function resetBerichtBox(element) {
        element.innerText = '';
        element.className = 'status-melding';
        element.style.color = '';
    }

/**
 * Set the value of a form input and validate it if it has a data parameter.
 * @param {string} id - The DOM id of the input element.
 * @param {*} waarde - The value to write into the input field.
 */
function zetInputValue(id, waarde) {
        const element = document.getElementById(id);
        if (!element) return;
        element.value = waarde !== undefined && waarde !== null ? waarde : '';
        const parameterNaam = element.getAttribute('data-param');
        if (parameterNaam) {
            valideerVeld(element, parameterNaam);
        }
    }

/**
 * Validate a numeric input field for decimal precision (based on step attribute)
 * and against the configured min/max limits for a parameter.
 * Adds or removes the 'buiten-limiet' CSS class accordingly.
 * @param {HTMLInputElement} inputElement - The input element to validate.
 * @param {string|null} parameterNaam - The parameter name used to lookup limits, or null for precision-only check.
 */
function valideerVeld(inputElement, parameterNaam) {
        if (inputElement.value === '') {
            inputElement.classList.remove('buiten-limiet');
            return;
        }
        const waarde = parseFloat(inputElement.value);
        if (isNaN(waarde)) {
            inputElement.classList.add('buiten-limiet');
            return;
        }

        // Precision check: count decimal places in the typed string vs what step allows
        const step = parseFloat(inputElement.getAttribute('step'));
        if (!isNaN(step) && step > 0) {
            const allowed = step >= 1 ? 0 : (step.toString().split('.')[1] || '').length;
            const dotIdx = inputElement.value.indexOf('.');
            const entered = dotIdx === -1 ? 0 : inputElement.value.length - dotIdx - 1;
            if (entered > allowed) {
                inputElement.classList.add('buiten-limiet');
                return;
            }
        }

        // Min/max limit check
        const limiet = actieveLimieten[parameterNaam];
        if (limiet) {
            inputElement.classList.toggle('buiten-limiet', waarde < limiet.min || waarde > limiet.max);
        } else {
            inputElement.classList.remove('buiten-limiet');
        }
    }
