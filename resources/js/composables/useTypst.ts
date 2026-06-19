import { useDebounceFn } from '@vueuse/core';
import type { Ref } from 'vue';
import { onUnmounted, ref, watch } from 'vue';
import {
    compilePdf,
    compileSvg,
    createPdfPreviewUrl,
    downloadPdf,
    revokePdfPreviewUrl,
} from '@/lib/typst';
import { defaultTypstSource } from '@/lib/typst-demo-source';

export type UseTypstReturn = {
    source: Ref<string>;
    previewHtml: Ref<string | null>;
    pdfPreviewOpen: Ref<boolean>;
    pdfPreviewUrl: Ref<string | null>;
    isCompiling: Ref<boolean>;
    isPreviewingPdf: Ref<boolean>;
    error: Ref<string | null>;
    preview: () => Promise<void>;
    previewPdf: () => Promise<void>;
    confirmDownload: () => void;
    handlePdfPreviewOpenChange: (open: boolean) => void;
};

export function useTypst(): UseTypstReturn {
    const source = ref(defaultTypstSource);
    const previewHtml = ref<string | null>(null);
    const pdfPreviewOpen = ref(false);
    const pdfPreviewUrl = ref<string | null>(null);
    const pendingPdfData = ref<Uint8Array | null>(null);
    const isCompiling = ref(false);
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

    const preview = async (): Promise<void> => {
        isCompiling.value = true;
        error.value = null;

        try {
            previewHtml.value = await compileSvg(source.value);
        } catch (exception) {
            previewHtml.value = null;
            error.value =
                exception instanceof Error
                    ? exception.message
                    : 'Failed to compile Typst preview.';
        } finally {
            isCompiling.value = false;
        }
    };

    const debouncedPreview = useDebounceFn(preview, 400);

    const previewPdf = async (): Promise<void> => {
        isPreviewingPdf.value = true;
        error.value = null;
        clearPdfPreview();

        try {
            const pdfData = await compilePdf(source.value);
            pendingPdfData.value = pdfData;
            pdfPreviewUrl.value = createPdfPreviewUrl(pdfData);
            pdfPreviewOpen.value = true;
        } catch (exception) {
            error.value =
                exception instanceof Error
                    ? exception.message
                    : 'Failed to compile PDF preview.';
        } finally {
            isPreviewingPdf.value = false;
        }
    };

    const confirmDownload = (): void => {
        if (!pendingPdfData.value) {
            return;
        }

        downloadPdf(pendingPdfData.value, 'typst-test.pdf');
        handlePdfPreviewOpenChange(false);
    };

    watch(source, () => {
        debouncedPreview();
    });

    onUnmounted(() => {
        clearPdfPreview();
    });

    return {
        source,
        previewHtml,
        pdfPreviewOpen,
        pdfPreviewUrl,
        isCompiling,
        isPreviewingPdf,
        error,
        preview,
        previewPdf,
        confirmDownload,
        handlePdfPreviewOpenChange,
    };
}
