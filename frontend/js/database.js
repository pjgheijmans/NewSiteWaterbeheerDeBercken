/**
 * Open the hidden CSV import file selector for the given table.
 * @param {string} tabelnaam - The target table name for the import.
 */
function triggerImportBladeren(tabelnaam) {
        document.getElementById(`import-file-${tabelnaam}`).click();
    }

/**
 * Read a CSV file from the user and send its contents to the server import endpoint.
 * @param {HTMLInputElement} inputElement - The file input element containing the selected CSV.
 * @param {string} tabelnaam - The target table name for import.
 */
async function verwerkCsvUpload(inputElement, tabelnaam) {
        const bestand = inputElement.files[0];
        if (!bestand) return;

        toonBericht('CSV-bestand wordt verwerkt...', 'succes');

        const reader = new FileReader();
        reader.onload = async function (e) {
            const ruweTekst = e.target.result;

            try {
                const res = await apiCall(`/api/database/import/${tabelnaam}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/csv' },
                    body: ruweTekst
                });
                const data = await res.json();

                if (res.ok) {
                    toonBericht(`CSV succesvol geïmporteerd in '${tabelnaam}'!`, 'succes');
                } else {
                    toonBericht(`Import mislukt: ${data.error}`, 'fout');
                }
            } catch (f) { toonBericht('Verbindingsfout tijdens import.', 'fout'); }

            // Reset het inputveld zodat hetzelfde bestand direct nogmaals gekozen kan worden
            inputElement.value = '';
        };

        reader.readAsText(bestand, 'UTF-8');
    }

/**
 * Confirm and execute a full truncate of the specified backend database table.
 * @param {string} tabelnaam - The name of the table to clear.
 */
async function leegmakenTabel(tabelnaam) {
        const bevestig = confirm(`🚨 GEVAAR: Weet u 100% zeker dat u de tabel '${tabelnaam}' VOLLEDIG wilt leegmaken?\nAlle data wordt permanent gewist!`);
        if (!bevestig) return;

        toonBericht('Tabel aan het leegmaken...', '');
        try {
            const res = await apiCall(`/api/database/truncate/${tabelnaam}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                toonBericht(`Tabel '${tabelnaam}' is succesvol leeggemaakt.`, 'succes');
                if (tabelnaam === 'gebruikers') { verwerkLogout(); } // Uitloggen als je jezelf wist
            } else { toonBericht(`Fout: ${data.error}`, 'fout'); }
        } catch (f) { toonBericht('Verbindingsfout met server.', 'fout'); }
    }

/**
 * Download the full export CSV for a specified table from the server.
 * @param {string} tabelnaam - The target table name to export.
 */
async function exporteerTabel(tabelnaam) {
            toonBericht('Export wordt voorbereid...', 'succes');
            try {
                // Omdat we een bestand downloaden, gebruiken we window.location.href 
                // De browser handelt de download hiermee automatisch af
                window.location.href = `/api/database/export/${tabelnaam}`;
            } catch (f) {
                toonBericht('Fout tijdens het downloaden van de export.', 'fout');
            }
        }
