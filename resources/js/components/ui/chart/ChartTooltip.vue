<script setup lang="ts">
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';

defineProps<{
    title?: string;
    data: {
        name: string;
        color: string;
        value: string;
    }[];
}>();
</script>

<template>
    <Card class="border shadow-sm">
        <CardHeader v-if="title" class="p-2 pb-0">
            <CardTitle class="text-sm">{{ title }}</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-1 p-2 pt-1 text-xs">
            <div
                v-for="item in data"
                :key="item.name"
                class="flex items-center justify-between gap-3"
            >
                <div class="flex items-center gap-2">
                    <span
                        class="size-2 shrink-0 rounded-full"
                        :style="{ backgroundColor: item.color }"
                    />
                    <span class="text-muted-foreground">{{ item.name }}</span>
                </div>
                <span class="font-medium tabular-nums">{{ item.value }}</span>
            </div>
        </CardContent>
    </Card>
</template>
