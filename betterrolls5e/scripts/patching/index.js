import { getSettings } from "../settings.js";
import { libWrapper } from "./libWrapper.js";

export function patchCoreFunctions() {
	libWrapper.register(
		"betterrolls5e",
		"CONFIG.Item.entityClass.prototype.roll",
		itemRoll(libWrapper._create_wrapper("CONFIG.Item.entityClass.prototype.roll", "betterrolls5e")._wrapped),
		"OVERRIDE"
	);
}

/**
 * Override for Item5e.roll(). This is an OVERRIDE however we still want
 * a passthrough. We need to be lower on priority than Midi.
 * @param {} wrapped
 * @returns
 */
const itemRoll = (defaultRoll) => function (options) {
	// Handle options, same defaults as core 5e
	options = mergeObject({configureDialog: true, createMessage: true }, options);
	const { rollMode, createMessage, vanilla } = options;

	const item = this;

	// Case - If the image button should roll a vanilla roll
	const { imageButtonEnabled, altSecondaryEnabled } = getSettings();
	if (vanilla || !imageButtonEnabled || (event?.altKey && !altSecondaryEnabled)) {
		return defaultRoll.bind(item)(options);
	}

	const preset = event?.altKey ? 1 : 0;
	return BetterRolls.rollItem(item, { preset }).toMessage({ rollMode, createMessage });
}
