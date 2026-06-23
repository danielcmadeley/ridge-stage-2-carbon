<?php

use App\Data\PortalFrameDesign;
use App\Services\PortalFrame\ChsSectionCatalog;
use App\Services\PortalFrame\CSectionCatalog;
use App\Services\PortalFrame\GableBracingBuilder;
use App\Services\PortalFrame\GableColumnBuilder;
use App\Services\PortalFrame\P399SectionLookup;
use App\Services\PortalFrame\PortalFrameGeometryBuilder;
use App\Services\PortalFrame\PurlinBuilder;
use App\Services\PortalFrame\SideRailBuilder;
use App\Services\PortalFrame\UbSectionCatalog;
use App\Services\PortalFrame\ZSectionCatalog;

function portalFrameDataPath(string $filename): string
{
    return dirname(__DIR__, 2).'/data/'.$filename;
}

function portalFrameServices(): PortalFrameGeometryBuilder
{
    $ubCatalog = new UbSectionCatalog(portalFrameDataPath('ub-sections.csv'));
    $chsCatalog = new ChsSectionCatalog(portalFrameDataPath('chs_sections.csv'));

    return new PortalFrameGeometryBuilder(
        new P399SectionLookup(portalFrameDataPath('p399-portal-frame-data.csv')),
        $ubCatalog,
        new ZSectionCatalog(portalFrameDataPath('z_sections.csv')),
        new CSectionCatalog(portalFrameDataPath('c_sections.csv')),
        new GableBracingBuilder($chsCatalog),
        new PurlinBuilder,
        new GableColumnBuilder(new PurlinBuilder),
        new SideRailBuilder,
    );
}

test('p399 lookup snaps span and resolves rafter section', function () {
    $lookup = new P399SectionLookup(portalFrameDataPath('p399-portal-frame-data.csv'));

    expect($lookup->snapSpan(24))->toBe(25)
        ->and($lookup->lookup('Rafter', 10, 6, 24))->toBe('356×171×45 UKB');
});

test('p399 lookup resolves restrained column section', function () {
    $lookup = new P399SectionLookup(portalFrameDataPath('p399-portal-frame-data.csv'));

    expect($lookup->lookup('Restrained Column', 10, 6, 24))->toBe('406×178×74 UKB');
});

test('p399 lookup rejects unavailable sections', function () {
    $lookup = new P399SectionLookup(portalFrameDataPath('p399-portal-frame-data.csv'));

    $lookup->lookup('Rafter', 8, 12, 15);
})->throws(InvalidArgumentException::class, 'P399 section unavailable');

test('portal frame geometry resolves screenshot example sections', function () {
    $result = portalFrameServices()->build(PortalFrameDesign::defaults());

    expect($result['rafterLineLoadKnM'])->toBe(10.0)
        ->and($result['lookupSpanM'])->toBe(25)
        ->and($result['rafter']->name)->toBe('UB 356x171x45')
        ->and($result['column']->name)->toBe('UB 406x178x74');
});

test('portal frame geometry creates expected member counts', function () {
    // Defaults: 40 m building length at 5 m bay spacing -> 8 bays -> 9 frames.
    $members = portalFrameServices()->build(PortalFrameDesign::defaults())['members'];

    expect($members)->toHaveCount(116)
        ->and(collect($members)->where('role', 'column'))->toHaveCount(18)
        ->and(collect($members)->where('role', 'gable_column'))->toHaveCount(6)
        ->and(collect($members)->where('role', 'rafter'))->toHaveCount(18)
        ->and(collect($members)->where('role', 'foundation'))->toHaveCount(24)
        ->and(collect($members)->where('role', 'tie'))->toHaveCount(2)
        ->and(collect($members)->where('role', 'brace'))->toHaveCount(16)
        ->and(collect($members)->where('role', 'purlin'))->toHaveCount(16)
        ->and(collect($members)->where('role', 'side_rail'))->toHaveCount(16);
});
