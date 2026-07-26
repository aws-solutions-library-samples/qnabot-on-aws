import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import vue from '@vitejs/plugin-vue';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import viteCompression from 'vite-plugin-compression';
import { visualizer } from 'rollup-plugin-visualizer';
import archiver from 'archiver';
import { createWriteStream } from 'fs';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Plugin to create website.zip after build
function zipBuildPlugin() {
  return {
    name: 'zip-build',
    closeBundle: async () => {
      const buildDir = resolve(__dirname, 'build');
      const zipDir = resolve(__dirname, '../build');
      const zipPath = resolve(zipDir, 'website.zip');

      // Ensure the zip directory exists
      await mkdir(zipDir, { recursive: true });

      return new Promise((resolvePromise, reject) => {
        const output = createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(`\nCreated website.zip (${archive.pointer()} bytes)`);
          resolvePromise();
        });

        archive.on('error', (err) => reject(err));

        archive.pipe(output);
        archive.directory(buildDir, false);
        archive.finalize();
      });
    }
  };
}

export default defineConfig({
  // Use relative paths for assets to work with API Gateway stage paths
  base: './',
  
  // Build configuration
  build: {
    outDir: 'build',
    emptyOutDir: true,
    minify: 'terser',
    terserOptions: {
      format: {
        ascii_only: true,
        comments: 'some' // Preserve license comments
      }
    },
    rollupOptions: {
      // aws-lex-web-ui references Vue, Vuex, and Vuetify as CJS externals —
      // declare them external so Rolldown does not error on unresolved require() imports
      external: ['Vue', 'Vuex', 'Vuetify'],
      input: {
        main: resolve(__dirname, 'index.html'),
        client: resolve(__dirname, 'client.html'),
        test: resolve(__dirname, 'test.html'),
        check: resolve(__dirname, 'entry.js')
      },
      output: {
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Fonts go to fonts/ directory without hash
          if (assetInfo.name && /\.(woff|woff2|eot|ttf|otf)$/.test(assetInfo.name)) {
            return 'fonts/[name][extname]';
          }
          // Images are copied from assets/ via publicDir
          if (assetInfo.name && /\.(png|jpe?g|gif|svg|webp)$/.test(assetInfo.name)) {
            return 'images/[name][extname]';
          }
          // Other assets go to assets/ with hash
          return 'assets/[name]-[hash][extname]';
        },
        manualChunks: (id) => {
          // AWS SDK chunk
          if (id.includes('node_modules/aws-sdk') || id.includes('node_modules/@aws-sdk')) {
            return 'aws-sdk';
          }
          
          // Lex Web UI chunk
          if (id.includes('node_modules/aws-lex-web-ui') || id.includes('node_modules/lex-web-ui-loader')) {
            return 'lex-web-ui';
          }
          
          // Vue vendor chunk
          if (id.includes('node_modules/vue') || 
              id.includes('node_modules/vuex') || 
              id.includes('node_modules/vue-router') || 
              id.includes('node_modules/vuetify')) {
            return 'vue-vendor';
          }
        }
      }
    }
  },

  // Plugins array
  plugins: [
    vue({
      template: {
        compilerOptions: {
          compatConfig: {
            MODE: 2 // Vue 2 compatibility mode
          }
        }
      }
    }),
    nodePolyfills({
      include: ['buffer', 'process', 'util', 'stream', 'events', 'path', 'fs', 'url', 'crypto'],
      globals: {
        Buffer: true,
        process: true
      }
    }),
    viteCompression({
      algorithm: 'gzip',
      ext: '.gz'
    }),
    visualizer({
      filename: 'stats.html', // writes to project root, not build, so excluded from website.zip
      open: false,
      gzipSize: true
    }),
    zipBuildPlugin()
  ],

  // Dev server configuration
  server: {
    port: 8080,
    open: true,
    // Middleware to add api-stage header to all responses
    middlewareMode: false,
    proxy: process.env.VITE_PROXY_TARGET ? {
      // Dynamic proxy configuration from environment variables
      // Set by dev-with-proxy.js script
      
      // Proxy the stage path for bootstrap (e.g., /prod)
      [`/${process.env.VITE_PROXY_STAGE || 'prod'}`]: {
        target: process.env.VITE_PROXY_TARGET,
        changeOrigin: true,
        secure: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => {
            // Add the api-stage header that bootstrap expects
            proxyReq.setHeader('api-stage', process.env.VITE_PROXY_STAGE || 'prod');
          });
        }
      },
      // Proxy all API paths (questions, bot, settings, etc.)
      '^/(questions|bot|settings|examples|translate|kendraIndex|kendraFaq|kendraFeedback|connect|genesys|jobs|pages|health)': {
        target: `${process.env.VITE_PROXY_TARGET}/${process.env.VITE_PROXY_STAGE || 'prod'}`,
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path, // Keep the path as-is
      }
    } : {
      // Manual proxy configuration
      // 
      // To use this:
      // 1. Find your API Gateway URL from CloudFormation outputs or AWS Console
      // 2. Replace 'https://your-api-gateway-url.execute-api.region.amazonaws.com' below
      // 3. Update the stage name ('/prod' or '/dev') to match your deployment
      // 4. Restart the dev server
      //
      // Example:
      // If your API is at: https://abc123.execute-api.us-east-1.amazonaws.com/prod
      // Then target should be: 'https://abc123.execute-api.us-east-1.amazonaws.com'
      // And the proxy path should be: '/prod'
      //
      // Uncomment the configuration below and update with your values:
      
      // '/prod': {
      //   target: 'https://your-api-gateway-url.execute-api.region.amazonaws.com',
      //   changeOrigin: true,
      //   secure: true,
      //   configure: (proxy, options) => {
      //     proxy.on('proxyReq', (proxyReq, req, res) => {
      //       // Add the api-stage header that bootstrap expects
      //       proxyReq.setHeader('api-stage', 'prod');
      //     });
      //   }
      // }
    }
  },

  // Resolve configuration
  resolve: {
    alias: {
      '@': resolve(__dirname, 'js'),
      // Provide empty modules for Node.js-only dependencies
      'source-map-js': resolve(__dirname, 'js/lib/empty-module.js'),
      // aws-lex-web-ui's Component uses a raw string template, which needs Vue's
      // runtime compiler. The default "vue" resolution is compiler-less and fails
      // silently in production (no warning - see vue.runtime.esm-bundler.js compile()).
      // Alias to the compiler-included build so the template actually renders.
      'vue': resolve(__dirname, '../node_modules/vue/dist/vue.esm-bundler.js'),
    }
  },

  // Public directory configuration - copy assets/images to build/images
  publicDir: 'assets'
});
