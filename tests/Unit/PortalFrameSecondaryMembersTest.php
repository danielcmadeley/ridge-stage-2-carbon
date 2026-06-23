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

test('portal frame geometry includes purlins and side rails', function () {
    $dataPath = static fn (string $filename): string => dirname(__DIR__, 2).'/data/'.$filename;
    $ubCatalog = new UbSectionCatalog($dataPath('ub-sections.csv'));

    $builder = new PortalFrameGeometryBuilder(
        new P399SectionLookup($dataPath('p399-portal-frame-data.csv')),
        $ubCatalog,
        new ZSectionCatalog($dataPath('z_sections.csv')),
        new CSectionCatalog($dataPath('c_sections.csv')),
        new GableBracingBuilder(new ChsSectionCatalog($dataPath('chs_sections.csv'))),
        new PurlinBuilder,
        new GableColumnBuilder(new PurlinBuilder),
        new SideRailBuilder,
    );

    $built = $builder->build(PortalFrameDesign::defaults());
    $purlins = array_values(array_filter(
        $built['members'],
        fn ($member) => $member->role === 'purlin',
    ));
    $sideRails = array_values(array_filter(
        $built['members'],
        fn ($member) => $member->role === 'side_rail',
    ));

    expect($purlins)->toHaveCount(16);
    expect($sideRails)->toHaveCount(16);
    expect($purlins[0]->section->name)->toBe('202 Z 16');
    expect($sideRails[0]->section->name)->toBe('202 C 16');

    $firstPurlin = $purlins[0];
    expect($firstPurlin->start[1])->toBe(0.0);
    expect($firstPurlin->end[1])->toBe(40.0);
    expect($firstPurlin->orientation)->toMatchArray([
        'halfSpan' => 12.0,
        'roofPitchDeg' => 6.0,
    ]);

    $leftHeights = array_map(
        fn ($member) => $member->start[2],
        array_values(array_filter(
            $sideRails,
            fn ($member) => str_starts_with($member->id, 'side-rail-left-'),
        )),
    );

    expect($leftHeights)->toBe([1.0, 2.5, 4.0, 5.5]);
});

test('purlin builder anchors the member so the Z bottom flange sits on the rafter top flange', function () {
    $dataPath = static fn (string $filename): string => dirname(__DIR__, 2).'/data/'.$filename;
    $ubCatalog = new UbSectionCatalog($dataPath('ub-sections.csv'));
    $zCatalog = new ZSectionCatalog($dataPath('z_sections.csv'));
    $lookup = new P399SectionLookup($dataPath('p399-portal-frame-data.csv'));
    $design = PortalFrameDesign::defaults();
    $rafterSection = $ubCatalog->find($lookup->lookup('Rafter', 10, 6, 24));
    $purlinSection = $zCatalog->find('202 Z 16');
    $builder = new PurlinBuilder;
    $rafterTop = $builder->pointOnRafterTopFlange($design, 'left', 1.0, $rafterSection);
    $anchor = $builder->purlinAnchorPoint($design, 'left', 1.0, $rafterSection, $purlinSection);

    expect($anchor['z'])->toBeGreaterThan($rafterTop['z']);
    expect($anchor['x'])->toBeLessThan($rafterTop['x']);
});

test('side rail builder anchors the member outside the column outer flange', function () {
    $dataPath = static fn (string $filename): string => dirname(__DIR__, 2).'/data/'.$filename;
    $ubCatalog = new UbSectionCatalog($dataPath('ub-sections.csv'));
    $cCatalog = new CSectionCatalog($dataPath('c_sections.csv'));
    $lookup = new P399SectionLookup($dataPath('p399-portal-frame-data.csv'));
    $columnSection = $ubCatalog->find($lookup->lookup('Restrained Column', 10, 6, 24));
    $gableColumnSection = $ubCatalog->find('UB 203x133x25');
    $sideRailSection = $cCatalog->find('202 C 16');
    $builder = new SideRailBuilder;
    $outerX = $builder->outerColumnFlangeX(12.0, $columnSection, 'left');
    $anchorX = $builder->sideRailAnchorX(12.0, $columnSection, $sideRailSection, 'left');

    expect($anchorX)->toBeLessThan($outerX);
    expect($anchorX)->toBe($outerX - ($sideRailSection->depth / 1000));
    expect($builder->sideRailAnchorX(12.0, $columnSection, $sideRailSection, 'right'))
        ->toBe($builder->outerColumnFlangeX(12.0, $columnSection, 'right') + ($sideRailSection->depth / 1000));
});

test('side rail builder anchors gable rails outside the gable column outer flange', function () {
    $dataPath = static fn (string $filename): string => dirname(__DIR__, 2).'/data/'.$filename;
    $ubCatalog = new UbSectionCatalog($dataPath('ub-sections.csv'));
    $cCatalog = new CSectionCatalog($dataPath('c_sections.csv'));
    $gableColumnSection = $ubCatalog->find('UB 203x133x25');
    $sideRailSection = $cCatalog->find('202 C 16');
    $builder = new SideRailBuilder;
    $outerY = $builder->outerGableColumnFlangeY(0.0, $gableColumnSection, 'front');
    $frontAnchorY = $builder->sideRailGableAnchorY(0.0, $gableColumnSection, $sideRailSection, 'front');

    expect($frontAnchorY)->toBeLessThan($outerY);
    expect($frontAnchorY)->toBe($outerY - ($sideRailSection->depth / 1000));
    expect($builder->sideRailGableAnchorY(40.0, $gableColumnSection, $sideRailSection, 'rear'))
        ->toBe($builder->outerGableColumnFlangeY(40.0, $gableColumnSection, 'rear') + ($sideRailSection->depth / 1000));
});

test('portal frame geometry includes two piles under each selected pile cap', function () {
    $dataPath = static fn (string $filename): string => dirname(__DIR__, 2).'/data/'.$filename;
    $ubCatalog = new UbSectionCatalog($dataPath('ub-sections.csv'));

    $builder = new PortalFrameGeometryBuilder(
        new P399SectionLookup($dataPath('p399-portal-frame-data.csv')),
        $ubCatalog,
        new ZSectionCatalog($dataPath('z_sections.csv')),
        new CSectionCatalog($dataPath('c_sections.csv')),
        new GableBracingBuilder(new ChsSectionCatalog($dataPath('chs_sections.csv'))),
        new PurlinBuilder,
        new GableColumnBuilder(new PurlinBuilder),
        new SideRailBuilder,
    );
    $design = PortalFrameDesign::fromArray([
        ...PortalFrameDesign::defaults()->toArray(),
        'foundation' => [
            'type' => 'two_pile_cap',
            'assumptions' => PortalFrameDesign::defaultFoundationAssumptions(),
        ],
    ]);

    $members = $builder->build($design)['members'];
    $firstLeftPiles = array_values(array_filter(
        $members,
        fn ($member) => str_starts_with($member->id, 'frame-0-pile-left-'),
    ));

    expect($firstLeftPiles)->toHaveCount(2);
    expect($firstLeftPiles[0]->pile)->toMatchArray([
        'diameter' => 0.45,
        'depth' => 6.0,
    ]);
    expect(abs($firstLeftPiles[1]->start[0] - $firstLeftPiles[0]->start[0]))->toEqualWithDelta(0.45 * 3, 1e-9);
});
