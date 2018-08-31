const convertData = function (data, alarmData) {
  const res = [];
  for (let i = 0; i < data.length; i++) {
    const alarmDataSingle = alarmData[data[i].id];
    if (alarmDataSingle) {
      res.push({
        name: data[i].name,
        value: data[i].value.concat(alarmDataSingle)
      });
    }
  }
  return res;
};

export const handleEvents = {
  /**
   * i 实例对象
   * o option
   * n 地图名
   **/
  resetOption: function (i, o, n) {
    i.clear();
    i.setOption(o);
    this.zoomAnimation(i);
  },

  // 设置effectscatter
  initSeriesData: function (data) {
    const temp = [];
    for (let i = 0; i < data.length; i++) {
      let geoCoord = geoCoordMap[data[i].name];
      if (geoCoord) {
        temp.push({
          name: data[i].name,
          value: geoCoord.concat(data[i].value, data[i].level)
        });
      }
    };
    return temp;
  },
  //传入chart实例
  zoomAnimation: function (chart) {
    let count = null;
    let zoom = function (per) {
      if (!count) count = per;
      count = count + per;
      // console.log(per,count);
      chart.setOption({
        geo: {
          zoom: count
        }
      });
      if (count < 1) window.requestAnimationFrame(function () {
        zoom(0.2);
      });
    };
    window.requestAnimationFrame(function () {
      zoom(0.2);
    });
  }
}
export const getMapOption = (opt) => {
  const defaultOpt = {
    mapName: 100000, // 地图展示
    goDown: false, // 是否下钻
    bgColor: '#404a59', // 画布背景色
  };
  if (opt) {
    opt = Object.assign(defaultOpt, opt)
  };
  const max = 400;
  const min = 0; // todo 
  const maxSize4Pin = 100;
  const minSize4Pin = 20;
  // style
  const style = {
    font: '18px "Microsoft YaHei", sans-serif',
    textColor: '#eee',
    lineColor: 'rgba(147, 235, 248, .8)'
  };
  const options = {
    backgroundColor: opt.bgColor,
    geo: {
      map: opt.mapName,
      zoom: 1,
      roam: true,
      label: {
        show: true,
        color: "#fff"
      },
      itemStyle: {
        borderColor: "rgba(147, 235, 248, 1)",
        borderWidth: 1,
        areaColor: {
          type: "radial",
          x: 0.5,
          y: 0.5,
          r: 0.8,
          colorStops: [{
              offset: 0,
              color: "rgba(147, 235, 248, 0)" // 0% 处的颜色
            },
            {
              offset: 1,
              color: "rgba(147, 235, 248, .2)" // 100% 处的颜色
            }
          ],
          globalCoord: false // 缺省为 false
        },
        shadowColor: "rgba(128, 217, 248, 1)",
        // shadowColor: 'rgba(255, 255, 255, 1)',
        shadowOffsetX: -2,
        shadowOffsetY: 2,
        shadowBlur: 10,
      },
      emphasis: {
        label: {
          color: "#fff"
        },
        itemStyle: {
          areaColor: "#389BB7",
          borderWidth: 0
        }

      }
    },
    tooltip: {
      trigger: 'item',
      formatter: function (params) {
        if (typeof (params.value)[2] === "undefined" && params.data && params.data.alarmNum !== undefined) {
          return `${params.name}:<br/>告警数量：${params.data.alarmNum}`;
        } else if (typeof (params.value)[2] === "undefined") {
          return '';
        } else {
          return `${params.name}:<br/>告警数量：${params.value[2]}`;
        }
      }
    },
    series: [{
        type: 'map',
        map: opt.mapName,
        geoIndex: 0,
        aspectScale: 0.75, //长宽比
        showLegendSymbol: false, // 存在legend时显示
        data: opt.data
      },
      {
        name: '告警数量',
        type: 'scatter',
        coordinateSystem: 'geo',
        symbol: 'pin',
        symbolSize: function (val) {
          let a = (maxSize4Pin - minSize4Pin) / (max - min);
          let b = minSize4Pin - a * min;
          b = maxSize4Pin - a * max;
          return a * val[2] + b;
        },
        label: {
          show: true,
          color: '#fff',
          fontSize: 9,
          formatter: function (params) {
            return params.value[2]
          }
        },
        itemStyle: {
          color: '#F62157', //标志颜色
        },
        zlevel: 6,
        data: convertData(opt.data, opt.alarmData),
      },
      {
        type: "effectScatter",
        coordinateSystem: "geo",
        showEffectOn: "render",
        rippleEffect: {
          period: 15,
          scale: 6,
          //brushType: "stroke"
        },
        hoverAnimation: true,
        itemStyle: {
          color: 'rgba(241, 109, 115, .8)',
          shadowBlur: 10,
          shadowColor: "#333"
        },
        data: opt.realtimeAlarmData || []
      }
    ]
  };
  return options;
}
