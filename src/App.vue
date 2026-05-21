<script setup lang="ts">
import SnakeGame from './components/SnakeGame.vue'
</script>

<template>
  <SnakeGame />
</template>

<style>
* {
  box-sizing: border-box;
}

html, body {
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #fff5f7;
}

#app {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
