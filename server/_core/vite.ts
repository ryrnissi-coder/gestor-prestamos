import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import { nanoid } from "nanoid";
import path from "path";
import { createServer as createViteServer } from "vite";
import viteConfig from "../../vite.config";

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  
  // Only serve index.html for SPA navigation (no file extensions)
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    
    // Don't intercept API calls, files with extensions, or special paths
    if (
      url.startsWith("/api") || 
      url.includes(".") || 
      url.startsWith("/.well-known")
    ) {
      return next();
    }

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "../../", "dist", "public");
  if (!fs.existsSync(distPath)) {
    console.error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }

  app.use(express.static(distPath, { fallthrough: true }));

  // Only fall through to index.html for SPA navigation (no file extensions)
  app.use("*", (req, res, next) => {
    // Don't intercept API calls or files with extensions
    if (req.originalUrl.startsWith("/api") || req.originalUrl.includes(".")) {
      return res.status(404).end();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
