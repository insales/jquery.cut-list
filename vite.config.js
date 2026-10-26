import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const minified = mode === 'minified';

  return {
    publicDir: false,
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      target: 'es2015',
      minify: minified ? 'oxc' : false,
      lib: {
        entry: 'src/index.js',
        name: 'InsalesCutList',
        formats: ['iife'],
        fileName: () => (minified ? 'jquery.cut-list.min.js' : 'jquery.cut-list.js'),
      },
    },
  };
});
