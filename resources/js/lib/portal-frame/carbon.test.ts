import { describe, expect, it } from 'vitest';
import { carbonFactors } from '@/lib/portal-frame/carbon-factors';
import {
    calculatePortalFrameCarbon,
    CONNECTIONS_STEEL_ALLOWANCE,
    GROUND_FLOOR_SLAB_DEPTH_M,
    GROUND_FLOOR_SLAB_REBAR_DIAMETER_MM,
    GROUND_FLOOR_SLAB_REBAR_SPACING_M,
    HAUNCH_TAPER_MASS_FACTOR,
    STEEL_DENSITY_KG_M3,
} from '@/lib/portal-frame/carbon';
import { HAUNCH_LENGTH_FRACTION } from '@/lib/portal-frame/haunch-geometry';
import { scorsBandForIntensity } from '@/lib/portal-frame/scors';
import {
    defaultPortalFrameDesign,
    type PortalFrameDesign,
} from '@/types/portal-frame';

function expectCarbonMatchesMass(
    line: { massKg: number; carbonKg: number },
    factor: number,
): void {
    expect(line.massKg).toBeGreaterThan(0);
    expect(line.carbonKg).toBeCloseTo(line.massKg * factor, 6);
}

describe('calculatePortalFrameCarbon', () => {
    it('applies the steel section factor to columns, rafters, ties and bracing', () => {
        const carbon = calculatePortalFrameCarbon(defaultPortalFrameDesign());
        const { breakdown } = carbon;

        expectCarbonMatchesMass(breakdown.columns, carbonFactors.steelSection);
        expectCarbonMatchesMass(breakdown.gableColumns, carbonFactors.steelSection);
        expectCarbonMatchesMass(breakdown.rafters, carbonFactors.steelSection);
        expectCarbonMatchesMass(breakdown.haunches, carbonFactors.steelSection);
        expectCarbonMatchesMass(breakdown.ties, carbonFactors.steelSection);
        expectCarbonMatchesMass(breakdown.braces, carbonFactors.steelSection);
    });

    it('applies the galvanized steel factor to side rails and purlins', () => {
        const { breakdown } = calculatePortalFrameCarbon(defaultPortalFrameDesign());

        expectCarbonMatchesMass(breakdown.sideRails, carbonFactors.galvanizedSteel);
        expectCarbonMatchesMass(breakdown.purlins, carbonFactors.galvanizedSteel);
    });

    it('applies the concrete and rebar factors to foundations', () => {
        const { breakdown } = calculatePortalFrameCarbon(defaultPortalFrameDesign());

        expectCarbonMatchesMass(breakdown.concrete, carbonFactors.concrete);
        expectCarbonMatchesMass(breakdown.rebar, carbonFactors.rebar);
    });

    it('adds a 250mm ground floor slab concrete allowance', () => {
        const design = defaultPortalFrameDesign();
        const { breakdown } = calculatePortalFrameCarbon(design);
        const concreteDensityKgM3 =
            (design.foundation.assumptions.concreteDensityKnM3 * 1000) / 9.80665;
        const expectedMassKg =
            design.span *
            design.buildingLength *
            GROUND_FLOOR_SLAB_DEPTH_M *
            concreteDensityKgM3;

        expect(breakdown.slabConcrete.massKg).toBeCloseTo(expectedMassKg, 6);
        expectCarbonMatchesMass(breakdown.slabConcrete, carbonFactors.concrete);
    });

    it('adds H12 top and bottom slab reinforcement at 200mm centres each way', () => {
        const design = defaultPortalFrameDesign();
        const { breakdown } = calculatePortalFrameCarbon(design);
        const barAreaM2 =
            (Math.PI * (GROUND_FLOOR_SLAB_REBAR_DIAMETER_MM / 1000) ** 2) / 4;
        const expectedMassKg =
            design.span *
            design.buildingLength *
            barAreaM2 *
            (4 / GROUND_FLOOR_SLAB_REBAR_SPACING_M) *
            STEEL_DENSITY_KG_M3;

        expect(breakdown.slabRebar.massKg).toBeCloseTo(expectedMassKg, 6);
        expectCarbonMatchesMass(breakdown.slabRebar, carbonFactors.rebar);
    });

    it('adds a ten percent connections allowance to hot-rolled steel sections', () => {
        const carbon = calculatePortalFrameCarbon(defaultPortalFrameDesign());
        const { breakdown } = carbon;
        const steelSectionsMassKg =
            breakdown.columns.massKg +
            breakdown.gableColumns.massKg +
            breakdown.rafters.massKg +
            breakdown.haunches.massKg +
            breakdown.ties.massKg +
            breakdown.braces.massKg;

        expect(breakdown.connections.massKg).toBeCloseTo(
            steelSectionsMassKg * CONNECTIONS_STEEL_ALLOWANCE,
            6,
        );
        expectCarbonMatchesMass(breakdown.connections, carbonFactors.steelSection);
    });

    it('estimates haunch mass as a tapered fraction of the rafter run', () => {
        const { breakdown } = calculatePortalFrameCarbon(defaultPortalFrameDesign());

        expect(breakdown.haunches.massKg).toBeCloseTo(
            breakdown.rafters.massKg *
                HAUNCH_LENGTH_FRACTION *
                HAUNCH_TAPER_MASS_FACTOR,
            6,
        );
    });

    it('sums the steel section roles into the steel sections total', () => {
        const carbon = calculatePortalFrameCarbon(defaultPortalFrameDesign());
        const { breakdown } = carbon;

        const expectedSteel =
            breakdown.columns.carbonKg +
            breakdown.gableColumns.carbonKg +
            breakdown.rafters.carbonKg +
            breakdown.haunches.carbonKg +
            breakdown.ties.carbonKg +
            breakdown.braces.carbonKg;

        expect(carbon.steelSectionsCarbonKg).toBeCloseTo(expectedSteel, 6);
    });

    it('combines steel, rails, purlins, concrete and rebar into the total', () => {
        const carbon = calculatePortalFrameCarbon(defaultPortalFrameDesign());
        const { breakdown } = carbon;

        const expectedTotal =
            carbon.steelSectionsCarbonKg +
            breakdown.sideRails.carbonKg +
            breakdown.purlins.carbonKg +
            breakdown.concrete.carbonKg +
            breakdown.rebar.carbonKg +
            breakdown.slabConcrete.carbonKg +
            breakdown.slabRebar.carbonKg +
            breakdown.connections.carbonKg;

        expect(carbon.totalCarbonKg).toBeCloseTo(expectedTotal, 6);
        expect(carbon.totalCarbonKg).toBeGreaterThan(0);
    });

    it('counts no rebar when the foundation type carries no modelled reinforcement', () => {
        const design: PortalFrameDesign = {
            ...defaultPortalFrameDesign(),
            foundation: {
                ...defaultPortalFrameDesign().foundation,
                type: 'two_pile_cap',
            },
        };

        const { breakdown } = calculatePortalFrameCarbon(design);

        expect(breakdown.rebar.massKg).toBe(0);
        expect(breakdown.rebar.carbonKg).toBe(0);
        expect(breakdown.concrete.massKg).toBeGreaterThan(0);
    });

    it('reports carbon intensity over the gross floor area and its SCORS band', () => {
        const design = defaultPortalFrameDesign();
        const carbon = calculatePortalFrameCarbon(design);

        expect(carbon.floorAreaM2).toBeCloseTo(
            design.span * design.buildingLength,
            6,
        );
        expect(carbon.carbonIntensityKgM2).toBeCloseTo(
            carbon.totalCarbonKg / carbon.floorAreaM2,
            6,
        );
        expect(carbon.scorsBand).toBe(
            scorsBandForIntensity(carbon.carbonIntensityKgM2),
        );
    });

    it('scales total carbon with building length', () => {
        const base = calculatePortalFrameCarbon(defaultPortalFrameDesign());
        const longer = calculatePortalFrameCarbon({
            ...defaultPortalFrameDesign(),
            buildingLength: defaultPortalFrameDesign().buildingLength * 2,
        });

        expect(longer.totalCarbonKg).toBeGreaterThan(base.totalCarbonKg);
    });
});
