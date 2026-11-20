/// <reference types="vitest/config" />
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The public base path. Locally and in Docker the app is served from "/".
// GitHub Pages serves project sites from "/<repo>/", so the deploy workflow
// sets VITE_BASE_PATH (e.g. "/magic_words/" for https://humanaice.github.io/magic_words/).
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rawBase = env.VITE_BASE_PATH || '/';
  const base = rawBase.endsWith('/') ? rawBase : `${rawBase}/`;

  return {
    base,
    plugins: [react()],
    build: {
      // Audio and sprite files are imported as URLs; keep them out of the JS bundle.
      assetsInlineLimit: 4096,
    },
    test: {
      environment: 'node',
    },
  };
});
