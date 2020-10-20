function i18n(key) {
	return game.i18n.localize(key);
}

Hooks.once("init", () => {
	
	/**
	* Register better rolls setting
	*/
	game.settings.register("betterrolls5e", "diceEnabled", {
		name: i18n("br5e.diceEnabled.name"),
		hint: i18n("br5e.diceEnabled.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	game.settings.register("betterrolls5e", "d20Mode", {
		name: i18n("br5e.d20Mode.name"),
		hint: i18n("br5e.d20Mode.hint"),
		scope: "world",
		config: true,
		default: 2,
		type: Number,
		choices: {
			1: i18n("br5e.d20Mode.choices.1"),
			2: i18n("br5e.d20Mode.choices.2"),
			3: i18n("br5e.d20Mode.choices.3")
		}
	});

	/**
	* Query roll type in Roll20 style
	*/
	game.settings.register("betterrolls5e", "queryAdvantageEnabled", {
		name: i18n("br5e.queryAdvantageEnabled.name"),
		hint: i18n("br5e.queryAdvantageEnabled.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});
	
	/**
	* Register added roll buttons
	*/
	game.settings.register("betterrolls5e", "rollButtonsEnabled", {
		name: i18n("br5e.rollButtonsEnabled.name"),
		hint: i18n("br5e.rollButtonsEnabled.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	/**
	* Register better roll for icon
	*/
	game.settings.register("betterrolls5e", "imageButtonEnabled", {
		name: i18n("br5e.imageButtonEnabled.name"),
		hint: i18n("br5e.imageButtonEnabled.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	game.settings.register("betterrolls5e", "altSecondaryEnabled", {
		name: i18n("br5e.altSecondaryEnabled.name"),
		hint: i18n("br5e.altSecondaryEnabled.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	/**
	* Register quick roll defaults for description
	*/
	game.settings.register("betterrolls5e", "quickDefaultDescriptionEnabled", {
		name: i18n("br5e.quickDefaultDescriptionEnabled.name"),
		hint: i18n("br5e.quickDefaultDescriptionEnabled.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});

	game.settings.register("betterrolls5e", "defaultRollArt", {
		name: i18n("br5e.defaultRollArt.name"),
		hint: i18n("br5e.defaultRollArt.hint"),
		scope: "world",
		config: true,
		default: "actor",
		type: String,
		choices: {
			"actor": i18n("Actor"),
			"token": i18n("Token")
		}
	});
	
	/**
	* Register roll label options
	*/
	game.settings.register("betterrolls5e", "rollTitlePlacement", {
		name: i18n("br5e.rollTitlePlacement.name"),
		hint: i18n("br5e.rollTitlePlacement.hint"),
		scope: "world",
		config: true,
		default: "1",
		type: String,
		choices: {
			"0": i18n("br5e.damageRollPlacement.choices.0"),
			"1": i18n("br5e.damageRollPlacement.choices.1")
		}
	});
	
	const damagePlacementOptions = ["damageTitlePlacement", "damageContextPlacement", "damageRollPlacement"];

	damagePlacementOptions.forEach(placementOption => {
		game.settings.register("betterrolls5e", placementOption, {
			name: i18n(`br5e.${placementOption}.name`),
			hint: i18n(`br5e.${placementOption}.hint`),
			scope: "world",
			config: true,
			default: "1",
			type: String,
			choices: {
				"0": i18n("br5e.damageRollPlacement.choices.0"),
				"1": i18n("br5e.damageRollPlacement.choices.1"),
				"2": i18n("br5e.damageRollPlacement.choices.2"),
				"3": i18n("br5e.damageRollPlacement.choices.3")
			}
		});
	});

	const contextReplacementOptions = ["contextReplacesTitle", "contextReplacesDamage"];

	contextReplacementOptions.forEach(contextOption => {
		game.settings.register("betterrolls5e", contextOption, {
			name: i18n(`br5e.${contextOption}.name`),
			hint: i18n(`br5e.${contextOption}.hint`),
			scope: "world",
			config: true,
			default: false,
			type: Boolean
		});
	});
	
	game.settings.register("betterrolls5e", "critBehavior", {
		name: i18n("br5e.critBehavior.name"),
		hint: i18n("br5e.critBehavior.hint"),
		scope: "world",
		config: true,
		default: "1",
		type: String,
		choices: {
			"0": i18n("br5e.critBehavior.choices.0"), // No Extra Damage
			"1": i18n("br5e.critBehavior.choices.1"), // Roll Critical Damage Dice
			"2": i18n("br5e.critBehavior.choices.2"), // Roll Base Damage, Max Critical
			"3": i18n("br5e.critBehavior.choices.3"), // Max Base & Critical Damage
		}
	});
	
	game.settings.register("betterrolls5e", "critString", {
		name: i18n("br5e.critString.name"),
		hint: i18n("br5e.critString.hint"),
		scope: "world",
		config: true,
		default: "Crit",
		type: String
	});
	
	game.settings.register("betterrolls5e", "chatDamageButtonsEnabled", {
		name: i18n("br5e.chatDamageButtonsEnabled.name"),
		hint: i18n("br5e.chatDamageButtonsEnabled.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	game.settings.register("betterrolls5e", "playRollSounds", {
		name: i18n("br5e.playRollSounds.name"),
		hint: i18n("br5e.playRollSounds.hint"),
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	game.settings.register("betterrolls5e", "hideDC", {
		name: i18n("br5e.hideDC.name"),
		hint: i18n("br5e.hideDC.hint"),
		scope: "world",
		config: true,
		default: "0",
		type: String,
		choices: {
			"0": i18n("br5e.hideDC.choices.0"),
			"1": i18n("br5e.hideDC.choices.1"),
			"2": i18n("br5e.hideDC.choices.2"),
		}
	});

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