import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    // Resuelve el alias '@/' del tsconfig: los tests importan igual que la app.
    tsconfigPaths: true,
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
})
