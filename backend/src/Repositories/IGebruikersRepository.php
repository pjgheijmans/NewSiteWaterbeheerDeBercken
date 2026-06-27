<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IGebruikersRepository.ts.
 *
 * hashBestaandeWachtwoorden() (opstartmigratie in Node) is in PHP niet nodig:
 * de seed-accounts worden direct gehasht gezaaid.
 */
interface IGebruikersRepository
{
    /**
     * Zoek een gebruiker op inlognaam en verifieer het wachtwoord.
     * @return array<string,mixed>|null De gebruiker (zonder wachtwoord) of null.
     */
    public function findByLogin(string $inlognaam, string $wachtwoord): ?array;

    /**
     * Alle gebruikers (zonder wachtwoord), inclusief hun rol_ids.
     * @return array<int,array<string,mixed>>
     */
    public function getAll(): array;

    /** @param array<string,mixed> $data voornaam, achternaam, inlognaam, wachtwoord, rol_ids */
    public function create(array $data): void;

    /** @param array<string,mixed> $data zoals create(); leeg wachtwoord = ongewijzigd laten */
    public function update(string $id, array $data): void;

    public function remove(string $id): void;

    /**
     * Gebruikers (naamvelden) die minstens $minNiveau hebben in $domein.
     * @return array<int,array{voornaam:string,achternaam:string,inlognaam:string}>
     */
    public function getMetRecht(string $domein, string $minNiveau): array;

    /** Zaai de standaardgebruikers (gehasht) en koppel hun standaardrol; idempotent. */
    public function seedDefaults(): void;
}
