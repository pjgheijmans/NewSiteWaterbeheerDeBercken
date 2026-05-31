import { Pool } from 'mysql2/promise';

/** Mock van de mysql2 Pool met execute en query als jest-mocks. */
export interface MockPool {
    execute: jest.Mock;
    query:   jest.Mock;
}

/**
 * Maak een verse mock-pool. Beide methoden geven standaard een leeg
 * [rows, fields] tuple terug. Cast met `as unknown as Pool` bij de
 * repository-constructor.
 */
export function maakMockPool(): MockPool {
    return {
        execute: jest.fn().mockResolvedValue([[], []]),
        query:   jest.fn().mockResolvedValue([[], []]),
    };
}

/** Wikkel rijen in het [rows, fields] tuple dat mysql2 teruggeeft. */
export function resultaat(rows: unknown[]): [unknown[], unknown[]] {
    return [rows, []];
}

/** Geef de SQL-string van de N-de execute-aanroep terug (genormaliseerde witruimte). */
export function sqlVan(mock: jest.Mock, aanroep = 0): string {
    return String(mock.mock.calls[aanroep][0]).replace(/\s+/g, ' ').trim();
}

/** Geef de parameter-array van de N-de execute-aanroep terug. */
export function paramsVan(mock: jest.Mock, aanroep = 0): unknown[] {
    return mock.mock.calls[aanroep][1] as unknown[];
}
