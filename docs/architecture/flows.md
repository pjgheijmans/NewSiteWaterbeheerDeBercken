# Flows

Sequencediagrammen van de belangrijkste scenario's. Terug naar het
[overzicht](../architecture.md). De backend toont de lagen
controller → service → repository.

---

## 1. Applicatie opstarten

```mermaid
sequenceDiagram
    participant B as Browser
    participant FE as FrontendController (/)
    participant Auth as AuthController (/api)
    participant Lim as LimietenController
    participant Met as MetingenController
    participant Svc as Service-laag
    participant DB as MySQL

    B->>FE: GET /
    FE->>FE: HTML-partials samenvoegen
    FE-->>B: volledige HTML + /js/*.js + /css/style.css

    Note over B: new Application()<br/>app.auth.start()

    B->>Auth: GET /api/ingelogd
    alt Niet ingelogd
        Auth-->>B: { ingelogd: false }
        B->>Auth: POST /api/login { username, password }
        Note over Auth: Validator (login)
        Auth->>Svc: AuthService.login(u, p)
        Svc->>DB: findByLogin()
        DB-->>Svc: gebruiker | null
        Auth->>Auth: $_SESSION['gebruiker'] = gebruiker
        Auth-->>B: { gebruiker }
    else Al ingelogd
        Auth-->>B: { ingelogd: true, gebruiker }
    end

    Note over B: app.auth.wisselRol(taak)

    B->>Lim: GET /api/limieten
    Lim->>Svc: LimietenService.getAll()
    Svc->>DB: SELECT * FROM limieten
    DB-->>B: actieveLimieten (genormaliseerd)
    Note over B: app.nav.pasSeizoenAan() — datum begrenzen

    Note over B: app.metingen.laadMetingen()
    B->>Met: GET /api/metingen?datum=...
    Met->>Svc: MetingenService.getMetingen(datum)
    Svc->>DB: getMetingen()
    DB-->>B: [ { bad_naam, ph_waarde, ... } ]

    par fire-and-forget
        B->>Met: GET /api/bezoekers?datum=...
        and
        B->>Met: GET /api/acties?datum=...
        Met->>Svc: MetingenService.getActies(datum)
        Svc->>DB: getActies()
        DB-->>B: acties
        Note over B: ⚠/✓-veldindicatoren bij de meetwaarden<br/>GET /api/taken voor de tab-/subtab-badges
    end

    B->>Met: GET /api/verbruik/diep-ondiep (+ /vorige)
    Note over B: app.verbruik.laadEnBerekenVerbruik()<br/>Verbruik = huidig − vorige
```

---

## 2. Acties genereren · Taken weergeven en afvinken

```mermaid
sequenceDiagram
    participant WB as Waterbeheerder
    participant FE as Frontend
    participant Ctrl as Controller
    participant Svc as Service
    participant Repo as Repositories
    participant DB as MySQL

    Note over WB,Svc: Trigger via meetwaarden
    WB->>FE: Meetwaarden invullen
    FE->>Ctrl: POST /api/metingen
    Note over Ctrl: Validator (meting)
    Ctrl->>Svc: MetingenService.saveMeting(body)
    Svc->>Repo: getBadId() + save(Groot|Peuter)BadMeting()
    Svc->>Repo: ActiesRepository.genereer()
    Repo->>DB: INSERT/DELETE acties (filter_spoelen_druk / _flow)

    Note over WB,Svc: Trigger via verbruik
    WB->>FE: Chemicaliën / Flocculant invullen
    FE->>Ctrl: POST /api/verbruik/diep-ondiep
    Ctrl->>Svc: VerbruikService.saveVerbruik(body)
    Svc->>Repo: saveVerbruik() + ActiesRepository.genereerVerbruik()
    Repo->>DB: INSERT/DELETE acties (chloor_bestellen / zwavelzuur / Flocculant)

    Note over WB,Svc: Trigger via bezoekers (coördinator-daggegevens)
    Note over Svc: CoordinatorenService.saveDaggegevens()<br/>→ genereerBezoekers() + genereerSpoelbeurt() (fire-and-forget)<br/>spoelbeurt → filter_spoelen_spoelbeurt (bezoekers) + filter_spoelen_dagen (dagen sinds reiniging)

    Note over WB,FE: Taken weergeven (per bad)
    WB->>FE: Taken-subtab openen
    FE->>Ctrl: GET /api/taken?datum=...
    Ctrl->>Svc: TakenService.getTaken(datum)
    Svc->>Repo: getRondetaken() + getActies()
    Note over Svc: filter_spoelen_* vouwen samen op de filtertaak<br/>overige acties → losse rijen — verplicht = (ooit) getriggerd alarm of kritiek<br/>afgevinkt verplicht alarm blijft in Verplicht (afgestreept, mét reden)
    Repo-->>FE: TaakItem[]
    FE-->>WB: secties "Verplicht vandaag" / "Overige taken"<br/>+ ⚠-badges op tabs/subtabs

    Note over WB,Svc: Afvinken / heropenen
    WB->>FE: Checkbox aan/uit
    alt rondetaak (incl. filtertaak)
        FE->>Ctrl: POST /api/rondetaken/{sleutel}/voltooi | /heropen
        Ctrl->>Svc: RondetakenService.voltooi/heropen
        Note over Svc: filtertaak → ook resolveFilterSpoelen(bad, datum)
    else losse actie (bv. chloor bestellen)
        FE->>Ctrl: POST /api/acties/{id}/resolve | /unresolve
        Ctrl->>Svc: resolveActie(id, gebruiker) | unresolveActie(id)
    end
    FE->>Ctrl: GET /api/taken (refresh)
    Ctrl-->>FE: bijgewerkte lijst
```

---

## 3. Autosave

```mermaid
sequenceDiagram
    participant U as Gebruiker
    participant DOM as DOM Input
    participant Save as app.opslaan (OpslaanModule)
    participant Ctrl as Controller
    participant Svc as Service
    participant DB as MySQL

    U->>DOM: Waarde invoeren
    DOM->>Save: input/change (bubble naar sectie-dagstaat)
    Save->>Save: setAutoSaveStatus('pending')<br/>clearTimeout + setTimeout(1200ms)
    Note over Save: debounce — reset bij elke toetsaanslag

    Save->>Save: timer → 'saving' → verwerkCentraleOpslaan(true)

    alt Waterbeheer — meetwaarden
        Save->>Ctrl: POST /api/metingen [Diep + Ondiep] (incl. verwachte versie)
        Ctrl->>Svc: MetingenService.saveMeting(body, auteur)
        Svc->>DB: Support\Optimistisch (UPDATE WHERE versie=?) + genereer acties
        Save->>Ctrl: GET /api/acties (veldindicatoren) + GET /api/taken (badges)
    else Waterbeheer — verbruik/verwarming
        Save->>Ctrl: POST /api/verbruik/diep-ondiep (+ /verwarmingssysteem) (incl. versie)
        Ctrl->>Svc: VerbruikService.saveVerbruik() / saveVerwarming()
    else Coördinator — blok / checklist / daggegevens
        Save->>Ctrl: POST /api/coordinatoren[/checklist|/daggegevens]
        Ctrl->>Svc: CoordinatorenService.save...()
    end

    alt geen conflict
        Svc-->>Save: 200 { versie, auteur, bijgewerkt_op }
        Save->>Save: versie onthouden, setAutoSaveStatus('saved')<br/>volledigheids-bolletjes bijwerken
    else versieconflict (iemand anders wijzigde de gegevens)
        Svc-->>Save: 409
        Save->>Save: behandelConflict() — laadMetingen() (herladen) + popup (wie wijzigde het laatst)
    end
```
