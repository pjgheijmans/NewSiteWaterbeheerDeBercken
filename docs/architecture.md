# Architectuur — Digitale Dagstaat Zwembad

---

## 1. Systeemoverzicht

```mermaid
graph TB
    subgraph Docker["Docker Stack"]
        subgraph Web["Container: zwembad_web (Node.js)"]
            Express["Express Server\n(server.js)"]
        end
        subgraph DB["Container: zwembad_db (MySQL 8)"]
            MySQL[(MySQL\nzwembad_status)]
        end
    end

    Browser["Browser\n(Waterbeheerder / Coördinator / Administrator)"]

    Browser -->|"HTTP (port 3000)"| Express
    Express -->|"mysql2 connection pool"| MySQL
    Express -->|"HTML partials + static JS/CSS"| Browser
```

---

## 2. Backend — lagen

```mermaid
graph LR
    subgraph Routes["Routes (backend/routes/)"]
        R_auth["auth.js\n/api/login\n/api/logout"]
        R_met["metingen.js\n/api/metingen\n/api/acties\n/api/bezoekers"]
        R_coord["coordinatoren.js\n/api/coordinatoren/*"]
        R_verb["verbruik.js\n/api/verbruik/*"]
        R_lim["limieten.js\n/api/limieten"]
        R_log["logboek.js\n/api/logboek"]
        R_gebr["gebruikers.js\n/api/gebruikers"]
        R_db["database.js\n/api/database/*"]
        R_trend["trend.js\n/api/trend/*"]
        R_front["frontend.js\n/ (HTML partials)"]
    end

    subgraph Repos["Repositories (backend/repositories/)"]
        Re_db[("db.js\nconnection pool")]
        Re_act["acties.js"]
        Re_coord["coordinatoren.js"]
        Re_verb["verbruik.js"]
        Re_lim["limieten.js"]
        Re_log["logboek.js"]
        Re_met["metingen.js"]
        Re_gebr["gebruikers.js"]
        Re_dbutil["database.js"]
        Re_trend["trend.js"]
    end

    subgraph DB["Database (MySQL)"]
        T_met["metingen_diep_ondiep\nmetingen_peuterbad\nmetingen_coordinatoren"]
        T_coord["coordinatoren_checklist\ncoordinatoren_daggegevens\ncoordinatoren_logboek"]
        T_verb["verbruik_diep_ondiep\nverwarmings_systeem_diep_ondiep"]
        T_act["acties"]
        T_lim["limieten"]
        T_rest["logboek\ngebruikers\nbaden"]
    end

    R_met --> Re_act & Re_met
    R_coord --> Re_coord
    R_verb --> Re_verb & Re_act
    R_lim --> Re_lim
    R_log --> Re_log
    R_gebr --> Re_gebr
    R_db --> Re_dbutil
    R_trend --> Re_trend

    Re_act & Re_met & Re_coord & Re_verb & Re_lim & Re_log & Re_gebr & Re_dbutil & Re_trend --> Re_db
    Re_db --> T_met & T_coord & T_verb & T_act & T_lim & T_rest
```

---

## 3. Frontend — modules

```mermaid
graph TB
    subgraph Bootstrap
        state["state.js\ngedeelde toestand\n(datum, rol, tabs)"]
        app["app.js\ninitialisatie\nautosave listener"]
    end

    subgraph Auth
        auth["auth.js\nlogin / logout\nwisselRol()"]
    end

    subgraph Navigation
        nav["nav.js\nveranderDatum()\nbegrensSeizoenDatum()"]
    end

    subgraph Data
        metingen["metingen.js\nmeetwaarden\nacties\nbezoekers\ntab-navigatie"]
        verbruik["verbruik.js\nverbruik\nverwarmingssysteem"]
        logboek["logboek.js\nlogboek blokken\nautosave per blok"]
    end

    subgraph Config
        limieten["limieten.js\nrichtwaarden\nseizoendatums\nautosave"]
        gebruikers["gebruikers.js\nCRUD accounts\nautosave"]
        database["database.js\ntabel beheer\nCSV export/import"]
    end

    subgraph Infrastructure
        opslaan["opslaan.js\ncentrale autosave\n(debounce 1.2s)"]
        ui["ui.js\nvalideerVeld()\ntoonBericht()"]
        api["api.js\napiCall() helper"]
        trend["trend.js\ntrendgrafieken\nChart.js"]
    end

    state --> metingen & verbruik & logboek & limieten & gebruikers & opslaan
    auth --> metingen & nav
    app --> auth
    api --> metingen & verbruik & logboek & limieten & gebruikers & database & trend & opslaan
    ui --> metingen & verbruik & limieten
    opslaan --> metingen & verbruik
```

---

## 4. Rollen en toegang

```mermaid
graph LR
    subgraph Rollen
        WB["Waterbeheerder"]
        CO["Coördinator"]
        AD["Administrator"]
    end

    subgraph Secties
        S1["Dagstaat\nMeetwaarden Diep/Ondiep\nMeetwaarden Peuterbad\nVerbruik\nBezoekers\nLogboek\nActies"]
        S2["Dagstaat\nMetingen\nChecklijst\nTemperatuur & Bezoekers\nLogboek"]
        S3["Limieten\nGebruikersbeheer\nDatabase Beheer\nTrendanalyse"]
    end

    WB --> S1
    CO --> S2
    AD --> S3
```

---

## 5. Acties-systeem — datavloed

```mermaid
sequenceDiagram
    participant WB as Waterbeheerder
    participant CO as Coördinator
    participant FE as Frontend
    participant BE as Backend
    participant DB as Database

    CO->>FE: Bezoekers invullen
    FE->>BE: POST /api/coordinatoren/daggegevens
    BE->>DB: saveDaggegevens()
    BE-->>BE: genereerBezoekers() fire-and-forget
    BE-->>BE: genereerSpoelbeurt() fire-and-forget
    BE->>DB: INSERT/DELETE acties

    WB->>FE: Meetwaarden invullen
    FE->>BE: POST /api/metingen
    BE->>DB: saveGrootBadMeting()
    BE-->>BE: genereer() — druk & flow check
    BE->>DB: INSERT/DELETE acties

    WB->>FE: Verbruik invullen
    FE->>BE: POST /api/verbruik/diep-ondiep
    BE-->>BE: genereerVerbruik() — chloor, zwavelzuur, floculant
    BE->>DB: INSERT/DELETE acties

    WB->>FE: Bezoekers-subtab openen
    FE->>BE: GET /api/bezoekers
    BE->>DB: getDaggegevens()
    BE-->>BE: genereerBezoekers() + genereerSpoelbeurt()
    BE->>DB: INSERT/DELETE acties
    BE-->>FE: bezoekers_vandaag + totalen

    FE->>BE: GET /api/acties
    BE->>DB: getActies()
    BE-->>FE: lijst van open/gesloten acties
    FE-->>WB: ⚠ badges + Acties-tab gevuld
```

---

## 6. Autosave — mechanisme

```mermaid
sequenceDiagram
    participant U as Gebruiker
    participant DOM as DOM Input
    participant OS as opslaan.js
    participant BE as Backend

    U->>DOM: Waarde invoeren (oninput)
    DOM->>OS: scheduleAutoSave()
    OS-->>OS: setStatus('pending')\nclearTimeout(timer)
    OS-->>OS: setTimeout 1.2s
    Note over OS: debounce — reset bij elke toetsaanslag
    OS->>OS: setStatus('saving')
    OS->>BE: POST /api/...
    BE-->>OS: { status: 'success' }
    OS-->>OS: setStatus('saved')
    OS-->>OS: setTimeout 4s → status leegmaken
```

---

## 7. Database schema — tabellen per domein

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
