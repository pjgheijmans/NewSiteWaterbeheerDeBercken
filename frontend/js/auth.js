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
            const res = await this.app.api.call('/api/ingelogd');
            const data = await res.json();
            if (data.ingelogd) this._activeerDashboard(data.gebruiker);
            else {
                document.getElementById('scherm-login').style.display = 'block';
                document.getElementById('scherm-dashboard').style.display = 'none';
            }
        } catch (f) {
            console.error('Starten mislukt', f);
        }
    }

    /** Verwerk het loginformulier en activeer het dashboard bij succes. */
    async verwerkLogin() {
        const u = document.getElementById('loginUsername').value;
        const p = document.getElementById('loginPassword').value;
        document.getElementById('login-fout').innerText = '';
        try {
            const res = await this.app.api.call('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p }),
            });
            const data = await res.json();
            if (res.ok) this._activeerDashboard(data.gebruiker);
            else document.getElementById('login-fout').innerText = data.error;
        } catch {
            document.getElementById('login-fout').innerText = 'Verbindingsfout.';
        }
    }

    /** Log de huidige gebruiker uit en herstart de applicatie. */
    async verwerkLogout() {
        this._zetGebruikerMenu(false);
        await this.app.api.call('/api/logout', { method: 'POST' });
        this.app.state.ingelogdeGebruiker = null;
        await this.start();
    }

    /**
     * De server gaf 401 (sessie verlopen door de idle-time-out): keer terug naar
     * het loginscherm met een blijvende uitleg in de login-foutregel (geen
     * vluchtige toast — die mis je als de time-out tijdens afwezigheid afgaat).
     * Guard tegen herhaald vuren bij meerdere parallelle 401's.
     */
    sessieVerlopen() {
        if (!this.app.state.ingelogdeGebruiker) return; // al uitgelogd
        this._zetGebruikerMenu(false);
        this.app.state.ingelogdeGebruiker = null;
        document.getElementById('scherm-login').style.display = 'block';
        document.getElementById('scherm-dashboard').style.display = 'none';
        const fout = document.getElementById('login-fout');
        if (fout)
            fout.innerText =
                'Uw sessie is verlopen door inactiviteit. Log opnieuw in om verder te gaan.';
    }

    /** Rangorde van rechtniveaus, voor vergelijkingen. */
    static get RANG() {
        return { geen: 0, lezen: 1, schrijven: 2 };
    }

    /** Het domein dat bij een nav-rol hoort. */
    static get DOMEIN_VAN_ROL() {
        return {
            waterbeheer: 'waterbeheer',
            coordinatoren: 'coordinator',
            trendanalyse: 'waterbeheer',
            limieten: 'beheer',
            actieteksten: 'beheer',
            gebruikers: 'beheer',
            rollen: 'beheer',
            database: 'beheer',
            configuratie: 'beheer',
        };
    }

    /** Alle nav-rollen in vaste volgorde (= keuzevolgorde voor de startsectie). */
    static get ROLLEN() {
        return [
            'waterbeheer',
            'coordinatoren',
            'limieten',
            'actieteksten',
            'gebruikers',
            'rollen',
            'database',
            'configuratie',
            'trendanalyse',
        ];
    }

    /** Heeft de ingelogde gebruiker minstens `niveau` in `domein`? */
    _heeftRecht(domein, niveau) {
        const g = this.app.state.ingelogdeGebruiker;
        const huidig = (g && g.rechten && g.rechten[domein]) || 'geen';
        return AuthModule.RANG[huidig] >= AuthModule.RANG[niveau];
    }

    /**
     * @param {Object} gebruiker
     * @private
     */
    _activeerDashboard(gebruiker) {
        this.app.state.ingelogdeGebruiker = gebruiker;
        document.getElementById('scherm-login').style.display = 'none';
        document.getElementById('scherm-dashboard').style.display = 'block';
        const rollen =
            gebruiker.rolNamen && gebruiker.rolNamen.length
                ? gebruiker.rolNamen.join(', ')
                : gebruiker.taak || '';
        document.getElementById('welkom-tekst').innerText =
            `${gebruiker.weergavenaam || gebruiker.voornaam}${rollen ? ` (${rollen})` : ''}`;

        // Een nav-knop is zichtbaar zodra de gebruiker minstens 'lezen' heeft in het
        // bijbehorende domein. De startsectie is de eerste zichtbare knop.
        let beginRol = null;
        AuthModule.ROLLEN.forEach((rol) => {
            const zichtbaar = this._heeftRecht(AuthModule.DOMEIN_VAN_ROL[rol], 'lezen');
            const btn = document.getElementById(`btn-rol-${rol}`);
            if (btn) btn.style.display = zichtbaar ? 'inline-block' : 'none';
            if (zichtbaar && !beginRol) beginRol = rol;
        });

        this.wisselRol(beginRol || 'waterbeheer');
    }

    /**
     * Wissel naar een andere applicatierol en laad de bijbehorende sectie.
     * @param {string} rol
     */
    wisselRol(rol) {
        this.app.state.huidigeRol = rol;
        AuthModule.ROLLEN.forEach((r) => {
            const btn = document.getElementById(`btn-rol-${r}`);
            if (btn) btn.classList.toggle('actief', r === rol);
        });

        const isDagstaat = rol === 'waterbeheer' || rol === 'coordinatoren';
        document.getElementById('sectie-dagstaat').style.display = isDagstaat ? 'block' : 'none';
        document.getElementById('sectie-limieten').style.display =
            rol === 'limieten' ? 'block' : 'none';
        document.getElementById('sectie-actieteksten').style.display =
            rol === 'actieteksten' ? 'block' : 'none';
        document.getElementById('sectie-gebruikers').style.display =
            rol === 'gebruikers' ? 'block' : 'none';
        document.getElementById('sectie-rollen').style.display =
            rol === 'rollen' ? 'block' : 'none';
        document.getElementById('sectie-database').style.display =
            rol === 'database' ? 'block' : 'none';
        document.getElementById('sectie-configuratie').style.display =
            rol === 'configuratie' ? 'block' : 'none';
        document.getElementById('sectie-trendanalyse').style.display =
            rol === 'trendanalyse' ? 'block' : 'none';
        document.getElementById('waterbeheer-tabs').style.display =
            rol === 'waterbeheer' ? 'flex' : 'none';
        document.getElementById('waterbeheer-dienst-bar').style.display =
            rol === 'waterbeheer' ? 'block' : 'none';

        if (rol === 'waterbeheer') {
            [
                'coordinatoren-subtab-nav',
                'coordinatoren-blokken-content',
                'coordinatoren-checklist-content',
                'coordinatoren-daggegevens-content',
                'coordinatoren-logboek-content',
            ].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            });
        }

        if (isDagstaat) {
            this.app.limieten.laadLimietenVanServer().then(() => {
                if (rol === 'waterbeheer')
                    this.app.metingen.wisselBadPagina(this.app.state.huidigeBadPagina);
                else this.app.metingen.laadMetingen();
                this.actualiseerLeesmodus();
            });
        } else if (rol === 'gebruikers') {
            this.app.gebruikers.laadGebruikers();
        } else if (rol === 'rollen') {
            this.app.rollen.laad();
        } else if (rol === 'configuratie') {
            this.app.configuratie.laad();
        } else if (rol === 'limieten') {
            this.app.limieten.laadLimietenVanServer();
        } else if (rol === 'actieteksten') {
            this.app.actieteksten.laadVanServer();
        } else if (rol === 'trendanalyse') {
            this.app.trend.initTrendDatums();
        }

        this.actualiseerLeesmodus();
    }

    // ── Alleen-lezen modus ──────────────────────────────────────────────────

    /** Huidige kalenderdag (Europe/Amsterdam) als YYYY-MM-DD. */
    _vandaag() {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'Europe/Amsterdam',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        }).format(new Date());
    }

    /** Mag in de huidige rol (en bij dagstaten: de gekozen datum) geschreven worden? */
    magNuOpslaan() {
        const rol = this.app.state.huidigeRol;
        const domein = AuthModule.DOMEIN_VAN_ROL[rol];
        if (!domein || !this._heeftRecht(domein, 'schrijven')) return false;
        if (rol === 'waterbeheer' || rol === 'coordinatoren') {
            const datum = document.getElementById('centraleDatum')?.value;
            const g = this.app.state.ingelogdeGebruiker;
            if (datum && datum < this._vandaag() && !(g && g.magHistorie)) return false;
        }
        return true;
    }

    /** Markeer de actieve sectie als alleen-lezen wanneer opslaan niet mag. */
    actualiseerLeesmodus() {
        const rol = this.app.state.huidigeRol;
        const sectieId =
            rol === 'waterbeheer' || rol === 'coordinatoren' ? 'sectie-dagstaat' : `sectie-${rol}`;
        document
            .querySelectorAll('.alleen-lezen')
            .forEach((el) => el.classList.remove('alleen-lezen'));
        // Herstel altijd eerst de velden die wij eerder op alleen-lezen zetten (bv.
        // bij een tabwissel of nadat de gekozen datum weer op vandaag staat).
        this._herstelLeesmodusVelden();
        const leesmodus = !this.magNuOpslaan();
        const sectie = document.getElementById(sectieId);
        if (sectie) {
            sectie.classList.toggle('alleen-lezen', leesmodus);
            if (leesmodus) this._zetVeldenReadonly(sectie);
        }
    }

    /**
     * @private Maak de bewerkbare velden in een sectie onbewerkbaar. Tekstachtige
     * velden krijgen `readonly` (blijven focus-/selecteerbaar om waarden te kopiëren);
     * `select`/checkbox/radio honoreren `readonly` niet, dus die gaan op `disabled`.
     * Velden die van zichzelf al op slot staan (bv. berekende cellen) laten we met
     * rust, en we onthouden per veld wat we aanpasten zodat _herstelLeesmodusVelden
     * precies dat terugdraait.
     */
    _zetVeldenReadonly(sectie) {
        sectie.querySelectorAll('input, select, textarea').forEach((veld) => {
            const viaDisabled =
                veld.tagName === 'SELECT' || veld.type === 'checkbox' || veld.type === 'radio';
            if (viaDisabled) {
                if (veld.disabled) return;
                veld.disabled = true;
                veld.setAttribute('data-leesmodus-disabled', '');
            } else {
                if (veld.readOnly) return;
                veld.readOnly = true;
                veld.setAttribute('data-leesmodus-readonly', '');
                // Leeg veld: toon een em-dash zodat een lege cel niet als 'gat' oogt.
                // Alleen als het veld nog geen eigen placeholder heeft.
                if (veld.value === '' && !veld.placeholder) {
                    veld.placeholder = '—';
                    veld.setAttribute('data-leesmodus-placeholder', '');
                }
            }
        });
    }

    /** @private Draai de door _zetVeldenReadonly aangepaste velden weer terug. */
    _herstelLeesmodusVelden() {
        document.querySelectorAll('[data-leesmodus-readonly]').forEach((veld) => {
            veld.readOnly = false;
            veld.removeAttribute('data-leesmodus-readonly');
        });
        document.querySelectorAll('[data-leesmodus-disabled]').forEach((veld) => {
            veld.disabled = false;
            veld.removeAttribute('data-leesmodus-disabled');
        });
        document.querySelectorAll('[data-leesmodus-placeholder]').forEach((veld) => {
            veld.removeAttribute('placeholder');
            veld.removeAttribute('data-leesmodus-placeholder');
        });
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
        const dd = document.getElementById('gebruiker-dropdown');
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

// Node/Jest: maak de klasse importeerbaar. In de browser bestaat `module` niet.
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AuthModule;
}
