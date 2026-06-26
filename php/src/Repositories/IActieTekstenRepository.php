<?php

declare(strict_types=1);

namespace Zwembad\Repositories;

/**
 * Port van backend/repositories/IActieTekstenRepository.ts (endpoint-deel).
 * getSjablonen()/seedDefaults()/render() komen erbij bij het porten van de
 * actie-generatie en het database-(seed)domein.
 */
interface IActieTekstenRepository
{
    /** @return list<array{actie_sleutel:string,sjabloon:string,omschrijving:?string}> Defaults + DB-overrides. */
    public function getAll(): array;

    /** @return list<array{actie_sleutel:string,sjabloon:string,omschrijving:?string}> Alleen de ingebouwde defaults. */
    public function getDefaults(): array;

    /** @return array<string,string> Sleutel → sjabloon (defaults + DB-overrides); voor de actiegeneratie. */
    public function getSjablonen(): array;

    /** @param array{actie_sleutel:string,sjabloon:string} $data */
    public function save(array $data): void;
}
