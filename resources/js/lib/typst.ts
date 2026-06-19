import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import { $typst, TypstSnippet } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';

let initialized = false;

function ensureInitialized(): void {
    if (initialized) {
        return;
    }

    $typst.setCompilerInitOptions({
        getModule: () => compilerWasm,
    });

    $typst.setRendererInitOptions({
        getModule: () => rendererWasm,
    });

    $typst.use(TypstSnippet.fetchPackageRegistry());

    initialized = true;
}

export async function compileSvg(mainContent: string): Promise<string> {
    ensureInitialized();

    return $typst.svg({ mainContent });
}

export async function compilePdf(mainContent: string): Promise<Uint8Array> {
    ensureInitialized();

    const pdfData = await $typst.pdf({ mainContent });

    if (!pdfData) {
        throw new Error('Failed to compile PDF.');
    }

    return pdfData;
}

function createPdfBlob(data: Uint8Array): Blob {
    return new Blob([data as unknown as BlobPart], {
        type: 'application/pdf',
    });
}

export function createPdfPreviewUrl(data: Uint8Array): string {
    return URL.createObjectURL(createPdfBlob(data));
}

export function revokePdfPreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
}

export function downloadPdf(
    data: Uint8Array,
    filename = 'document.pdf',
): void {
    const link = document.createElement('a');
    link.href = createPdfPreviewUrl(data);
    link.download = filename;
    link.click();
    revokePdfPreviewUrl(link.href);
}
