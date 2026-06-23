<?php

namespace App\Services\PortalFrame;

use App\Data\UbSection;
use InvalidArgumentException;
use RuntimeException;

class UbSectionCatalog
{
    /** @var array<string, UbSection> */
    private array $sectionsByKey = [];

    public function __construct(?string $csvPath = null)
    {
        $this->load($csvPath ?? base_path('data/ub-sections.csv'));
    }

    public function find(string $designation): UbSection
    {
        $normalizedKey = $this->normalizeDesignation($designation);

        if (! array_key_exists($normalizedKey, $this->sectionsByKey)) {
            throw new InvalidArgumentException("UB section not found for designation [{$designation}].");
        }

        return $this->sectionsByKey[$normalizedKey];
    }

    public function normalizeDesignation(string $designation): string
    {
        $normalized = str_replace(['×', ' '], ['x', ''], $designation);
        $normalized = preg_replace('/UKB$/i', '', $normalized) ?? $normalized;
        $normalized = trim($normalized, "x \t\n\r\0\x0B");

        if (str_starts_with(strtoupper($normalized), 'UB')) {
            return strtolower($normalized);
        }

        return 'ub '.$normalized;
    }

    private function load(string $csvPath): void
    {
        if (! is_readable($csvPath)) {
            throw new RuntimeException("UB sections file not readable: {$csvPath}");
        }

        $handle = fopen($csvPath, 'r');

        if ($handle === false) {
            throw new RuntimeException("Could not open UB sections file: {$csvPath}");
        }

        $headers = fgetcsv($handle, escape: '\\');

        if ($headers === false) {
            fclose($handle);

            throw new RuntimeException('UB sections file is empty.');
        }

        while (($row = fgetcsv($handle, escape: '\\')) !== false) {
            if ($row === [null] || ($row[0] ?? '') === '') {
                continue;
            }

            $section = new UbSection(
                name: (string) $row[0],
                h: (float) $row[1],
                b: (float) $row[2],
                tw: (float) $row[3],
                tf: (float) $row[4],
            );

            $this->sectionsByKey[$this->normalizeDesignation($section->name)] = $section;
            $this->sectionsByKey[$this->normalizeDesignation(str_replace('UB ', '', $section->name))] = $section;
        }

        fclose($handle);
    }
}
