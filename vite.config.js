import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev-only: run the /api/* serverless functions under `npm run dev`.
// Vite's dev server normally serves only the React app, so /api/* would 404
// locally (they only run on Vercel). This middleware loads the matching
// api/<name>.js handler on demand and adapts Node req/res to the Vercel-style
// handler(req, res) signature. It also loads your .env into process.env so the
// handlers see ANTHROPIC_API_KEY, EMAIL_*, etc. Disabled in production builds.
function apiDevServer() {
  return {
    name: "api-dev-server",
    apply: "serve",
    configureServer(server) {
      const env = loadEnv(server.config.mode, process.cwd(), "");
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }

      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith("/api/")) return next();

        const pathname = req.url.split("?")[0].replace(/\/$/, "");
        const name = pathname.slice("/api/".length);
        if (!/^[a-zA-Z0-9_-]+$/.test(name)) return next();

        let handler;
        try {
          const mod = await server.ssrLoadModule(`/api/${name}.js`);
          handler = mod.default;
        } catch {
          res.statusCode = 404;
          return res.end();
        }
        if (typeof handler !== "function") {
          res.statusCode = 404;
          return res.end();
        }

        // Collect and JSON-parse the body (Vercel parses it for you).
        let raw = "";
        await new Promise((resolve) => {
          req.on("data", (c) => (raw += c));
          req.on("end", resolve);
        });
        if (raw && (req.headers["content-type"] || "").includes("application/json")) {
          try {
            req.body = JSON.parse(raw);
          } catch {
            req.body = {};
          }
        } else {
          req.body = raw;
        }

        // Minimal Vercel-style res helpers.
        res.status = (code) => {
          res.statusCode = code;
          return res;
        };
        res.json = (obj) => {
          if (!res.getHeader("Content-Type")) res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(obj));
          return res;
        };
        res.send = (body) => {
          res.end(body);
          return res;
        };

        try {
          await handler(req, res);
        } catch (e) {
          server.config.logger.error(`[api/${name}] ${e?.stack || e}`);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "handler_error" }));
          }
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), apiDevServer()],
});
