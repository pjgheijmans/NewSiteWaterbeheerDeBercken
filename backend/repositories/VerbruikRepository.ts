import { Pool, RowDataPacket } from 'mysql2/promise';
import { VerbruikData, VerbruikInput, VerwarmingData, VerwarmingInput, OpslaanResultaat } from '../types';
import { IVerbruikRepository } from './IVerbruikRepository';
import { optimistischOpslaan } from './optimistisch';

export class VerbruikRepository implements IVerbruikRepository {
    constructor(private readonly pool: Pool) {}

    async getVerbruik(datum: string): Promise<VerbruikData> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [datum]
        );
        return (rows[0] as VerbruikData) ?? {};
    }

    async getVorigeVerbruik(datum: string): Promise<VerbruikData> {
        const d = new Date(datum);
        d.setDate(d.getDate() - 1);
        const vorigeDatum = d.toISOString().split('T')[0];
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT * FROM verbruik_diep_ondiep WHERE datum = ?', [vorigeDatum]
        );
        return (rows[0] as VerbruikData) ?? {};
    }

    async saveVerbruik(
        data: VerbruikInput, auteur: string | null, verwachteVersie: number | null,
    ): Promise<OpslaanResultaat> {
        return optimistischOpslaan(this.pool, 'verbruik_diep_ondiep',
            { datum: data.datum },
            {
                floculant:           data.floculant ?? null,
                water_diep:          data.water_diep ?? null,
                water_ondiep:        data.water_ondiep ?? null,
                water_totaal:        data.water_totaal ?? null,
                elektriciteit_nacht: data.elektriciteit_nacht ?? null,
                elektriciteit_dag:   data.elektriciteit_dag ?? null,
                gas:                 data.gas ?? null,
                chemicalien_chloor:     data.chemicalien_chloor ?? null,
                chemicalien_zwavelzuur: data.chemicalien_zwavelzuur ?? null,
            },
            auteur, verwachteVersie);
    }

    async getVerwarming(datum: string): Promise<VerwarmingData> {
        const [rows] = await this.pool.execute<RowDataPacket[]>(
            'SELECT * FROM verwarmings_systeem_diep_ondiep WHERE datum = ?', [datum]
        );
        return (rows[0] as VerwarmingData) ?? {};
    }

    async saveVerwarming(
        data: VerwarmingInput, auteur: string | null, verwachteVersie: number | null,
    ): Promise<OpslaanResultaat> {
        const bool = (v: unknown) => (v === true || v === 1 || v === '1' ? 1 : 0);
        return optimistischOpslaan(this.pool, 'verwarmings_systeem_diep_ondiep',
            { datum: data.datum },
            {
                verwarming_status_1: bool(data.verwarming_status_1),
                verwarming_status_2: bool(data.verwarming_status_2),
                verwarming_status_3: bool(data.verwarming_status_3),
                verwarming_status_4: bool(data.verwarming_status_4),
                verwarming_druk_ok:  bool(data.verwarming_druk_ok),
                verwarming_visuele_controle: bool(data.verwarming_visuele_controle),
            },
            auteur, verwachteVersie);
    }
}
