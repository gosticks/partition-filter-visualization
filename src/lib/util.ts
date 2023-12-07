import { DataScaling } from './store/dataStore/types';

export const formatPowerOfTen = (num: number) => {
	if (num === 0) return '0';
	const exponent = Math.floor(Math.log10(Math.abs(num)));
	return `10^${exponent}`;
};

export const labelSkipFactor = (numSegments: number) => {
	if (numSegments > 100) {
		return numSegments / 10;
	} else if (numSegments > 25) {
		return 8;
	} else if (numSegments > 14) {
		return 4;
	} else if (numSegments > 8) {
		return 2;
	}
	return 1;
};

export const scaleDecoder = (scale: DataScaling) => {
	switch (scale) {
		case DataScaling.LINEAR:
			return (n: number) => n;
		case DataScaling.LOG:
			return (n: number) => Math.pow(2, n);
	}
};
