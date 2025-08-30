import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import session from "express-session";
import connectPgSimpleFactory from "connect-pg-simple";
import { pool } from "./db";
import { passport, ensureAdminSeed } from "./auth";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.set('trust proxy', 1); // behind Render/Reverse proxies for correct secure cookies and IPs

// Sessions (store in Postgres)
const PgStore = connectPgSimpleFactory(session);
app.use(
  session({
    store: new PgStore({ pool, tableName: "sessions", createTableIfMissing: true }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: 'auto', // Auto-set secure cookies behind HTTPS (Render); non-secure in local dev
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  console.log("Session data at middleware:", req.session);
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
  // Ensure an admin account exists
  await ensureAdminSeed();

  const server = await registerRoutes(app);

  // Auth endpoints for admin login/logout
  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: Error | null, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Unauthorized" });
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { passwordHash, ...safeUser } = user as any;
        // Also store the normalized user in session so routes that read req.session.user work
        try {
          req.session.user = safeUser;
          // Save session (if available) before responding
          if (typeof req.session.save === 'function') {
            req.session.save(() => {
              return res.json(safeUser);
            });
          } else {
            return res.json(safeUser);
          }
        } catch (e) {
          console.error('Failed to save session user:', e);
          return res.json(safeUser);
        }
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session?.destroy(() => {
        res.clearCookie("connect.sid");
        res.json({ message: "Logged out" });
      });
    });
  });

  // Serve uploads directory statically for uploaded images
  const uploadsRoot = path.resolve(import.meta.dirname, "..", "uploads");
  app.use("/uploads", express.static(uploadsRoot));

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
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
