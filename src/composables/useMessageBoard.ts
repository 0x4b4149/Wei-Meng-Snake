import { ref, computed } from 'vue';

export interface MessageEntry {
  id: string;
  name: string;
  content: string;
  rating?: number; // 星星數 1~5
  timestamp: number;
}

const messages = ref<MessageEntry[]>([]);

const fetchMessages = async () => {
  try {
    const res = await fetch('/api/messages');
    if (res.ok) {
      messages.value = await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch messages:', error);
  }
};

// 初始載入
fetchMessages();

export const useMessageBoard = () => {
  // 依時間舊到新排序，最新的在最下面
  const sortedMessages = computed(() =>
    [...messages.value].sort((a, b) => a.timestamp - b.timestamp)
  );

  const addMessage = async (name: string, content: string, rating: number = 0) => {
    if (!content.trim()) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content: content.trim(), rating }),
      });

      if (res.ok) {
        await fetchMessages();
      }
    } catch (error) {
      console.error('Failed to add message:', error);
    }
  };

  return { sortedMessages, addMessage };
};
