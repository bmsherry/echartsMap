import Vue from 'vue'
import App from './App.vue'
import "./assets/css/normalize.scss";
import echarts from 'echarts'
import VueAMap from "vue-amap";
import {
  lazyAMapApiLoaderInstance
} from "vue-amap";

Vue.use(VueAMap);
VueAMap.initAMapApiLoader({
  key: "你的高德地图Key",
  plugin: [
    "Geocoder",
    "MarkerClusterer",
    "CitySearch"
  ],
  uiVersion: '1.0.11' // 版本号
});
Vue.prototype.$echarts = echarts;
/* eslint-disable no-new */
lazyAMapApiLoaderInstance.load().then(() => {
  new Vue({
    el: "#app",
    render: h => h(App)
  });
});
