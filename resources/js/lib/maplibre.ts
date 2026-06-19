import { Map } from 'maplibre-gl';
import type { MapOptions } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export function createMap(
    container: HTMLElement,
    options: Omit<MapOptions, 'container'>,
): Map {
    return new Map({
        container,
        ...options,
    });
}
