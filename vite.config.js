import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';

export default defineConfig({
    plugins: [vue()],
    root: 'src/rendered',
    server: {
        fs: {
            // The renderer's ESM package boundary must not exclude root-level dependency assets.
            allow: [fileURLToPath(new URL('.', import.meta.url))],
        },
    },
    build: {
        // Matches the production path loaded by src/main/main.js
        outDir: '../../dist',
        emptyOutDir: true,
    },
});
