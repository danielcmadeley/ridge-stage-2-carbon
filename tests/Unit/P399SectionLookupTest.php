<?php

use App\Data\PortalFrameDesign;
use App\Services\PortalFrame\P399SectionLookup;
use App\Services\PortalFrame\PortalFrameGeometryBuilder;
use App\Services\PortalFrame\UbSectionCatalog;

function portalFrameDataPath(string $filename): string
{
    return dirname(__DIR__, 2).'/data/'.$filename;
}

function portalFrameServices(): PortalFrameGeometryBuilder
{
    return new PortalFrameGeometryBuilder(
        new P399SectionLookup(portalFrameDataPath('p399-portal-frame-data.csv')),
        new UbSectionCatalog(portalFrameDataPath('ub-sections.csv')),
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
    $members = portalFrameServices()->build(PortalFrameDesign::defaults())['members'];

    expect($members)->toHaveCount(48)
        ->and(collect($members)->where('role', 'column'))->toHaveCount(16)
        ->and(collect($members)->where('role', 'rafter'))->toHaveCount(16)
        ->and(collect($members)->where('role', 'foundation'))->toHaveCount(16);
});
