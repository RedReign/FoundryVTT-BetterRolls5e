import { getSettings } from "../settings.js";
import { libWrapper } from "./libWrapper.js";


export function patchCoreFunctions() {
	override("CONFIG.Item.entityClass.prototype.roll", itemRoll);
}

/**
 * A version of libwrapper OVERRIDE that tries to get the original function.
 * We want Better Rolls and Core 5e to be swappable between each other,
 * and for other modules to wrap over it.
 * @param {*} target
 * @param {*} fn A curried function that takes the original and returns a function to pass to libwrapper
 */
function override(target, fn) {
	const original = libWrapper._create_wrapper?.(target, "betterrolls5e")._wrapped ?? eval(target);
	libWrapper.register("betterrolls5e", target, fn(original), "OVERRIDE");
}

/**
 * Override for Item5e.roll(). This is an OVERRIDE however we still want
 * a passthrough. We need to be lower on priority than Midi.
 * @param {} wrapped
 * @returns
 */
const itemRoll = (defaultRoll) => function (options) {
	// Handle options, same defaults as core 5e
	options = mergeObject({configureDialog: true, createMessage: true, event }, options);
	const { rollMode, createMessage, vanilla } = options;
	const altKey = options.event?.altKey;
	const item = this;

	// Case - If the image button should roll a vanilla roll, UNLESS vanilla is defined and is false
	const { imageButtonEnabled, altSecondaryEnabled } = getSettings();
	if (vanilla || (!imageButtonEnabled && vanilla !== false) || (altKey && !altSecondaryEnabled)) {
		return defaultRoll.bind(item)(options);
	}

	const preset = altKey ? 1 : 0;
	const card = BetterRolls.rollItem(item, { preset, event: options.event });
	return card.toMessage({ rollMode, createMessage });
}
