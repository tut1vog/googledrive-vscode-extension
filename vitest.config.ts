import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/unit/**/*.test.ts'],
        alias: {
            vscode: new URL('./test/mocks/vscode.ts', import.meta.url).pathname,
        },
    },
});
