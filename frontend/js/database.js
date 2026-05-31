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
        if (!confirm(`🚨 GEVAAR: Weet u 100% zeker dat u de tabel '${tabelnaam}' VOLLEDIG wilt leegmaken?\nAlle data wordt permanent gewist!`)) return;
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
        if (!confirm('GEVAAR: Dit wist ALLE data permanent — metingen, gebruikers, limieten, alles.\n\nWeet u dit zeker?')) return;
        if (!confirm('LAATSTE WAARSCHUWING: Er is geen herstel mogelijk.\n\nDruk op OK om alle data te verwijderen.')) return;
        this.app.ui.toonBericht('Database wordt gewist...', '');
        try {
            const res  = await this.app.api.call('/api/database/verwijder-alles', { method: 'POST' });
            const data = await res.json();
            if (res.ok) { alert('Database volledig gewist. U wordt uitgelogd.'); window.location.reload(); }
            else         this.app.ui.toonBericht(`Fout: ${data.error}`, 'fout');
        } catch { this.app.ui.toonBericht('Verbindingsfout met server.', 'fout'); }
    }

    /** Wis alle tabellen en seed standaard limieten en gebruikers. */
    async maakNieuweDatabase() {
        if (!confirm('Dit wist ALLE data en maakt een lege database aan met standaard limieten en standaard gebruikers.\n\nWeet u dit zeker?')) return;
        if (!confirm('LAATSTE WAARSCHUWING: Alle huidige metingen en instellingen worden permanent gewist.\n\nDruk op OK om door te gaan.')) return;
        this.app.ui.toonBericht('Database wordt geïnitialiseerd...', '');
        try {
            const res  = await this.app.api.call('/api/database/initialiseer', { method: 'POST' });
            const data = await res.json();
            if (res.ok) { alert('Nieuwe database aangemaakt. U wordt uitgelogd.'); window.location.reload(); }
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
