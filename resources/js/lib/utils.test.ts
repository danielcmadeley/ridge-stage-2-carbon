import { describe, expect, it } from 'vitest';
import { reactive, ref } from 'vue';
import { deepToRaw } from '@/lib/utils';

describe('deepToRaw', () => {
    it('returns primitives unchanged', () => {
        expect(deepToRaw(24)).toBe(24);
        expect(deepToRaw('restrained')).toBe('restrained');
        expect(deepToRaw(null)).toBe(null);
    });

    it('unwraps nested reactive objects into plain values', () => {
        const design = reactive({
            span: 24,
            foundation: {
                type: 'reinforced_pad',
                assumptions: { concreteCoverM: 0.05 },
            },
        });

        const plain = deepToRaw(design);

        expect(plain).toEqual({
            span: 24,
            foundation: {
                type: 'reinforced_pad',
                assumptions: { concreteCoverM: 0.05 },
            },
        });
    });

    it('produces a tree that structuredClone can copy without DataCloneError', () => {
        const design = reactive({
            span: 24,
            foundation: {
                type: 'reinforced_pad',
                assumptions: { cover: 0.05 },
            },
        });

        expect(() => structuredClone(deepToRaw(design))).not.toThrow();
    });

    it('detaches the copy so mutating the source afterwards has no effect', () => {
        const design = reactive({ span: 24, foundation: { type: 'pad' } });
        const plain = deepToRaw(design);

        design.span = 30;
        design.foundation.type = 'two_pile_cap';

        expect(plain).toEqual({ span: 24, foundation: { type: 'pad' } });
    });

    it('unwraps refs and arrays of reactive objects', () => {
        const items = reactive([{ x: 1 }, { x: 2 }]);
        const count = ref(3);

        expect(deepToRaw({ items, count })).toEqual({
            items: [{ x: 1 }, { x: 2 }],
            count: 3,
        });
    });
});
