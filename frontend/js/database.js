/**
 * Databasebeheer — CSV import/export en tabel-truncate operaties.
 */
class DatabaseModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * Open de verborgen bestandskiezer voor CSV-import.
     * @param {string} tabelnaam
     */
    triggerImportBladeren(tabelnaam) {
        document.getElementById(`import-file-${tabelnaam}`).click();
    }

    /**
     * Lees een CSV-bestand en stuur de inhoud naar de import-endpoint.
     * @param {HTMLInputElement} inputElement
     * @param {string} tabelnaam
     */
    verwerkCsvUpload(inputElement, tabelnaam) {
        const bestand = inputElement.files[0];
        if (!bestand) return;
        this.app.ui.toonBericht('CSV-bestand wordt verwerkt...', 'succes');

        const reader = new FileReader();
        reader.onload = async e => {
            try {
                const res  = await this.app.api.call(`/api/database/import/${tabelnaam}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/csv' },
                    body: e.target.result,
                });
                const data = await res.json();
                if (res.ok)
                    this.app.ui.toonBericht(`CSV succesvol geïmporteerd in '${tabelnaam}'!`, 'succes');
                else
                    this.app.ui.toonBericht(`Import mislukt: ${data.error}`, 'fout');
            } catch { this.app.ui.toonBericht('Verbindingsfout tijdens import.', 'fout'); }
            inputElement.value = '';
        };
        reader.readAsText(bestand, 'UTF-8');
    }

    /**
     * Leeg een tabel na bevestiging.
     * @param {string} tabelnaam
     */
    async leegmakenTabel(tabelnaam) {
        if (!(await this.app.ui.bevestig({
            titel: 'Tabel leegmaken',
            tekst: `Weet u 100% zeker dat u de tabel '${tabelnaam}' volledig wilt leegmaken?\n\nAlle data wordt permanent gewist.`,
            bevestig: 'Leegmaken', gevaar: true,
        }))) return;
        this.app.ui.toonBericht('Tabel aan het leegmaken...', '');
        try {
            const res  = await this.app.api.call(`/api/database/truncate/${tabelnaam}`, { method: 'POST' });
            const data = await res.json();
            if (res.ok) {
                this.app.ui.toonBericht(`Tabel '${tabelnaam}' is succesvol leeggemaakt.`, 'succes');
                if (tabelnaam === 'gebruikers') this.app.auth.verwerkLogout();
            } else {
                this.app.ui.toonBericht(`Fout: ${data.error}`, 'fout');
            }
        } catch { this.app.ui.toonBericht('Verbindingsfout met server.', 'fout'); }
    }

    /** Wis alle tabellen na dubbele bevestiging. */
    async verwijderDatabase() {
        if (!(await this.app.ui.bevestig({
            titel: 'Volledige database verwijderen',
            tekst: 'Dit wist ALLE data permanent — metingen, gebruikers, limieten, alles.\n\nWeet u dit zeker?',
            bevestig: 'Verwijderen', gevaar: true,
        }))) return;
        if (!(await this.app.ui.bevestig({
            titel: 'Laatste waarschuwing',
            tekst: 'Er is geen herstel mogelijk.\n\nWilt u echt alle data verwijderen?',
            bevestig: 'Definitief verwijderen', gevaar: true,
        }))) return;
        this.app.ui.toonBericht('Database wordt gewist...', '');
        try {
            const res  = await this.app.api.call('/api/database/verwijder-alles', { method: 'POST' });
            const data = await res.json();
            if (res.ok) { await this.app.ui.meld('Database volledig gewist. U wordt uitgelogd.'); window.location.reload(); }
            else         this.app.ui.toonBericht(`Fout: ${data.error}`, 'fout');
        } catch { this.app.ui.toonBericht('Verbindingsfout met server.', 'fout'); }
    }

    /** Wis alle tabellen en seed standaard limieten en gebruikers. */
    async maakNieuweDatabase() {
        if (!(await this.app.ui.bevestig({
            titel: 'Nieuwe database aanmaken',
            tekst: 'Dit wist ALLE data en maakt een lege database aan met standaard limieten en standaard gebruikers.\n\nWeet u dit zeker?',
            bevestig: 'Doorgaan', gevaar: true,
        }))) return;
        if (!(await this.app.ui.bevestig({
            titel: 'Laatste waarschuwing',
            tekst: 'Alle huidige metingen en instellingen worden permanent gewist.\n\nWilt u doorgaan?',
            bevestig: 'Definitief aanmaken', gevaar: true,
        }))) return;
        this.app.ui.toonBericht('Database wordt geïnitialiseerd...', '');
        try {
            const res  = await this.app.api.call('/api/database/initialiseer', { method: 'POST' });
            const data = await res.json();
            if (res.ok) { await this.app.ui.meld('Nieuwe database aangemaakt. U wordt uitgelogd.'); window.location.reload(); }
            else         this.app.ui.toonBericht(`Fout: ${data.error}`, 'fout');
        } catch { this.app.ui.toonBericht('Verbindingsfout met server.', 'fout'); }
    }

    /**
     * Download een tabel als CSV-bestand.
     * @param {string} tabelnaam
     */
    exporteerTabel(tabelnaam) {
        this.app.ui.toonBericht('Export wordt voorbereid...', 'succes');
        window.location.href = `/api/database/export/${tabelnaam}`;
    }
}
