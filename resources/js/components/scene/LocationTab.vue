<script setup lang="ts">
import { Search } from '@lucide/vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { GeocodedAddress } from '@/lib/map/geocode-address';
import type { BuildingRotation, CustomBuilding } from '@/types/custom-building';

export type RotationAxis = 0 | 1 | 2;

defineProps<{
    searchResults: GeocodedAddress[];
    searchError: string | null;
    isSearching: boolean;
    rotation: BuildingRotation;
    placedBuildings: CustomBuilding[];
    bounds: { width: number; depth: number; height: number };
}>();

const emit = defineEmits<{
    search: [];
    placeAt: [result: GeocodedAddress];
    updateRotation: [axis: RotationAxis, value: number];
    flyTo: [buildingId: string];
    remove: [buildingId: string];
}>();

const query = defineModel<string>('query', { required: true });

const rotationFields: { id: string; label: string; axis: RotationAxis }[] = [
    { id: 'rotation-x', label: 'Rotation X (rad)', axis: 0 },
    { id: 'rotation-y', label: 'Rotation Y (rad)', axis: 1 },
    { id: 'rotation-z', label: 'Rotation Z (rad)', axis: 2 },
];

function emitRotation(axis: RotationAxis, value: string | number): void {
    const parsed = typeof value === 'number' ? value : Number(value);

    if (!Number.isFinite(parsed)) {
        return;
    }

    emit('updateRotation', axis, parsed);
}
</script>

<template>
    <div class="flex flex-col gap-4" role="tabpanel" aria-label="Location">
        <div class="grid w-full gap-2">
            <Label for="address">Postcode or address</Label>
            <Input
                id="address"
                v-model="query"
                placeholder="e.g. SW1A 1AA or 10 Downing Street"
                @keydown.enter.prevent="emit('search')"
            />
        </div>

        <p v-if="searchError" class="w-full text-sm text-destructive">
            {{ searchError }}
        </p>

        <ul
            v-if="searchResults.length > 1"
            class="max-h-40 w-full space-y-2 overflow-y-auto"
        >
            <li
                v-for="(result, index) in searchResults"
                :key="`${result.lng}-${result.lat}-${index}`"
            >
                <button
                    type="button"
                    class="w-full rounded-md border border-sidebar-border/70 px-3 py-2 text-left text-sm hover:bg-muted"
                    @click="emit('placeAt', result)"
                >
                    {{ result.label }}
                </button>
            </li>
        </ul>

        <Button class="w-full" :disabled="isSearching" @click="emit('search')">
            <Search class="size-4" />
            {{ isSearching ? 'Searching…' : 'Find on map' }}
        </Button>

        <div class="grid grid-cols-3 gap-3">
            <div
                v-for="field in rotationFields"
                :key="field.id"
                class="grid gap-2"
            >
                <Label :for="field.id">{{ field.label }}</Label>
                <Input
                    :id="field.id"
                    :model-value="rotation[field.axis]"
                    type="number"
                    step="0.1"
                    @update:model-value="
                        (value) => emitRotation(field.axis, value)
                    "
                />
            </div>
        </div>

        <div v-if="placedBuildings.length > 0" class="grid gap-2">
            <Label>Placed buildings</Label>
            <ul class="space-y-2">
                <li
                    v-for="building in placedBuildings"
                    :key="building.id"
                    class="flex items-center justify-between rounded-md border border-sidebar-border/70 px-3 py-2 text-sm"
                >
                    <button
                        type="button"
                        class="text-left hover:underline"
                        @click="emit('flyTo', building.id)"
                    >
                        {{ building.portalFrame.span }}m span ×
                        {{ building.portalFrame.buildingLength }}m
                    </button>
                    <Button
                        variant="ghost"
                        size="sm"
                        @click="emit('remove', building.id)"
                    >
                        Remove
                    </Button>
                </li>
            </ul>
        </div>

        <p class="w-full text-xs text-muted-foreground">
            Envelope: {{ bounds.width.toFixed(1) }}m ×
            {{ bounds.depth.toFixed(1) }}m × {{ bounds.height.toFixed(1) }}m
            apex
        </p>
    </div>
</template>
