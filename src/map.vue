<template>
  <div class="castscreen">
    <div id="loadingcanvas" v-show="loadingcanvas">
      <canvas ref="c"></canvas>
    </div>
    <div class="left" v-if="!loadingcanvas">
      <div class="canvaszz"> </div>
      <canvas id="starCanvas" ref="starCanvas"></canvas>
      <div class="top">
        <div class="topimg">
          <div class="demo">地图DEMO</div>
        </div>
      </div>
      <div class="leftbottom">
        <div class="echartsmap">
          <div class="mapbreadcrumbbox">
            <div class="mapbreadcrumbboxtop"></div>
            <div class="mapbreadcrumbboxleft"></div>
            <div class="mapbreadcrumbcontainer">
              <div class="mapbreadcrumbicon"></div>
              <div class="geography" @click="clickBreadcrumbMap(0)">中国</div>
              <div v-if="currentProvince" class="breadgeography">></div>
              <div v-if="currentProvince" class="geography" @click="clickBreadcrumbMap(1)">{{currentProvince}}</div>
              <div v-if="currentCity" class="breadgeography">></div>
              <div v-if="currentCity" class="geography" @click="clickBreadcrumbMap(2)">{{currentCity}}</div>
            </div>
            <div class="mapbreadcrumbboxright"></div>
          </div>

          <div id="echarts-castscreen">
          </div>
          <div class="rightbox">
            <div class="devicedata">
              <div class="devicecontainer">
                <div class="devicedataall devicecontainersame">
                  <div class="devicecontainersame-top">{{deviceTotal}}</div>
                  <div class="devicecontainersame-bottom">设备总数</div>
                </div>
                <div class="alarmdataall devicecontainersame">
                  <div class="devicecontainersame-top">{{alarmTotal}}</div>
                  <div class="devicecontainersame-bottom">总告警次数</div>
                </div>
              </div>
            </div>
            <div class="barcontainer">
              <div class="bartitle">
                <div class="bartitleicon"></div>
                <div class="bartitlecontent">设备区域分布 (台)</div>
              </div>
              <div class="echarts-castscreen-barbox" ref="barbox">
                <div id="echarts-castscreen-bar" ref="castscreenbar"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

</template>

<script>
import throttle from "lodash.throttle";
import {
  handleEvents,
  getMapOption,
  convertBarData,
  getBarOption
} from "./assets/js/echartsMapOption";
import { convertIMapToEcharts } from "./assets/js/convertGeoJSON";
import { loading } from "./assets/js/loading";
import starMap from "./assets/js/starMap";

const tw = require("./assets/710000.json");
export default {
  name: "CastScreen",
  data() {
    return {
      barHeight: 0,
      barOutHeight: 0,
      deviceTotal: 1117,
      alarmTotal: 1248,
      timeTicket: null,
      timeoutTimer: null,
      barTimer: null,
      intervalTimer: null,
      loadingcanvas: false,
      options: {},
      count: 0, //控制tooltip自动播放到第几个
      myMap: null,
      barCharts: null,
      currentProvince: 0,
      currentCity: 0,
      spcialProvinceJSONMap: {},
      spcialCityJSONMap: {},
      opt: [], //0为国家1为省2为城市
      ids: [], //保存面包屑的id e.g [100000,110000,110100]
      realtimeAlarmData: [
        { id: 360100, name: "南昌市", value: [115.89, 28.48] },
        { id: 360200, name: "景德镇", value: [117.28, 29.09] }
      ],
      deviceData: {}
    };
  },
  mounted() {
    const self = this;
    this.loadingcanvas = true;
    loading(this.$refs["c"]);
    this.timeoutTimer = window.setTimeout(function() {
      window.AMapUI.loadUI(["geo/DistrictExplorer"], DistrictExplorer => {
        //启动页面
        self.convertAreaDeviceData();
        self.districtExplorer = new DistrictExplorer();
        const adcode = 100000; //全国的区划编码
        self.getMapJson(adcode, self.drawMap);
        self.$nextTick(() => {
          self.loadingcanvas = false;
          self.$nextTick(() => {
            self.getCastBarBoxHeight();
            const canvas = self.$refs["starCanvas"];
            //画星空
            starMap(canvas);
            //定时调后端接口刷新数据
            self.intervalTimer = setInterval(async () => {
              self.intervalOpera(self.opt.length);
            }, 300000);
          });
        });
      });
    }, 1000);
    this._initIndex();
  },
  methods: {
    //增加轮播tooltip
    intervalToolTip(options) {
      let count = 0;
      const dataLength = options.series[0].data.length;
      this.timeTicket && window.clearInterval(this.timeTicket);
      this.timeTicket = window.setInterval(() => {
        if (count === dataLength) {
          count = 0;
        }
        this.myMap.dispatchAction({
          type: "downplay",
          seriesIndex: 0
        });
        this.myMap.dispatchAction({
          type: "highlight",
          seriesIndex: 0,
          dataIndex: count % dataLength
        });
        this.myMap.dispatchAction({
          type: "showTip",
          seriesIndex: 0,
          dataIndex: count % dataLength
        });
        count++;
      }, 2000);
    },
    getJSONspecailOpear(adcode, areaNode) {
      if (adcode === 440000) {
        this.spcialCityJSONMap[441900] = this.spcialCityJSONMap[441900]
          ? this.spcialCityJSONMap[441900]
          : areaNode.getSubFeatureByAdcode(441900);
        this.spcialCityJSONMap[442000] = this.spcialCityJSONMap[442000]
          ? this.spcialCityJSONMap[442000]
          : areaNode.getSubFeatureByAdcode(442000);
      } else if (adcode === 620000) {
        this.spcialCityJSONMap[620200] = this.spcialCityJSONMap[620200]
          ? this.spcialCityJSONMap[620200]
          : areaNode.getSubFeatureByAdcode(620200);
      }
    },
    //获取地理json
    getMapJson(adcode, cb, payload) {
      this.districtExplorer.loadAreaNode(adcode, (error, areaNode) => {
        if (error) {
          return;
        }
        const geoJSON = areaNode.getSubFeatures();
        this.getJSONspecailOpear(adcode, areaNode);
        cb.call(this, this.convertGeoJSON(geoJSON), payload);
      });
    },
    convertGeoJSON(copyJSON) {
      const geoJSON = [...copyJSON];
      const geoCoord = [126, 25];
      const points$1 = [
        [
          [0, 3.5],
          [7, 11.2],
          [15, 11.9],
          [30, 7],
          [42, 0.7],
          [52, 0.7],
          [56, 7.7],
          [59, 0.7],
          [64, 0.7],
          [64, 0],
          [5, 0],
          [0, 3.5]
        ],
        [[13, 16.1], [19, 14.7], [16, 21.7], [11, 23.1], [13, 16.1]],
        [[12, 32.2], [14, 38.5], [15, 38.5], [13, 32.2], [12, 32.2]],
        [[16, 47.6], [12, 53.2], [13, 53.2], [18, 47.6], [16, 47.6]],
        [[6, 64.4], [8, 70], [9, 70], [8, 64.4], [6, 64.4]],
        [[23, 82.6], [29, 79.8], [30, 79.8], [25, 82.6], [23, 82.6]],
        [[37, 70.7], [43, 62.3], [44, 62.3], [39, 70.7], [37, 70.7]],
        [[48, 51.1], [51, 45.5], [53, 45.5], [50, 51.1], [48, 51.1]],
        [[51, 35], [51, 28.7], [53, 28.7], [53, 35], [51, 35]],
        [[52, 22.4], [55, 17.5], [56, 17.5], [53, 22.4], [52, 22.4]],
        [[58, 12.6], [62, 7], [63, 7], [60, 12.6], [58, 12.6]],
        [
          [0, 3.5],
          [0, 93.1],
          [64, 93.1],
          [64, 0],
          [63, 0],
          [63, 92.4],
          [1, 92.4],
          [1, 3.5],
          [0, 3.5]
        ]
      ];
      for (let i$1 = 0; i$1 < points$1.length; i$1++) {
        for (let k = 0; k < points$1[i$1].length; k++) {
          points$1[i$1][k][0] /= 10.5;
          points$1[i$1][k][1] /= -10.5 / 0.75;

          points$1[i$1][k][0] += geoCoord[0];
          points$1[i$1][k][1] += geoCoord[1];
        }
      }
      const len = geoJSON.length;
      for (let i = 0; i < len; i++) {
        if (geoJSON[i].properties.adcode === 460000) {
          geoJSON[i].geometry.coordinates.length = 1;
          geoJSON[i].geometry.coordinates.push(points$1);
          geoJSON[i].properties.cp = geoJSON[i].properties.center;
          break;
        } else if (geoJSON[i].properties.adcode === 460300) {
          break;
        }
      }
      const json = {
        UTF8Encoding: true,
        features: geoJSON,
        type: "FeatureCollection"
      };
      json.features.forEach(function(feature) {
        const encodeOffsets = (feature.geometry.encodeOffsets = []);
        const coordinates = feature.geometry.coordinates;
        if (feature.geometry.type === "Polygon") {
          coordinates.forEach((coordinate, idx) => {
            coordinates[idx] = convertIMapToEcharts.encodePolygon(
              coordinate,
              (encodeOffsets[idx] = [])
            );
          });
        } else if (feature.geometry.type === "MultiPolygon") {
          coordinates.forEach((polygon, idx1) => {
            encodeOffsets[idx1] = [];
            polygon.forEach((coordinate, idx2) => {
              coordinates[idx1][idx2] = convertIMapToEcharts.encodePolygon(
                coordinate,
                (encodeOffsets[idx1][idx2] = [])
              );
            });
          });
        }
        feature.id = feature.properties.adcode;
        feature.level = feature.properties.level;
      });
      return json;
    },
    async drawMap(json) {
      //初始化画全国
      this.$echarts.registerMap(100000, json);
      this.myMap = this.$echarts.init(
        document.getElementById("echarts-castscreen")
      );
      const goDown = true;
      //转换data
      const mapData = this.convertMapData(json);
      const data = this.convertData(json);
      this.ids = [100000];
      this.opt = [
        {
          mapName: 100000,
          mapData: mapData,
          deviceData: this.deviceData,
          data: data,
          goDown: goDown,
          realtimeAlarmData: this.comfirmInMap(),
          nextLevel: "province"
        }
      ];
      this.options = getMapOption(this.opt[0]);
      this.setBar(data);
      this.myMap.setOption(this.options);
      this.intervalToolTip(this.options);
      this.mapBindClick();
      this.mapBindMouseEvent();
    },
    setBar(data) {
      this.barTimer ? clearInterval(this.barTimer) : null;
      const len = data.length;
      this.barHeight = `${len * 30 + 50}px`;
      this.barCharts = this.$echarts.init(
        document.getElementById("echarts-castscreen-bar")
      );
      const barData = convertBarData(data, "barData");
      const yData = convertBarData(data);
      const barDataCopy = [...barData];
      const yDataCopy = [...yData];
      const convertData = getBarOption(barData, yData);
      this.barCharts.setOption(convertData);
      this.barCharts.resize({ height: this.barHeight });
      if (parseFloat(this.barHeight) > parseFloat(this.barOutHeight)) {
        this.barTimer = setInterval(() => {
          barDataCopy.unshift(barDataCopy.pop());
          yDataCopy.unshift(yDataCopy.pop());
          const convertData = getBarOption(barDataCopy, yDataCopy);
          this.barCharts.setOption(convertData);
        }, 3000);
      }
    },
    //循环调后端接口后的操作
    intervalOpera(len) {
      this.options = this.convertIntervalData(getMapOption(this.opt[len - 1]));
      this.myMap.clear();
      this.myMap.setOption(this.options);
      this.setBar(this.options.series[0].data);
      this.intervalToolTip(this.options);
    },
    convertIntervalData(options) {
      options.series[0].data.map(val => {
        if (this.deviceData[val.id]) {
          val.deviceNum = this.deviceData[val.id];
        }
      });
      return options;
    },
    convertAreaDeviceData() {
      //mock
      this.mock = [
        {
          adcode: 440000,
          address: "广东省",
          count: 92
        },
        {
          adcode: 410000,
          address: "河南省",
          count: 176
        },
        {
          adcode: 150000,
          address: "内蒙古自治区",
          count: 117
        },
        {
          adcode: 230000,
          address: "黑龙江省",
          count: 143
        },
        {
          adcode: 650000,
          address: "新疆维吾尔自治区",
          count: 120
        },
        {
          adcode: 420000,
          address: "湖北省",
          count: 117
        },
        {
          adcode: 210000,
          address: "辽宁省",
          count: 115
        },
        {
          adcode: 370000,
          address: "山东省",
          count: 155
        },
        {
          adcode: 610000,
          address: "陕西省",
          count: 118
        },
        {
          adcode: 310000,
          address: "上海市",
          count: 19
        },
        {
          adcode: 520000,
          address: "贵州省",
          count: 98
        },
        {
          adcode: 500000,
          address: "重庆市",
          count: 41
        },
        {
          adcode: 540000,
          address: "西藏自治区",
          count: 83
        },
        {
          adcode: 340000,
          address: "安徽省",
          count: 123
        },
        {
          adcode: 350000,
          address: "福建省",
          count: 95
        },
        {
          adcode: 430000,
          address: "湖南省",
          count: 137
        },
        {
          adcode: 460000,
          address: "海南省",
          count: 31
        },
        {
          adcode: 320000,
          address: "江苏省",
          count: 110
        },
        {
          adcode: 630000,
          address: "青海省",
          count: 53
        },
        {
          adcode: 450000,
          address: "广西壮族自治区",
          count: 126
        },
        {
          adcode: 640000,
          address: "宁夏回族自治区",
          count: 28
        },
        {
          adcode: 360000,
          address: "江西省",
          count: 112
        },
        {
          adcode: 330000,
          address: "浙江省",
          count: 101
        },
        {
          adcode: 130000,
          address: "河北省",
          count: 180
        },
        {
          adcode: 810000,
          address: "香港特别行政区",
          count: 21
        }
      ];
      this.deviceData = {};
      this.mock.map(val => {
        this.deviceData[val.adcode] = ++val.count;
      });
    },
    clickBreadcrumbMap(level) {
      //说明点击的不是最下层 才操作
      if (this.opt.length !== level + 1) {
        //点击面包屑 获取设备数量
        this.convertAreaDeviceData();
        if (level === 0) {
          this.currentProvince = "";
          this.currentCity = "";
        } else if (level === 1) {
          this.currentCity = "";
        }
        this.opt.length = level + 1;
        this.ids.length = level + 1;
        this.options = getMapOption(this.opt[level]);
        handleEvents.resetOption(this.myMap, this.options);
        this.setBar(this.options.series[0].data);
        this.intervalToolTip(this.options);
      }
    },
    setBreadcrumb(level, name) {
      if (level === 1) {
        this.currentProvince = name;
      } else if (level === 2) {
        this.currentCity = name;
      }
    },
    mapBindClick() {
      this.myMap.on("click", params => {
        //除去中国5个不含辖区的市
        if (params.data.level === "province" || params.data.level === "city") {
          let opt = {};
          if (params.data.level === "province") {
            opt = this.opt[0];
          } else {
            opt = this.opt[1];
          }
          if (opt.goDown) {
            if (
              params.data.id === 620200 ||
              params.data.id === 441900 ||
              params.data.id === 442000
            ) {
              this.getClickDataOpera(
                this.convertGeoJSON([this.spcialCityJSONMap[params.data.id]]),
                params
              );
            } else if (params.data.id === 710000) {
              this.getClickDataOpera(this.convertGeoJSON(tw.features), params);
            } else {
              this.getMapJson(params.data.id, this.getClickDataOpera, params);
            }
          }
        }
      });
    },
    mapBindMouseEvent() {
      const self = this;
      this.myMap.on("mouseover", function(params) {
        self.timeTicket && window.clearInterval(self.timeTicket);
        self.myMap.dispatchAction({
          type: "downplay",
          seriesIndex: 0
        });
        self.myMap.dispatchAction({
          type: "highlight",
          seriesIndex: 0,
          dataIndex: params.dataIndex
        });
        self.myMap.dispatchAction({
          type: "showTip",
          seriesIndex: 0,
          dataIndex: params.dataIndex
        });
      });
      this.myMap.on("mouseout", function(params) {
        self.timeTicket && window.clearInterval(self.timeTicket);
        self.intervalToolTip(self.options);
      });
    },
    getNextLevel(json) {
      let nextLevel = null;
      if (json.features && json.features.length > 0) {
        nextLevel = json.features[0].level;
      }
      return nextLevel;
    },
    getClickDataOpera(json, params) {
      //下钻时获取对应区域设备数量
      this.convertAreaDeviceData();
      const mapData = this.convertMapData(json);
      const data = this.convertData(json);
      const nextLevel = this.getNextLevel(json);
      this.ids.push(parseInt(params.data.id));
      let goDown = false;
      let current = "";
      //说明是省
      if (params.data.level === "province") {
        this.setBreadcrumb(1, params.data.name);
        current = "province";
        goDown = true;
      } else {
        this.setBreadcrumb(2, params.data.name);
        current = "city";
        goDown = false;
      }
      //如果是台湾省  不点下去 所以
      if (params.data.id === 710000) {
        goDown = false;
      }
      this.opt.push({
        mapName: params.data.id,
        mapData: mapData,
        deviceData: this.deviceData,
        data: data,
        goDown: goDown,
        realtimeAlarmData: this.comfirmInMap(),
        nextLevel: nextLevel
      });
      this.$echarts.registerMap(params.data.id, json);
      let currentOpt = {};
      if (current === "province") {
        currentOpt = this.opt[1];
      } else {
        currentOpt = this.opt[2];
      }
      this.options = getMapOption(currentOpt);
      handleEvents.resetOption(this.myMap, this.options);
      this.setBar(data);
      this.intervalToolTip(this.options);
    },
    //判断告警点是否在当前层级地图内
    comfirmInMap() {
      const data = [];
      const len = this.ids.length;
      this.realtimeAlarmData.map(val => {
        if (len === 2) {
          if (parseInt(val.id / 10000) * 10000 === this.ids[1]) {
            data.push(val.value);
          }
        } else if (len === 3) {
          //城市级别
          if (val.id === this.ids[2]) {
            data.push(val.value);
          }
        } else {
          data.push(val.value);
        }
      });
      return data;
    },
    //经纬度中心点与省市编码的映射
    convertMapData(data) {
      const resData = {};
      if (data && data.features && data.features.length > 0) {
        data.features.map(val => {
          resData[val.id] = val.properties.center;
        });
      }
      return resData;
    },
    //[{name:xxx,value:xxx,id:xxx}]
    convertData(data) {
      const resData = [];
      if (data && data.features && data.features.length > 0) {
        data.features.map(val => {
          resData.push({
            name: val.properties.name,
            value: val.properties.center,
            id: val.id,
            deviceNum: val.id ? this.deviceData[val.id] || 0 : undefined,
            level: val.level
          });
        });
      }
      return resData;
    },
    //绑定resize事件
    _initIndex() {
      this._listener = throttle(this.resizeListener, 200);
      window.addEventListener("resize", this._listener);
    },
    resizeListener() {
      const canvas = this.$refs["starCanvas"];
      //画星空
      starMap(canvas);
      this.myMap.resize();
    },
    getCastBarBoxHeight() {
      this.barOutHeight = window.getComputedStyle(this.$refs["barbox"]).height;
    }
  },
  destroyed() {
    window.removeEventListener("resize", this._listener);
    this.timeTicket && window.clearInterval(this.timeTicket);
    this.timeoutTimer && window.clearTimeout(this.timeoutTimer);
    this.barTimer && window.clearInterval(this.barTimer);
    this.intervalTimer && window.clearInterval(this.intervalTimer);
  }
};
</script>

<style lang="scss">
.castscreen {
  position: absolute;
  min-width: 1366px;
  width: 100%;
  height: 100%;
  display: flex;
  display: -webkit-flex;
  background-image: url("./assets/image/mapbg.jpg");
  #loadingcanvas {
    background: #000;
    position: absolute;
    height: 100%;
    width: 100%;
    z-index: 10000;
    canvas {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
    }
  }
  .left {
    height: 100%;
    flex: 1;
    display: flex;
    display: -webkit-flex;
    flex-direction: column;
    .canvaszz {
      width: 100%;
      height: 100%;
      background-image: url("./assets/image/mapbg.jpg");
      background-size: 100% 100%;
      position: absolute;
      filter: alpha(opacity=40);
      -moz-opacity: 0.4;
      -khtml-opacity: 0.4;
      opacity: 0.4;
      z-index: 10;
    }
    #starCanvas {
      width: 100%;
      height: 100%;
      position: absolute;
    }
    .top {
      position: absolute;
      top: 20px;
      width: 100%;
      height: 80px;
      z-index: 1000;
      .topimg {
        width: 1349px;
        height: 80px;
        background: url("./assets/image/castscreentitle.png");
        margin: 0 auto;
        .demo {
          margin: 0 auto;
          font-size: 36px;
          font-weight: bold;
          color: #25c4d3;
          line-height: 80px;
        }
      }
    }
    .lefttop {
      height: 100px;
    }
    .leftbottom {
      flex: 10;
      .echartsmap {
        height: 100%;
        position: relative;
        z-index: 100;
        #echarts-castscreen {
          height: 100%;
        }
        .rightbox {
          position: absolute;
          top: 120px;
          bottom: 40px;
          width: 22%;
          right: 40px;
          display: flex;
          display: -webkit-flex;
          flex-direction: column;
          .devicedata {
            flex: 2;
            margin-bottom: 20px;
            position: relative;
            background-image: url("./assets/image/deviceTotal.png");
            background-size: 100% 100%;
            .devicecontainer {
              width: 76%;
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;
              height: 48%;
              display: flex;
              display: -webkit-flex;
              .devicedataall {
                margin-right: 10%;
              }
              .devicecontainersame {
                background-image: url("./assets/image/devicebox.png");
                background-size: 100% 100%;
                flex: 1;
                display: flex;
                display: -webkit-flex;
                flex-direction: column;
                .devicecontainersame-top {
                  display: table-cell;
                  vertical-align: bottom;
                  flex: 3;
                  font-size: 36px;
                  color: #25c4d3;
                  font-weight: bold;
                  text-align: center;
                  position: relative;
                  top: 5px;
                }
                .devicecontainersame-bottom {
                  flex: 2;
                  font-size: 14px;
                  color: #64afff;
                  text-align: center;
                }
              }
            }
          }
          .barcontainer {
            background-image: url("./assets/image/deviceArea.png");
            background-size: 100% 100%;
            flex: 7;
            position: relative;
            padding: 60px 0 30px 0;
            overflow: hidden;
            .bartitle {
              position: absolute;
              top: 20px;
              left: 10px;
              height: 30px;
              display: flex;
              display: -webkit-flex;
              .bartitleicon {
                background: url("./assets/image/smokeicon.png") 0 0 no-repeat;
                width: 30px;
                height: 30px;
                margin-left: 30px;
              }
              .bartitlecontent {
                margin-left: 10px;
                font-size: 18px;
                color: #64afff;
                line-height: 30px;
                height: 30px;
              }
            }
            .echarts-castscreen-barbox {
              width: 100%;
              height: 100%;
              padding-right: 30px;
              #echarts-castscreen-bar {
                width: 100%;
              }
            }
          }
        }
        .mapbreadcrumbbox {
          position: absolute;
          top: 125px;
          left: 60px;
          z-index: 1001;
          display: flex;
          display: -webkit-flex;
          .mapbreadcrumbboxtop {
            position: absolute;
            top: -6px;
            left: 0;
            background: url("./assets/image/bread1.png") 0 0 no-repeat;
            height: 9px;
            width: 86px;
          }
          .mapbreadcrumbboxleft {
            width: 24px;
            height: 50px;
            background-image: url("./assets/image/bread3.png");
            background-size: 100% 100%;
          }
          .mapbreadcrumbboxright {
            width: 24px;
            height: 50px;
            background-image: url("./assets/image/bread4.png");
            background-size: 100% 100%;
          }
          .mapbreadcrumbcontainer {
            display: flex;
            display: -webkit-flex;
            color: #ffffff;
            background-image: url("./assets/image/bread2.png");
            background-size: 100% 100%;
            font-size: 20px;
            height: 50px;
            .mapbreadcrumbicon {
              background: url("./assets/image/breadicon.png") 0 0 no-repeat;
              width: 18px;
              height: 18px;
              margin: 16px 10px 16px 0;
            }
            .geography {
              font-size: 18px;
              color: #64afff;
              cursor: pointer;
              height: 50px;
              line-height: 50px;
            }
            .breadgeography {
              font-size: 18px;
              color: #64afff;
              height: 50px;
              line-height: 50px;
              margin: 0 10px;
            }
          }
        }
      }
    }
  }
}
@media screen and (max-width: 1440px) {
  .devicecontainersame-top {
    font-size: 24px !important;
  }
}
</style>


