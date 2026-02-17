import path from 'path';
import { readFileSync } from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

let appVersion = '0.0.0';
try {
  const pkg = JSON.parse(readFileSync(path.resolve(__dirname, 'package.json'), 'utf-8'));
  appVersion = pkg.version || appVersion;
} catch (_) {}

export default defineConfig(({ mode }) => {
    // Safely load env, fallback to empty object if files don't exist
    let env = {};
    try {
        env = loadEnv(mode, '.', '', { ignore: ['.env.local'] });
    } catch (e) {
        if (mode === 'development') {
            console.warn('Could not load env files, using defaults');
        }
    }
    
    const isProduction = mode === 'production';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
        'process.env.NODE_ENV': JSON.stringify(mode),
        '__DEV__': JSON.stringify(!isProduction),
        '__APP_VERSION__': JSON.stringify(appVersion),
        '__BUILD_TIME__': JSON.stringify(new Date().toISOString())
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'esnext',
        minify: 'esbuild',
        sourcemap: false,
        rollupOptions: {
          output: {
            manualChunks: {
              'vendor-react': ['react', 'react-dom', 'react-router-dom'],
              'vendor-animations': ['framer-motion'],
              'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
              'vendor-gemini': ['@google/genai'],
              'vendor-icons': ['lucide-react'],
            },
          },
        },
        chunkSizeWarningLimit: 1000,
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom', 'framer-motion'],
        exclude: ['@remotion/bundler', '@remotion/cli', 'remotion'],
      },
    };
});
