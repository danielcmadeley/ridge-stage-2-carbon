<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { TypstPaperSize } from '@/lib/typst-paper-size';

defineProps<{
    open: boolean;
    pdfPreviewUrl: string | null;
    paperSize: TypstPaperSize;
    isCompiling?: boolean;
    error?: string | null;
    title?: string;
    description?: string;
}>();

const emit = defineEmits<{
    'update:open': [open: boolean];
    'update:paperSize': [paperSize: TypstPaperSize];
    download: [];
}>();
</script>

<template>
    <Dialog :open="open" @update:open="emit('update:open', $event)">
        <DialogContent class="flex max-h-[90vh] flex-col sm:max-w-4xl">
            <DialogHeader>
                <DialogTitle>{{ title ?? 'PDF Preview' }}</DialogTitle>
                <DialogDescription>
                    {{
                        description ??
                        'Review the compiled PDF before downloading.'
                    }}
                </DialogDescription>
            </DialogHeader>

            <div class="flex flex-wrap items-center gap-2">
                <Label class="text-sm">Paper size</Label>
                <Button
                    type="button"
                    size="sm"
                    :variant="paperSize === 'a4' ? 'default' : 'outline'"
                    :disabled="isCompiling"
                    @click="emit('update:paperSize', 'a4')"
                >
                    A4
                </Button>
                <Button
                    type="button"
                    size="sm"
                    :variant="paperSize === 'a3' ? 'default' : 'outline'"
                    :disabled="isCompiling"
                    @click="emit('update:paperSize', 'a3')"
                >
                    A3
                </Button>
            </div>

            <div
                class="relative min-h-[60vh] flex-1 overflow-hidden rounded-md border"
            >
                <iframe
                    v-if="pdfPreviewUrl && !isCompiling"
                    :src="pdfPreviewUrl"
                    title="PDF preview"
                    class="h-full min-h-[60vh] w-full"
                />
                <p
                    v-else
                    class="text-muted-foreground flex min-h-[60vh] items-center justify-center p-6 text-sm"
                >
                    {{ isCompiling ? 'Compiling PDF…' : 'Preview will appear here.' }}
                </p>
            </div>

            <p v-if="error" class="text-destructive text-sm">
                {{ error }}
            </p>

            <DialogFooter class="gap-2">
                <DialogClose as-child>
                    <Button variant="secondary">Cancel</Button>
                </DialogClose>

                <Button
                    :disabled="!pdfPreviewUrl || isCompiling"
                    @click="emit('download')"
                >
                    Download PDF
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
