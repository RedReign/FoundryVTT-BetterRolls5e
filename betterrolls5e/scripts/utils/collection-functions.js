/**
 * Returns a new object containing a subset of source
 * using the keys in props. Equivalent to lodash's pick method.
 * @param {object} source
 * @param {string[]} props
 * @returns {object} subset of source
 */
export function pick(source, props) {
	const result = {};
	for (const prop of props) {
		result[prop] = source[prop];
	}
	return result;
}

export function pickBy(source, predicate) {
	const props = [];
	for (const [key, value] of Object.entries(source)) {
		if (predicate(value, key)) {
			props.push(key);
		}
	}

	return pick(source, props);
}

/**
 * This method is like findIndex except that it iterates
 * from right to left.
 */
export function findLastIndex(array, predicate) {
	const length = array == null ? 0 : array.length;
	if (!length) {
		return -1;
	}

	for (let index = length - 1; index >= 0; index--) {
		if (predicate(array[index], index, array)) {
			return index;
		}
	}

	return -1;
}

/**
 * This method is like find except that it iterates
 * from right to left.
 */
export function findLast(collection, predicate) {
	const iterable = Object(collection);
	const index = findLastIndex(collection, predicate);
	return index > -1 ? iterable[index] : undefined;
}
