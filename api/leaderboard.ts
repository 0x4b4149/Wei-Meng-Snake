import { Redis } from '@upstash/redis';

let kvClient: Redis | null = null;

function getRedis() {
  if (kvClient) return kvClient;
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    throw new Error('Redis configuration missing. Check Vercel environment variables.');
  }
  
  kvClient = new Redis({ url, token });
  return kvClient;
}

const MAX_ENTRIES = 10;
const LEADERBOARD_KEY = 'wm_snake:leaderboard';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const kv = getRedis();
      const entries = await kv.get(LEADERBOARD_KEY) || [];
      return res.status(200).json(entries);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, score, character } = req.body;
      
      if (!name || typeof score !== 'number' || !character) {
        return res.status(400).json({ error: 'Invalid input' });
      }
      if (score <= 0) {
        return res.status(400).json({ error: 'Score must be greater than 0' });
      }

      const timestamp = Date.now();
      const newId = `${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

      const kv = getRedis();
      let entries: any[] = (await kv.get(LEADERBOARD_KEY)) || [];
      
      const existingIndex = entries.findIndex((e: any) => e.name === name);

      if (existingIndex !== -1) {
        const existingEntry = entries[existingIndex];
        if (score > existingEntry.score) {
          entries[existingIndex] = {
            id: newId,
            name,
            score,
            character,
            timestamp
          };
        } else {
          return res.status(200).json({ id: undefined, message: 'Not a new high score' });
        }
      } else {
        entries.push({
          id: newId,
          name,
          score,
          character,
          timestamp
        });
      }

      // 排序並取前 MAX_ENTRIES
      entries.sort((a, b) => b.score - a.score);
      entries = entries.slice(0, MAX_ENTRIES);

      await kv.set(LEADERBOARD_KEY, entries);
      
      return res.status(200).json({ id: newId });
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
