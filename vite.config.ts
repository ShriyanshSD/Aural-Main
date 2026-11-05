import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';

export default defineConfig(({mode}) => {
  const isOwnerBuild = mode === 'owner';
  const env = loadEnv(mode, process.cwd(), '');
  const configuredOwnerApiUrl = env.VITE_OWNER_API_BASE_URL || 'https://aural-main.vercel.app';
  let ownerApiBaseUrl = 'https://aural-main.vercel.app';
  if (isOwnerBuild) {
    let parsedOwnerApiUrl: URL;
    try {
      parsedOwnerApiUrl = new URL(configuredOwnerApiUrl);
    } catch {
      throw new Error('VITE_OWNER_API_BASE_URL must be an absolute HTTPS origin.');
    }
    if (
      parsedOwnerApiUrl.protocol !== 'https:'
      || parsedOwnerApiUrl.pathname !== '/'
      || parsedOwnerApiUrl.search
      || parsedOwnerApiUrl.hash
      || parsedOwnerApiUrl.username
      || parsedOwnerApiUrl.password
    ) {
      throw new Error('VITE_OWNER_API_BASE_URL must be an absolute HTTPS origin without a path or credentials.');
    }
    ownerApiBaseUrl = parsedOwnerApiUrl.origin;
  }
  const ownerIndexPlugin: Plugin = {
    name: 'aurel-owner-index',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const ownerHtml = bundle['owner.html'];
      if (!ownerHtml || ownerHtml.type !== 'asset') {
        throw new Error(`The owner HTML entry was not emitted by Vite. Output entries: ${Object.keys(bundle).join(', ')}`);
      }
      this.emitFile({
        type: 'asset',
        fileName: 'index.html',
        source: ownerHtml.source,
      });
    },
  };

  return {
    plugins: [react(), tailwindcss(), ...(isOwnerBuild ? [ownerIndexPlugin] : [])],
    ...(isOwnerBuild ? {
      build: {
        outDir: 'dist-owner',
        emptyOutDir: true,
        rollupOptions: {
          input: path.resolve(__dirname, 'owner.html'),
        },
      },
    } : {}),
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    define: isOwnerBuild ? {
      'import.meta.env.VITE_OWNER_API_BASE_URL': JSON.stringify(ownerApiBaseUrl),
    } : {},
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
