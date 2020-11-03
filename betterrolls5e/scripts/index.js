import { BRSettings } from "./settings.js";
import { BetterRollsChatCard } from "./chat-message.js";
import { BetterRolls } from "./betterrolls5e.js";
import { ItemUtils } from "./utils.js";

Hooks.once("init", () => {
	BRSettings.init();
	
	// Setup template partials
	const prefix = "modules/betterrolls5e/templates"
	loadTemplates([
		`${prefix}/red-damage-crit.html`
	]);
});

Hooks.on("ready", () => {
	// Make a combined damage type array that includes healing
	const dnd5e = CONFIG.DND5E;
	CONFIG.betterRolls5e.combinedDamageTypes = mergeObject(duplicate(dnd5e.damageTypes), dnd5e.healingTypes);
	
	// Updates crit text from the dropdown.
	let critText = BRSettings.critString;
	if (critText.includes("br5e.critString")) {
		critText = i18n(critText);
		game.settings.set("betterrolls5e", "critString", critText);
	}

	// Initialize Better Rolls
	window.BetterRolls = BetterRolls();
	Hooks.call("readyBetterRolls");
});

// Create flags for item when it's first created
Hooks.on("createOwnedItem", (actor, itemData) => {
	BRSettings.diceEnabled ? ItemUtils.ensureFlags(game.actors.get(actor._id).items.get(itemData._id)) : null;
});

// Modify context menu for damage rolls (they break)
Hooks.on("getChatLogEntryContext", (html, options) => {
	let contextDamageLabels = [
		game.i18n.localize("DND5E.ChatContextDamage"),
		game.i18n.localize("DND5E.ChatContextHealing"),
		game.i18n.localize("DND5E.ChatContextDoubleDamage"),
		game.i18n.localize("DND5E.ChatContextHalfDamage")
	];
	
	for (let i=options.length-1; i>=0; i--) {
		let option = options[i];
		if (contextDamageLabels.includes(option.name)) {
			option.condition = li => canvas.tokens.controlled.length && li.find(".dice-roll").length && !li.find(".red-full").length;
		}
	}
});

// Bind to any newly rendered chat cards at runtime
Hooks.on("renderChatMessage", (message, html, data) => {
	BetterRollsChatCard.bind(message, html);
});
