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

const MAX_MESSAGES = 50;
const MESSAGES_KEY = 'wm_snake:messages';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    try {
      const kv = getRedis();
      const messages = await kv.get(MESSAGES_KEY) || [];
      return res.status(200).json(messages);
    } catch (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, content, rating = 0 } = req.body;
      
      if (!name || !content || !content.trim()) {
        return res.status(400).json({ error: 'Invalid input' });
      }

      const timestamp = Date.now();
      const id = `${timestamp}-${Math.random().toString(36).slice(2, 7)}`;

      const newMessage = {
        id,
        name,
        content: content.trim(),
        rating,
        timestamp
      };

      const kv = getRedis();
      let messages: any[] = (await kv.get(MESSAGES_KEY)) || [];
      messages.push(newMessage);

      // 依照時間排序，只保留最新的 MAX_MESSAGES 筆
      messages.sort((a, b) => a.timestamp - b.timestamp);
      
      if (messages.length > MAX_MESSAGES) {
        // 從後面截取最新的 MAX_MESSAGES 筆
        messages = messages.slice(-MAX_MESSAGES);
      }

      await kv.set(MESSAGES_KEY, messages);
      
      return res.status(200).json({ id });
    } catch (error) {
      console.error('Error adding message:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
