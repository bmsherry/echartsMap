export const convertIMapToEcharts = {
  encodePolygon(coordinate, encodeOffsets) {
    let result = "";

    let prevX = this.quantize(coordinate[0][0]);
    let prevY = this.quantize(coordinate[0][1]);
    // Store the origin offset
    encodeOffsets[0] = prevX;
    encodeOffsets[1] = prevY;

    for (let i = 0; i < coordinate.length; i++) {
      const point = coordinate[i];
      result += this.encode(point[0], prevX);
      result += this.encode(point[1], prevY);

      prevX = this.quantize(point[0]);
      prevY = this.quantize(point[1]);
    }

    return result;
  },
  quantize(val) {
    return Math.ceil(val * 1024);
  },
  encode(val, prev) {
    // Quantization
    val = this.quantize(val);
    // var tmp = val;
    // Delta
    val = val - prev;
    if (((val << 1) ^ (val >> 15)) + 64 === 8232) {
      //WTF, 8232 will get syntax error in js code
      val--;
    }
    // ZigZag
    val = (val << 1) ^ (val >> 15);
    // add offset and get unicode
    return String.fromCharCode(val + 64);
  },
}
