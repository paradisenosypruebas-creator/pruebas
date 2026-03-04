import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Cargamos las variables de entorno (como tu API KEY)
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // ESTA LÍNEA ES CLAVE: permite que los archivos se encuentren en Cloudflare
    base: './', 
    
    plugins: [
      react(),
      tailwindcss(),
    ],
    
    define: {
      // Esto conecta tu código con la API de Gemini
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    
    resolve: {
      alias: {
        // Esto ayuda a Vite a entender las rutas de tus archivos
        '@': path.resolve(__dirname, './'),
      },
    },
    
    server: {
      // Configuraciones específicas de AI Studio para evitar parpadeos
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
