export interface IDatabaseRepository {
    exportRows(tabel: string): Promise<Record<string, unknown>[]>;
    runInitSql(): Promise<void>;
    truncate(tabel: string): Promise<void>;
    truncateAll(): Promise<void>;
    seedAllDefaults(): Promise<void>;
    getBadId(bad_naam: string): Promise<number | null>;
    importRow(actualTabel: string, columns: string[], values: unknown[]): Promise<void>;
    setForeignKeyChecks(on: boolean): Promise<void>;
}
