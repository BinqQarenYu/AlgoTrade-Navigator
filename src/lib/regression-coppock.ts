import { calculateCoppockCurve } from './indicators';

const data = [100, 102, 101, 105, 107, 108, 110, 112, 111, 115, 118, 120, 122, 125, 124, 128, 130];
const longRoC = 4;
const shortRoC = 2;
const wmaPeriod = 3;

const result = calculateCoppockCurve(data, longRoC, shortRoC, wmaPeriod);
console.log(JSON.stringify(result));
