/**
 * Application — service container en bootstrap.
 *
 * Maakt alle modules aan, injecteert `app` als gedeelde dependency,
 * en exposeert de minimale set globale functies die HTML onclick-handlers nodig hebben.
 */
class Application {
    constructor() {
        this.state      = new AppState();
        this.api        = new ApiClient();
        this.ui         = new UIManager(this);
        this.nav        = new NavModule(this);
        this.limieten   = new LimietenModule(this);
        this.actieteksten = new ActieTekstenModule(this);
        this.dienst     = new DienstModule(this);
        this.trend      = new TrendModule(this);
        this.logboek    = new LogboekModule(this);
        this.gebruikers = new GebruikersModule(this);
        this.database   = new DatabaseModule(this);
        this.verbruik   = new VerbruikModule(this);
        this.metingen   = new MetingenModule(this);
        this.taken      = new TakenModule(this);
        this.opslaan    = new OpslaanModule(this);
        this.auth       = new AuthModule(this);
    }
}

// ── Opstarten ──────────────────────────────────────────────────────────────────

const app = new Application();
app.state.initDatumInput();
app.opslaan.wireAutoSave();
app.auth.start();

// ── Globale functies voor HTML onclick-handlers ────────────────────────────────
// Alle andere code gebruikt app.module.methode() direct.

window.verwerkLogin             = ()           => app.auth.verwerkLogin();
window.verwerkLogout            = ()           => app.auth.verwerkLogout();
window.toggleGebruikerMenu      = ()           => app.auth.toggleGebruikerMenu();
window.wisselRol                = (rol)        => app.auth.wisselRol(rol);

window.veranderDatum            = (dagen)      => app.nav.veranderDatum(dagen);

window.wisselBadPagina          = (pagina)     => app.metingen.wisselBadPagina(pagina);
window.wisselSubtab             = (subtab)     => app.metingen.wisselSubtab(subtab);
window.wisselCoordSubtab        = (subtab)     => app.metingen.wisselCoordSubtab(subtab);
window.wisselPeuterbadSubtab    = (subtab)     => app.metingen.wisselPeuterbadSubtab(subtab);
window.toggleTaak               = (sl, op)     => app.taken.toggle(sl, op);
window.voegNieuwBlokToe         = ()           => app.metingen.voegNieuwBlokToe();

window.wisselTrendTab           = (subtab)     => app.trend.wisselTrendTab(subtab);
window.laadTrendData            = ()           => app.trend.laadTrendData();

window.laadStandaardLimieten    = ()           => app.limieten.laadStandaardLimieten();
window.scheduleAutoSaveLimieten = ()           => app.limieten.scheduleAutoSaveLimieten();

window.laadStandaardActieTeksten = ()          => app.actieteksten.laadStandaardActieTeksten();

window.toggleDienst             = ()           => app.dienst.toggleBewerk();

window.voegGebruikerToe         = ()           => app.gebruikers.voegGebruikerToe();
window.verwijderGebruiker       = (id)         => app.gebruikers.verwijderGebruiker(id);

window.leegmakenTabel           = (naam)       => app.database.leegmakenTabel(naam);
window.verwijderDatabase        = ()           => app.database.verwijderDatabase();
window.maakNieuweDatabase       = ()           => app.database.maakNieuweDatabase();
window.exporteerTabel           = (naam)       => app.database.exporteerTabel(naam);
window.triggerImportBladeren    = (naam)       => app.database.triggerImportBladeren(naam);
window.verwerkCsvUpload         = (el, naam)   => app.database.verwerkCsvUpload(el, naam);

window.voegLogboekBlokToe       = (c, api)     => app.logboek.voegLogboekBlokToe(c, api);

window.scheduleAutoSave         = ()           => app.opslaan.scheduleAutoSave();
window.scheduleAutoSaveBlok     = (tijdstip)   => app.opslaan.scheduleAutoSaveBlok(tijdstip);

window.valideerVeld             = (el, param)  => app.ui.valideerVeld(el, param);
