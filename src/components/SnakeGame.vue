<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';

// 遊戲常數
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPECIAL_SPAWN_CHANCE = 0.05; // 每秒嘗試產出的機率

// 圖片配置
const ASSETS = {
  weiHead: '/wei.svg',
  mengHead: '/meng.svg',
  body: 'https://api.iconify.design/flat-color-icons/like.svg',
  cake: '/cake.svg',
  ai: 'https://api.iconify.design/flat-color-icons/chip.svg',
  piano: 'https://api.iconify.design/flat-color-icons/music.svg',
  gift: 'https://api.iconify.design/flat-color-icons/gift.svg'
};

const TONGUE_TWISTERS = [
  '崴孟三百天禮物，孟崴三百天禮物',
  '崴寶愛孟寶，孟寶愛崴寶',
  '它的顆粒好好吃，它的奶油好好吃'
];

// 動態計算格子大小
const getResponsiveCellSize = () => {
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  // 為了避免超出螢幕，扣除標題、提示字元與內距的高度 (約 140px) 與寬度 (約 40px)
  const availableHeight = vh - 140;
  const availableWidth = vw - 40;
  const minDim = Math.min(availableHeight, availableWidth);
  return Math.max(Math.floor(minDim / GRID_SIZE), 10);
};

// 遊戲狀態
const CELL_SIZE = ref(40);
const snake = ref([{ x: 10, y: 10 }]);
const direction = ref({ x: 0, y: 0 });
const nextDirection = ref({ x: 0, y: -1 });
const cake = ref({ x: 5, y: 5 }); // 永遠存在的蛋糕
const specialItem = ref<{ x: number, y: number, type: string } | null>(null); // 偶爾出現的道具
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
    const type = types[Math.floor(Math.random() * types.length)];
    
    while (true) {
      const pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE)
      };
      if (!snake.value.some(s => s.x === pos.x && s.y === pos.y) && (pos.x !== cake.value.x || pos.y !== cake.value.y)) {
        specialItem.value = { ...pos, type };
        
        if (specialItemTimeout.value) clearTimeout(specialItemTimeout.value);
        // 10 秒後沒吃到就消失
        specialItemTimeout.value = window.setTimeout(() => { specialItem.value = null; }, 10000);
        break;
      }
    }
  }
};

const move = () => {
  if (isGameOver.value || isPaused.value || showStartScreen.value) return;
  direction.value = nextDirection.value;

  // AI 導航優先導向最近的食物
  if (isAutoPilot.value) {
    const head = snake.value[0];
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

  // 檢查碰撞
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
  score.value += basePoints * scoreMultiplier.value;

  if (type === 'cake') {
    triggerMeme();
    generateCake();
  } else if (type === 'ai') {
    activateAutoPilot();
  } else if (type === 'piano') {
    activateSlowMo();
  } else if (type === 'gift') {
    activateTwister();
  }
};

const triggerMeme = () => { showMemeText.value = true; setTimeout(() => { showMemeText.value = false; }, 1000); };

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
  twisterText.value = TONGUE_TWISTERS[Math.floor(Math.random() * TONGUE_TWISTERS.length)];
  message.value = '挑戰！得分加倍 🎁';
  scoreMultiplier.value = 2; // 分數加倍
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
    
    // 重置特殊狀態
    isAutoPilot.value = false;
    isSlowMo.value = false;
    showTwister.value = false;
    if (autoPilotTimeout.value) clearTimeout(autoPilotTimeout.value);
    if (slowMoTimeout.value) clearTimeout(slowMoTimeout.value);
    if (twisterTimeout.value) clearTimeout(twisterTimeout.value);
    if (specialItemTimeout.value) clearTimeout(specialItemTimeout.value);
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
  message.value = '沒關係，下次再努力！❤️';
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
onMounted(() => { window.addEventListener('keydown', handleKeydown); window.addEventListener('resize', updateSize); updateSize(); generateCake(); });
onUnmounted(() => { window.removeEventListener('keydown', handleKeydown); window.removeEventListener('resize', updateSize); if (gameInterval.value) clearInterval(gameInterval.value); if (specialSpawnInterval.value) clearInterval(specialSpawnInterval.value); });
const transitionSpeed = computed(() => { const ms = isSlowMo.value ? INITIAL_SPEED * 2 : INITIAL_SPEED; return `${ms}ms`; });
</script>

<template>
  <div class="app-wrapper">
    <div class="game-container">
      <div class="game-header">
        <h1>崴孟純愛貪食蛇 🐍💕</h1>
        <div v-if="!showStartScreen" class="stats">
          <span :class="{ 'multiplier-active': scoreMultiplier > 1 }">
            分數: {{ score }} {{ scoreMultiplier > 1 ? ' (x' + scoreMultiplier + ')' : '' }}
          </span>
          <span class="status-msg">{{ message }}</span>
        </div>
      </div>
      
      <div v-if="showStartScreen" class="start-screen">
        <h2>選擇你的角色</h2>
        <div class="char-selection">
          <div class="char-option" :class="{ selected: selectedCharacter === 'wei' }" @click="selectCharacter('wei')">
            <img :src="ASSETS.weiHead" class="char-img-preview" alt="崴寶" />
            <p>崴寶</p>
          </div>
          <div class="char-option" :class="{ selected: selectedCharacter === 'meng' }" @click="selectCharacter('meng')">
            <img :src="ASSETS.mengHead" class="char-img-preview" alt="孟寶" />
            <p>孟寶</p>
          </div>
        </div>
        <button class="start-btn" @click="startActualGame">開始純愛之旅</button>
      </div>

      <template v-else>
        <div class="game-board" :style="{ width: GRID_SIZE * CELL_SIZE + 'px', height: GRID_SIZE * CELL_SIZE + 'px' }">
          <!-- 蛋糕 -->
          <div class="game-item food-item" :style="{ 
            left: cake.x * CELL_SIZE + 'px', 
            top: cake.y * CELL_SIZE + 'px',
            width: CELL_SIZE + 'px',
            height: CELL_SIZE + 'px',
            transform: 'scale(1.4)'
          }">
            <img :src="ASSETS.cake" alt="cake" />
          </div>

          <!-- 特殊道具 -->
          <div v-if="specialItem" class="game-item special-item" :style="{ 
            left: specialItem.x * CELL_SIZE + 'px', 
            top: specialItem.y * CELL_SIZE + 'px',
            width: CELL_SIZE + 'px',
            height: CELL_SIZE + 'px',
            transform: 'scale(1.6)'
          }">
            <img :src="ASSETS[specialItem.type as keyof typeof ASSETS]" alt="special" />
          </div>

          <!-- 蛇 -->
          <div 
            v-for="(segment, index) in snake" 
            :key="index"
            class="game-item"
            :class="index === 0 ? 'snake-head-container' : 'snake-body-container'"
            :style="{ 
              left: segment.x * CELL_SIZE + 'px', 
              top: segment.y * CELL_SIZE + 'px',
              width: CELL_SIZE + 'px',
              height: CELL_SIZE + 'px',
              zIndex: index === 0 ? 10 : 5,
              transitionDuration: transitionSpeed,
              transform: index === 0 ? 'scale(1.8)' : 'scale(1.2)'
            }"
          >
            <template v-if="index === 0">
              <img :src="selectedCharacter === 'wei' ? ASSETS.weiHead : ASSETS.mengHead" class="head-img" />
              <span class="char-tag" :style="{ fontSize: Math.max(CELL_SIZE/3, 8) + 'px', transform: 'scale(0.8)' }">
                {{ selectedCharacter === 'wei' ? '崴' : '孟' }}
              </span>
            </template>
            <img v-else :src="ASSETS.body" class="body-img" />
          </div>

          <Transition name="fade">
            <div v-if="showMemeText" class="meme-text">它的顆粒好好吃！✨</div>
          </Transition>
          <Transition name="fade">
            <div v-if="showTwister" class="twister-box">
              <div class="twister-text">{{ twisterText }}</div>
            </div>
          </Transition>

          <div v-if="isPaused || isGameOver" class="overlay">
            <div v-if="isGameOver" class="game-over">
              <h2>遊戲結束</h2>
              <p>{{ message }}</p>
              <button @click="startGame">重新開始</button>
              <button @click="showStartScreen = true" class="secondary-btn">回首頁</button>
            </div>
            <div v-else-if="isPaused" class="pause">
              <h2>暫停中</h2>
              <button @click="startGame">繼續遊戲</button>
            </div>
          </div>
        </div>

        <div class="controls-hint">
          <span>方向鍵控制，空白鍵暫停</span>
        </div>
      </template>
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
  background-color: #fff5f7;
  overflow: hidden;
}

.game-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: 'PingFang TC', 'Microsoft JhengHei', sans-serif;
  color: #ff69b4;
  background-color: #fff;
  padding: 15px 20px;
  border-radius: 20px;
  box-shadow: 0 10px 30px rgba(255, 182, 193, 0.4);
  margin: auto;
}

.game-header {
  text-align: center;
  margin-bottom: 5px;
  width: 100%;
}

h1 {
  font-size: 1.8rem;
  margin: 0;
  text-shadow: 1px 1px #ffe4e1;
}

.stats {
  display: flex;
  justify-content: space-around;
  font-weight: bold;
  font-size: 1.3rem;
  margin-top: 5px;
  min-height: 1.5em;
}

.multiplier-active {
  color: #ff1493;
  animation: flash 0.5s infinite;
}

@keyframes flash {
  50% { opacity: 0.5; }
}

.game-board {
  position: relative;
  background-color: #fff0f5;
  border: 4px solid #ffb6c1;
  border-radius: 10px;
  overflow: hidden;
}

.game-item {
  position: absolute;
  display: flex;
  justify-content: center;
  align-items: center;
  transition-property: left, top;
  transition-timing-function: linear;
}

.game-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.special-item {
  animation: bounce 0.5s infinite alternate;
}

@keyframes bounce {
  from { transform: scale(0.9); }
  to { transform: scale(1.1); }
}

.head-img {
  border-radius: 50%;
  border: 2px solid #ff69b4;
  background: white;
}

.body-img {
  animation: heart-beat 1s infinite alternate;
}

.char-tag {
  position: absolute;
  bottom: -10%;
  right: -10%;
  background: #ff69b4;
  color: white;
  padding: 1px 3px;
  border-radius: 4px;
  z-index: 11;
  font-weight: bold;
}

@keyframes heart-beat {
  from { transform: scale(0.85); }
  to { transform: scale(1.1); }
}

.start-screen { text-align: center; }
.char-selection { display: flex; gap: 20px; margin: 15px 0; }
.char-option { cursor: pointer; padding: 10px; border: 3px solid transparent; border-radius: 15px; transition: all 0.3s; }
.char-option.selected { border-color: #ff69b4; background-color: #fff0f5; transform: scale(1.05); }
.char-img-preview { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; background: white; border: 2px solid #ffb6c1; }
.start-btn { background: linear-gradient(45deg, #ff69b4, #ff1493); font-size: 1.2rem; font-weight: bold; padding: 10px 30px; color: white; border: none; border-radius: 10px; cursor: pointer; }

.status-msg { color: #ff1493; margin-left: 10px; }

.meme-text, .twister-box {
  position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
  background: rgba(255, 255, 255, 0.95); padding: 15px 25px; border-radius: 20px;
  font-weight: bold; color: #ff69b4; border: 2px solid #ffb6c1; z-index: 20; text-align: center;
}
.twister-text { font-size: 1.1rem; color: #ff1493; }

.overlay {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(255, 255, 255, 0.7); display: flex; justify-content: center; align-items: center; z-index: 100;
}
.game-over, .pause { text-align: center; background: white; padding: 20px; border-radius: 15px; border: 3px solid #ffb6c1; }

button { background: #ff69b4; color: white; border: none; padding: 8px 16px; border-radius: 10px; font-size: 1rem; cursor: pointer; margin: 5px; }

.controls-hint { margin-top: 10px; color: #aaa; font-size: 0.9rem; }

.fade-enter-active, .fade-leave-active { transition: all 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translate(-50%, -40%); }
</style>
