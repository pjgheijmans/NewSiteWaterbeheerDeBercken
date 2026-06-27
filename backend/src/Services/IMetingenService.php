<?php

declare(strict_types=1);

namespace Zwembad\Services;

/**
 * Port van backend/services/IMetingenService.ts.
 */
interface IMetingenService
{
    /** @return array<int,array<string,mixed>> */
    public function getMetingen(string $datum): array;

    /**
     * @param array<string,mixed> $body
     * @return array{versie:int,auteur:?string,bijgewerkt_op:?string}
     */
    public function saveMeting(array $body, ?string $auteur): array;

    /** @return array<int,array<string,mixed>> */
    public function getActies(string $datum): array;

    /** @param array<string,mixed> $gebruiker */
    public function resolveActie(string $id, array $gebruiker): void;

    public function unresolveActie(string $id): void;

    /** @return array<string,mixed> */
    public function getBezoekers(string $datum): array;

    /** @return array<string,mixed> */
    public function getGebondenChloor(string $datum): array;
}
