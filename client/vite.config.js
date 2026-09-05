import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

function androidAssetsPlugin() {
  const androidDir = path.resolve(__dirname, '../android');

  const apkMappings = {
    '/downloads/Spark.apk': path.join(androidDir, 'sparks-twa/Sparks-release-signed.apk'),
    '/downloads/spark.apk': path.join(androidDir, 'sparks-twa/Sparks-release-signed.apk'),
    '/downloads/Skill-Bridge-Spark.apk': path.join(androidDir, 'sparks-twa/Sparks-release-signed.apk'),
    '/downloads/Vault.apk': path.join(androidDir, 'vault-twa/Vault-release-signed.apk'),
    '/downloads/vault.apk': path.join(androidDir, 'vault-twa/Vault-release-signed.apk'),
    '/downloads/Skill-Bridge-Vault.apk': path.join(androidDir, 'vault-twa/Vault-release-signed.apk'),
    '/downloads/Supss.apk': path.join(androidDir, 'supss-twa/Supss-release-signed.apk'),
    '/downloads/supss.apk': path.join(androidDir, 'supss-twa/Supss-release-signed.apk'),
    '/downloads/Skill-Bridge-SUPSS.apk': path.join(androidDir, 'supss-twa/Supss-release-signed.apk'),
  };

  return {
    name: 'vite-plugin-android-assets',
    // In Dev Server: Stream directly from the android project folder
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const urlPath = req.url ? req.url.split('?')[0] : '';
        const targetFile = apkMappings[urlPath];
        if (targetFile && fs.existsSync(targetFile)) {
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader('Content-Disposition', `attachment; filename="${path.basename(targetFile)}"`);
          fs.createReadStream(targetFile).pipe(res);
          return;
        }
        next();
      });
    },
    // In Production Build: Automatically attach APKs directly from android/ into dist/downloads
    closeBundle() {
      const distDownloads = path.resolve(__dirname, 'dist/downloads');
      if (!fs.existsSync(distDownloads)) {
        fs.mkdirSync(distDownloads, { recursive: true });
      }

      const distinctTargets = [
        {
          src: path.join(androidDir, 'sparks-twa/Sparks-release-signed.apk'),
          names: ['Spark.apk', 'spark.apk', 'Skill-Bridge-Spark.apk']
        },
        {
          src: path.join(androidDir, 'vault-twa/Vault-release-signed.apk'),
          names: ['Vault.apk', 'vault.apk', 'Skill-Bridge-Vault.apk']
        },
        {
          src: path.join(androidDir, 'supss-twa/Supss-release-signed.apk'),
          names: ['Supss.apk', 'supss.apk', 'Skill-Bridge-SUPSS.apk']
        }
      ];

      for (const item of distinctTargets) {
        if (fs.existsSync(item.src)) {
          for (const name of item.names) {
            fs.copyFileSync(item.src, path.join(distDownloads, name));
          }
        }
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), androidAssetsPlugin()],
  server: {
    watch: {
      usePolling: true
    },
    fs: {
      allow: ['..']
    }
  },
  build: {
    chunkSizeWarningLimit: 3000
  }
});
