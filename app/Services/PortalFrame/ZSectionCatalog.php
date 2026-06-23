<?php

namespace App\Services\PortalFrame;

use App\Data\ZSection;
use InvalidArgumentException;
use RuntimeException;

class ZSectionCatalog
{
    /** @var array<string, ZSection> */
    private array $sectionsByKey = [];

    public function __construct(?string $csvPath = null)
    {
        $this->load($csvPath ?? base_path('data/z_sections.csv'));
    }

    public function find(string $designation): ZSection
    {
        $normalizedKey = $this->normalizeDesignation($designation);

        if (! array_key_exists($normalizedKey, $this->sectionsByKey)) {
            throw new InvalidArgumentException("Z section not found for designation [{$designation}].");
        }

        return $this->sectionsByKey[$normalizedKey];
    }

    public function normalizeDesignation(string $designation): string
    {
        return strtolower(trim(preg_replace('/\s+/', ' ', $designation) ?? $designation));
    }

    private function load(string $csvPath): void
    {
        if (! is_readable($csvPath)) {
            throw new RuntimeException("Z sections file not readable: {$csvPath}");
        }

        $handle = fopen($csvPath, 'r');

        if ($handle === false) {
            throw new RuntimeException("Could not open Z sections file: {$csvPath}");
        }

        $headers = fgetcsv($handle, escape: '\\');

        if ($headers === false) {
            fclose($handle);

            throw new RuntimeException('Z sections file is empty.');
        }

        while (($row = fgetcsv($handle, escape: '\\')) !== false) {
            if ($row === [null] || ($row[0] ?? '') === '') {
                continue;
            }

            $section = new ZSection(
                name: (string) $row[0],
                depth: (float) $row[3],
                topFlange: (float) $row[4],
                bottomFlange: (float) $row[5],
                t: (float) $row[6],
                areaCm2: (float) $row[2],
            );

            $this->sectionsByKey[$this->normalizeDesignation($section->name)] = $section;
        }

        fclose($handle);
    }
}
