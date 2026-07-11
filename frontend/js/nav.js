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
        const begin = this._seizoenBeginIso();
        const eind = this._seizoenEindIso();
        if (!begin && !eind) return datumStr;
        if (begin && datumStr < begin) return begin;
        if (eind && datumStr > eind) return eind;
        return datumStr;
    }

    /** YYYYMMDD-integer → ISO datumstring. */
    _ymdNaarIso(v) {
        const s = String(Math.round(v)).padStart(8, '0');
        return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    }

    /** ISO-startdatum van het seizoen, of `''` als er geen is ingesteld. */
    _seizoenBeginIso() {
        const begin = this.app.state.actieveLimieten.seizoen_begin?.max;
        return begin ? this._ymdNaarIso(begin) : '';
    }

    /** ISO-einddatum van het seizoen, of `''` als er geen is ingesteld. */
    _seizoenEindIso() {
        const eind = this.app.state.actieveLimieten.seizoen_eind?.max;
        return eind ? this._ymdNaarIso(eind) : '';
    }

    /** Onderste toegestane ISO-datum van de kiezer (seizoensbegin). */
    _minDatumIso() {
        return this._seizoenBeginIso();
    }

    /** Bovenste toegestane ISO-datum van de kiezer: seizoenseinde, maar nooit later dan vandaag. */
    _maxDatumIso() {
        const vandaag = this._vandaagIso();
        const eind = this._seizoenEindIso();
        return eind && eind < vandaag ? eind : vandaag;
    }

    /** ISO datumstring van vandaag. */
    _vandaagIso() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    /**
     * Begrens een datumstring tot de seizoensgrenzen én niet verder dan vandaag —
     * datums in de toekomst hebben geen betekenis in de dagstaat.
     * @param {string} datumStr - ISO datumstring
     * @returns {string}
     */
    begrensDatum(datumStr) {
        const begrensd = this.begrensSeizoenDatum(datumStr);
        const vandaag = this._vandaagIso();
        return begrensd > vandaag ? vandaag : begrensd;
    }

    /**
     * Begrens de centraleDatum-kiezer tot de seizoenslimieten en vandaag:
     * zet `min`/`max` zodat de native kiezer datums buiten het seizoen (en in de
     * toekomst) uitgrijst, corrigeer een waarde die er toch buiten valt en
     * werk de navigatieknoppen bij.
     */
    pasSeizoenAan() {
        const input = document.getElementById('centraleDatum');
        if (!input) return;
        const min = this._minDatumIso();
        const max = this._maxDatumIso();
        if (min) input.min = min;
        else input.removeAttribute('min');
        input.max = max;
        if (input.value) {
            const begrensd = this.begrensDatum(input.value);
            if (begrensd !== input.value) input.value = begrensd;
        }
        this._actualiseerNavKnoppen();
    }

    /**
     * Grijs "Vorige Dag" uit op het seizoensbegin en "Volgende Dag" op vandaag/
     * seizoenseinde — er is dan geen dag om naartoe te navigeren.
     */
    _actualiseerNavKnoppen() {
        const input = document.getElementById('centraleDatum');
        const vorige = document.getElementById('nav-vorige-dag');
        const volgende = document.getElementById('nav-volgende-dag');
        const datum = input?.value;
        if (vorige) vorige.disabled = !datum || datum <= this._minDatumIso();
        if (volgende) volgende.disabled = !datum || datum >= this._maxDatumIso();
    }

    /**
     * Verschuif de geselecteerde datum met een aantal dagen.
     * @param {number} dagen - Positief of negatief dagenaantal.
     */
    veranderDatum(dagen) {
        this.app.ui.toonBericht('', '');
        const input = document.getElementById('centraleDatum');
        const datum = new Date(input.value);
        datum.setDate(datum.getDate() + dagen);
        let nieuw = `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, '0')}-${String(datum.getDate()).padStart(2, '0')}`;
        nieuw = this.begrensDatum(nieuw);
        input.value = nieuw;
        this._actualiseerNavKnoppen();
        // laadMetingen past na het (her)opbouwen van de tabel zelf de read-only
        // modus toe, dus die hoeft hier niet apart aangeroepen te worden.
        this.app.metingen.laadMetingen();
    }
}

// Node/Jest: exporteer de klasse zodat hij in jsdom-tests gebruikt kan worden.
// In de browser bestaat `module` niet en wordt dit genegeerd.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavModule;
}
