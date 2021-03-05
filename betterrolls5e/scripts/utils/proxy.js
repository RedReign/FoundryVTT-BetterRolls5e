

/**
 * Creates objects (proxies) which can be used to deserialize flags efficiently.
 * Currently this is used so that Roll objects unwrap properly.
 */
export const FoundryProxy = {
	// A set of all created proxies. Weaksets do not prevent garbage collection,
	// allowing us to safely test if something is a proxy by adding it in here
	proxySet: new WeakSet(),

	/**
	 * Creates a new proxy that turns serialized objects (like rolls) into objects.
	 * Use the result as if it was the original object.
	 * @param {*} data
	 */
	create(data) {
		const proxy = new Proxy(data, FoundryProxy);
		FoundryProxy.proxySet.add(proxy);
		return proxy;
	},

	/**
	 * @private
	 */
	get(target, key) {
		const value = target[key];

		// Prevent creating the same proxy again
		if (FoundryProxy.proxySet.has(value)) {
			return value;
		}

		if (value !== null && typeof value === 'object') {
			if (value.class === "Roll") {
				// This is a serialized roll, convert to roll object
				return Roll.fromData(value);
			} else if (!{}.hasOwnProperty.call(target, key)) {
				// this is a getter or setter function, so no proxy-ing
				return value;
			} else {
				// Create a nested proxy, and save the reference
				const proxy = FoundryProxy.create(value);
				target[key] = proxy;
				return proxy;
			}
		} else {
			return value;
		}
	},

	/**
	 * @private
	 */
	set(target, key, value) {
		target[key] = value;
		return true;
	}
}
