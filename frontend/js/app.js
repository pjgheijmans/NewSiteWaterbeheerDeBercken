/**
 * Application — service container en bootstrap.
 *
 * Maakt alle modules aan, injecteert `app` als gedeelde dependency,
 * en exposeert de minimale set globale functies die HTML onclick-handlers nodig hebben.
 */
class Application {
    constructor() {
        this.state = new AppState();
        this.api = new ApiClient(this);
        this.ui = new UIManager(this);
        this.nav = new NavModule(this);
        this.limieten = new LimietenModule(this);
        this.actieteksten = new ActieTekstenModule(this);
        this.dienst = new DienstModule(this);
        this.trend = new TrendModule(this);
        this.logboek = new LogboekModule(this);
        this.gebruikers = new GebruikersModule(this);
        this.rollen = new RollenModule(this);
        this.database = new DatabaseModule(this);
        this.configuratie = new ConfiguratieModule(this);
        this.verbruik = new VerbruikModule(this);
        this.metingen = new MetingenModule(this);
        this.taken = new TakenModule(this);
        this.opslaan = new OpslaanModule(this);
        this.auth = new AuthModule(this);
    }
}

// ── Opstarten ──────────────────────────────────────────────────────────────────

const app = new Application();
app.state.initDatumInput();
app.opslaan.wireAutoSave();
app.auth.start();

// Bij terugkeer naar het tabblad de waterbeheer-gegevens verversen, zodat
// wijzigingen van een andere gebruiker zichtbaar worden. Alleen als er geen
// onopgeslagen invoer in de wacht staat (geen lopende autosave-debounce), zodat
// we niemand z'n typewerk overschrijven.
window.addEventListener('focus', () => {
    if (
        app.state.ingelogdeGebruiker &&
        app.state.huidigeRol === 'waterbeheer' &&
        !app.state.autoSaveTimer
    ) {
        app.metingen.laadMetingen();
    }
});

// Versielabel in de kop vullen (faalt stil — het is puur informatief).
(async () => {
    try {
        const res = await app.api.call('/api/versie');
        const data = await res.json();
        const el = document.getElementById('app-versie');
        if (!el) return;
        el.textContent =
            data.commit && data.commit !== 'onbekend'
                ? `v${data.versie} (${data.commit})`
                : `v${data.versie}`;
    } catch {
        /* versie is niet kritiek; negeer fouten */
    }
})();

// ── Globale functies voor HTML onclick-handlers ────────────────────────────────
// Alle andere code gebruikt app.module.methode() direct.

window.verwerkLogin = () => app.auth.verwerkLogin();
window.verwerkLogout = () => app.auth.verwerkLogout();
window.toggleGebruikerMenu = () => app.auth.toggleGebruikerMenu();
window.wisselRol = (rol) => app.auth.wisselRol(rol);
window.actualiseerLeesmodus = () => app.auth.actualiseerLeesmodus();

window.veranderDatum = (dagen) => app.nav.veranderDatum(dagen);

window.wisselBadPagina = (pagina) => app.metingen.wisselBadPagina(pagina);
window.wisselSubtab = (subtab) => app.metingen.wisselSubtab(subtab);
window.wisselCoordSubtab = (subtab) => app.metingen.wisselCoordSubtab(subtab);
window.wisselPeuterbadSubtab = (subtab) => app.metingen.wisselPeuterbadSubtab(subtab);
window.toggleTaak = (sl, op) => app.taken.toggle(sl, op);
window.voegNieuwBlokToe = () => app.metingen.voegNieuwBlokToe();

window.wisselTrendTab = (subtab) => app.trend.wisselTrendTab(subtab);
window.laadTrendData = () => app.trend.laadTrendData();

window.laadStandaardLimieten = () => app.limieten.laadStandaardLimieten();
window.scheduleAutoSaveLimieten = () => app.limieten.scheduleAutoSaveLimieten();

window.laadStandaardActieTeksten = () => app.actieteksten.laadStandaardActieTeksten();

window.voegGebruikerToe = () => app.gebruikers.voegGebruikerToe();
window.verwijderGebruiker = (id) => app.gebruikers.verwijderGebruiker(id);

window.voegRolToe = () => app.rollen.voegRolToe();
window.verwijderRol = (id) => app.rollen.verwijderRol(id);

window.leegmakenTabel = (naam) => app.database.leegmakenTabel(naam);
window.verwijderDatabase = () => app.database.verwijderDatabase();
window.maakNieuweDatabase = () => app.database.maakNieuweDatabase();
window.exporteerTabel = (naam) => app.database.exporteerTabel(naam);
window.triggerImportBladeren = (naam) => app.database.triggerImportBladeren(naam);
window.verwerkCsvUpload = (el, naam) => app.database.verwerkCsvUpload(el, naam);

window.voegLogboekBlokToe = (c, api) => app.logboek.voegLogboekBlokToe(c, api);

window.scheduleAutoSave = () => app.opslaan.scheduleAutoSave();
window.scheduleAutoSaveBlok = (tijdstip) => app.opslaan.scheduleAutoSaveBlok(tijdstip);

window.valideerVeld = (el, param) => app.ui.valideerVeld(el, param);
