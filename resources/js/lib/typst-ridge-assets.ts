import { $typst } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';

const ridgeAssetFiles = [
    'image1.png',
    'image2.svg',
    'image3.png',
    'image4.svg',
    'image5.png',
    'image6.png',
    'image7.png',
    'image8.png',
    'image9.png',
    'image10.png',
    'image11.png',
    'image12.png',
    'image13.jpeg',
] as const;

let assetsMounted = false;

export async function mountRidgeTemplateAssets(): Promise<void> {
    if (assetsMounted) {
        return;
    }

    await Promise.all(
        ridgeAssetFiles.map(async (file) => {
            const response = await fetch(`/ridge-template/assets/${file}`);

            if (!response.ok) {
                throw new Error(`Failed to load Ridge template asset: ${file}`);
            }

            const data = new Uint8Array(await response.arrayBuffer());
            await $typst.mapShadow(`/ridge/${file}`, data);
        }),
    );

    assetsMounted = true;
}

export function resetRidgeTemplateAssets(): void {
    assetsMounted = false;
    $typst.resetShadow();
}
