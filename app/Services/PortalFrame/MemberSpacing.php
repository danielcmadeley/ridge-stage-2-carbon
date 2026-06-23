<?php

namespace App\Services\PortalFrame;

class MemberSpacing
{
    /**
     * @return list<float>
     */
    public static function spacedOffsetsAlongSpan(
        float $totalLength,
        float $startOffset,
        float $endOffset,
        float $spacing,
    ): array {
        $maxOffset = $totalLength - $endOffset;

        if ($maxOffset < $startOffset - 1e-9 || $spacing <= 0) {
            return [];
        }

        $offsets = [];
        $position = $startOffset;

        while ($position <= $maxOffset + 1e-9) {
            $offsets[] = $position;
            $position += $spacing;
        }

        return $offsets;
    }
}
