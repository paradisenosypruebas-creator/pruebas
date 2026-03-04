import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("history.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    title TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    role TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(session_id) REFERENCES sessions(id) ON DELETE CASCADE
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/sessions", (req, res) => {
    const sessions = db.prepare("SELECT * FROM sessions ORDER BY updated_at DESC").all();
    res.json(sessions);
  });

  app.get("/api/sessions/:id", (req, res) => {
    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
    if (!session) return res.status(404).json({ error: "Session not found" });
    
    const messages = db.prepare("SELECT role, content FROM messages WHERE session_id = ? ORDER BY id ASC").all(req.params.id);
    res.json({ ...session, messages });
  });

  app.post("/api/sessions", (req, res) => {
    const { id, title, messages } = req.body;
    
    const insertSession = db.prepare("INSERT OR REPLACE INTO sessions (id, title, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)");
    const insertMessage = db.prepare("INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)");
    const deleteMessages = db.prepare("DELETE FROM messages WHERE session_id = ?");

    const transaction = db.transaction(() => {
      insertSession.run(id, title);
      deleteMessages.run(id);
      for (const msg of messages) {
        insertMessage.run(id, msg.role, msg.content);
      }
    });

    transaction();
    res.json({ success: true });
  });

  app.delete("/api/sessions/:id", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE id = ?").run(req.params.id);
    res.json({ success: true });
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
