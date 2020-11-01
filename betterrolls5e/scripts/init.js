import { BRSettings } from "./settings.js";

Hooks.once("init", () => {
	BRSettings.init();
	
	// Setup template partials
	const prefix = "modules/betterrolls5e/templates"
	loadTemplates([
		`${prefix}/red-damage-crit.html`
	]);
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