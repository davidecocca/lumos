import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    root: 'src/rendered',
    build: {
        // Matches the production path loaded by src/main/main.js
        outDir: '../../dist',
        emptyOutDir: true,
    },
});
