import rendererWasm from '@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm?url';
import compilerWasm from '@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm?url';
import { CompileFormatEnum } from '@myriaddreamin/typst.ts/dist/esm/compiler.mjs';
import { $typst, TypstSnippet } from '@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs';

const mainTypPath = '/ridge/main.typ';

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

function formatTypstDiagnostics(
    diagnostics: Array<string | { message: string }> | undefined,
): string {
    if (!diagnostics?.length) {
        return 'Typst compilation failed.';
    }

    return diagnostics
        .map((diagnostic) =>
            typeof diagnostic === 'string' ? diagnostic : diagnostic.message,
        )
        .join('\n');
}

export function extractTypstError(exception: unknown): string {
    if (exception instanceof Error) {
        return exception.message;
    }

    if (typeof exception === 'string') {
        return exception;
    }

    if (exception !== null && typeof exception === 'object') {
        if ('message' in exception && typeof exception.message === 'string') {
            return exception.message;
        }

        try {
            return JSON.stringify(exception);
        } catch {
            return 'Typst compilation failed.';
        }
    }

    return 'Typst compilation failed.';
}

async function compileDocument(
    mainContent: string,
    format: CompileFormatEnum,
): Promise<Uint8Array> {
    ensureInitialized();
    await $typst.addSource(mainTypPath, mainContent);

    const compiler = await $typst.getCompiler();
    const result = await compiler.compile({
        mainFilePath: mainTypPath,
        format,
        diagnostics: 'unix',
    });

    if (!result.result) {
        throw new Error(formatTypstDiagnostics(result.diagnostics));
    }

    return result.result;
}

export async function compilePdf(mainContent: string): Promise<Uint8Array> {
    return compileDocument(mainContent, CompileFormatEnum.pdf);
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
