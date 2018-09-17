export const convertBarData = function (data, flag) {
  const reData = []

  if (flag === 'barData') {
    data.map(val => {
      reData.push({
        name: val.name,
        value: val.deviceNum
      })
    })
  } else {
    data.map(val => {
      reData.push(
        val.name
      )
    })
  }
  return reData
}

export const handleEvents = {
  /**
   * i 实例对象
   * o option
   * n 地图名
   **/
  resetOption: function (i, o) {
    i.clear();
    i.setOption(o);
    this.zoomAnimation(i);
  },

  // 设置effectscatter
  initSeriesData: function (data) {
    const temp = [];
    for (let i = 0; i < data.length; i++) {
      const geoCoord = geoCoordMap[data[i].name];
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
    const zoom = function (per) {
      if (!count) count = per;
      count = count + per;
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
    bgColor: 'transparent', // 画布背景色
  };
  if (opt) {
    opt = Object.assign(defaultOpt, opt)
  };
  const options = {
    nextLevel: opt.nextLevel,
    adcode: opt.mapName,
    backgroundColor: opt.bgColor,
    geo3D: {
      map: opt.mapName,
      zoom: 1,
      roam: true,
      label: {
        show: true,
        color: "#fff"
      },
      layoutCenter: ['40%', '50%'],
      layoutSize: '110%',
      itemStyle: {
        borderColor: "rgba(50,129,241, 1)",
        borderWidth: 1,
        //color: 'rgba(13,31,101,0.9)',
        areaColor: {
          type: 'radial',
          x: 0.5,
          y: 0.5,
          r: 0.8,
          colorStops: [{
            offset: 0,
            color: 'rgba(13,31,101, 0)' // 0% 处的颜色
          }, {
            offset: 1,
            color: 'rgba(13,31,101, 0.8)' // 100% 处的颜色
          }],
          globalCoord: false // 缺省为 false
        },
        shadowColor: "rgba(27,107,255, 0.4)",
        shadowOffsetX: -2,
        shadowOffsetY: 2,
        shadowBlur: 10,
      },
      emphasis: {
        label: {
          color: "#fff"
        },
        itemStyle: {
          areaColor: "#2A71D5",
          borderWidth: 0
        }

      }
    },
    tooltip: {
      trigger: 'item',
      borderColor: '#11BAFB',
      backgroundColor: 'rgba(16,32,108,0.9)',
      borderWidth: 1,
      extraCssText: 'box-shadow:  0 0  20px rgb(16,137,250,0.5) inset ;',
      textStyle: {
        color: "#25C4D3",
        fontSize: 18,
      },
      formatter: function (params) {
        if (typeof (params.value)[2] === "undefined" && params.data && params.data.deviceNum !== undefined) {
          return `${params.name}:<br/>设备数量：${params.data.deviceNum}`;
        } else if (typeof (params.value)[2] === "undefined") {
          return '';
        } else {
          return `${params.name}:<br/>设备数量：${params.value[2]}`;
        }
      }
    },
    series: [{
        type: 'map3D',
        map: opt.mapName,
        geoIndex: 0,
        aspectScale: 0.75, //长宽比
        showLegendSymbol: false, // 存在legend时显示
        data: opt.data
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
          color: 'rgba(255,31,31,0.20)',
          shadowBlur: 10,
          shadowColor: "#FF3E3E",
          symbolSize: 60
        },
        data: opt.realtimeAlarmData || []
      }
    ]
  };
  return options;
}

export const getBarOption = (data, yData) => {
  const options = {
    grid: {
      left: 90,
      top: 0,
      right: 50,
      bottom: 0,
      tooltip: {
        show: false
      }
    },
    xAxis: {
      type: 'value',
      show: false
    },
    yAxis: {
      type: 'category',
      nameGap: 16,
      axisLine: {
        show: false,
        lineStyle: {
          color: '#ddd'
        }
      },
      axisTick: {
        show: false,
        lineStyle: {
          color: '#ddd'
        }
      },
      axisLabel: {
        interval: 0,
        formatter: function (params) {
          const len = params.length;
          let label = "";
          if (len < 5) {
            label = params;
          } else if (len > 4 && len < 9) {
            label = `${params.substring(0,4)}\n${params.substring(4,len)}`
          } else {
            label = `${params.substring(0,4)}\n${params.substring(4,8)}\n${params.substring(8,len)}`
          }
          return label;
        },
        margin: 50,
        align: 'left',
        textStyle: {
          color: '#64AFFF'
        },
      },
      data: yData
    },
    series: [{
      name: 'barSer',
      type: 'bar',
      roam: false,
      visualMap: false,
      zlevel: 2,
      barMaxWidth: 20,
      itemStyle: {
        normal: {
          color: '#22B8FF'
        },
        emphasis: {
          color: "#3596c0"
        }
      },
      label: {
        normal: {
          show: true,
          position: 'right',
          textStyle: {
            color: '#64AFFF'
          }
        }
      },
      data: data
    }, ]
  }
  return options;
}
