import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const db = new Database("airguard.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    location_lat REAL,
    location_lng REAL,
    alert_threshold INTEGER DEFAULT 100,
    notifications_enabled INTEGER DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS aqi_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_name TEXT,
    area_name TEXT,
    aqi_value INTEGER,
    pm25 REAL,
    pm10 REAL,
    co REAL,
    no2 REAL,
    so2 REAL,
    o3 REAL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    aqi_level INTEGER,
    message TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Migration: Add area_name to aqi_history if it doesn't exist
try {
  db.exec("ALTER TABLE aqi_history ADD COLUMN area_name TEXT;");
} catch (e) {
  // Column already exists or table doesn't exist yet (unlikely due to CREATE TABLE above)
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/user", (req, res) => {
    const user = db.prepare("SELECT * FROM users LIMIT 1").get();
    if (!user) {
      const info = db.prepare("INSERT INTO users (email, alert_threshold) VALUES (?, ?)").run("user@example.com", 100);
      return res.json(db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid));
    }
    res.json(user);
  });

  app.post("/api/user/settings", (req, res) => {
    const { alert_threshold, notifications_enabled, location_lat, location_lng } = req.body;
    db.prepare(`
      UPDATE users 
      SET alert_threshold = ?, notifications_enabled = ?, location_lat = ?, location_lng = ?
      WHERE id = (SELECT id FROM users LIMIT 1)
    `).run(alert_threshold, notifications_enabled, location_lat, location_lng);
    res.json({ success: true });
  });

  app.get("/api/aqi/history", (req, res) => {
    const history = db.prepare("SELECT * FROM aqi_history ORDER BY timestamp DESC LIMIT 24").all();
    res.json(history);
  });

  app.post("/api/aqi/log", (req, res) => {
    const { location_name, area_name, aqi_value, pm25, pm10, co, no2, so2, o3 } = req.body;
    db.prepare(`
      INSERT INTO aqi_history (location_name, area_name, aqi_value, pm25, pm10, co, no2, so2, o3)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(location_name, area_name || '', aqi_value, pm25, pm10, co, no2, so2, o3);
    res.json({ success: true });
  });

  app.get("/api/alerts", (req, res) => {
    const alerts = db.prepare("SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 10").all();
    res.json(alerts);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
