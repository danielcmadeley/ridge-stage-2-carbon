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
})->throws(InvalidArgumentException::class, 'P399 has no Rafter section');

test('p399 lookup rounds a non-tabulated eaves height up to the next tabulated value', function () {
    $lookup = new P399SectionLookup(portalFrameDataPath('p399-portal-frame-data.csv'));

    expect($lookup->lookup('Restrained Column', 10, 7, 25))
        ->toBe($lookup->lookup('Restrained Column', 10, 8, 25));
});

test('p399 lookup rounds a non-tabulated line load up to the next tabulated value', function () {
    $lookup = new P399SectionLookup(portalFrameDataPath('p399-portal-frame-data.csv'));

    expect($lookup->lookup('Rafter', 9.75, 6, 20))
        ->toBe($lookup->lookup('Rafter', 10, 6, 20));
});

test('p399 lookup clamps a light line load up to the smallest tabulated value', function () {
    $lookup = new P399SectionLookup(portalFrameDataPath('p399-portal-frame-data.csv'));

    expect($lookup->lookup('Rafter', 2, 6, 20))
        ->toBe($lookup->lookup('Rafter', 8, 6, 20));
});

test('p399 lookup rejects eaves heights beyond the tabulated range', function () {
    $lookup = new P399SectionLookup(portalFrameDataPath('p399-portal-frame-data.csv'));

    $lookup->lookup('Rafter', 10, 13, 20);
})->throws(InvalidArgumentException::class, 'out of scope');

test('portal frame geometry resolves sections for a non-tabulated eaves height', function () {
    $design = new PortalFrameDesign(
        span: 24.0,
        eavesHeight: 7.0,
        buildingLength: 40.0,
        baySpacing: 5.0,
        deadLoadKnM2: 1.25,
        servicesLoadKnM2: 0.25,
        liveLoadKnM2: 0.75,
        columnRestraint: 'restrained',
    );

    $result = portalFrameServices()->build($design);

    // Section lookup now runs on the ULS factored line load
    // (y_G.(dead+services) + y_Q.live) x bay = (1.35.1.5 + 1.5.0.75).5 = 15.75
    // -> snaps to the 16 kN/m row, so a heavier rafter/column is selected.
    expect($result['rafter']->name)->toBe('UB 356x171x67')
        ->and($result['column']->name)->toBe('UB 533x210x101');
});

test('portal frame geometry resolves screenshot example sections', function () {
    $result = portalFrameServices()->build(PortalFrameDesign::defaults());

    // Default loads (dead 0.30 + services 0.25 + live 0.60) kN/m2 over a 5 m
    // bay give a 5.75 kN/m characteristic line load (returned here) and an
    // 8.21 kN/m factored line load (used for section lookup -> snaps to 10).
    expect($result['rafterLineLoadKnM'])->toBe(5.75)
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
