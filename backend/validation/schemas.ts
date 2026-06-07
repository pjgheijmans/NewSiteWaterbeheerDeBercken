import { z } from 'zod';

/** ISO-datum YYYY-MM-DD, zoals een <input type="date"> levert. */
const datum = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'moet formaat YYYY-MM-DD hebben');

/** Niet-leeg tijdstip (HH:MM:SS of volledige datetime voor logboek). */
const tijdstip = z.string().min(1, 'is verplicht');

// ── Metingen ────────────────────────────────────────────────────────────────
// looseObject: meetwaardevelden lopen mee zonder strikte typering (de frontend
// stuurt deels nummers, deels strings). datum en bad_naam zijn wel verplicht.
export const metingSchema = z.looseObject({
    datum,
    bad_naam: z.string().min(1, 'is verplicht'),
});

// ── Verbruik / Verwarming ─────────────────────────────────────────────────────
export const verbruikSchema   = z.looseObject({ datum });
export const verwarmingSchema = z.looseObject({ datum });

// ── Coordinatoren ──────────────────────────────────────────────────────────────
export const coordinatorMetingSchema = z.looseObject({
    datum,
    bad_naam: z.string().min(1, 'is verplicht'),
});
export const checklistSchema   = z.looseObject({ datum });
export const daggegevensSchema = z.looseObject({ datum });
export const logboekSchema     = z.looseObject({
    datum,
    tijdstip,
    tekst: z.string().optional(),
});

// ── Rondetaken ──────────────────────────────────────────────────────────────
export const rondetaakToggleSchema = z.object({ datum });

// ── Gebruikers (strikt) ─────────────────────────────────────────────────────
export const gebruikerSchema = z.object({
    voornaam:   z.string(),
    achternaam: z.string(),
    inlognaam:  z.string().min(1, 'is verplicht'),
    wachtwoord: z.string().min(1, 'is verplicht'),
    taak:       z.enum(['waterbeheerder', 'coordinator', 'Administrator']),
});

// Bij wijzigen mag het wachtwoord leeg blijven (= ongewijzigd laten).
export const gebruikerUpdateSchema = gebruikerSchema.extend({
    wachtwoord: z.string().optional(),
});

// ── Limieten (strikt) ─────────────────────────────────────────────────────────
export const limietSchema = z.object({
    parameter_naam: z.string().min(1, 'is verplicht'),
    min_waarde:     z.number(),
    max_waarde:     z.number(),
});

// ── Auth ────────────────────────────────────────────────────────────────────
export const loginSchema = z.object({
    username: z.string().min(1, 'is verplicht'),
    password: z.string().min(1, 'is verplicht'),
});
