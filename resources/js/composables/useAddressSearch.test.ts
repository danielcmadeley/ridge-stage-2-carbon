import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAddressSearch } from '@/composables/useAddressSearch';
import { geocodeAddress } from '@/lib/map/geocode-address';

vi.mock('@/lib/map/geocode-address', () => ({
    geocodeAddress: vi.fn(),
}));

const geocodeAddressMock = vi.mocked(geocodeAddress);

const westminster = {
    label: 'Westminster, London',
    lng: -0.1246,
    lat: 51.4994,
};
const camden = { label: 'Camden, London', lng: -0.1426, lat: 51.5416 };

describe('useAddressSearch', () => {
    beforeEach(() => {
        geocodeAddressMock.mockReset();
    });

    it('reports the missing-team message when no team is selected', async () => {
        const search = useAddressSearch({
            teamSlug: () => null,
            missingTeamMessage: 'Select a team before searching.',
        });
        search.query.value = 'Westminster';

        await search.search();

        expect(search.error.value).toBe('Select a team before searching.');
        expect(geocodeAddressMock).not.toHaveBeenCalled();
    });

    it('requires at least three characters', async () => {
        const search = useAddressSearch({ teamSlug: () => 'ridge' });
        search.query.value = '  ab ';

        await search.search();

        expect(search.error.value).toBe(
            'Enter at least three characters to search.',
        );
        expect(geocodeAddressMock).not.toHaveBeenCalled();
    });

    it('stores multiple results without auto-selecting', async () => {
        geocodeAddressMock.mockResolvedValue([westminster, camden]);
        const onSingleResult = vi.fn();
        const search = useAddressSearch({
            teamSlug: () => 'ridge',
            onSingleResult,
        });
        search.query.value = 'London';

        await search.search();

        expect(search.results.value).toEqual([westminster, camden]);
        expect(search.error.value).toBeNull();
        expect(onSingleResult).not.toHaveBeenCalled();
    });

    it('auto-selects a lone match', async () => {
        geocodeAddressMock.mockResolvedValue([westminster]);
        const onSingleResult = vi.fn();
        const search = useAddressSearch({
            teamSlug: () => 'ridge',
            onSingleResult,
        });
        search.query.value = 'Westminster';

        await search.search();

        expect(onSingleResult).toHaveBeenCalledWith(westminster);
    });

    it('reports when nothing matches', async () => {
        geocodeAddressMock.mockResolvedValue([]);
        const search = useAddressSearch({ teamSlug: () => 'ridge' });
        search.query.value = 'Atlantis';

        await search.search();

        expect(search.error.value).toBe('No matching addresses were found.');
        expect(search.results.value).toEqual([]);
    });

    it('surfaces API errors and clears the searching flag', async () => {
        geocodeAddressMock.mockRejectedValue(new Error('Rate limited.'));
        const search = useAddressSearch({ teamSlug: () => 'ridge' });
        search.query.value = 'Westminster';

        await search.search();

        expect(search.error.value).toBe('Rate limited.');
        expect(search.isSearching.value).toBe(false);
    });
});
