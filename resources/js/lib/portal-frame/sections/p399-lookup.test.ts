import { describe, expect, it } from 'vitest';
import { lookupP399Section } from '@/lib/portal-frame/sections/p399-lookup';

describe('lookupP399Section', () => {
    it('returns the exact tabulated section when inputs land on the grid', () => {
        expect(lookupP399Section('Rafter', 10, 6, 25)).toBe('356×171×45 UKB');
    });

    it('rounds a non-tabulated line load up to the next tabulated value', () => {
        // 9.75 kN/m should be selected using the 10 kN/m row (conservative).
        expect(lookupP399Section('Rafter', 9.75, 6, 20)).toBe(
            lookupP399Section('Rafter', 10, 6, 20),
        );
    });

    it('clamps a light line load up to the smallest tabulated value', () => {
        // Far below the 8 kN/m minimum still resolves to a valid (safe) section.
        expect(lookupP399Section('Rafter', 2, 6, 20)).toBe(
            lookupP399Section('Rafter', 8, 6, 20),
        );
    });

    it('rounds a non-tabulated eaves height up to the next tabulated value', () => {
        expect(lookupP399Section('Restrained Column', 10, 7, 25)).toBe(
            lookupP399Section('Restrained Column', 10, 8, 25),
        );
    });

    it('clamps line loads beyond the tabulated range to the heaviest section', () => {
        // Factored (ULS) line loads can exceed the 16 kN/m tabulated maximum;
        // rather than aborting the editor, the lookup falls back to the
        // heaviest available section (the 16 kN/m row).
        expect(lookupP399Section('Rafter', 18, 6, 20)).toBe(
            lookupP399Section('Rafter', 16, 6, 20),
        );
        expect(lookupP399Section('Rafter', 99, 6, 20)).toBe(
            lookupP399Section('Rafter', 16, 6, 20),
        );
    });

    it('flags eaves heights beyond the tabulated range as out of scope', () => {
        expect(() => lookupP399Section('Rafter', 10, 13, 20)).toThrow(
            /out of scope/i,
        );
    });

    it('flags spans beyond the tabulated range as out of scope', () => {
        expect(() => lookupP399Section('Rafter', 10, 6, 45)).toThrow(
            /out of scope/i,
        );
        expect(() => lookupP399Section('Rafter', 10, 6, 12)).toThrow(
            /out of scope/i,
        );
    });

    it('reports genuinely unavailable P399 combinations clearly', () => {
        // 15 m span at 12 m eaves is marked '*' (unavailable) in the table.
        expect(() => lookupP399Section('Rafter', 10, 12, 15)).toThrow(
            /no Rafter section/i,
        );
    });
});
