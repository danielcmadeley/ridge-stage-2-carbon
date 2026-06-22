import inertia from '@inertiajs/vite';
import { templateCompilerOptions } from '@tresjs/core';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';

export default defineConfig({
    test: {
        environment: 'node',
        include: ['resources/js/**/*.test.ts'],
    },
    resolve: {
        alias: {
            '@': '/resources/js',
        },
    },
    assetsInclude: ['**/*.wasm'],
    optimizeDeps: {
        exclude: [
            '@myriaddreamin/typst.ts',
            '@myriaddreamin/typst-ts-web-compiler',
            '@myriaddreamin/typst-ts-renderer',
        ],
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.ts'],
            refresh: true,
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia(),
        tailwindcss(),
        vue({
            template: {
                ...templateCompilerOptions.template,
                transformAssetUrls: {
                    base: null,
                    includeAbsolute: false,
                },
            },
        }),
        wayfinder({
            formVariants: true,
        }),
    ],
});
