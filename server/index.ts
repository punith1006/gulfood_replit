import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Trust proxy so req.protocol is correct behind Replit's proxy
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// Middleware to inject dynamic base URL into HTML meta tags for social sharing
app.use((req, res, next) => {
  const originalSend = res.send;
  const originalEnd = res.end;
  
  res.send = function(data) {
    const contentType = res.get('Content-Type') || '';
    if (contentType.includes('text/html') && data) {
      const protocol = req.protocol || 'https';
      const host = req.get('host') || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      
      let html = typeof data === 'string' ? data : data.toString();
      html = html.replace(/\{\{BASE_URL\}\}/g, baseUrl);
      
      return originalSend.call(this, html);
    }
    return originalSend.call(this, data);
  };
  
  res.end = function(data, ...args: any[]) {
    const contentType = res.get('Content-Type') || '';
    if (contentType.includes('text/html') && data && (typeof data === 'string' || Buffer.isBuffer(data))) {
      const protocol = req.protocol || 'https';
      const host = req.get('host') || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      
      let html = typeof data === 'string' ? data : data.toString();
      html = html.replace(/\{\{BASE_URL\}\}/g, baseUrl);
      
      return originalEnd.call(this, html, ...args);
    }
    return originalEnd.call(this, data, ...args);
  };
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
