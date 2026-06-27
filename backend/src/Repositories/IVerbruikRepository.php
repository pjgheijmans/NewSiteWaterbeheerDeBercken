<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IVerbruikRepository.ts.
 */
interface IVerbruikRepository
{
    /** @return array<string,mixed> Verbruiksrij voor de dag, of [] als er niets is. */
    public function getVerbruik(string $datum): array;

    /** @return array<string,mixed> Verbruiksrij van de vorige dag, of []. */
    public function getVorigeVerbruik(string $datum): array;

    /**
     * @param array<string,mixed> $data
     * @return array{versie:int,auteur:?string,bijgewerkt_op:?string}
     */
    public function saveVerbruik(array $data, ?string $auteur, ?int $verwachteVersie): array;

    /** @return array<string,mixed> Verwarmingsrij voor de dag, of []. */
    public function getVerwarming(string $datum): array;

    /**
     * @param array<string,mixed> $data
     * @return array{versie:int,auteur:?string,bijgewerkt_op:?string}
     */
    public function saveVerwarming(array $data, ?string $auteur, ?int $verwachteVersie): array;
}
