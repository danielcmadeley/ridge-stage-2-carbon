import { describe, expect, it } from 'vitest';
import { spacedOffsetsAlongSpan } from '@/lib/portal-frame/member-spacing';

describe('spacedOffsetsAlongSpan', () => {
    it('returns offsets from startOffset stepping by spacing until endOffset from far end', () => {
        expect(spacedOffsetsAlongSpan(12.07, 1.0, 0.25, 1.5)).toEqual([
            1.0, 2.5, 4.0, 5.5, 7.0, 8.5, 10.0, 11.5,
        ]);
    });

    it('returns empty array when usable span is non-positive', () => {
        expect(spacedOffsetsAlongSpan(1.0, 1.0, 0.25, 1.5)).toEqual([]);
        expect(spacedOffsetsAlongSpan(5.0, 1.0, 5.0, 1.5)).toEqual([]);
    });

    it('returns single offset when only one position fits', () => {
        expect(spacedOffsetsAlongSpan(2.0, 1.0, 0.5, 1.5)).toEqual([1.0]);
    });

    it('steps vertically for side rails up to eaves height', () => {
        expect(spacedOffsetsAlongSpan(6.0, 1.0, 0.0, 1.5)).toEqual([1.0, 2.5, 4.0, 5.5]);
    });
});
