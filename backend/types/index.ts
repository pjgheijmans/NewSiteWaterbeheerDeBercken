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
}

export interface BadTotalen {
    diep: number;
    ondiep: number;
}

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
    bezoekers_vandaag?: number | null;
    buitentemperatuur?: number | null;
    luchttemperatuur?: number | null;
}
