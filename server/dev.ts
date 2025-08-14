import express from "express";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { log } from "./vite";
import { registerRoutes } from "./routes";
import awesomeVideoRouter from "./routes/awesome-video";

const app = express();

// Enable CORS for all origins with full support
app.use(cors({
  origin: true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
  exposedHeaders: ["Content-Type", "Authorization"],
  maxAge: 86400
}));

app.use(express.json());
app.use(express.raw({ type: "application/vnd.custom-type" }));
app.use(express.text({ type: "text/html" }));

// Register API routes
app.use("/api/awesome-video", awesomeVideoRouter);
registerRoutes(app);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

async function startServer() {
  const vite = await createViteServer({
    root: "./client",
    server: {
      middlewareMode: false,
      host: "0.0.0.0",
      port: 5000,
      hmr: {
        port: 443,
      },
      fs: {
        allow: [".."],
      },
    },
    configFile: false,
    logLevel: "info",
    appType: "spa",
  });

  // Use Vite's middleware
  app.use(vite.middlewares);

  const PORT = process.env.PORT || 5000;
  
  app.listen(PORT, () => {
    log(`serving on port ${PORT}`);
  });
}

startServer().catch(console.error);