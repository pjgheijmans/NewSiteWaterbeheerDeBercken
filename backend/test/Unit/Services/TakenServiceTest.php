<?php

declare(strict_types=1);

namespace Zwembad\Tests\Unit\Services;

use PHPUnit\Framework\TestCase;
use Zwembad\Repositories\IActiesRepository;
use Zwembad\Repositories\IRondetakenRepository;
use Zwembad\Services\TakenService;

/**
 * Test de samenstel-logica van de "Taken"-weergave met gemockte repositories
 * (geen DB): rondetaakcatalogus + acties → TaakItem[] met de juiste categorie,
 * prioriteit, het samenvouwen van filter_spoelen-acties en de reden/handeling-split.
 */
final class TakenServiceTest extends TestCase
{
    /** @param array<int,array<string,mixed>> $rondetaken @param array<int,array<string,mixed>> $acties */
    private function maakService(array $rondetaken, array $acties): TakenService
    {
        $rt = $this->createMock(IRondetakenRepository::class);
        $rt->method('getRondetaken')->willReturn($rondetaken);
        $acts = $this->createMock(IActiesRepository::class);
        $acts->method('getActies')->willReturn($acties);

        return new TakenService($rt, $acts);
    }

    private function rondetaak(string $sleutel, string $prioriteit, string $gebied = 'Diep'): array
    {
        return [
            'sleutel' => $sleutel, 'gebied' => $gebied, 'label' => "L $sleutel",
            'prioriteit' => $prioriteit, 'pagina' => 'grote-baden',
            'voltooid' => false, 'voltooid_op' => null, 'voltooid_door' => null,
        ];
    }

    private function vindItem(array $items, string $sleutel): array
    {
        foreach ($items as $i) {
            if ($i['sleutel'] === $sleutel) {
                return $i;
            }
        }
        self::fail("Geen taak-item met sleutel $sleutel");
    }

    public function testNormaleRondetaakZonderAlarmIsOverig(): void
    {
        $items = $this->maakService([$this->rondetaak('diep_haarfilter', 'normaal')], [])->getTaken('2026-06-26');
        $item = $this->vindItem($items, 'diep_haarfilter');

        self::assertSame('overig', $item['categorie']);
        self::assertSame('normaal', $item['prioriteit']);
        self::assertNull($item['reden']);
        self::assertSame(['type' => 'rondetaak', 'sleutel' => 'diep_haarfilter'], $item['bron']);
    }

    public function testKritiekeRondetaakIsBelangrijk(): void
    {
        $items = $this->maakService([$this->rondetaak('regelaar_diep', 'kritiek')], [])->getTaken('2026-06-26');
        self::assertSame('belangrijk', $this->vindItem($items, 'regelaar_diep')['categorie']);
    }

    public function testFilterRondetaakNeemtFilterSpoelenAlarmOver(): void
    {
        $acties = [[
            'id' => 7, 'bad_naam' => 'Diep', 'actie_type' => 'filter_spoelen_flow',
            'beschrijving' => 'Flow Diep onder 250 m³/h — Filter spoelen',
            'opgelost' => 0, 'opgelost_op' => null, 'opgelost_door' => null,
        ]];
        $items = $this->maakService([$this->rondetaak('diep_filter', 'normaal')], $acties)->getTaken('2026-06-26');

        // De filter_spoelen-actie wordt op de diep_filter-rondetaak samengevouwen,
        // dus er is GEEN los 'actie:7'-item.
        self::assertCount(1, $items);
        $item = $this->vindItem($items, 'diep_filter');
        self::assertSame('verplicht', $item['categorie']);
        self::assertSame('alarm', $item['prioriteit']);
        self::assertStringContainsString('Flow Diep onder 250 m³/h', $item['reden']);
    }

    public function testOverigeActieWordtLosAlarmItem(): void
    {
        $acties = [[
            'id' => 9, 'bad_naam' => 'Diep', 'actie_type' => 'chloor_bestellen',
            'beschrijving' => 'Chloorvoorraad onder 200 liter — Chloor bestellen',
            'opgelost' => 0, 'opgelost_op' => null, 'opgelost_door' => null,
        ]];
        $items = $this->maakService([], $acties)->getTaken('2026-06-26');
        $item = $this->vindItem($items, 'actie:9');

        self::assertSame('verplicht', $item['categorie']);
        self::assertSame('Algemeen', $item['gebied']); // facility-breed type
        self::assertSame('Chloor bestellen', $item['label']); // handeling = deel na " — "
        self::assertSame(['type' => 'actie', 'ids' => [9]], $item['bron']);
    }
}
