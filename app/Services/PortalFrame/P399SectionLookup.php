<?php

namespace App\Services\PortalFrame;

use InvalidArgumentException;
use RuntimeException;

class P399SectionLookup
{
    /** @var array<int, int> */
    private const TABULATED_SPANS = [15, 20, 25, 30, 35, 40];

    private const SNAP_TOLERANCE = 1e-6;

    /** @var array<string, string> */
    private array $entries = [];

    /** @var list<float> */
    private array $lineLoadsKnM = [];

    /** @var list<float> */
    private array $eavesHeightsM = [];

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
        $minSpan = self::TABULATED_SPANS[0];
        $maxSpan = self::TABULATED_SPANS[array_key_last(self::TABULATED_SPANS)];

        if ($spanM < $minSpan - self::SNAP_TOLERANCE || $spanM > $maxSpan + self::SNAP_TOLERANCE) {
            throw new InvalidArgumentException(
                "P399 covers spans from {$minSpan} m to {$maxSpan} m; {$spanM} m is out of scope.",
            );
        }

        $lookupLineLoad = $this->snapUpToTabulated($lineLoadKnM, $this->lineLoadsKnM);

        // Factored (ULS) line loads can exceed the tabulated preliminary-sizing
        // range; clamp to the heaviest tabulated entry so the heaviest available
        // section is returned rather than aborting the export.
        if ($lookupLineLoad === null) {
            $lookupLineLoad = $this->lineLoadsKnM[array_key_last($this->lineLoadsKnM)];
        }

        $lookupEavesHeight = $this->snapUpToTabulated($eavesHeightM, $this->eavesHeightsM);

        if ($lookupEavesHeight === null) {
            $maxEavesHeight = $this->eavesHeightsM[array_key_last($this->eavesHeightsM)];

            throw new InvalidArgumentException(
                "P399 covers eaves heights up to {$maxEavesHeight} m; {$eavesHeightM} m is out of scope.",
            );
        }

        $lookupSpan = $this->snapSpan($spanM);
        $entryKey = strtolower($memberType).'|'
            .$this->normalizeNumericKey($lookupLineLoad).'|'
            .$this->normalizeNumericKey($lookupEavesHeight).'|'
            .$lookupSpan;

        if (! array_key_exists($entryKey, $this->entries)) {
            throw new InvalidArgumentException(
                "P399 has no {$memberType} section for {$lookupLineLoad} kN/m, {$lookupEavesHeight} m eaves, {$lookupSpan} m span.",
            );
        }

        $designation = $this->entries[$entryKey];

        if ($designation === '*' || trim($designation) === '') {
            throw new InvalidArgumentException(
                "P399 has no {$memberType} section for {$lookupLineLoad} kN/m, {$lookupEavesHeight} m eaves, {$lookupSpan} m span.",
            );
        }

        return $designation;
    }

    /**
     * @param  list<float>  $tabulated
     */
    private function snapUpToTabulated(float $value, array $tabulated): ?float
    {
        foreach ($tabulated as $candidate) {
            if ($candidate >= $value - self::SNAP_TOLERANCE) {
                return $candidate;
            }
        }

        return null;
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
        $lineLoadSet = [];
        $eavesHeightSet = [];

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

            $lineLoadValue = (float) $lineLoad;
            $eavesHeightValue = (float) $eavesHeight;
            $lineLoadSet[(string) $lineLoadValue] = $lineLoadValue;
            $eavesHeightSet[(string) $eavesHeightValue] = $eavesHeightValue;

            foreach (self::TABULATED_SPANS as $index => $tabulatedSpan) {
                $designation = trim((string) ($row[$index + 3] ?? ''));
                $entryKey = strtolower($currentMemberType).'|'.$lineLoad.'|'.$eavesHeight.'|'.$tabulatedSpan;
                $this->entries[$entryKey] = $designation;
            }
        }

        fclose($handle);

        $this->lineLoadsKnM = array_values($lineLoadSet);
        sort($this->lineLoadsKnM, SORT_NUMERIC);
        $this->eavesHeightsM = array_values($eavesHeightSet);
        sort($this->eavesHeightsM, SORT_NUMERIC);
    }

    private function normalizeNumericKey(float $value): string
    {
        $normalized = number_format($value, 4, '.', '');
        $normalized = rtrim(rtrim($normalized, '0'), '.');

        return $normalized === '' ? '0' : $normalized;
    }
}
