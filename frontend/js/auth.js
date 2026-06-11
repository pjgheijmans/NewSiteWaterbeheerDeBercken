/**
 * Authenticatie, dashboard-activatie en rolwisseling.
 */
class AuthModule {
    /** @param {Application} app */
    constructor(app) {
        this.app = app;
    }

    /** Start de applicatie door de inlogstatus te controleren. */
    async start() {
        try {
            const res  = await this.app.api.call('/api/ingelogd');
            const data = await res.json();
            if (data.ingelogd) this._activeerDashboard(data.gebruiker);
            else {
                document.getElementById('scherm-login').style.display    = 'block';
                document.getElementById('scherm-dashboard').style.display = 'none';
            }
        } catch (f) { console.error('Starten mislukt', f); }
    }

    /** Verwerk het loginformulier en activeer het dashboard bij succes. */
    async verwerkLogin() {
        const u = document.getElementById('loginUsername').value;
        const p = document.getElementById('loginPassword').value;
        document.getElementById('login-fout').innerText = '';
        try {
            const res  = await this.app.api.call('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p }),
            });
            const data = await res.json();
            if (res.ok) this._activeerDashboard(data.gebruiker);
            else document.getElementById('login-fout').innerText = data.error;
        } catch { document.getElementById('login-fout').innerText = 'Verbindingsfout.'; }
    }

    /** Log de huidige gebruiker uit en herstart de applicatie. */
    async verwerkLogout() {
        this._zetGebruikerMenu(false);
        await this.app.api.call('/api/logout', { method: 'POST' });
        this.app.state.ingelogdeGebruiker = null;
        await this.start();
    }

    /**
     * @param {Object} gebruiker
     * @private
     */
    _activeerDashboard(gebruiker) {
        this.app.state.ingelogdeGebruiker = gebruiker;
        document.getElementById('scherm-login').style.display    = 'none';
        document.getElementById('scherm-dashboard').style.display = 'block';
        const rolAfk = { waterbeheerder: 'WB', coordinator: 'CO', Administrator: 'AD' }[gebruiker.taak] || gebruiker.taak;
        document.getElementById('welkom-tekst').innerText = `${gebruiker.weergavenaam || gebruiker.voornaam} (${rolAfk})`;

        const knoppen = {
            waterbeheer:   false,
            coordinatoren: false,
            limieten:      false,
            actieteksten:  false,
            gebruikers:    false,
            database:      false,
            trendanalyse:  false,
        };

        let beginRol = 'waterbeheer';
        if (gebruiker.taak === 'waterbeheerder') {
            Object.keys(knoppen).forEach(k => { knoppen[k] = true; });
            knoppen.limieten     = false; // limieten beheren is voorbehouden aan Administrator
            knoppen.actieteksten = false; // actie-teksten beheren idem
            beginRol = 'waterbeheer';
        } else if (gebruiker.taak === 'Administrator') {
            knoppen.limieten     = true;
            knoppen.actieteksten = true;
            knoppen.gebruikers   = true;
            knoppen.database     = true;
            knoppen.trendanalyse = false; // trendanalyse is voorbehouden aan waterbeheerder
            beginRol = 'limieten';
        } else {
            knoppen.coordinatoren = true;
            beginRol = 'coordinatoren';
        }

        Object.entries(knoppen).forEach(([k, zichtbaar]) => {
            const btn = document.getElementById(`btn-rol-${k}`);
            if (btn) btn.style.display = zichtbaar ? 'inline-block' : 'none';
        });

        this.wisselRol(beginRol);
    }

    /**
     * Wissel naar een andere applicatierol en laad de bijbehorende sectie.
     * @param {string} rol
     */
    wisselRol(rol) {
        this.app.state.huidigeRol = rol;
        ['waterbeheer', 'coordinatoren', 'limieten', 'actieteksten', 'gebruikers', 'database', 'trendanalyse'].forEach(r => {
            const btn = document.getElementById(`btn-rol-${r}`);
            if (btn) btn.classList.toggle('actief', r === rol);
        });

        const isDagstaat = (rol === 'waterbeheer' || rol === 'coordinatoren');
        document.getElementById('sectie-dagstaat').style.display      = isDagstaat          ? 'block' : 'none';
        document.getElementById('sectie-limieten').style.display       = (rol === 'limieten')       ? 'block' : 'none';
        document.getElementById('sectie-actieteksten').style.display   = (rol === 'actieteksten')   ? 'block' : 'none';
        document.getElementById('sectie-gebruikers').style.display     = (rol === 'gebruikers')     ? 'block' : 'none';
        document.getElementById('sectie-database').style.display       = (rol === 'database')       ? 'block' : 'none';
        document.getElementById('sectie-trendanalyse').style.display   = (rol === 'trendanalyse')   ? 'block' : 'none';
        document.getElementById('waterbeheer-tabs').style.display      = (rol === 'waterbeheer')    ? 'flex'  : 'none';
        document.getElementById('waterbeheer-dienst-bar').style.display = (rol === 'waterbeheer')   ? 'block' : 'none';

        if (rol === 'waterbeheer') {
            ['coordinatoren-subtab-nav', 'coordinatoren-blokken-content',
             'coordinatoren-checklist-content', 'coordinatoren-daggegevens-content',
             'coordinatoren-logboek-content'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }

        if (isDagstaat) {
            this.app.limieten.laadLimietenVanServer().then(() => {
                if (rol === 'waterbeheer')
                    this.app.metingen.wisselBadPagina(this.app.state.huidigeBadPagina);
                else
                    this.app.metingen.laadMetingen();
            });
        } else if (rol === 'gebruikers') {
            this.app.gebruikers.laadGebruikers();
        } else if (rol === 'limieten') {
            this.app.limieten.laadLimietenVanServer();
        } else if (rol === 'actieteksten') {
            this.app.actieteksten.laadVanServer();
        } else if (rol === 'trendanalyse') {
            this.app.trend.initTrendDatums();
        }
    }

    // ── Gebruikersmenu (naam → submenu) ──────────────────────────────────────

    /** Klap het gebruikersmenu onder de naam open/dicht. */
    toggleGebruikerMenu() {
        const dd = document.getElementById('gebruiker-dropdown');
        if (!dd) return;
        const open = dd.style.display !== 'none' && dd.style.display !== '';
        this._zetGebruikerMenu(!open);
    }

    /** Toon of verberg het gebruikersmenu en sluit het bij een klik erbuiten. */
    _zetGebruikerMenu(open) {
        const dd      = document.getElementById('gebruiker-dropdown');
        const trigger = document.querySelector('.gebruiker-trigger');
        if (!dd) return;
        dd.style.display = open ? 'block' : 'none';
        if (trigger) trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open && !this._sluitGebruikerMenu) {
            this._sluitGebruikerMenu = (e) => {
                if (!e.target.closest('#gebruiker-menu')) this._zetGebruikerMenu(false);
            };
            document.addEventListener('click', this._sluitGebruikerMenu);
        } else if (!open && this._sluitGebruikerMenu) {
            document.removeEventListener('click', this._sluitGebruikerMenu);
            this._sluitGebruikerMenu = null;
        }
    }
}
