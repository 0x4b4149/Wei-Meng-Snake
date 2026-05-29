import { ref, computed } from 'vue';

export interface MessageEntry {
  id: string;
  name: string;
  content: string;
  rating?: number; // 星星數 1~5
  timestamp: number;
}

const STORAGE_KEY = 'wm_snake_messages';
const MAX_MESSAGES = 50;

const messages = ref<MessageEntry[]>([]);

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    messages.value = raw ? JSON.parse(raw) : [];
  } catch {
    messages.value = [];
  }
};

const saveToStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value));
};

// 初始載入
loadFromStorage();

export const useMessageBoard = () => {
  // 依時間舊到新排序，最新的在最下面
  const sortedMessages = computed(() =>
    [...messages.value].sort((a, b) => a.timestamp - b.timestamp)
  );

  const addMessage = (name: string, content: string, rating: number = 0) => {
    if (!content.trim()) return;

    const newMsg: MessageEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      content: content.trim(),
      rating,
      timestamp: Date.now(),
    };

    messages.value.push(newMsg);

    // 只保留最近的 MAX_MESSAGES 筆
    if (messages.value.length > MAX_MESSAGES) {
      // 依照時間排序，保留最新的
      messages.value = [...messages.value]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, MAX_MESSAGES);
    }

    saveToStorage();
  };

  const clearMessages = () => {
    messages.value = [];
    saveToStorage();
  };

  return { sortedMessages, addMessage, clearMessages };
};
