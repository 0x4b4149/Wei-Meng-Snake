<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import Leaderboard from './Leaderboard.vue';
import MessageBoard from './MessageBoard.vue';
import { useLeaderboard } from '../composables/useLeaderboard';

// ====== Props & Emits ======
const props = defineProps<{ playerName: string }>();
const emit = defineEmits<{ logout: [] }>();

const { addEntry } = useLeaderboard();
const latestEntryId = ref<string | undefined>();

// 遊戲常數
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPECIAL_SPAWN_CHANCE = 0.05;

// 圖片配置（全部使用已驗證可用的 iconify noto: 系列 emoji 圖示）
const ASSETS = {
  weiHead: '/wei.svg',
  mengHead: '/meng.svg',
  body: 'https://api.iconify.design/noto:red-heart.svg',   // 蛇身：紅心 ❤️
  cake: '/cake.svg',
  ai: 'https://api.iconify.design/noto:laptop.svg',         // AI 道具：筆電 💻
  piano: 'https://api.iconify.design/noto:musical-keyboard.svg', // 鋼琴道具：鍵盤 🎹
  gift: 'https://api.iconify.design/noto:wrapped-gift.svg'  // 禮物道具：禮物 🎁
};

const TONGUE_TWISTERS = [
  '崴孟三百天禮物，孟崴三百天禮物',
  '崴寶愛孟寶，孟寶愛崴寶',
  '它的顆粒好好吃，它的奶油好好吃'
];

const HEART_CHARS = ['💕', '💗', '💖', '🩷', '♥', '💘'];

// ★ 效能優化：預先產生愛心粒子資料，不在 template 裡呼叫 Math.random()
interface HeartParticle {
  id: number;
  char: string;
  left: string;
  animationDelay: string;
  animationDuration: string;
  fontSize: string;
  opacity: number;
}

const heartParticles = ref<HeartParticle[]>([]);
const initHeartParticles = () => {
  heartParticles.value = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    char: HEART_CHARS[i % HEART_CHARS.length] || '💕',
    left: (i * 8.5 + Math.random() * 4) + '%',
    animationDelay: (i * 0.8 + Math.random() * 0.5) + 's',
    animationDuration: (7 + Math.random() * 5) + 's',
    fontSize: (10 + Math.random() * 14) + 'px',
    opacity: 0.12 + Math.random() * 0.2
  }));
};

// 動態計算格子大小
const getResponsiveCellSize = () => {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const isDesktop = vw > 768;
  const availableHeight = vh - 140;
  // 左邊排行榜 + 右邊留言板 大約各佔 220px 加上間距，共預留 500px
  const availableWidth = isDesktop ? vw - 500 : vw - 40;
  const minDim = Math.min(availableHeight, availableWidth);
  return Math.max(Math.floor(minDim / GRID_SIZE), 10);
};

// 遊戲狀態
const CELL_SIZE = ref(40);
const snake = ref([{ x: 10, y: 10 }]);
const direction = ref({ x: 0, y: 0 });
const nextDirection = ref({ x: 0, y: -1 });
const cake = ref({ x: 5, y: 5 });
const specialItem = ref<{ x: number, y: number, type: string } | null>(null);
const specialItemTimeout = ref<number | null>(null);

const score = ref(0);
const scoreMultiplier = ref(1);
const isGameOver = ref(false);
const isPaused = ref(true);
const gameInterval = ref<number | null>(null);
const specialSpawnInterval = ref<number | null>(null);
const message = ref('');
const showMemeText = ref(false);
const selectedCharacter = ref<'wei' | 'meng'>('wei');
const showStartScreen = ref(true);

// 特殊狀態
const isAutoPilot = ref(false);
const isSlowMo = ref(false);
const showTwister = ref(false);
const twisterText = ref('');

// 特殊效果的 Timeouts
const autoPilotTimeout = ref<number | null>(null);
const slowMoTimeout = ref<number | null>(null);
const twisterTimeout = ref<number | null>(null);

// 百分milestone 大蛋糕
const showBigCake = ref(false);
const bigCakeMilestone = ref(0);
const bigCakeTimeout = ref<number | null>(null);

// ★ 效能優化：預先計算頭像 src，避免每幀重新做三元判斷
const headSrc = computed(() =>
  selectedCharacter.value === 'wei' ? ASSETS.weiHead : ASSETS.mengHead
);
const charLabel = computed(() =>
  selectedCharacter.value === 'wei' ? '崴' : '孟'
);

// ★ 效能優化：cell size 相關衍生值預先計算
const cellPx = computed(() => CELL_SIZE.value + 'px');
const tagFontSize = computed(() => Math.max(CELL_SIZE.value / 3, 8) + 'px');

const generateCake = () => {
  while (true) {
    const newCake = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    if (!snake.value.some(s => s.x === newCake.x && s.y === newCake.y)) {
      cake.value = newCake;
      break;
    }
  }
};

const spawnSpecialItem = () => {
  if (specialItem.value || isPaused.value || showStartScreen.value) return;
  if (Math.random() < SPECIAL_SPAWN_CHANCE) {
    const types = ['ai', 'piano', 'gift'];
    const type = types[Math.floor(Math.random() * types.length)] || 'ai';
    while (true) {
      const pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!snake.value.some(s => s.x === pos.x && s.y === pos.y) && (pos.x !== cake.value.x || pos.y !== cake.value.y)) {
        specialItem.value = { ...pos, type };
        if (specialItemTimeout.value) clearTimeout(specialItemTimeout.value);
        specialItemTimeout.value = window.setTimeout(() => { specialItem.value = null; }, 10000);
        break;
      }
    }
  }
};

const move = () => {
  if (isGameOver.value || isPaused.value || showStartScreen.value) return;
  direction.value = nextDirection.value;

  if (isAutoPilot.value) {
    const head = snake.value[0];
    if (!head) return;
    const target = specialItem.value || cake.value;
    if (head.x < target.x && direction.value.x !== -1) nextDirection.value = { x: 1, y: 0 };
    else if (head.x > target.x && direction.value.x !== 1) nextDirection.value = { x: -1, y: 0 };
    else if (head.y < target.y && direction.value.y !== -1) nextDirection.value = { x: 0, y: 1 };
    else if (head.y > target.y && direction.value.y !== 1) nextDirection.value = { x: 0, y: -1 };
    direction.value = nextDirection.value;
  }

  if (direction.value.x === 0 && direction.value.y === 0) return;

  const newHead = {
    x: snake.value[0]!.x + direction.value.x,
    y: snake.value[0]!.y + direction.value.y
  };

  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) { endGame(); return; }
  if (snake.value.some(segment => segment.x === newHead.x && segment.y === newHead.y)) { endGame(); return; }

  snake.value.unshift(newHead);

  if (newHead.x === cake.value.x && newHead.y === cake.value.y) {
    handleEat('cake');
  } else if (specialItem.value && newHead.x === specialItem.value.x && newHead.y === specialItem.value.y) {
    handleEat(specialItem.value.type);
    specialItem.value = null;
    if (specialItemTimeout.value) clearTimeout(specialItemTimeout.value);
  } else {
    snake.value.pop();
  }
};

const handleEat = (type: string) => {
  const basePoints = type === 'cake' ? 10 : (type === 'gift' ? 50 : 20);
  const prevScore = score.value;
  score.value += basePoints * scoreMultiplier.value;

  // 檢查是否跨越 100 的倍數里程碑
  const prevMilestone = Math.floor(prevScore / 100);
  const newMilestone = Math.floor(score.value / 100);
  if (newMilestone > prevMilestone && score.value > 0) {
    triggerBigCake(newMilestone * 100);
  }

  if (type === 'cake') { triggerMeme(); generateCake(); }
  else if (type === 'ai') { activateAutoPilot(); }
  else if (type === 'piano') { activateSlowMo(); }
  else if (type === 'gift') { activateTwister(); }
};

const triggerBigCake = (milestone: number) => {
  bigCakeMilestone.value = milestone;
  showBigCake.value = true;
  if (bigCakeTimeout.value) clearTimeout(bigCakeTimeout.value);
  bigCakeTimeout.value = window.setTimeout(() => { showBigCake.value = false; }, 2500);
};

const triggerMeme = () => {
  showMemeText.value = true;
  setTimeout(() => { showMemeText.value = false; }, 1000);
};

const activateAutoPilot = () => {
  isAutoPilot.value = true;
  message.value = '崴寶 AI 導航中！💻';
  if (autoPilotTimeout.value) clearTimeout(autoPilotTimeout.value);
  autoPilotTimeout.value = window.setTimeout(() => { isAutoPilot.value = false; message.value = ''; }, 5000);
};

const activateSlowMo = () => {
  isSlowMo.value = true;
  message.value = '孟寶音樂慢動作！🎹';
  resetInterval();
  if (slowMoTimeout.value) clearTimeout(slowMoTimeout.value);
  slowMoTimeout.value = window.setTimeout(() => {
    isSlowMo.value = false;
    message.value = '';
    if (!isPaused.value) resetInterval();
  }, 5000);
};

const activateTwister = () => {
  showTwister.value = true;
  twisterText.value = TONGUE_TWISTERS[Math.floor(Math.random() * TONGUE_TWISTERS.length)] || '';
  message.value = '挑戰！得分加倍 🎁';
  scoreMultiplier.value = 2;
  if (twisterTimeout.value) clearTimeout(twisterTimeout.value);
  twisterTimeout.value = window.setTimeout(() => {
    showTwister.value = false;
    message.value = '';
    scoreMultiplier.value = 1;
  }, 5000);
};

const resetInterval = () => {
  if (gameInterval.value) clearInterval(gameInterval.value);
  const currentSpeed = isSlowMo.value ? INITIAL_SPEED * 2 : INITIAL_SPEED;
  gameInterval.value = window.setInterval(move, currentSpeed);
};

const startGame = () => {
  if (isGameOver.value) {
    snake.value = [{ x: 10, y: 10 }];
    direction.value = { x: 0, y: 0 };
    nextDirection.value = { x: 0, y: -1 };
    score.value = 0;
    scoreMultiplier.value = 1;
    isGameOver.value = false;
    generateCake();
    specialItem.value = null;
    message.value = '';
    isAutoPilot.value = false;
    isSlowMo.value = false;
    showTwister.value = false;
    if (autoPilotTimeout.value) clearTimeout(autoPilotTimeout.value);
    if (slowMoTimeout.value) clearTimeout(slowMoTimeout.value);
    if (twisterTimeout.value) clearTimeout(twisterTimeout.value);
    if (specialItemTimeout.value) clearTimeout(specialItemTimeout.value);
    if (bigCakeTimeout.value) clearTimeout(bigCakeTimeout.value);
    showBigCake.value = false;
  }
  isPaused.value = false;
  resetInterval();
  if (specialSpawnInterval.value) clearInterval(specialSpawnInterval.value);
  specialSpawnInterval.value = window.setInterval(spawnSpecialItem, 1000);
};

const pauseGame = () => {
  isPaused.value = true;
  if (gameInterval.value) clearInterval(gameInterval.value);
  if (specialSpawnInterval.value) clearInterval(specialSpawnInterval.value);
};

const endGame = () => {
  isGameOver.value = true;
  isPaused.value = true;
  if (gameInterval.value) clearInterval(gameInterval.value);
  if (specialSpawnInterval.value) clearInterval(specialSpawnInterval.value);
  message.value = `${props.playerName}，沒關係，下次再努力！❤️`;

  const id = addEntry(props.playerName, score.value, selectedCharacter.value);
  if (id) {
    latestEntryId.value = id;
  }
};

const selectCharacter = (char: 'wei' | 'meng') => { selectedCharacter.value = char; };
const startActualGame = () => { showStartScreen.value = false; updateSize(); startGame(); };

const handleKeydown = (e: KeyboardEvent) => {
  if (showStartScreen.value) return;
  switch (e.key) {
    case 'ArrowUp': if (direction.value.y !== 1) nextDirection.value = { x: 0, y: -1 }; break;
    case 'ArrowDown': if (direction.value.y !== -1) nextDirection.value = { x: 0, y: 1 }; break;
    case 'ArrowLeft': if (direction.value.x !== 1) nextDirection.value = { x: -1, y: 0 }; break;
    case 'ArrowRight': if (direction.value.x !== -1) nextDirection.value = { x: 1, y: 0 }; break;
    case ' ': if (isPaused.value) startGame(); else pauseGame(); break;
  }
};

const updateSize = () => { CELL_SIZE.value = getResponsiveCellSize(); };

// ★ 效能優化：snake segment 的 transform style 預先計算為 computed
// 改用 transform: translate() 取代 left/top，觸發 GPU 合成而非 Layout Reflow
const snakeStyles = computed(() =>
  snake.value.map((seg, idx) => ({
    // transform 不觸發 layout，只觸發 composite，效能最好
    transform: `translate(${seg.x * CELL_SIZE.value}px, ${seg.y * CELL_SIZE.value}px) scale(${idx === 0 ? 1.8 : 1.2})`,
    zIndex: idx === 0 ? 10 : 5,
    transitionDuration: transitionSpeed.value,
    width: cellPx.value,
    height: cellPx.value,
  }))
);

const cakeStyle = computed(() => ({
  transform: `translate(${cake.value.x * CELL_SIZE.value}px, ${cake.value.y * CELL_SIZE.value}px) scale(1.4)`,
  width: cellPx.value,
  height: cellPx.value,
}));

const specialStyle = computed(() => specialItem.value ? ({
  transform: `translate(${specialItem.value.x * CELL_SIZE.value}px, ${specialItem.value.y * CELL_SIZE.value}px) scale(1.6)`,
  width: cellPx.value,
  height: cellPx.value,
}) : {});

const transitionSpeed = computed(() => {
  const ms = isSlowMo.value ? INITIAL_SPEED * 2 : INITIAL_SPEED;
  return `${ms}ms`;
});

onMounted(() => {
  initHeartParticles();
  window.addEventListener('keydown', handleKeydown);
  window.addEventListener('resize', updateSize);
  updateSize();
  generateCake();
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
  window.removeEventListener('resize', updateSize);
  if (gameInterval.value) clearInterval(gameInterval.value);
  if (specialSpawnInterval.value) clearInterval(specialSpawnInterval.value);
});
</script>

<template>
  <div class="app-wrapper">
    <!-- ★ 浮動愛心：資料在 script 預先生成，不在 template 呼叫 Math.random() -->
    <div class="floating-hearts" aria-hidden="true">
      <span
        v-for="p in heartParticles"
        :key="p.id"
        class="heart-particle"
        :style="{
          left: p.left,
          animationDelay: p.animationDelay,
          animationDuration: p.animationDuration,
          fontSize: p.fontSize,
          opacity: p.opacity
        }"
      >{{ p.char }}</span>
    </div>

    <div class="main-layout">
      <Leaderboard
        class="game-leaderboard"
        :current-player-name="props.playerName"
        :latest-entry-id="latestEntryId"
      />

      <div class="game-container">
        <div class="game-header">
        <div class="header-top">
          <h1>
            <span class="title-heart">💕</span>
            崴孟純愛貪食蛇
            <span class="title-heart">💕</span>
          </h1>
          <button class="logout-btn" @click="emit('logout')" title="登出">
            <span>{{ playerName }}</span>
            <span class="logout-icon">🚪</span>
          </button>
        </div>
        <div v-if="!showStartScreen" class="stats">
          <span class="score-display" :class="{ 'multiplier-active': scoreMultiplier > 1 }">
            🩷 分數: {{ score }}{{ scoreMultiplier > 1 ? ` (x${scoreMultiplier})` : '' }}
          </span>
          <span v-if="message" class="status-msg">{{ message }}</span>
        </div>
      </div>

      <!-- 開始畫面 -->
      <div v-if="showStartScreen" class="start-screen">
        <div class="start-subtitle">{{ playerName }}，選擇你的角色 ✨</div>
        <div class="char-selection">
          <div class="char-option" :class="{ selected: selectedCharacter === 'wei' }" @click="selectCharacter('wei')">
            <div class="char-img-wrapper">
              <img :src="ASSETS.weiHead" class="char-img-preview" alt="崴寶" />
            </div>
            <p class="char-name">崴寶</p>
            <p class="char-desc">💻 AI 小天才</p>
          </div>
          <div class="love-connector">
            <span class="love-icon">💑</span>
          </div>
          <div class="char-option" :class="{ selected: selectedCharacter === 'meng' }" @click="selectCharacter('meng')">
            <div class="char-img-wrapper">
              <img :src="ASSETS.mengHead" class="char-img-preview" alt="孟寶" />
            </div>
            <p class="char-name">孟寶</p>
            <p class="char-desc">🎹 鋼琴小天使</p>
          </div>
        </div>
        <button class="start-btn" @click="startActualGame">
          <span>開始純愛之旅</span>
          <span class="btn-sparkle">✨</span>
        </button>
        <p class="start-footer">{{ playerName }} 加油！崴崴孟孟愛你 🐍💖</p>
      </div>

      <!-- 遊戲畫面 -->
      <template v-else>
        <div
          class="game-board"
          :style="{ width: GRID_SIZE * CELL_SIZE + 'px', height: GRID_SIZE * CELL_SIZE + 'px' }"
        >
          <!-- ★ 蛋糕：改用 transform: translate 定位 -->
          <div class="game-item food-item" :style="cakeStyle">
            <img :src="ASSETS.cake" alt="cake" />
          </div>

          <!-- ★ 特殊道具：改用 transform: translate 定位 -->
          <div v-if="specialItem" class="game-item special-item" :style="specialStyle">
            <img :src="ASSETS[specialItem.type as keyof typeof ASSETS]" alt="special" />
          </div>

          <!-- ★ 蛇身：
               - key 改用 segment 的 x,y 座標字串，讓 Vue diff 正確追蹤每個格子
               - 改用 transform: translate 定位（GPU composite，無 reflow）
               - snakeStyles computed 避免每幀在 template 重新計算 -->
          <div
            v-for="(segment, index) in snake"
            :key="`${segment.x}-${segment.y}`"
            class="game-item"
            :class="index === 0 ? 'snake-head-container' : 'snake-body-container'"
            :style="snakeStyles[index]"
          >
            <template v-if="index === 0">
              <img :src="headSrc" class="head-img" />
              <span class="char-tag" :style="{ fontSize: tagFontSize }">{{ charLabel }}</span>
            </template>
            <img v-else :src="ASSETS.body" class="body-img" />
          </div>

          <Transition name="fade">
            <div v-if="showMemeText" class="meme-text">它的顆粒好好吃！✨</div>
          </Transition>

          <!-- 百分里程碑大蛋糕 -->
          <Transition name="big-cake-anim">
            <div v-if="showBigCake" class="big-cake-overlay" @click="showBigCake = false">
              <img :src="ASSETS.cake" class="big-cake-img" alt="里程碑蛋糕" />
              <div class="big-cake-score">🎉 {{ bigCakeMilestone }} 分！</div>
              <div class="big-cake-msg">崴孟好厲害 💕</div>
            </div>
          </Transition>
          <Transition name="fade">
            <div v-if="showTwister" class="twister-box">
              <div class="twister-text">{{ twisterText }}</div>
            </div>
          </Transition>

          <div v-if="isPaused || isGameOver" class="overlay">
            <div v-if="isGameOver" class="game-over">
              <div class="overlay-emoji">😢💔</div>
              <h2>遊戲結束</h2>
              <p class="final-score">最終分數：{{ score }}</p>
              <p class="overlay-msg">{{ message }}</p>
              <div class="overlay-buttons">
                <button class="primary-btn" @click="startGame">💪 重新開始</button>
                <button class="secondary-btn" @click="showStartScreen = true">🏠 回首頁</button>
              </div>
            </div>
            <div v-else-if="isPaused" class="pause">
              <div class="overlay-emoji">⏸️💕</div>
              <h2>暫停中</h2>
              <p class="overlay-msg">崴孟休息一下～</p>
              <button class="primary-btn" @click="startGame">▶️ 繼續遊戲</button>
            </div>
          </div>
        </div>

        <div class="controls-hint">
          <p>控制方式：方向鍵 ⬆️⬇️⬅️➡️ 或 WASD<br/>
             手機版：滑動螢幕</p>
        </div>
      </template>
    </div>

    <MessageBoard
      class="game-message-board"
      :current-player-name="props.playerName"
    />
  </div>
</div>
</template>

<style scoped>
.app-wrapper {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  position: relative;
}

.main-layout {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 24px;
  z-index: 1;
  width: 100%;
  max-width: 1200px;
  padding: 20px;
}

@media (max-width: 768px) {
  .main-layout {
    flex-direction: column;
    align-items: center;
    gap: 16px;
    height: 100vh;
    overflow-y: auto;
    justify-content: flex-start;
  }
  .game-leaderboard, .game-message-board {
    display: none;
  }
}

.floating-hearts {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.heart-particle {
  position: absolute;
  bottom: -30px;
  /* ★ will-change 告訴瀏覽器這個元素只做 transform，提前開啟合成層 */
  will-change: transform;
  animation: floatUp linear infinite;
}

@keyframes floatUp {
  from { transform: translateY(0) scale(1); opacity: 0; }
  10% { opacity: 0.25; }
  90% { opacity: 0.1; }
  to  { transform: translateY(-105vh) scale(0.6); opacity: 0; }
}

/* ====== 遊戲容器
   ★ 移除 backdrop-filter: blur，改用實色半透明背景
   backdrop-filter 在每次 paint 都要 blur 整個背景，在遊戲持續更新時非常耗能
====== */
.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'Nunito', 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  color: #d6336c;
  background: rgba(255, 255, 255, 0.92);
  padding: 15px 24px;
  border-radius: 24px;
  border: 2px solid rgba(255, 182, 193, 0.5);
  box-shadow:
    0 8px 32px rgba(255, 105, 180, 0.15),
    0 2px 8px rgba(255, 182, 193, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  margin: auto;
  position: relative;
  z-index: 1;
}

/* ====== 標題 ====== */
.game-header {
  text-align: center;
  margin-bottom: 5px;
  width: 100%;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  position: relative;
}

.logout-btn {
  position: absolute;
  right: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 105, 180, 0.1);
  border: 1.5px solid rgba(255, 182, 193, 0.4);
  border-radius: 20px;
  padding: 4px 10px;
  font-family: inherit;
  font-size: 0.8rem;
  font-weight: 700;
  color: #e07aab;
  cursor: pointer;
  transition: background 0.2s ease, transform 0.2s ease;
  white-space: nowrap;
  max-width: 80px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn:hover {
  background: rgba(255, 105, 180, 0.2);
  transform: scale(1.05);
}

.logout-icon {
  flex-shrink: 0;
}

h1 {
  font-size: 1.8rem;
  font-weight: 900;
  margin: 0;
  background: linear-gradient(135deg, #ff6b9d, #e91e8c, #ff6bb5);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmerText 3s ease infinite;
  letter-spacing: 1px;
}

@keyframes shimmerText {
  0%   { background-position: 0% center; }
  50%  { background-position: 100% center; }
  100% { background-position: 0% center; }
}

.title-heart {
  display: inline-block;
  /* ★ will-change 讓瀏覽器預先建立合成層 */
  will-change: transform;
  animation: heartPulse 1.2s ease-in-out infinite;
  -webkit-text-fill-color: initial;
}

@keyframes heartPulse {
  0%, 100% { transform: scale(1); }
  50%       { transform: scale(1.25); }
}

/* ====== 分數欄 ====== */
.stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  font-weight: 700;
  font-size: 1.15rem;
  margin-top: 5px;
  min-height: 1.5em;
  color: #d6336c;
}

.score-display {
  background: rgba(255, 105, 180, 0.1);
  padding: 2px 14px;
  border-radius: 20px;
  border: 1px solid rgba(255, 105, 180, 0.2);
}

.multiplier-active {
  color: #fff;
  background: linear-gradient(135deg, #ff1493, #ff69b4);
  border-color: transparent;
  animation: flashMulti 0.6s infinite;
}

@keyframes flashMulti {
  50% { opacity: 0.7; transform: scale(1.05); }
}

.status-msg {
  color: #e91e8c;
  font-weight: 800;
  animation: slideInMsg 0.3s ease-out;
}

@keyframes slideInMsg {
  from { opacity: 0; transform: translateY(-5px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ====== 開始畫面 ====== */
.start-screen {
  text-align: center;
  padding: 10px 0;
}

.start-subtitle {
  font-size: 1.4rem;
  font-weight: 800;
  color: #d6336c;
  margin-bottom: 8px;
}

.char-selection {
  display: flex;
  gap: 16px;
  margin: 12px 0;
  align-items: center;
  justify-content: center;
}

.char-option {
  cursor: pointer;
  padding: 14px 18px;
  border: 3px solid rgba(255, 182, 193, 0.4);
  border-radius: 20px;
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275),
              box-shadow 0.3s ease,
              border-color 0.3s ease,
              background 0.3s ease;
  background: rgba(255, 255, 255, 0.8);
  min-width: 130px;
}

.char-option:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(255, 105, 180, 0.25);
  border-color: rgba(255, 105, 180, 0.5);
}

.char-option.selected {
  border-color: #ff69b4;
  background: linear-gradient(135deg, rgba(255, 240, 245, 0.95), rgba(255, 228, 243, 0.95));
  transform: translateY(-4px) scale(1.03);
  box-shadow:
    0 8px 25px rgba(255, 105, 180, 0.3),
    0 0 20px rgba(255, 105, 180, 0.12);
}

.char-img-wrapper {
  display: inline-block;
}

.char-img-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  background: white;
  border: 3px solid #ffb6c1;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 182, 193, 0.3);
}

.char-option.selected .char-img-preview {
  border-color: #ff69b4;
  box-shadow: 0 0 18px rgba(255, 105, 180, 0.35);
}

.char-name {
  font-size: 1.2rem;
  font-weight: 800;
  margin: 8px 0 2px;
  color: #d6336c;
}

.char-desc {
  font-size: 0.85rem;
  margin: 0;
  color: #e07aab;
  font-weight: 600;
}

.love-connector {
  display: flex;
  align-items: center;
  justify-content: center;
}

.love-icon {
  font-size: 2rem;
  will-change: transform;
  animation: heartPulse 1.5s ease-in-out infinite;
}

/* ====== 開始按鈕 ====== */
.start-btn {
  background: linear-gradient(135deg, #ff69b4, #ff1493, #e91e8c);
  background-size: 200% auto;
  font-size: 1.25rem;
  font-weight: 800;
  padding: 12px 36px;
  color: white;
  border: none;
  border-radius: 50px;
  cursor: pointer;
  transition: transform 0.25s ease, box-shadow 0.25s ease, background-position 0.4s ease;
  box-shadow: 0 4px 20px rgba(255, 20, 147, 0.35);
  letter-spacing: 1px;
  font-family: inherit;
}

.start-btn:hover {
  background-position: right center;
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 6px 28px rgba(255, 20, 147, 0.45);
}

.start-btn:active {
  transform: translateY(0) scale(0.98);
}

.btn-sparkle {
  display: inline-block;
  margin-left: 4px;
  will-change: transform;
  animation: sparkle 1.5s ease infinite;
}

@keyframes sparkle {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
  50%       { transform: scale(1.3) rotate(15deg); opacity: 0.7; }
}

.start-footer {
  margin-top: 14px;
  font-size: 0.95rem;
  color: #e07aab;
  font-weight: 600;
  opacity: 0.8;
}

/* ====== 遊戲面板 ====== */
.game-board {
  position: relative;
  background:
    radial-gradient(circle at 50% 50%, rgba(255, 228, 243, 0.4) 0%, rgba(255, 240, 245, 0.2) 100%),
    linear-gradient(rgba(255, 182, 193, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 182, 193, 0.07) 1px, transparent 1px);
  background-size: 100% 100%, 20px 20px, 20px 20px;
  border: 3px solid rgba(255, 182, 193, 0.55);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(255, 182, 193, 0.15);
}

/* ====== 遊戲物件
   ★ 使用 transform: translate 定位（取代 left/top）
   - left/top 變化 → 觸發 Layout → Paint → Composite（最慢）
   - transform 變化 → 只觸發 Composite（最快，GPU 加速）
====== */
.game-item {
  position: absolute;
  top: 0;
  left: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  will-change: transform;
  transition-property: transform;
  transition-timing-function: linear;
}

.game-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

/* ★ 移除 filter: drop-shadow 動畫（每幀重算 filter 非常耗效能）
   改用 box-shadow 或純 CSS 動畫代替 */
.food-item {
  animation: foodPulse 2s ease-in-out infinite;
}

@keyframes foodPulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.85; }
}

.special-item {
  will-change: transform;
  animation: specialBounce 0.5s ease-in-out infinite alternate;
}

@keyframes specialBounce {
  from { transform: translate(var(--tx, 0), var(--ty, 0)) scale(1.4); }
  to   { transform: translate(var(--tx, 0), var(--ty, 0)) scale(1.7); }
}

/* ★ special-item 的 bounce 和 computed style 的 scale(1.6) 同時存在會互相覆蓋
   所以 special-item 的動畫只做 opacity 變化 */
.game-item.special-item {
  animation: specialGlow 0.6s ease-in-out infinite alternate;
}

@keyframes specialGlow {
  from { opacity: 0.85; }
  to   { opacity: 1; }
}

/* ====== 蛇頭 ====== */
.head-img {
  border-radius: 50%;
  border: 2px solid #ff69b4;
  background: white;
  box-shadow: 0 0 8px rgba(255, 105, 180, 0.3);
}

.body-img {
  will-change: transform;
  animation: heart-beat 1s ease-in-out infinite alternate;
}

.char-tag {
  position: absolute;
  bottom: -10%;
  right: -10%;
  background: linear-gradient(135deg, #ff69b4, #ff1493);
  color: white;
  padding: 1px 4px;
  border-radius: 6px;
  z-index: 11;
  font-weight: 800;
  box-shadow: 0 2px 5px rgba(255, 20, 147, 0.25);
  font-family: inherit;
  /* transform 由 parent 控制，這裡不重複加 */
}

@keyframes heart-beat {
  from { transform: scale(0.85); }
  to   { transform: scale(1.1); }
}

/* ====== 彈出訊息 ====== */
.meme-text, .twister-box {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.97);
  padding: 14px 26px;
  border-radius: 20px;
  font-weight: 800;
  color: #d6336c;
  border: 2px solid rgba(255, 182, 193, 0.5);
  z-index: 20;
  text-align: center;
  box-shadow: 0 6px 24px rgba(255, 105, 180, 0.2);
  font-size: 1.05rem;
}

.twister-text {
  font-size: 1.1rem;
  color: #e91e8c;
  font-weight: 800;
}

/* ====== 遮罩
   ★ 移除 backdrop-filter: blur，改用實色半透明
   overlay 出現時遊戲暫停，但 blur 本身仍持續耗用 GPU
====== */
.overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 235, 245, 0.88);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  border-radius: 14px;
}

.game-over, .pause {
  text-align: center;
  background: rgba(255, 255, 255, 0.98);
  padding: 28px 36px;
  border-radius: 24px;
  border: 2px solid rgba(255, 182, 193, 0.5);
  box-shadow: 0 10px 35px rgba(255, 105, 180, 0.18);
  animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes popIn {
  from { transform: scale(0.82); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}

.overlay-emoji {
  font-size: 2.2rem;
  margin-bottom: 6px;
  animation: heartPulse 1.5s ease-in-out infinite;
}

.game-over h2, .pause h2 {
  font-size: 1.5rem;
  font-weight: 900;
  color: #d6336c;
  margin: 4px 0 8px;
}

.final-score {
  font-size: 1.2rem;
  font-weight: 800;
  color: #e91e8c;
  margin: 4px 0;
}

.overlay-msg {
  font-size: 1rem;
  color: #e07aab;
  font-weight: 600;
  margin: 4px 0 12px;
}

.overlay-buttons {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

/* ====== 按鈕共用 ====== */
.primary-btn, .secondary-btn, button {
  font-family: inherit;
  font-weight: 700;
  border: none;
  padding: 10px 22px;
  border-radius: 50px;
  font-size: 1rem;
  cursor: pointer;
  margin: 4px;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.primary-btn, button:not(.secondary-btn):not(.start-btn) {
  background: linear-gradient(135deg, #ff69b4, #ff1493);
  color: white;
  box-shadow: 0 3px 14px rgba(255, 20, 147, 0.28);
}

.primary-btn:hover, button:not(.secondary-btn):not(.start-btn):hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 20px rgba(255, 20, 147, 0.38);
}

.secondary-btn {
  background: rgba(255, 105, 180, 0.1);
  color: #d6336c;
  border: 2px solid rgba(255, 105, 180, 0.3);
}

.secondary-btn:hover {
  background: rgba(255, 105, 180, 0.2);
  transform: translateY(-2px);
}

/* ====== 底部提示 ====== */
.controls-hint {
  margin-top: 8px;
  color: #d4a0b8;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

/* ====== 轉場動畫 ====== */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -42%) scale(0.92);
}
/* ====== 百分里程碑大蛋糕 ====== */
.big-cake-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(255, 235, 248, 0.82);
  border-radius: 14px;
  z-index: 50;
  cursor: pointer;
  gap: 10px;
}

.big-cake-img {
  width: min(55%, 180px);
  height: auto;
  /* 入場时連續擺動動画 */
  animation: cakeBounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards,
             cakeWobble 0.8s ease-in-out 0.5s infinite alternate;
  will-change: transform;
  filter: drop-shadow(0 8px 20px rgba(255, 105, 180, 0.35));
}

@keyframes cakeBounceIn {
  0%   { transform: scale(0) rotate(-10deg); opacity: 0; }
  60%  { transform: scale(1.15) rotate(3deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}

@keyframes cakeWobble {
  from { transform: scale(1) rotate(-2deg); }
  to   { transform: scale(1.05) rotate(2deg); }
}

.big-cake-score {
  font-size: 2rem;
  font-weight: 900;
  color: #d6336c;
  text-shadow: 0 2px 8px rgba(255, 105, 180, 0.3);
  animation: scoreFlash 0.6s ease-in-out infinite alternate;
}

@keyframes scoreFlash {
  from { transform: scale(1);    color: #d6336c; }
  to   { transform: scale(1.08); color: #ff1493; }
}

.big-cake-msg {
  font-size: 1.2rem;
  font-weight: 800;
  color: #e07aab;
  letter-spacing: 1px;
}

/* 大蛋糕進出場転場 */
.big-cake-anim-enter-active {
  transition: opacity 0.3s ease;
}
.big-cake-anim-leave-active {
  transition: opacity 0.4s ease, transform 0.4s ease;
}
.big-cake-anim-enter-from {
  opacity: 0;
}
.big-cake-anim-leave-to {
  opacity: 0;
  transform: scale(1.08);
}
</style>
