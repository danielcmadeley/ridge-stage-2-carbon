<?php

use App\Services\PortalFrame\ChsSectionCatalog;
use App\Services\PortalFrame\GableBracingBuilder;

test('gable bracing adds wall and roof members on both gable ends', function () {
    $builder = new GableBracingBuilder(
        new ChsSectionCatalog(dirname(__DIR__, 2).'/data/chs_sections.csv'),
    );

    $braces = $builder->build(
        frameCount: 3,
        baySpacing: 5.0,
        halfSpan: 12.0,
        eavesHeight: 6.0,
        apexHeight: 7.26,
    );

    expect($braces)->toHaveCount(16)
        ->and(collect($braces)->firstWhere('id', 'gable-front-left-wall-ascending')?->start)
        ->toBe([-12.0, 0.0, 0.0])
        ->and(collect($braces)->firstWhere('id', 'gable-front-left-wall-ascending')?->end)
        ->toBe([-12.0, 5.0, 6.0])
        ->and(collect($braces)->firstWhere('id', 'gable-rear-right-roof-from-ridge')?->start)
        ->toBe([0.0, 10.0, 7.26]);
});

test('gable bracing is omitted when there is only one frame', function () {
    $builder = new GableBracingBuilder(
        new ChsSectionCatalog(dirname(__DIR__, 2).'/data/chs_sections.csv'),
    );

    expect($builder->build(1, 5.0, 12.0, 6.0, 7.26))->toBe([]);
});
