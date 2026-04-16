import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        include: ['test/unit/**/*.test.ts'],
        alias: {
            vscode: new URL('./test/mocks/vscode.ts', import.meta.url).pathname,
            googleapis: new URL('./test/mocks/googleapis.ts', import.meta.url).pathname,
            'google-auth-library': new URL('./test/mocks/google-auth-library.ts', import.meta.url).pathname,
        },
    },
});
