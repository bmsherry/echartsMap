<template>
    <div class="castscreen">
        <div class="echartsmap">
            <div class="mapbreadcrumbcontainer">
                <div class="geography" @click="clickBreadcrumbMap(0)">中国</div>
                <div v-if="currentProvince">></div>
                <div v-if="currentProvince" class="geography" @click="clickBreadcrumbMap(1)">{{currentProvince}}</div>
                <div v-if="currentCity">></div>
                <div v-if="currentCity" class="geography" @click="clickBreadcrumbMap(2)">{{currentCity}}</div>
            </div>
            <div id="echarts-castscreen">
            </div>
        </div>
    </div>
</template>

<script>
import throttle from "lodash.throttle";
import { handleEvents, getMapOption } from "./assets/js/echartsMapOption";
import { convertIMapToEcharts } from "./assets/js/convertGeoJSON";
import axios from "axios";

export default {
  name: "CastScreen",
  data() {
    const self = this;
    return {
      myMap: null,
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
      alarmData: {
        360700: 199,
        360800: 39,
        361100: 152,
        360400: 299,
        361000: 89,
        360900: 52,
        360100: 9,
        360200: 352,
        360300: 99,
        360600: 39,
        360500: 480
      }
    };
  },
  mounted() {
    this.timer = setTimeout(() => {
      window.AMapUI.loadUI(["geo/DistrictExplorer"], DistrictExplorer => {
        //启动页面
        this.districtExplorer = new DistrictExplorer();

        const adcode = 100000; //全国的区划编码
        this.getMapJson(adcode, this.drawMap);
      });
    }, 1000);
    this._initIndex();
  },
  methods: {
    getJSONspecailOpear(adcode, areaNode) {
      if (adcode === 100000) {
        //台湾省
        this.spcialProvinceJSONMap[710000] = this.spcialProvinceJSONMap[710000]
          ? this.spcialProvinceJSONMap[710000]
          : areaNode.getSubFeatureByAdcode(710000);
      } else if (adcode === 440000) {
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
          console.error(error);
          return;
        }
        const geoJSON = areaNode.getSubFeatures();
        this.getJSONspecailOpear(adcode, areaNode);
        cb.call(this, this.convertGeoJSON(geoJSON), payload);
      });
    },
    convertGeoJSON(copyJSON) {
      const geoJSON = [...copyJSON];
      const len = geoJSON.length;
      for (let i = 0; i < len; i++) {
        if (geoJSON[i].properties.adcode === 460000) {
          geoJSON[i].geometry.coordinates.length = 1;
          break;
        } else if (geoJSON[i].properties.adcode === 460300) {
          geoJSON.splice(i, 1);
          break;
        }
      }
      const json = {
        UTF8Encoding: true,
        features: geoJSON,
        type: "FeatureCollection"
      };
      json.features.forEach(function(feature) {
        let encodeOffsets = (feature.geometry.encodeOffsets = []);
        let coordinates = feature.geometry.coordinates;
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
      console.log(json);
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
          bgColor: "#154e90",
          mapName: 100000,
          mapData: mapData,
          alarmData: this.alarmData,
          data: data,
          goDown: goDown,
          realtimeAlarmData: this.comfirmInMap()
        }
      ];
      const options = getMapOption(this.opt[0]);
      this.myMap.setOption(options);
      this.mapBindClick();
    },
    clickBreadcrumbMap(level) {
      //说明点击的不是最下层 才操作
      if (this.opt.length !== level + 1) {
        if (level === 0) {
          this.currentProvince = "";
          this.currentCity = "";
        } else if (level === 1) {
          this.currentCity = "";
        }
        this.opt.length = level + 1;
        this.ids.length = level + 1;
        handleEvents.resetOption(this.myMap, getMapOption(this.opt[level]));
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
              this.getClickDataOpera(
                this.convertGeoJSON([
                  this.spcialProvinceJSONMap[params.data.id]
                ]),
                params
              );
            } else {
              this.getMapJson(params.data.id, this.getClickDataOpera, params);
            }
          }
        }
      });
    },
    getClickDataOpera(json, params) {
      const mapData = this.convertMapData(json);
      const data = this.convertData(json);
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
      //   if (params.data.id === 710000) {
      //     goDown = false;
      //   }
      this.opt.push({
        bgColor: "#154e90",
        mapName: params.data.id,
        mapData: mapData,
        alarmData: this.alarmData,
        data: data,
        goDown: goDown,
        realtimeAlarmData: this.comfirmInMap()
      });
      this.$echarts.registerMap(params.data.id, json);
      let currentOpt = {};
      if (current === "province") {
        currentOpt = this.opt[1];
      } else {
        currentOpt = this.opt[2];
      }
      handleEvents.resetOption(this.myMap, getMapOption(currentOpt));
    },
    //判断告警点是否在当前层级地图内
    comfirmInMap() {
      let data = [];
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
            alarmNum: val.id ? this.alarmData[val.id] || 0 : undefined,
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
      this.myMap.resize();
    }
  },
  destroyed() {
    window.removeEventListener("resize", this._listener);
  }
};
</script>

<style lang="scss">
.castscreen {
  height: 100%;
  display: flex;
  display: -webkit-flex;

  .echartsmap {
    flex: 1;
    -webkit-flex: 1;
    height: 100%;
    position: relative;
    #echarts-castscreen {
      height: 100%;
    }
    .mapbreadcrumbcontainer {
      position: absolute;
      top: 30px;
      left: 200px;
      z-index: 1000;
      display: flex;
      display: -webkit-flex;
      color: #ffffff;
      font-size: 20px;
      .geography {
        cursor: pointer;
      }
    }
  }
}
</style>


