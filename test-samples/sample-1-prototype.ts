import { v4 as uuidv4 } from 'uuid';

/* A function which checks if an excel cell value stores no meaningful data */
export function isNull(value: string | number | null) {
	if (value === null) return true;
	if (value === 0) return true;
	if (value === '#N/A') return true;
	if (value === '') return true;
	return false;
}

/* Convert Excel cell reference to one-based row and column */
export function excelCellToRowCol(cell: string): [number, number] {
	const r = /\$?([A-Z]*)\$?([0-9]*)/;
	const m = cell.match(r);
	if (m) {
		const row = +m[2];
		let arr = m[1].toUpperCase()
			.split('')
			.map(n => n.charCodeAt(0) - 65 + 1);
		const col = arrayToDecimal(arr, 26);
		return [col, row];
	}
	return [0, 0];
}

/* Number array to decimal with parameter base */
export function arrayToDecimal(arr: number[], base: number = 10): number {
	return arr.reduce((acc, curr, i) => {
		let power = arr.length - i - 1;
		let multiple = Math.pow(base, power);
		return acc += multiple * curr;
	}, 0);
}

/* Function that detects parameters within an azure function route and replaces them with express route parameters */
export function replaceRouteParams(route: string): string {
	if (!route.startsWith('/')) route = `/${route}`;

	// Replace route parameters with express route parameters
	route = route.replace(/\{([^}]*)\}/g, ':$1');

	// Resolve {rand-guid} binding expression with a new GUID
	route = route.replace(/{rand-guid}/g, uuidv4());

	// The binding expression DateTime resolves to a representation of DateTime.UtcNow. The following blob path in a function.json file creates a blob with a name like 2018-02-16T17-59-55Z.txt.
	route = route.replace(/{date-time}/g, new Date().toISOString());

	return route;
	
}

/* Function that takes an array of strings and joins them to a camelCase string */
export function toCamelCase(str: string, sep?: string): string
export function toCamelCase(arr: string[]): string
export function toCamelCase(param: string | string[], sep: string = '_'): string {
	let arr: string[];
	if (typeof param === 'string') {
		arr = param.split(sep);
	} else {
		arr = param;
	}
	return arr.reduce((acc, curr, i) => {
		if (i === 0) return acc + curr.charAt(0).toLowerCase() + curr.slice(1);
		return acc + curr.charAt(0).toUpperCase() + curr.slice(1);
	}, '');
}

/* Capitalises first letter of a string */
export function capitalise(str: string): string {
	return str.charAt(0).toUpperCase() + str.slice(1);
}

/* Normalize a number in bytes to the appropriate kilobyte, megabyte, or gigabyte */
export function normaliseBytes(bytes: number): string {
	let units = ['bytes', 'KB', 'MB', 'GB', 'TB'];
	for (let x = 0; x < units.length; x++) {
		let n = Math.pow(1024, x);
		let m = bytes / n;
		if (m >= 1 && m < 102.4) {
			return `${m.toFixed(1)} ${units[x]}`;
		}
		if (bytes < 1024) return `${bytes} ${units[x]}`;
	}
	return `${bytes} bytes`;
}

/* Convert a string to an ArrayBuffer */
export function toArrayBuffer(str: string): ArrayBuffer {
	let buf = new ArrayBuffer(str.length);
	let bufView = new Uint8Array(buf);
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	return buf;
}

/* A function that returns whether the values written in an excel cell are false-y */
export function isExcelNull(value: string | null | number): boolean {
	if (value === null) return true;
	if (value === 0) return true;
	if (value === NaN) return true;
	if (value === '#N/A') return true;
	if (value === '') return true;
	return false;
}

/* Schwartzian transform to shuffle an array */
export function shuffle<T>(array: T[]): T[] {
	let currentIndex = array.length, temporaryValue, randomIndex;
	while (0 !== currentIndex) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}
	return array;
}

// A function which takes a source name for data and generates some sort of abbreviation for it
export function abbreviate(source: string): string {
	
	const s = /\s+/g;
	const r = /^[A-Z]{2,}/;
	const camelCase = /([A-Z][a-z]{2,})/g;

	const words = source.split(s);

	for (let w of words) {
		
		// If any word is all caps, return it
		let arr = w.match(r);
		if (arr) {
			return arr[0];
		}

		// If any word is in PascalCase and the first segment is >= 3 letters, return that segment
		arr = w.match(camelCase);
		if (arr && arr.length >=2 && arr[0].length >= 3) {
			let firstSegment = arr[0];
			return firstSegment;
		}
	}

	// If all else fails, return the string's initials in uppercase
	return words.map(w => w.charAt(0)).join('').toUpperCase();

}