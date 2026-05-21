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

function resetBerichtBox(element) {
        element.innerText = '';
        element.className = 'status-melding';
        element.style.color = '';
    }

function zetInputValue(id, waarde) {
        const element = document.getElementById(id);
        if (!element) return;
        element.value = waarde !== undefined && waarde !== null ? waarde : '';
        const parameterNaam = element.getAttribute('data-param');
        if (parameterNaam) {
            valideerVeld(element, parameterNaam);
        }
    }

function valideerVeld(inputElement, parameterNaam) {
        const waarde = parseFloat(inputElement.value);
        const limiet = actieveLimieten[parameterNaam];
        if (!isNaN(waarde) && limiet) {
            if (waarde < limiet.min || waarde > limiet.max) { inputElement.classList.add('buiten-limiet'); }
            else { inputElement.classList.remove('buiten-limiet'); }
        } else { inputElement.classList.remove('buiten-limiet'); }
    }
