<script setup lang="ts">
import { onMounted } from 'vue';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useTypst } from '@/composables/useTypst';

const {
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
} = useTypst();

onMounted(() => {
    preview();
});
</script>

<template>
    <div class="contents">
        <Card class="h-full gap-4 py-4">
            <CardHeader class="px-4 pb-0">
                <CardTitle>Ridge Submission Template</CardTitle>
            <CardDescription>
                Typst recreation of the Ridge submission PDF — preview and download.
            </CardDescription>
            </CardHeader>

            <CardContent class="flex flex-1 flex-col gap-4 px-4">
                <textarea
                    v-model="source"
                    class="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 min-h-32 w-full resize-y rounded-md border px-3 py-2 font-mono text-sm shadow-xs outline-none focus-visible:ring-[3px]"
                    spellcheck="false"
                />

                <div
                    class="border-sidebar-border/70 relative min-h-48 flex-1 overflow-auto rounded-lg border bg-white p-4 dark:border-sidebar-border"
                >
                    <p
                        v-if="isCompiling && !previewHtml"
                        class="text-muted-foreground text-sm"
                    >
                        Compiling preview…
                    </p>
                    <div
                        v-else-if="previewHtml"
                        class="typst-preview [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
                        v-html="previewHtml"
                    />
                    <p
                        v-else
                        class="text-muted-foreground text-sm"
                    >
                        Preview will appear here.
                    </p>
                </div>

                <p
                    v-if="error"
                    class="text-destructive text-sm"
                >
                    {{ error }}
                </p>
            </CardContent>

            <CardFooter class="px-4 pt-0">
                <Button
                    :disabled="isPreviewingPdf || isCompiling"
                    @click="previewPdf"
                >
                    {{ isPreviewingPdf ? 'Compiling PDF…' : 'Preview PDF' }}
                </Button>
            </CardFooter>
        </Card>

        <Dialog
            :open="pdfPreviewOpen"
            @update:open="handlePdfPreviewOpenChange"
        >
            <DialogContent class="flex max-h-[90vh] flex-col sm:max-w-4xl">
                <DialogHeader>
                    <DialogTitle>PDF Preview</DialogTitle>
                    <DialogDescription>
                        Review the compiled PDF before downloading.
                    </DialogDescription>
                </DialogHeader>

                <iframe
                    v-if="pdfPreviewUrl"
                    :src="pdfPreviewUrl"
                    title="PDF preview"
                    class="min-h-[60vh] w-full flex-1 rounded-md border"
                />

                <DialogFooter class="gap-2">
                    <DialogClose as-child>
                        <Button variant="secondary">Cancel</Button>
                    </DialogClose>

                    <Button @click="confirmDownload">Download PDF</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
</template>
