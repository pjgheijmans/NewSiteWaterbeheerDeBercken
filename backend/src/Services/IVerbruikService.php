<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/IVerbruikService.ts.
 */
interface IVerbruikService
{
    /** @return array<string,mixed> */
    public function getVerbruik(string $datum): array;

    /** @return array<string,mixed> */
    public function getVorigeVerbruik(string $datum): array;

    /**
     * @param array<string,mixed> $body
     * @return array{versie:int,auteur:?string,bijgewerkt_op:?string}
     */
    public function saveVerbruik(array $body, ?string $auteur): array;

    /** @return array<string,mixed> */
    public function getVerwarming(string $datum): array;

    /**
     * @param array<string,mixed> $body
     * @return array{versie:int,auteur:?string,bijgewerkt_op:?string}
     */
    public function saveVerwarming(array $body, ?string $auteur): array;
}
