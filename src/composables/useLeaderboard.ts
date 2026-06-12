import { ref, computed } from 'vue';

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  character: 'wei' | 'meng';
  timestamp: number;
}

const MAX_ENTRIES = 10;

// 模組級別的共享狀態（所有用到此 composable 的地方共享同一份資料）
const entries = ref<LeaderboardEntry[]>([]);

const fetchLeaderboard = async () => {
  try {
    const res = await fetch('/api/leaderboard');
    if (res.ok) {
      entries.value = await res.json();
    }
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
  }
};

// 初始載入
fetchLeaderboard();

export const useLeaderboard = () => {
  // 依分數降序排列，取前 10
  const sortedEntries = computed(() =>
    [...entries.value]
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_ENTRIES)
  );

  const addEntry = async (name: string, score: number, character: 'wei' | 'meng') => {
    if (score <= 0) return undefined;

    try {
      const res = await fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score, character }),
      });

      if (res.ok) {
        const data = await res.json();
        // 重新獲取最新排行榜資料
        await fetchLeaderboard();
        return data.id; // 返回新生成的 ID（如果有的話）以便觸發高亮動畫
      }
    } catch (error) {
      console.error('Failed to add leaderboard entry:', error);
    }
    return undefined;
  };

  const getRank = (id: string) =>
    sortedEntries.value.findIndex(e => e.id === id) + 1;

  return { sortedEntries, addEntry, getRank };
};
