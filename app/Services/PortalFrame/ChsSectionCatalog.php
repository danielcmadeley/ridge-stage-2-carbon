<?php

namespace App\Services\PortalFrame;

use App\Data\ChsSection;
use InvalidArgumentException;
use RuntimeException;

class ChsSectionCatalog
{
    /** @var array<string, ChsSection> */
    private array $sectionsByKey = [];

    public function __construct(?string $csvPath = null)
    {
        $this->load($csvPath ?? base_path('data/chs_sections.csv'));
    }

    public function find(string $designation): ChsSection
    {
        $normalizedKey = $this->normalizeDesignation($designation);

        if (! array_key_exists($normalizedKey, $this->sectionsByKey)) {
            throw new InvalidArgumentException("CHS section not found for designation [{$designation}].");
        }

        return $this->sectionsByKey[$normalizedKey];
    }

    public function normalizeDesignation(string $designation): string
    {
        $normalized = str_replace(['×', ' '], ['x', ''], strtolower($designation));

        if (str_starts_with($normalized, 'chs')) {
            $normalized = substr($normalized, 3);
        }

        if (str_ends_with($normalized, 'chs')) {
            $normalized = substr($normalized, 0, -3);
        }

        $normalized = trim($normalized, 'x');

        return 'chs '.$normalized;
    }

    private function load(string $csvPath): void
    {
        if (! is_readable($csvPath)) {
            throw new RuntimeException("CHS sections file not readable: {$csvPath}");
        }

        $handle = fopen($csvPath, 'r');

        if ($handle === false) {
            throw new RuntimeException("Could not open CHS sections file: {$csvPath}");
        }

        for ($headerRow = 0; $headerRow < 5; $headerRow++) {
            if (fgetcsv($handle, escape: '\\') === false) {
                fclose($handle);

                throw new RuntimeException('CHS sections file is empty.');
            }
        }

        $currentDiameter = null;

        while (($row = fgetcsv($handle, escape: '\\')) !== false) {
            if ($row === [null]) {
                continue;
            }

            if (($row[0] ?? '') !== '') {
                $currentDiameter = (float) $row[0];
            }

            if ($currentDiameter === null || ($row[1] ?? '') === '') {
                continue;
            }

            $thickness = (float) $row[1];
            $thicknessLabel = (string) $row[1];
            $name = "{$currentDiameter}x{$thicknessLabel} CHS";

            $section = new ChsSection(
                name: $name,
                d: $currentDiameter,
                t: $thickness,
                areaCm2: (float) $row[3],
            );

            $this->sectionsByKey[$this->normalizeDesignation($name)] = $section;
            $this->sectionsByKey[$this->normalizeDesignation("{$currentDiameter}x{$thicknessLabel}")] = $section;
        }

        fclose($handle);
    }
}
