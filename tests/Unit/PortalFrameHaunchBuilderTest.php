<?php

use App\Data\PortalFrameDesign;
use App\Services\PortalFrame\ChsSectionCatalog;
use App\Services\PortalFrame\CSectionCatalog;
use App\Services\PortalFrame\GableBracingBuilder;
use App\Services\PortalFrame\GableColumnBuilder;
use App\Services\PortalFrame\P399SectionLookup;
use App\Services\PortalFrame\PortalFrameDesignResolver;
use App\Services\PortalFrame\PortalFrameGeometryBuilder;
use App\Services\PortalFrame\PortalFrameHaunchBuilder;
use App\Services\PortalFrame\PortalFrameRenderAdjustments;
use App\Services\PortalFrame\PurlinBuilder;
use App\Services\PortalFrame\SideRailBuilder;
use App\Services\PortalFrame\UbSectionCatalog;
use App\Services\PortalFrame\ZSectionCatalog;

function portalFrameExportResolver(): PortalFrameDesignResolver
{
    $dataPath = static fn (string $filename): string => dirname(__DIR__, 2).'/data/'.$filename;
    $ubCatalog = new UbSectionCatalog($dataPath('ub-sections.csv'));

    return new PortalFrameDesignResolver(
        new PortalFrameGeometryBuilder(
            new P399SectionLookup($dataPath('p399-portal-frame-data.csv')),
            $ubCatalog,
            new ZSectionCatalog($dataPath('z_sections.csv')),
            new CSectionCatalog($dataPath('c_sections.csv')),
            new GableBracingBuilder(new ChsSectionCatalog($dataPath('chs_sections.csv'))),
            new PurlinBuilder,
            new GableColumnBuilder(new PurlinBuilder),
            new SideRailBuilder,
        ),
        new PortalFrameRenderAdjustments,
        new PortalFrameHaunchBuilder,
    );
}

test('builds one eaves haunch per rafter for export', function () {
    $design = PortalFrameDesign::fromArray([
        'span' => 24,
        'eavesHeight' => 6,
        'buildingLength' => 40,
        'baySpacing' => 5,
        'deadLoadKnM2' => 1.25,
        'liveLoadKnM2' => 0.75,
        'columnRestraint' => 'restrained',
        'roofPitchDeg' => 6,
    ]);

    $resolved = portalFrameExportResolver()->resolveForExport($design);
    $rafterCount = count(array_filter(
        $resolved['members'],
        static fn (array $member): bool => $member['role'] === 'rafter',
    ));

    expect($resolved['haunches'])->toHaveCount($rafterCount);
    expect($resolved['haunches'][0]['id'])->toBe('frame-0-haunch-left');
    expect($resolved['haunches'][0]['role'])->toBe('haunch');
    expect($resolved['haunches'][0]['section']['name'])->toBe('UB 356x171x45');
});

test('uses the rafter UB section and 10% length for haunches', function () {
    $design = PortalFrameDesign::fromArray([
        'span' => 24,
        'eavesHeight' => 6,
        'buildingLength' => 10,
        'baySpacing' => 5,
        'deadLoadKnM2' => 1.25,
        'liveLoadKnM2' => 0.75,
        'columnRestraint' => 'restrained',
        'roofPitchDeg' => 6,
    ]);

    $resolved = portalFrameExportResolver()->resolveForExport($design);
    $renderRafter = collect($resolved['members'])->first(
        static fn (array $member): bool => $member['id'] === 'frame-0-rafter-left',
    );
    $haunch = collect($resolved['haunches'])->first(
        static fn (array $member): bool => $member['id'] === 'frame-0-haunch-left',
    );

    $analysisLength = 12 / cos(deg2rad(6));
    $haunchLength = sqrt(
        ($haunch['end'][0] - $haunch['start'][0]) ** 2
        + ($haunch['end'][1] - $haunch['start'][1]) ** 2
        + ($haunch['end'][2] - $haunch['start'][2]) ** 2
    );

    expect($haunch['section']['h'])->toEqualWithDelta(
        $renderRafter['section']['h'],
        0.000001,
    );
    expect($haunchLength)->toEqualWithDelta(
        $analysisLength * PortalFrameHaunchBuilder::HAUNCH_LENGTH_FRACTION,
        0.000001,
    );
});
