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
 * Validate a numeric input field against the configured limits for a parameter.
 * Adds or removes the 'buiten-limiet' CSS class based on whether the value is in range.
 * @param {HTMLInputElement} inputElement - The input element to validate.
 * @param {string} parameterNaam - The parameter name used to lookup limits.
 */
function valideerVeld(inputElement, parameterNaam) {
        const waarde = parseFloat(inputElement.value);
        const limiet = actieveLimieten[parameterNaam];
        if (!isNaN(waarde) && limiet) {
            if (waarde < limiet.min || waarde > limiet.max) { inputElement.classList.add('buiten-limiet'); }
            else { inputElement.classList.remove('buiten-limiet'); }
        } else { inputElement.classList.remove('buiten-limiet'); }
    }
