<script setup lang="ts">
import AppShell from '@/components/app/AppShell.vue';
import { Toaster } from '@/components/ui/sonner';
</script>

<template>
    <AppShell variant="header">
        <div class="flex h-svh min-h-0 w-full flex-1 flex-col">
            <main
                class="relative flex h-svh min-h-0 flex-1 flex-col overflow-x-hidden"
            >
                <slot />
            </main>
        </div>
        <Toaster />
    </AppShell>
</template>
