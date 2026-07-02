import type { Ref } from 'vue';
import { onUnmounted, ref, watch } from 'vue';
import {
    compilePdf,
    createPdfPreviewUrl,
    downloadPdf,
    extractTypstError,
    revokePdfPreviewUrl,
} from '@/lib/report/typst';
import type { TypstPaperSize } from '@/lib/report/typst-paper-size';

export type UseTypstPdfExportOptions = {
    buildSource: (paperSize: TypstPaperSize) => string;
    downloadFilename: string;
};

export type UseTypstPdfExportReturn = {
    paperSize: Ref<TypstPaperSize>;
    pdfPreviewOpen: Ref<boolean>;
    pdfPreviewUrl: Ref<string | null>;
    isPreviewingPdf: Ref<boolean>;
    error: Ref<string | null>;
    previewPdf: () => Promise<void>;
    confirmDownload: () => void;
    handlePdfPreviewOpenChange: (open: boolean) => void;
};

export function useTypstPdfExport(
    options: UseTypstPdfExportOptions,
): UseTypstPdfExportReturn {
    const paperSize = ref<TypstPaperSize>('a4');
    const pdfPreviewOpen = ref(false);
    const pdfPreviewUrl = ref<string | null>(null);
    const pendingPdfData = ref<Uint8Array | null>(null);
    const isPreviewingPdf = ref(false);
    const error = ref<string | null>(null);

    const clearPdfPreview = (): void => {
        if (pdfPreviewUrl.value) {
            revokePdfPreviewUrl(pdfPreviewUrl.value);
        }

        pdfPreviewUrl.value = null;
        pendingPdfData.value = null;
    };

    const handlePdfPreviewOpenChange = (open: boolean): void => {
        pdfPreviewOpen.value = open;

        if (!open) {
            clearPdfPreview();
        }
    };

    const compilePreview = async (): Promise<void> => {
        isPreviewingPdf.value = true;
        error.value = null;
        clearPdfPreview();

        try {
            const pdfData = await compilePdf(
                options.buildSource(paperSize.value),
            );
            pendingPdfData.value = pdfData;
            pdfPreviewUrl.value = createPdfPreviewUrl(pdfData);
        } catch (exception) {
            error.value = extractTypstError(exception);
        } finally {
            isPreviewingPdf.value = false;
        }
    };

    const previewPdf = async (): Promise<void> => {
        pdfPreviewOpen.value = true;
        await compilePreview();
    };

    const confirmDownload = (): void => {
        if (!pendingPdfData.value) {
            return;
        }

        downloadPdf(pendingPdfData.value, options.downloadFilename);
        handlePdfPreviewOpenChange(false);
    };

    watch(paperSize, () => {
        if (pdfPreviewOpen.value) {
            void compilePreview();
        }
    });

    onUnmounted(() => {
        clearPdfPreview();
    });

    return {
        paperSize,
        pdfPreviewOpen,
        pdfPreviewUrl,
        isPreviewingPdf,
        error,
        previewPdf,
        confirmDownload,
        handlePdfPreviewOpenChange,
    };
}
