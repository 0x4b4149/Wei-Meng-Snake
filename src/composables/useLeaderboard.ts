import { ref, computed } from 'vue';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  character: 'wei' | 'meng';
  timestamp: number;
}

const STORAGE_KEY = 'wm_snake_leaderboard';
const MAX_ENTRIES = 10;

// 模組級別的共享狀態（所有用到此 composable 的地方共享同一份資料）
const entries = ref<LeaderboardEntry[]>([]);

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    entries.value = raw ? JSON.parse(raw) : [];
  } catch {
    entries.value = [];
  }
};

const saveToStorage = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.value));
};

// 初始載入
loadFromStorage();

export const useLeaderboard = () => {
  // 依分數降序排列，取前 10
  const sortedEntries = computed(() =>
    [...entries.value]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES)
  );

  const addEntry = (name: string, score: number, character: 'wei' | 'meng') => {
    if (score <= 0) return undefined;

    const existingIndex = entries.value.findIndex(e => e.name === name);

    if (existingIndex !== -1) {
      const existingEntry = entries.value[existingIndex];
      // 玩家已在榜上，只在分數更高時更新
      if (existingEntry && score > existingEntry.score) {
        const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        entries.value[existingIndex] = {
          id: newId,
          name: existingEntry.name,
          score,
          character,
          timestamp: Date.now()
        };
      } else {
        // 沒有打破自己的紀錄，直接返回
        return undefined;
      }
    } else {
      // 新玩家，直接加入
      const newEntry: LeaderboardEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name,
        score,
        character,
        timestamp: Date.now(),
      };
      entries.value.push(newEntry);
    }

    // 排序並只保留分數最高的 MAX_ENTRIES 筆
    entries.value = [...entries.value]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES);

    saveToStorage();
    
    // 返回該玩家最新的 ID (以便觸發高光動畫)
    const updatedEntry = entries.value.find(e => e.name === name);
    return updatedEntry?.id;
  };

  const clearLeaderboard = () => {
    entries.value = [];
    saveToStorage();
  };

  const getRank = (id: string) =>
    sortedEntries.value.findIndex(e => e.id === id) + 1;

  return { sortedEntries, addEntry, clearLeaderboard, getRank };
};
