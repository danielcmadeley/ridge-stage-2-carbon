<?php

use App\Services\PortalFrame\ChsSectionCatalog;
use App\Services\PortalFrame\GableBracingBuilder;

test('chs catalog loads 114.3x5.0 CHS from the data file', function () {
    $catalog = new ChsSectionCatalog(dirname(__DIR__, 2).'/data/chs_sections.csv');

    $section = $catalog->find('114.3x5.0 CHS');

    expect($section->name)->toBe('114.3x5.0 CHS')
        ->and($section->d)->toBe(114.3)
        ->and($section->t)->toBe(5.0)
        ->and($section->areaCm2)->toBe(17.2);
});

test('gable bracing uses 114.3x5.0 CHS by default', function () {
    $catalog = new ChsSectionCatalog(dirname(__DIR__, 2).'/data/chs_sections.csv');
    $builder = new GableBracingBuilder($catalog);

    $braces = $builder->build(3, 5.0, 12.0, 6.0, 7.26);

    expect($braces)->toHaveCount(16)
        ->and(collect($braces)->every(fn ($member) => $member->section->name === '114.3x5.0 CHS'))
        ->toBeTrue();
});
