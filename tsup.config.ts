import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  external: ['@elizaos/core'],
  dts: false,
  splitting: false,
  sourcemap: true,
  clean: true,
});
