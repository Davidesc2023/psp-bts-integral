import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
// Obtener __dirname equivalente en ESModule (método canónico)
var __dirname = fileURLToPath(new URL('.', import.meta.url));
var src = resolve(__dirname, 'src');
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            { find: '@modules', replacement: resolve(src, 'modules') },
            { find: '@services', replacement: resolve(src, 'services') },
            { find: '@stores', replacement: resolve(src, 'stores') },
            { find: '@config', replacement: resolve(src, 'config') },
            { find: '@components', replacement: resolve(src, 'components') },
            { find: '@/types', replacement: resolve(src, 'types') },
            { find: '@', replacement: src },
        ],
    },
    server: {
        port: 3000,
    },
    build: {
        outDir: 'dist',
    },
});
