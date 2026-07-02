import { CanvasTexture, Sprite, SpriteMaterial } from 'three';

export const GRID_LABEL_SIZE_M = 1.2;

export function createCircleLabelSprite(text: string): Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Unable to create column grid label canvas.');
    }

    const fontSize = 72;
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    const metrics = context.measureText(text);
    canvas.width = Math.ceil(metrics.width + 48);
    canvas.height = fontSize + 48;

    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    context.fillStyle = '#ffffff';
    context.beginPath();
    context.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.height / 2 - 4,
        0,
        Math.PI * 2,
    );
    context.fill();
    context.strokeStyle = '#374151';
    context.lineWidth = 6;
    context.stroke();
    context.fillStyle = '#111827';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 2);

    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new SpriteMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false,
    });
    const sprite = new Sprite(material);
    const aspect = canvas.width / canvas.height;

    sprite.scale.set(GRID_LABEL_SIZE_M * aspect, GRID_LABEL_SIZE_M, 1);

    return sprite;
}

export function createDimensionLabelSprite(text: string): Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('Unable to create dimension label canvas.');
    }

    const fontSize = 56;
    const paddingX = 36;
    const paddingY = 22;
    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    const metrics = context.measureText(text);
    const radius = 18;
    canvas.width = Math.ceil(metrics.width + paddingX * 2);
    canvas.height = fontSize + paddingY * 2;

    context.font = `600 ${fontSize}px system-ui, sans-serif`;
    context.fillStyle = '#1f2937';
    context.beginPath();
    context.roundRect(0, 0, canvas.width, canvas.height, radius);
    context.fill();
    context.fillStyle = '#ffffff';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2 + 1);

    const texture = new CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new SpriteMaterial({
        map: texture,
        depthTest: false,
        depthWrite: false,
    });
    const sprite = new Sprite(material);
    const aspect = canvas.width / canvas.height;
    const heightM = 1.35;

    sprite.scale.set(heightM * aspect, heightM, 1);

    return sprite;
}
