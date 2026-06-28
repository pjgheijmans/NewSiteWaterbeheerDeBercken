<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

use PDO;
use Zwembad\Support\Wachtwoord;

/**
 * Port van backend/repositories/GebruikersRepository.ts (auth-deel).
 * Verifieert wachtwoorden in code (zodat hashes met willekeurige salt werken) en
 * stelt de effectieve rechten per domein samen uit alle rollen van de gebruiker.
 */
class GebruikersRepository implements IGebruikersRepository
{
    /** Niveaus oplopend in macht; index = rang. */
    private const NIVEAU_ORDE = ['geen', 'lezen', 'schrijven'];

    /** Standaardgebruikers + de rol die ze bij een verse database krijgen. */
    private const DEFAULT_GEBRUIKERS = [
        ['voornaam' => 'Admin', 'achternaam' => '', 'inlognaam' => 'Admin', 'wachtwoord' => 'lpphw', 'rolNaam' => 'Beheer'],
        ['voornaam' => 'Paul', 'achternaam' => 'Heijmans', 'inlognaam' => 'pheijmans', 'wachtwoord' => 'Paul', 'rolNaam' => 'Waterbeheer'],
    ];

    public function __construct(private PDO $pdo)
    {
    }

    public function findByLogin(string $inlognaam, string $wachtwoord): ?array
    {
        $stmt = $this->pdo->prepare(
            'SELECT id, voornaam, achternaam, inlognaam, taak, wachtwoord
             FROM gebruikers WHERE inlognaam = ?',
        );
        $stmt->execute([$inlognaam]);
        $rij = $stmt->fetch();

        if ($rij === false || !Wachtwoord::verifieer($wachtwoord, $rij['wachtwoord'])) {
            return null;
        }

        // Upgrade legacy plaintext naar een hash bij een geslaagde login (best-effort).
        if (!Wachtwoord::isGehasht($rij['wachtwoord'])) {
            try {
                $up = $this->pdo->prepare('UPDATE gebruikers SET wachtwoord = ? WHERE id = ?');
                $up->execute([Wachtwoord::hash($wachtwoord), $rij['id']]);
            } catch (\Throwable) {
                // upgrade is best-effort; login slaagt sowieso
            }
        }

        $rechtenInfo = $this->laadRechten((int) $rij['id']);

        return [
            'id' => (int) $rij['id'],
            'gebruikersnaam' => $rij['inlognaam'],
            'taak' => $rij['taak'],
            'voornaam' => $rij['voornaam'],
            'achternaam' => $rij['achternaam'],
            'inlognaam' => $rij['inlognaam'],
            'rechten' => $rechtenInfo['rechten'],
            'magHistorie' => $rechtenInfo['magHistorie'],
            'rolNamen' => $rechtenInfo['rolNamen'],
        ];
    }

    public function getAll(): array
    {
        // Wachtwoord (hash) bewust NIET teruggeven.
        $gebruikers = $this->pdo
            ->query('SELECT id, voornaam, achternaam, inlognaam FROM gebruikers')
            ->fetchAll();

        // Rolkoppelingen in één query ophalen en stitchen (geen N+1).
        $koppels = $this->pdo->query('SELECT gebruiker_id, rol_id FROM gebruiker_rollen')->fetchAll();
        $perGebruiker = [];
        foreach ($koppels as $k) {
            $perGebruiker[(int) $k['gebruiker_id']][] = (int) $k['rol_id'];
        }

        return array_map(static fn (array $g): array => [
            'id' => (int) $g['id'],
            'voornaam' => $g['voornaam'],
            'achternaam' => $g['achternaam'],
            'inlognaam' => $g['inlognaam'],
            'rol_ids' => $perGebruiker[(int) $g['id']] ?? [],
        ], $gebruikers);
    }

    public function create(array $data): void
    {
        $this->inTransactie(function (PDO $pdo) use ($data): void {
            $stmt = $pdo->prepare(
                'INSERT INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord) VALUES (?, ?, ?, ?)',
            );
            $stmt->execute([
                $data['voornaam'],
                $data['achternaam'],
                $data['inlognaam'],
                Wachtwoord::hash($data['wachtwoord']),
            ]);
            $this->zetRollen($pdo, (int) $pdo->lastInsertId(), $data['rol_ids']);
        });
    }

    public function update(string $id, array $data): void
    {
        $this->inTransactie(function (PDO $pdo) use ($id, $data): void {
            if (($data['wachtwoord'] ?? '') !== '') {
                // Nieuw wachtwoord opgegeven → hashen en meeschrijven.
                $pdo->prepare(
                    'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=?, wachtwoord=? WHERE id=?',
                )->execute([
                    $data['voornaam'], $data['achternaam'], $data['inlognaam'],
                    Wachtwoord::hash($data['wachtwoord']), $id,
                ]);
            } else {
                // Leeg wachtwoord → bestaande hash behouden.
                $pdo->prepare(
                    'UPDATE gebruikers SET voornaam=?, achternaam=?, inlognaam=? WHERE id=?',
                )->execute([$data['voornaam'], $data['achternaam'], $data['inlognaam'], $id]);
            }
            $this->zetRollen($pdo, (int) $id, $data['rol_ids']);
        });
    }

    public function remove(string $id): void
    {
        // gebruiker_rollen ruimt zichzelf op via ON DELETE CASCADE.
        $this->pdo->prepare('DELETE FROM gebruikers WHERE id = ?')->execute([$id]);
    }

    public function seedDefaults(): void
    {
        foreach (self::DEFAULT_GEBRUIKERS as $g) {
            $this->pdo->prepare(
                'INSERT IGNORE INTO gebruikers (voornaam, achternaam, inlognaam, wachtwoord) VALUES (?, ?, ?, ?)',
            )->execute([$g['voornaam'], $g['achternaam'], $g['inlognaam'], Wachtwoord::hash($g['wachtwoord'])]);

            // Koppel (her)aan de standaardrol; idempotent via INSERT IGNORE.
            $this->pdo->prepare(
                'INSERT IGNORE INTO gebruiker_rollen (gebruiker_id, rol_id)
                 SELECT u.id, r.id FROM gebruikers u JOIN rollen r ON r.naam = ?
                 WHERE u.inlognaam = ?',
            )->execute([$g['rolNaam'], $g['inlognaam']]);
        }
    }

    public function getMetRecht(string $domein, string $minNiveau): array
    {
        // Niveaus die tellen: alles vanaf $minNiveau (bv. 'lezen' → lezen + schrijven).
        $idx = array_search($minNiveau, self::NIVEAU_ORDE, true);
        $toegestaan = array_values(array_filter(
            array_slice(self::NIVEAU_ORDE, $idx === false ? 0 : $idx),
            static fn (string $n): bool => $n !== 'geen',
        ));
        if ($toegestaan === []) {
            return [];
        }
        $plaatshouders = implode(', ', array_fill(0, count($toegestaan), '?'));
        $stmt = $this->pdo->prepare(
            "SELECT DISTINCT g.voornaam, g.achternaam, g.inlognaam
             FROM gebruikers g
             JOIN gebruiker_rollen gr ON gr.gebruiker_id = g.id
             JOIN rol_rechten rr ON rr.rol_id = gr.rol_id
             WHERE rr.domein = ? AND rr.niveau IN ($plaatshouders)",
        );
        $stmt->execute([$domein, ...$toegestaan]);

        return $stmt->fetchAll();
    }

    /**
     * Effectieve rechten: het HOOGSTE niveau per domein over al zijn rollen;
     * magHistorie als minstens één rol het toestaat. Port van _laadRechten().
     *
     * @return array{rechten: array<string,string>, magHistorie: bool, rolNamen: string[]}
     */
    private function laadRechten(int $gebruikerId): array
    {
        $stmt = $this->pdo->prepare(
            'SELECT r.naam, r.mag_historie_bewerken, rr.domein, rr.niveau
             FROM gebruiker_rollen gr
             JOIN rollen r ON r.id = gr.rol_id
             LEFT JOIN rol_rechten rr ON rr.rol_id = r.id
             WHERE gr.gebruiker_id = ?',
        );
        $stmt->execute([$gebruikerId]);

        $rechten = [];
        $rolNamen = [];
        $magHistorie = false;
        foreach ($stmt->fetchAll() as $row) {
            $rolNamen[$row['naam']] = true;
            if ((int) $row['mag_historie_bewerken'] === 1) {
                $magHistorie = true;
            }
            if ($row['domein'] !== null && $row['niveau'] !== null) {
                $huidig = $rechten[$row['domein']] ?? 'geen';
                $rechten[$row['domein']] = $this->hoogste($huidig, $row['niveau']);
            }
        }

        return [
            'rechten' => $rechten,
            'magHistorie' => $magHistorie,
            'rolNamen' => array_keys($rolNamen),
        ];
    }

    private function hoogste(string $a, string $b): string
    {
        return array_search($a, self::NIVEAU_ORDE, true) >= array_search($b, self::NIVEAU_ORDE, true)
            ? $a
            : $b;
    }

    /**
     * Vervang de rolkoppelingen van een gebruiker door precies $rolIds.
     * @param int[] $rolIds
     */
    private function zetRollen(PDO $pdo, int $gebruikerId, array $rolIds): void
    {
        $pdo->prepare('DELETE FROM gebruiker_rollen WHERE gebruiker_id = ?')->execute([$gebruikerId]);
        $insert = $pdo->prepare('INSERT INTO gebruiker_rollen (gebruiker_id, rol_id) VALUES (?, ?)');
        foreach ($rolIds as $rolId) {
            $insert->execute([$gebruikerId, (int) $rolId]);
        }
    }

    /** Voer $werk uit binnen een transactie; rolt terug bij een fout. Port van _inTransactie(). */
    private function inTransactie(callable $werk): void
    {
        $this->pdo->beginTransaction();
        try {
            $werk($this->pdo);
            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
            throw $e;
        }
    }
}
