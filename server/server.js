import express from 'express';
import Database from 'better-sqlite3';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

// 初始化 SQLite 資料庫
const db = new Database(path.join(__dirname, 'data.db'));

// 建立資料表
db.exec(`
  CREATE TABLE IF NOT EXISTS leaderboard (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    score INTEGER NOT NULL,
    character TEXT NOT NULL,
    timestamp INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    rating INTEGER,
    timestamp INTEGER NOT NULL
  );
`);

// 準備 SQL 語句
const insertLeaderboard = db.prepare('INSERT OR REPLACE INTO leaderboard (id, name, score, character, timestamp) VALUES (?, ?, ?, ?, ?)');
const getLeaderboardByName = db.prepare('SELECT * FROM leaderboard WHERE name = ?');
const updateLeaderboardScore = db.prepare('UPDATE leaderboard SET id = ?, score = ?, character = ?, timestamp = ? WHERE name = ?');
const getTopLeaderboard = db.prepare('SELECT * FROM leaderboard ORDER BY score DESC LIMIT 10');

const insertMessage = db.prepare('INSERT INTO messages (id, name, content, rating, timestamp) VALUES (?, ?, ?, ?, ?)');
const getRecentMessages = db.prepare('SELECT * FROM messages ORDER BY timestamp ASC LIMIT 50');
const deleteOldMessages = db.prepare(`
  DELETE FROM messages WHERE id NOT IN (
    SELECT id FROM messages ORDER BY timestamp DESC LIMIT 50
  )
`);

app.use(cors());
app.use(express.json());

// API: 排行榜
app.get('/api/leaderboard', (req, res) => {
  try {
    const entries = getTopLeaderboard.all();
    res.json(entries);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/leaderboard', (req, res) => {
  try {
    const { name, score, character } = req.body;
    if (!name || typeof score !== 'number' || !character) {
      return res.status(400).json({ error: 'Invalid input' });
    }
    if (score <= 0) {
       return res.status(400).json({ error: 'Score must be greater than 0' });
    }

    const timestamp = Date.now();
    let newId = `${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

    const existingEntry = getLeaderboardByName.get(name);

    if (existingEntry) {
      if (score > existingEntry.score) {
        updateLeaderboardScore.run(newId, score, character, timestamp, name);
      } else {
        // 沒有破紀錄，不更新
        return res.json({ id: undefined, message: 'Not a new high score' });
      }
    } else {
      insertLeaderboard.run(newId, name, score, character, timestamp);
    }

    res.json({ id: newId });
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// API: 留言板
app.get('/api/messages', (req, res) => {
  try {
    const msgs = getRecentMessages.all();
    res.json(msgs);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/messages', (req, res) => {
  try {
    const { name, content, rating = 0 } = req.body;
    if (!name || !content || !content.trim()) {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const timestamp = Date.now();
    const id = `${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

    insertMessage.run(id, name, content.trim(), rating, timestamp);
    
    // 只保留最近 50 筆
    deleteOldMessages.run();

    res.json({ id });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
