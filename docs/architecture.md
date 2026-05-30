# Architectuur — Digitale Dagstaat Zwembad

---

## 1. Systeemoverzicht

```mermaid
graph TB
    subgraph Docker["Docker Stack"]
        subgraph Web["Container: zwembad_web (Node.js 18)"]
            Express["Express Server\nserver.js\n• wacht op DB (retry)\n• voert init.sql uit\n• start op port 3000"]
        end
        subgraph DB["Container: zwembad_db (MySQL 8)"]
            MySQL[(MySQL\nzwembad_status)]
        end
        Web -->|"mysql2 pool"| DB
    end

    Browser["Browser\n(Waterbeheerder / Coördinator / Administrator)"]
    Browser -->|"GET / — HTML + JS + CSS"| Web
    Browser -->|"GET/POST /api/*"| Web
```

---

## 2. Backend — routes en endpoints

```mermaid
graph LR
    subgraph auth["auth.js  →  /api"]
        A1["POST /api/login"]
        A2["POST /api/logout"]
        A3["GET  /api/ingelogd"]
    end

    subgraph met["metingen.js  →  /api"]
        M1["GET  /api/metingen"]
        M2["POST /api/metingen"]
        M3["GET  /api/acties"]
        M4["POST /api/acties/:id/resolve"]
        M5["POST /api/acties/:id/unresolve"]
        M6["GET  /api/bezoekers"]
    end

    subgraph coord["coordinatoren.js  →  /api/coordinatoren"]
        C1["GET  / POST /"]
        C2["DELETE /"]
        C3["GET  / POST /checklist"]
        C4["GET  / POST /daggegevens"]
        C5["GET  / POST /logboek"]
        C6["DELETE /logboek/:id"]
    end

    subgraph verb["verbruik.js  →  /api/verbruik"]
        V1["GET  /diep-ondiep"]
        V2["POST /diep-ondiep"]
        V3["GET  /diep-ondiep/vorige"]
        V4["GET  /verwarmingssysteem"]
        V5["POST /verwarmingssysteem"]
    end

    subgraph lim["limieten.js  →  /api/limieten"]
        L1["GET  /"]
        L2["POST /"]
        L3["GET  /defaults"]
    end

    subgraph log["logboek.js  →  /api/logboek"]
        LG1["GET  /"]
        LG2["POST /"]
        LG3["DELETE /:id"]
    end

    subgraph gebr["gebruikers.js  →  /api/gebruikers"]
        G1["GET  /"]
        G2["POST /"]
        G3["PUT  /:id"]
        G4["DELETE /:id"]
    end

    subgraph db["database.js  →  /api/database"]
        D1["POST /truncate/:tabelnaam"]
        D2["POST /verwijder-alles"]
        D3["POST /initialiseer"]
        D4["GET  /export/:tabelnaam"]
        D5["POST /import/:tabelnaam"]
    end

    subgraph trend["trend.js  →  /api/trend"]
        TR1["GET /metingen"]
        TR2["GET /verbruik"]
    end

    subgraph front["frontend.js  →  /"]
        F1["GET / — HTML partials samenvoegen"]
    end
```

---

## 3. Backend — repositories en database

```mermaid
graph LR
    subgraph Routes
        R["Routes\n(zie hoofdstuk 2)"]
    end

    subgraph Repos["Repositories (backend/repositories/)"]
        Re_pool[("db.js\nmysql2 pool")]
        Re_act["acties.js\ngenereer / resolve\nunresolve / getActies\ngenereerBezoekers\ngenereerSpoelbeurt\ngenereerVerbruik"]
        Re_coord["coordinatoren.js\ngetCoordinatoren\nsaveMeting / deleteBlok\ngetChecklist / saveChecklist\ngetDaggegevens / saveDaggegevens"]
        Re_clog["coordinatoren_logboek.js\ngetByDatum / save\ndeleteById"]
        Re_verb["verbruik.js\ngetVerbruik / saveVerbruik\ngetVorigeVerbruik\ngetVerwarming / saveVerwarming"]
        Re_lim["limieten.js\ngetAll / getDefaults\nseedDefaults / save"]
        Re_log["logboek.js\ngetByDatum / save\ndeleteById"]
        Re_met["metingen.js\ngetMetingen\nsaveGrootBadMeting\nsavePeuterbadMeting\ngetBadId"]
        Re_gebr["gebruikers.js\ngetAll / create\nupdate / delete\nseedDefaults"]
        Re_dbutil["database.js\nexportRows / truncate\ntruncateAll / importRow\nrunInitSql / seedAllDefaults"]
        Re_trend["trend.js\ngetMetingenTrend\ngetVerbruikTrend"]
    end

    subgraph DB["MySQL — tabellen"]
        T1["metingen_diep_ondiep\nmetingen_peuterbad\nmetingen_coordinatoren"]
        T2["coordinatoren_checklist\ncoordinatoren_daggegevens\ncoordinatoren_logboek"]
        T3["verbruik_diep_ondiep\nverwarmings_systeem_diep_ondiep"]
        T4["acties"]
        T5["limieten"]
        T6["logboek\ngebruikers\nbaden"]
    end

    R --> Re_act & Re_coord & Re_clog & Re_verb & Re_lim & Re_log & Re_met & Re_gebr & Re_dbutil & Re_trend
    Re_act & Re_coord & Re_clog & Re_verb & Re_lim & Re_log & Re_met & Re_gebr & Re_dbutil & Re_trend --> Re_pool
    Re_pool --> T1 & T2 & T3 & T4 & T5 & T6
```

---

## 4. Frontend — modules

```mermaid
graph TB
    subgraph Bootstrap["Bootstrap (laden bij start)"]
        state["state.js\ndatum = vandaag\nhuidigeRol / huidigeBadPagina\nactieveLimieten = {}"]
        app["app.js\nstartApplicatie()\nglobale input/change listener\n→ scheduleAutoSave"]
    end

    subgraph Auth["Authenticatie"]
        auth["auth.js\nverwerkLogin()\nverwerkLogout()\nactiveerDashboard()\nwisselRol()"]
    end

    subgraph Nav["Navigatie"]
        nav["nav.js\nveranderDatum()\nbegrensSeizoenDatum()\npasSeizoenAan()"]
    end

    subgraph Data["Dagstaat data"]
        metingen["metingen.js\nwisselBadPagina()\nwisselSubtab()\nlaadMetingen()\nlaadActies()\nlaadBezoekers()\nbouwTabelOp()\nlosActieGroepOp()"]
        verbruik["verbruik.js\nlaadWaterbeheerVelden()\nlaadEnBerekenVerbruik()\nslaAlgemeenGegevensOp()"]
        logboek["logboek.js\nlaadLogboek()\nmaakLogboekBlok()\nvoegLogboekBlokToe()\nscheduleAutoSaveLogboek()"]
    end

    subgraph Save["Opslaan"]
        opslaan["opslaan.js\nscheduleAutoSave() debounce 1.2s\nverwerkCentraleOpslaan()\nslaCoordinatorenBlokOp()\nscheduleAutoSaveBlok()\nscheduleAutoSaveChecklist()\nscheduleAutoSaveDaggegevens()"]
    end

    subgraph Config["Beheer"]
        limieten["limieten.js\nlaadLimietenVanServer()\nbouwLimietenBeheerTabel()\nscheduleAutoSaveLimieten()\nverwerkCentraleLimietenOpslaan()"]
        gebruikers["gebruikers.js\nautosave"]
        database["database.js\nCSV export/import\ntruncate / initialiseer"]
        trend["trend.js\nChart.js grafieken"]
    end

    subgraph Infra["Infrastructuur"]
        api["api.js\napiCall() — fetch + foutafhandeling"]
        ui["ui.js\nvalideerVeld() — limiet + precisie\ntoonBericht()"]
    end

    state --> metingen & verbruik & logboek & limieten & opslaan
    app --> auth
    auth --> metingen & nav & limieten
    api --> metingen & verbruik & logboek & limieten & gebruikers & database & trend & opslaan
    ui --> metingen & verbruik & limieten
    opslaan --> metingen & verbruik
    nav --> metingen
    limieten --> nav
```

---

## 5. Rollen en toegang

```mermaid
graph LR
    subgraph Rollen
        WB["Waterbeheerder"]
        CO["Coördinator"]
        AD["Administrator"]
    end

    subgraph WB_Tab["Dagstaat — Waterbeheer"]
        WB1["Diep/Ondiep\n• Meetwaarden\n• Verbruik\n• Verwarmingssysteem\n• Bezoekers"]
        WB2["Peuterbad\n• Meetwaarden\n• Verbruik"]
        WB3["Logboek"]
        WB4["Acties"]
    end

    subgraph CO_Tab["Dagstaat — Coördinatoren"]
        CO1["Metingen\n(meerdere blokken/dag)"]
        CO2["Checklijst"]
        CO3["Temperatuur & Bezoekers"]
        CO4["Logboek"]
    end

    subgraph AD_Tab["Beheerschermen"]
        AD1["Limieten\n(richtwaarden + actiedrempels\n+ seizoendatums)"]
        AD2["Gebruikersbeheer"]
        AD3["Database Beheer\n(export/import/truncate)"]
        AD4["Trendanalyse\n(Chart.js)"]
    end

    WB --> WB1 & WB2 & WB3 & WB4
    CO --> CO1 & CO2 & CO3 & CO4
    AD --> AD1 & AD2 & AD3 & AD4
```

---

## 6. Sequencediagram — Applicatie opstarten

```mermaid
sequenceDiagram
    participant B as Browser
    participant FE as frontend.js
    participant Auth as /api
    participant Lim as /api/limieten
    participant Met as /api/metingen
    participant Actie as /api/acties
    participant DB as MySQL

    B->>FE: GET /
    FE->>FE: samenvoegen HTML partials\n(head + nav + login + dagstaat + ... + footer)
    FE-->>B: volledige HTML-pagina
    B->>FE: GET /css/style.css
    B->>FE: GET /js/*.js  (alle modules)
    FE-->>B: statische bestanden

    Note over B: state.js: datum = vandaag
    Note over B: app.js: startApplicatie()

    B->>Auth: GET /api/ingelogd
    Auth->>DB: check req.session.gebruiker
    alt Sessie verlopen / niet ingelogd
        Auth-->>B: { ingelogd: false }
        Note over B: loginscherm tonen
        B->>B: verwerkLogin()
        B->>Auth: POST /api/login { username, password }
        Auth->>DB: SELECT gebruiker WHERE inlognaam = ?
        DB-->>Auth: gebruiker record
        Auth->>Auth: sla op in req.session
        Auth-->>B: { gebruiker: { voornaam, taak } }
    else Al ingelogd
        Auth-->>B: { ingelogd: true, gebruiker: { voornaam, taak } }
    end

    Note over B: activeerDashboard(gebruiker)\nwisselRol(taak)

    B->>Lim: GET /api/limieten
    Lim->>DB: SELECT * FROM limieten
    DB-->>Lim: alle richtwaarden + drempelwaarden + seizoendatums
    Lim-->>B: actieveLimieten object
    Note over B: pasSeizoenAan() — datum begrenzen op seizoen\nbouwLimietenBeheerTabel() (alleen voor Administrator)

    Note over B: wisselBadPagina('grote-baden')\nlaadMetingen()

    B->>Met: GET /api/metingen?datum=vandaag
    Met->>DB: getMetingen(datum)
    DB-->>Met: meetwaarden Diep + Ondiep
    Met-->>B: [ { bad_naam, ph, chloor, ... } ]

    Note over B: bouwTabelOp(data)

    par fire-and-forget parallel
        B->>B: laadBezoekers() → GET /api/bezoekers
        and
        B->>Actie: GET /api/acties?datum=vandaag
        Actie->>DB: getActies(datum)
        DB-->>Actie: open + gesloten acties
        Actie-->>B: acties array
        Note over B: updateSubtabBadges()\nveldIndicatoren bijwerken\nActies-tab vullen
    end

    B->>Met: GET /api/verbruik/diep-ondiep?datum=vandaag
    B->>Met: GET /api/verbruik/diep-ondiep/vorige?datum=vandaag
    Note over B: laadEnBerekenVerbruik()\nVerbruik kolom = huidig − vorige
```

---

## 7. Sequencediagram — Acties aanmaken en oplossen

```mermaid
sequenceDiagram
    participant WB as Waterbeheerder
    participant CO as Coördinator
    participant FE as Frontend
    participant BE as Backend
    participant DB as MySQL

    Note over CO,BE: Trigger via bezoekersaantal
    CO->>FE: Bezoekers invullen (coord. daggegevens)
    FE->>BE: POST /api/coordinatoren/daggegevens
    BE->>DB: saveDaggegevens()
    BE-->>BE: genereerBezoekers() fire-and-forget\n→ INSERT/DELETE filter_spoelen_bezoekers
    BE-->>BE: genereerSpoelbeurt() fire-and-forget\n→ som dagelijks sinds laatste cleaning\n→ INSERT/DELETE filter_spoelen_spoelbeurt

    Note over WB,BE: Trigger via meetwaarden
    WB->>FE: Meetwaarden invullen (Diep/Ondiep/Peuterbad)
    FE->>BE: POST /api/metingen
    BE->>DB: saveGrootBadMeting() / savePeuterbadMeting()
    BE-->>BE: genereer()\n→ filter_spoelen_druk (druk verschil)\n→ filter_spoelen_flow (flow te laag)
    BE->>DB: INSERT INTO acties ON DUPLICATE KEY UPDATE beschrijving

    Note over WB,BE: Trigger via verbruik
    WB->>FE: Chemicaliën / floculant invullen
    FE->>BE: POST /api/verbruik/diep-ondiep
    BE-->>BE: genereerVerbruik()\n→ chloor_bestellen\n→ zwavelzuur_bestellen\n→ floculant_bijvullen
    BE->>DB: INSERT INTO acties ON DUPLICATE KEY UPDATE

    Note over WB,FE: Acties weergeven
    WB->>FE: Bezoekers-subtab openen
    FE->>BE: GET /api/bezoekers?datum=...
    BE->>DB: getDaggegevens() + berekenSpoelbeurtTotaal()
    BE-->>BE: genereerBezoekers() + genereerSpoelbeurt()
    BE-->>FE: { bezoekers_vandaag, totaal_diep, totaal_ondiep }

    FE->>BE: GET /api/acties?datum=...
    BE->>DB: SELECT acties JOIN baden
    BE-->>FE: [ { actie_type, bad_naam, beschrijving, opgelost, ... } ]
    FE-->>WB: groepeer filter_spoelen_* per bad\n⚠ badges op subtabs + nav\n⚠ indicators op invoervelden

    Note over WB,BE: Actie oplossen
    WB->>FE: Checkbox aanvinken
    FE->>BE: POST /api/acties/:id/resolve
    BE->>DB: UPDATE acties SET opgelost=TRUE\nopgelost_op=NOW()\nopgelost_door=naam
    FE->>BE: GET /api/acties (refresh)
    BE-->>FE: bijgewerkte actielijst
    FE-->>WB: actie groen ✓ + badges bijgewerkt

    Note over WB,BE: Actie heropenen (ongedaan maken)
    WB->>FE: Checkbox uitvinken
    FE->>BE: POST /api/acties/:id/unresolve
    BE->>DB: UPDATE acties SET opgelost=FALSE\nopgelost_op=NULL\nopgelost_door=NULL
```

---

## 8. Sequencediagram — Autosave

```mermaid
sequenceDiagram
    participant U as Gebruiker
    participant DOM as DOM Input
    participant App as app.js (global listener)
    participant OS as opslaan.js
    participant BE as Backend
    participant DB as MySQL

    U->>DOM: Waarde invoeren
    DOM->>App: input / change event (bubble)
    App->>OS: scheduleAutoSave()
    OS->>OS: setStatus('pending')\nclearTimeout(autoSaveTimer)
    OS->>OS: setTimeout(1200ms)

    Note over OS: debounce — reset bij elke toetsaanslag

    OS->>OS: timer afgelopen → setStatus('saving')
    OS->>OS: verwerkCentraleOpslaan(autoSave=true)

    alt Waterbeheer — meetwaarden
        OS->>BE: POST /api/metingen [Diep + Ondiep]
        BE->>DB: saveGrootBadMeting()
        BE-->>BE: genereer() acties
        BE-->>OS: { status: 'success' }
        OS->>BE: GET /api/acties (refresh badges)
    else Waterbeheer — verbruik/verwarming
        OS->>BE: POST /api/verbruik/diep-ondiep
        OS->>BE: POST /api/verbruik/verwarmingssysteem
        BE-->>BE: genereerVerbruik() acties
        BE-->>OS: { status: 'success' }
    else Coördinator — metingen blok
        OS->>BE: POST /api/coordinatoren [per bad per blok]
        BE-->>OS: { status: 'success' }
    else Coördinator — checklist
        OS->>BE: POST /api/coordinatoren/checklist
        BE-->>OS: { status: 'success' }
    else Coördinator — daggegevens
        OS->>BE: POST /api/coordinatoren/daggegevens
        BE-->>BE: genereerBezoekers() + genereerSpoelbeurt()
        BE-->>OS: { status: 'success' }
    end

    OS->>OS: setStatus('saved')
    OS->>OS: setTimeout(4000ms) → status leegmaken
```

---

## 9. Database schema — ER diagram

```mermaid
erDiagram
    BADEN {
        int id PK
        varchar naam
    }
    METINGEN_DIEP_ONDIEP {
        int id PK
        int bad_id FK
        date datum
        decimal ph_waarde
        decimal chloor_waarde
        decimal temperatuur
        int flow
        decimal filter_druk_in
        decimal filter_druk_uit
        decimal water
    }
    METINGEN_PEUTERBAD {
        int id PK
        int bad_id FK
        date datum
        decimal ph_waarde
        decimal chloor_waarde
        int flow
        decimal filter_druk_in
        int water
        int chemicalien_chloor
        int chemicalien_zwavelzuur
    }
    METINGEN_COORDINATOREN {
        int id PK
        int bad_id FK
        date datum
        time tijdstip
        varchar auteur
        decimal ph_waarde
        decimal chloor_vrij
        decimal chloor_totaal
        decimal watertemperatuur
        varchar helderheid
        tinyint bad_gebruikt
    }
    COORDINATOREN_CHECKLIST {
        int id PK
        date datum
        tinyint proef_waterspeel
        tinyint proef_spraypark
        tinyint proef_douches
        tinyint proef_glijbaan
    }
    COORDINATOREN_DAGGEGEVENS {
        int id PK
        date datum
        decimal lucht_temperatuur
        int bezoekers_vandaag
        int bezoekers_totaal_spoelbeurt
    }
    COORDINATOREN_LOGBOEK {
        int id PK
        date datum
        datetime tijdstip
        varchar auteur
        text tekst
    }
    LOGBOEK {
        int id PK
        date datum
        datetime tijdstip
        varchar auteur
        text tekst
    }
    VERBRUIK_DIEP_ONDIEP {
        int id PK
        date datum
        int floculant
        int water_diep
        int water_ondiep
        int water_totaal
        int elektriciteit_nacht
        int elektriciteit_dag
        int gas
        int chemicalien_chloor
        int chemicalien_zwavelzuur
    }
    VERWARMINGS_SYSTEEM {
        int id PK
        date datum
        boolean verwarming_status_1
        boolean verwarming_status_2
        boolean verwarming_status_3
        boolean verwarming_status_4
        boolean verwarming_druk_ok
        boolean verwarming_visuele_controle
    }
    ACTIES {
        int id PK
        int bad_id FK
        date datum
        varchar beschrijving
        varchar actie_type
        boolean opgelost
        datetime opgelost_op
        varchar opgelost_door
    }
    LIMIETEN {
        int id PK
        varchar parameter_naam
        decimal min_waarde
        decimal max_waarde
    }
    GEBRUIKERS {
        int id PK
        varchar voornaam
        varchar achternaam
        varchar inlognaam
        varchar wachtwoord
        enum taak
    }

    BADEN ||--o{ METINGEN_DIEP_ONDIEP : "heeft"
    BADEN ||--o{ METINGEN_PEUTERBAD : "heeft"
    BADEN ||--o{ METINGEN_COORDINATOREN : "heeft"
    BADEN ||--o{ ACTIES : "heeft"
```
