/**
 * Centrale applicatiestatus — één instantie gedeeld via de Application container.
 */
class AppState {
    constructor() {
        const vandaag = new Date();
        /** @type {string} ISO datumstring van de geselecteerde dag */
        this.centraleDatum = `${vandaag.getFullYear()}-${String(vandaag.getMonth() + 1).padStart(2, '0')}-${String(vandaag.getDate()).padStart(2, '0')}`;

        this.huidigeRol             = 'waterbeheer';
        this.huidigeBadPagina       = 'grote-baden';
        this.huidigeSubtab          = 'meetwaarden';
        this.huidigeCoordSubtab     = 'metingen';
        this.huidigePeuterbadSubtab = 'meetwaarden';
        this.huidigeTrendSubtab     = 'meetwaarden';

        /** @type {Object.<string,Chart>} Actieve Chart.js instanties per canvas-id */
        this.trendCharts = {};
        /** @type {Array} Gecachte metingendata van de laatste laadMetingen aanroep */
        this.gecachteData = [];
        /** @type {Object} Actieve limieten geladen van de server */
        this.actieveLimieten = {};
        /** @type {Object|null} Ingelogde gebruiker of null */
        this.ingelogdeGebruiker = null;

        // Timers — beheerd per module maar centraal opgeslagen
        this.berichtTimer               = null;
        this.autoSaveTimer              = null;
        this.blokTimers                 = {};
        this.checklistAutoSaveTimer     = null;
        this.daggegevensAutoSaveTimer   = null;
        this.limietenAutoSaveTimer      = null;
        this.actieTekstenAutoSaveTimer  = null;
        this.dienstAutoSaveTimer        = null;
        this.logboekTimers              = {};
        this.gebruikersSaveTimers       = {};
        this.rollenSaveTimers           = {};
        this.configuratieSaveTimers     = {};

        // Optimistische concurrency: per record (sleutel → {versie, auteur, bijgewerkt_op}).
        // Sleutels: 'meting:Diep' | 'meting:Ondiep' | 'meting:Peuterbad' | 'verbruik' | 'verwarming'.
        this.versies                    = {};
    }

    /** Schrijf de begindatum naar het datum-invoerveld in de pagina. */
    initDatumInput() {
        const el = document.getElementById('centraleDatum');
        if (el) el.value = this.centraleDatum;
    }
}
