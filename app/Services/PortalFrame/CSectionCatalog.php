<?php

namespace App\Services\PortalFrame;

use App\Data\CSection;
use InvalidArgumentException;
use RuntimeException;

class CSectionCatalog
{
    /** @var array<string, CSection> */
    private array $sectionsByKey = [];

    public function __construct(?string $csvPath = null)
    {
        $this->load($csvPath ?? base_path('data/c_sections.csv'));
    }

    public function find(string $designation): CSection
    {
        $normalizedKey = $this->normalizeDesignation($designation);

        if (! array_key_exists($normalizedKey, $this->sectionsByKey)) {
            throw new InvalidArgumentException("C section not found for designation [{$designation}].");
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
            throw new RuntimeException("C sections file not readable: {$csvPath}");
        }

        $handle = fopen($csvPath, 'r');

        if ($handle === false) {
            throw new RuntimeException("Could not open C sections file: {$csvPath}");
        }

        $headers = fgetcsv($handle, escape: '\\');

        if ($headers === false) {
            fclose($handle);

            throw new RuntimeException('C sections file is empty.');
        }

        while (($row = fgetcsv($handle, escape: '\\')) !== false) {
            if ($row === [null] || ($row[0] ?? '') === '') {
                continue;
            }

            $section = new CSection(
                name: (string) $row[0],
                depth: (float) $row[3],
                flange: (float) $row[4],
                t: (float) $row[5],
                areaCm2: (float) $row[2],
            );

            $this->sectionsByKey[$this->normalizeDesignation($section->name)] = $section;
        }

        fclose($handle);
    }
}
