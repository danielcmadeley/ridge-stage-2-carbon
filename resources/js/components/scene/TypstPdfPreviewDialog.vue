<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { TypstPaperSize } from '@/lib/report/typst-paper-size';

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
        <DialogContent
            :show-close-button="false"
            class="flex h-[90vh] w-[75vw] max-w-[75vw] flex-col gap-0 overflow-hidden border-ridge-green p-0 sm:max-w-[75vw]"
        >
            <div class="flex min-h-0 flex-1">
                <aside
                    class="flex w-72 shrink-0 flex-col gap-6 border-r border-ridge-green/10 p-6"
                >
                    <DialogHeader class="space-y-2 text-left">
                        <DialogTitle>{{ title ?? 'PDF Preview' }}</DialogTitle>
                        <DialogDescription>
                            {{
                                description ??
                                'Review the compiled PDF before downloading.'
                            }}
                        </DialogDescription>
                    </DialogHeader>

                    <div class="space-y-2">
                        <Label class="text-sm">Paper size</Label>
                        <div class="flex gap-2">
                            <Button
                                type="button"
                                size="sm"
                                class="flex-1"
                                :variant="
                                    paperSize === 'a4' ? 'default' : 'outline'
                                "
                                :disabled="isCompiling"
                                @click="emit('update:paperSize', 'a4')"
                            >
                                A4
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                class="flex-1"
                                :variant="
                                    paperSize === 'a3' ? 'default' : 'outline'
                                "
                                :disabled="isCompiling"
                                @click="emit('update:paperSize', 'a3')"
                            >
                                A3
                            </Button>
                        </div>
                    </div>

                    <div class="flex-1" />

                    <div class="space-y-3">
                        <p v-if="error" class="text-sm text-destructive">
                            {{ error }}
                        </p>

                        <div class="flex flex-col gap-2">
                            <DialogClose as-child>
                                <Button variant="secondary" class="w-full">
                                    Cancel
                                </Button>
                            </DialogClose>

                            <Button
                                class="w-full"
                                :disabled="!pdfPreviewUrl || isCompiling"
                                @click="emit('download')"
                            >
                                Download PDF
                            </Button>
                        </div>
                    </div>
                </aside>

                <div class="relative min-h-0 min-w-0 flex-1 bg-muted/30">
                    <iframe
                        v-if="pdfPreviewUrl && !isCompiling"
                        :src="pdfPreviewUrl"
                        title="PDF preview"
                        class="absolute inset-0 h-full w-full border-0"
                    />
                    <p
                        v-else
                        class="flex h-full items-center justify-center p-6 text-sm text-muted-foreground"
                    >
                        {{
                            isCompiling
                                ? 'Compiling PDF…'
                                : 'Preview will appear here.'
                        }}
                    </p>
                </div>
            </div>
        </DialogContent>
    </Dialog>
</template>
