<template>
  <div id="app">
    <echarts-map></echarts-map>
  </div>
</template>

<script>
import echartsMap from "./map";
export default {
  name: "app",
  components: {
    echartsMap
  },
  data() {
    return {
      msg: "Welcome to Your Vue.js App"
    };
  }
};
</script>

<style lang="scss">
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  height: 100%;
}
</style>
