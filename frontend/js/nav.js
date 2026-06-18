/**
 * Datumnavigatie en seizoensgrenzen.
 */
class NavModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    /**
     * Begrens een datumstring tot de geconfigureerde seizoensgrenzen.
     * @param {string} datumStr - ISO datumstring
     * @returns {string}
     */
    begrensSeizoenDatum(datumStr) {
        const limieten = this.app.state.actieveLimieten;
        const begin    = limieten.seizoen_begin?.max;
        const eind     = limieten.seizoen_eind?.max;
        if (!begin && !eind) return datumStr;
        const toIso = v => {
            const s = String(Math.round(v)).padStart(8, '0');
            return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
        };
        if (begin && datumStr < toIso(begin)) return toIso(begin);
        if (eind  && datumStr > toIso(eind))  return toIso(eind);
        return datumStr;
    }

    /** Begrensd de centraleDatum input tot de seizoenslimieten. */
    pasSeizoenAan() {
        const input = document.getElementById('centraleDatum');
        if (!input || !input.value) return;
        const begrensd = this.begrensSeizoenDatum(input.value);
        if (begrensd !== input.value) input.value = begrensd;
    }

    /**
     * Verschuif de geselecteerde datum met een aantal dagen.
     * @param {number} dagen - Positief of negatief dagenaantal.
     */
    veranderDatum(dagen) {
        this.app.ui.toonBericht('', '');
        const input      = document.getElementById('centraleDatum');
        const datum      = new Date(input.value);
        datum.setDate(datum.getDate() + dagen);
        let nieuw = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`;
        nieuw     = this.begrensSeizoenDatum(nieuw);
        input.value = nieuw;
        this.app.metingen.laadMetingen();
        this.app.auth.actualiseerLeesmodus();
    }
}
