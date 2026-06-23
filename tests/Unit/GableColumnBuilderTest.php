<?php

use App\Data\PortalFrameDesign;
use App\Data\UbSection;
use App\Services\PortalFrame\GableColumnBuilder;
use App\Services\PortalFrame\PurlinBuilder;

test('gable column builder spaces columns at six metre centres on each gable end', function () {
    $builder = new GableColumnBuilder(new PurlinBuilder);
    $design = PortalFrameDesign::defaults();
    $gableColumnSection = new UbSection(
        name: 'UB 203x133x25',
        h: 203.2,
        b: 133.2,
        tw: 5.7,
        tf: 7.8,
    );
    $rafterSection = new UbSection(
        name: 'UB 356x171x45',
        h: 356.0,
        b: 171.0,
        tw: 7.0,
        tf: 11.5,
    );

    expect($builder->gableColumnXPositions(24.0))->toBe([-12.0, -6.0, 0.0, 6.0, 12.0]);

    $members = $builder->build($design, $gableColumnSection, $rafterSection);

    expect(collect($members)->where('role', 'gable_column'))->toHaveCount(6);
    expect(collect($members)->where('role', 'foundation'))->toHaveCount(6);

    $midColumn = collect($members)->firstWhere('id', 'gable-front-column-1');
    expect($midColumn?->start)->toBe([-6.0, 0.0, 0.0]);
    expect($midColumn?->section->name)->toBe('UB 203x133x25');
    expect($midColumn?->end[2])->toBeGreaterThan($design->eavesHeight);

    $apexColumn = collect($members)->firstWhere('id', 'gable-front-column-2');
    expect($apexColumn?->end[2])->toBeGreaterThan($midColumn?->end[2]);
});
