/** Aangemelde gebruiker opgeslagen in de sessie. */
export interface Gebruiker {
    id: number;
    gebruikersnaam: string;
    taak: string;
    voornaam?: string;
    achternaam?: string;
    inlognaam?: string;
}

// ── Metingen ──────────────────────────────────────────────────────────────────

export interface Meting {
    bad_naam: string;
    ph_waarde: number | null;
    chloor_waarde: number | null;
    temperatuur: number | null;
    flow: number | null;
    filter_druk_in: number | null;
    filter_druk_uit: number | null;
    kathodische_bescherming: number | null;
    water: number | null;
    chemicalien_chloor: number | null;
    chemicalien_zwavelzuur: number | null;
}

export interface GrootBadMetingInput {
    datum: string;
    bad_naam: string;
    ph_waarde?: number | null;
    chloor_waarde?: number | null;
    temperatuur?: number | null;
    flow?: number | null;
    filter_druk_in?: number | null;
    filter_druk_uit?: number | null;
    kathodische_bescherming?: number | null;
}

export interface PeuterbadMetingInput {
    datum: string;
    bad_naam: string;
    ph_waarde?: number | null;
    chloor_waarde?: number | null;
    flow?: number | null;
    filter_druk_in?: number | null;
    filter_druk?: number | null;
    water?: number | null;
    chemicalien_chloor?: number | null;
    chemicalien_zwavelzuur?: number | null;
}

export type MetingInput = GrootBadMetingInput | PeuterbadMetingInput;

// ── Acties ────────────────────────────────────────────────────────────────────

export interface Actie {
    id: number;
    bad_naam: string;
    beschrijving: string;
    actie_type: string;
    opgelost: boolean;
    opgelost_op: Date | null;
    opgelost_door: string | null;
}

export interface Drempelwaarden {
    actie_druk_verschil: number;
    actie_druk_peuterbad: number;
    actie_flow_diep: number;
    actie_flow_ondiep: number;
    actie_flow_peuterbad: number;
    actie_chloor_min: number;
    actie_zwavelzuur_min: number;
    actie_bezoekers_max: number;
    actie_spoelbeurt_max: number;
    actie_floculant_min: number;
    actie_gebonden_chloor_max: number;
    actie_chloor_peuterbad_min: number;
    actie_zwavelzuur_peuterbad_min: number;
}

export interface BadTotalen {
    diep: number;
    ondiep: number;
}

/** Resultaat van de bezoekers-endpoint: dagtelling plus cumulatieve totalen per bad. */
export interface BezoekersResultaat {
    bezoekers_vandaag: number | null;
    bezoekers_totaal_diep: number | null;
    bezoekers_totaal_ondiep: number | null;
}

/** Resultaat van de gebonden-chloor-endpoint: dagmaximum (chloor_totaal − chloor_vrij) per bad. */
export interface GebondenChloorResultaat {
    diep: number | null;
    ondiep: number | null;
    peuterbad: number | null;
}

// ── Rondetaken ──────────────────────────────────────────────────────────────────

/** Urgentie van een rondetaak; bepaalt sortering en de ⚠-markering op de tab. */
export type RondetaakPrioriteit = 'kritiek' | 'normaal';

/** Bad-pagina waaronder een rondetaak/taak wordt getoond. */
export type TaakPagina = 'grote-baden' | 'peuterbad';

/**
 * Categorie waarin een taak-item in de "Taken"-weergave valt:
 *  - 'verplicht'  = een getriggerde actie/alarm die uitgevoerd MOET worden;
 *  - 'belangrijk' = een kritieke rondetaak (regelaars/spraypark): belangrijk, niet verplicht;
 *  - 'overig'     = een normale rondetaak die tijdens een ronde kan gebeuren.
 */
export type TaakCategorie = 'verplicht' | 'belangrijk' | 'overig';

/** Vaste catalogus-definitie van een rondetaak (staat in code, niet in de DB). */
export interface RondetaakDefinitie {
    sleutel: string;
    gebied: string;
    label: string;
    prioriteit: RondetaakPrioriteit;
    /** Bad-pagina waaronder de taak hoort (Diep/Ondiep delen 'grote-baden'). */
    pagina: TaakPagina;
}

/** Een rondetaak voor een specifieke dag: catalogus-definitie + voltooiingsstatus. */
export interface Rondetaak extends RondetaakDefinitie {
    voltooid: boolean;
    voltooid_op: string | null;
    voltooid_door: string | null;
}

/** Herkomst van een taak-item: een rondetaak (checkbox) of geaggregeerde acties (alarm). */
export type TaakBron =
    | { type: 'rondetaak'; sleutel: string }
    | { type: 'actie'; ids: number[] };

/**
 * Samengesteld taak-item voor de "Taken"-weergave: de unie van rondetaken en
 * (drempel)acties, per bad-pagina gegroepeerd. 'alarm' = een getriggerde actie
 * die uitgevoerd MOET worden; 'kritiek'/'normaal' komen van de rondetaakcatalogus.
 * `categorie` bepaalt onder welke kop (Verplicht/Belangrijk/Overig) het item valt.
 */
export interface TaakItem {
    sleutel: string;
    pagina: TaakPagina;
    gebied: string;
    label: string;
    prioriteit: RondetaakPrioriteit | 'alarm';
    voltooid: boolean;
    voltooid_op: string | null;
    voltooid_door: string | null;
    reden: string | null;
    categorie: TaakCategorie;
    bron: TaakBron;
}

// ── Gebruikers ────────────────────────────────────────────────────────────────

export interface GebruikerRecord {
    id: number;
    voornaam: string;
    achternaam: string;
    inlognaam: string;
    /** Optioneel: getAll() levert het (gehashte) wachtwoord niet mee terug. */
    wachtwoord?: string;
    taak: string;
}

export interface GebruikerInput {
    voornaam: string;
    achternaam: string;
    inlognaam: string;
    wachtwoord: string;
    taak: string;
}

// ── Limieten ──────────────────────────────────────────────────────────────────

export interface Limiet {
    min: number;
    max: number;
}

export type LimietenMap = Record<string, Limiet>;

export interface LimietInput {
    parameter_naam: string;
    min_waarde: number;
    max_waarde: number;
}

// ── Actie-teksten ─────────────────────────────────────────────────────────────

/** Tekst-sjabloon voor een gegenereerde actie. */
export interface ActieTekst {
    actie_sleutel: string;
    sjabloon: string;
    omschrijving: string | null;
}

/** Invoer voor het opslaan/wijzigen van één actie-sjabloon. */
export interface ActieTekstInput {
    actie_sleutel: string;
    sjabloon: string;
}

// ── Waterbeheer-dienst ────────────────────────────────────────────────────────

/** De twee personen die op een dag dienst hadden bij waterbeheer. */
export interface WaterbeheerDienst {
    dienst_1: string | null;
    dienst_2: string | null;
}

/** Invoer voor het opslaan van de waterbeheer-dienst van een dag. */
export interface WaterbeheerDienstInput {
    datum: string;
    dienst_1?: string | null;
    dienst_2?: string | null;
}

// ── Trend ─────────────────────────────────────────────────────────────────────

export interface TrendMetingRow {
    datum: string;
    bad_naam: string;
    ph_waarde: number | null;
    chloor_waarde: number | null;
    temperatuur: number | null;
    flow: number | null;
    filter_druk_in: number | null;
    filter_druk_uit: number | null;
    kathodische_bescherming: number | null;
}

export interface TrendVerbruikRow {
    datum: string;
    water_diep: number | null;
    water_ondiep: number | null;
    water_totaal: number | null;
    elektriciteit_nacht: number | null;
    elektriciteit_dag: number | null;
    gas: number | null;
    chemicalien_chloor: number | null;
    chemicalien_zwavelzuur: number | null;
}

export interface TrendPeuterbadRow {
    datum: string;
    water: number | null;
    chemicalien_chloor: number | null;
    chemicalien_zwavelzuur: number | null;
}

export interface TrendVerbruikResult {
    algemeen: TrendVerbruikRow[];
    peuterbad: TrendPeuterbadRow[];
}

// ── Logboek ───────────────────────────────────────────────────────────────────
// LogboekEntry and LogboekSaveResult are defined in the Coordinatoren section above.

// ── Verbruik ──────────────────────────────────────────────────────────────────

export interface VerbruikData {
    datum?: string;
    floculant?: number | null;
    water_diep?: number | null;
    water_ondiep?: number | null;
    water_totaal?: number | null;
    elektriciteit_nacht?: number | null;
    elektriciteit_dag?: number | null;
    gas?: number | null;
    chemicalien_chloor?: number | null;
    chemicalien_zwavelzuur?: number | null;
}

export interface VerbruikInput extends VerbruikData {
    datum: string;
}

export interface VerwarmingData {
    datum?: string;
    verwarming_status_1?: boolean | number | null;
    verwarming_status_2?: boolean | number | null;
    verwarming_status_3?: boolean | number | null;
    verwarming_status_4?: boolean | number | null;
    verwarming_druk_ok?: boolean | number | null;
    verwarming_visuele_controle?: boolean | number | null;
}

export interface VerwarmingInput extends VerwarmingData {
    datum: string;
}

// ── Coordinatoren ─────────────────────────────────────────────────────────────

export interface Daggegevens {
    lucht_temperatuur?: number | null;
    bezoekers_vandaag?: number | null;
    bezoekers_totaal_spoelbeurt?: number | null;
    auteur?: string | null;
}

export interface DaggegevensInput {
    lucht_temperatuur?: number | null;
    bezoekers_vandaag?: number | null;
    bezoekers_totaal_spoelbeurt?: number | null;
}

export interface CoordinatorMeting {
    bad_naam: string;
    ph_waarde: number | null;
    chloor_vrij: number | null;
    chloor_totaal: number | null;
    watertemperatuur: number | null;
    helderheid: number | null;
    bad_gebruikt: boolean | number | null;
}

export interface CoordinatorBlok {
    tijdstip: string;
    auteur: string;
    metingen: CoordinatorMeting[];
}

export interface CoordinatorMetingInput {
    datum: string;
    bad_naam: string;
    tijdstip?: string;
    ph_waarde?: number | null;
    chloor_vrij?: number | null;
    chloor_totaal?: number | null;
    watertemperatuur?: number | null;
    helderheid?: number | null;
    bad_gebruikt?: boolean | number | null;
}

export interface Checklist {
    proef_waterspeel: boolean | number;
    proef_spraypark: boolean | number;
    proef_douches: boolean | number;
    proef_glijbaan: boolean | number;
    auteur?: string | null;
}

export interface ChecklistInput {
    proef_waterspeel?: boolean | number;
    proef_spraypark?: boolean | number;
    proef_douches?: boolean | number;
    proef_glijbaan?: boolean | number;
}

export interface LogboekEntry {
    id: number;
    tijdstip: string;
    auteur: string | null;
    tekst: string;
}

export interface LogboekSaveResult {
    id: number;
    auteur: string | null;
}

/** Resultaat dat de service teruggeeft na het opslaan van een logboekregel. */
export interface LogboekOpslaanResultaat {
    id: number | null;
    auteur: string;
}

// ── Session augmentation ───────────────────────────────────────────────────────
// Placed here so ts-node always loads it (index.ts is imported by every controller).
// Inside a module (file with exports), declare module = augmentation, not replacement.
declare module 'express-session' {
    interface SessionData {
        gebruiker?: Gebruiker;
    }
}
