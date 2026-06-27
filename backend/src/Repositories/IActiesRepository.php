<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IActiesRepository.ts.
 * genereerVerbruik/resolveFilterSpoelen/unresolveFilterSpoelen worden door
 * verbruik/rondetaken gebruikt en lopen alvast mee zodat die domeinen later
 * alleen nog hoeven te worden gewired.
 */
interface IActiesRepository
{
    /** @return array<int,array<string,mixed>> */
    public function getActies(string $datum): array;

    public function resolve(string $id, ?string $opgelostDoor): void;

    public function unresolve(string $id): void;

    /** Resolve alle open filter_spoelen_*-acties voor een bad op een datum. */
    public function resolveFilterSpoelen(string $badNaam, string $datum, ?string $door): void;

    /** Heropen alle filter_spoelen_*-acties voor een bad op een datum. */
    public function unresolveFilterSpoelen(string $badNaam, string $datum): void;

    /** @param array<string,mixed> $body */
    public function genereer(int $badId, string $datum, string $badNaam, array $body): void;

    /** @param array<string,mixed> $body */
    public function genereerVerbruik(string $datum, array $body): void;

    public function genereerBezoekers(string $datum, mixed $bezoekersVandaag): void;

    /** @return array<string,float> Totalen per bad (sleutel = bad-naam in kleine letters). */
    public function genereerSpoelbeurt(string $datum): array;

    public function genereerCoordinatoren(string $datum): void;

    /** @return array{diep:?float,ondiep:?float,peuterbad:?float} Dagmaximum gebonden chloor per bad. */
    public function getGebondenChloorMax(string $datum): array;
}
