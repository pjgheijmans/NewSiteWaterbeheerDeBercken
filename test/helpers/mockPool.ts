import { Pool } from 'mysql2/promise';

/** Mock van de mysql2 Pool met execute en query als jest-mocks. */
export interface MockPool {
    execute: jest.Mock;
    query:   jest.Mock;
    getConnection: jest.Mock;
    /** De mock-connection die getConnection teruggeeft (deelt dezelfde execute). */
    connection: {
        execute: jest.Mock;
        beginTransaction: jest.Mock;
        commit: jest.Mock;
        rollback: jest.Mock;
        release: jest.Mock;
    };
}

/**
 * Maak een verse mock-pool. execute/query geven standaard een leeg
 * [rows, fields] tuple terug. Een transactie-connection deelt dezelfde
 * execute-mock, zodat assertions op pool.execute ook de queries binnen een
 * transactie zien. Cast met `as unknown as Pool` bij de repository-constructor.
 */
export function maakMockPool(): MockPool {
    const execute = jest.fn().mockResolvedValue([[], []]);
    const connection = {
        execute,
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        commit:           jest.fn().mockResolvedValue(undefined),
        rollback:         jest.fn().mockResolvedValue(undefined),
        release:          jest.fn(),
    };
    return {
        execute,
        query:         jest.fn().mockResolvedValue([[], []]),
        getConnection: jest.fn().mockResolvedValue(connection),
        connection,
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
