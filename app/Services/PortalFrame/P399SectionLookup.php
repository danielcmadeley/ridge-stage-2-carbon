<?php

namespace App\Services\PortalFrame;

use InvalidArgumentException;
use RuntimeException;

class P399SectionLookup
{
    /** @var array<int, int> */
    private const TABULATED_SPANS = [15, 20, 25, 30, 35, 40];

    /** @var array<string, string> */
    private array $entries = [];

    public function __construct(?string $csvPath = null)
    {
        $this->load($csvPath ?? base_path('data/p399-portal-frame-data.csv'));
    }

    public function snapSpan(float $span): int
    {
        $nearest = self::TABULATED_SPANS[0];
        $smallestDelta = abs($span - $nearest);

        foreach (self::TABULATED_SPANS as $tabulatedSpan) {
            $delta = abs($span - $tabulatedSpan);

            if ($delta < $smallestDelta) {
                $nearest = $tabulatedSpan;
                $smallestDelta = $delta;
            }
        }

        return $nearest;
    }

    public function lookup(string $memberType, float $lineLoadKnM, float $eavesHeightM, float $spanM): string
    {
        $lookupSpan = $this->snapSpan($spanM);
        $lineLoadKey = $this->normalizeNumericKey($lineLoadKnM);
        $eavesKey = $this->normalizeNumericKey($eavesHeightM);
        $entryKey = strtolower($memberType).'|'.$lineLoadKey.'|'.$eavesKey.'|'.$lookupSpan;

        if (! array_key_exists($entryKey, $this->entries)) {
            throw new InvalidArgumentException(
                "No P399 section found for {$memberType} at {$lineLoadKnM} kN/m, {$eavesHeightM} m eaves, {$lookupSpan} m span.",
            );
        }

        $designation = $this->entries[$entryKey];

        if ($designation === '*' || trim($designation) === '') {
            throw new InvalidArgumentException(
                "P399 section unavailable for {$memberType} at {$lineLoadKnM} kN/m, {$eavesHeightM} m eaves, {$lookupSpan} m span.",
            );
        }

        return $designation;
    }

    private function load(string $csvPath): void
    {
        if (! is_readable($csvPath)) {
            throw new RuntimeException("P399 data file not readable: {$csvPath}");
        }

        $handle = fopen($csvPath, 'r');

        if ($handle === false) {
            throw new RuntimeException("Could not open P399 data file: {$csvPath}");
        }

        fgetcsv($handle, escape: '\\');
        fgetcsv($handle, escape: '\\');

        $currentMemberType = null;

        while (($row = fgetcsv($handle, escape: '\\')) !== false) {
            if ($row === [null] || $row === false) {
                continue;
            }

            $memberType = trim((string) ($row[0] ?? ''));

            if ($memberType !== '') {
                $currentMemberType = $memberType;
            }

            if ($currentMemberType === null) {
                continue;
            }

            $lineLoad = trim((string) ($row[1] ?? ''));
            $eavesHeight = trim((string) ($row[2] ?? ''));

            if ($lineLoad === '' || $eavesHeight === '') {
                continue;
            }

            foreach (self::TABULATED_SPANS as $index => $tabulatedSpan) {
                $designation = trim((string) ($row[$index + 3] ?? ''));
                $entryKey = strtolower($currentMemberType).'|'.$lineLoad.'|'.$eavesHeight.'|'.$tabulatedSpan;
                $this->entries[$entryKey] = $designation;
            }
        }

        fclose($handle);
    }

    private function normalizeNumericKey(float $value): string
    {
        $normalized = number_format($value, 4, '.', '');
        $normalized = rtrim(rtrim($normalized, '0'), '.');

        return $normalized === '' ? '0' : $normalized;
    }
}
