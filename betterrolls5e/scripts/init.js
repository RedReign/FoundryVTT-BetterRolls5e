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
	
	game.settings.register("betterrolls5e", "damageTitlePlacement", {
		name: i18n("br5e.damageTitlePlacement.name"),
		hint: i18n("br5e.damageTitlePlacement.hint"),
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
	
	game.settings.register("betterrolls5e", "damageContextPlacement", {
		name: i18n("br5e.damageContextEnabled.name"),
		hint: i18n("br5e.damageContextEnabled.hint"),
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
	
	game.settings.register("betterrolls5e", "damageRollPlacement", {
		name: i18n("br5e.damageRollPlacement.name"),
		hint: i18n("br5e.damageRollPlacement.hint"),
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
	
	game.settings.register("betterrolls5e", "contextReplacesTitle", {
		name: i18n("br5e.contextReplacesTitle.name"),
		hint: i18n("br5e.contextReplacesTitle.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});
	
	game.settings.register("betterrolls5e", "contextReplacesDamage", {
		name: i18n("br5e.contextReplacesDamage.name"),
		hint: i18n("br5e.contextReplacesDamage.hint"),
		scope: "world",
		config: true,
		default: false,
		type: Boolean
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
			"2": i18n("br5e.critBehavior.choices.2"), // Max Base Damage & Roll Critical
			"3": i18n("br5e.critBehavior.choices.3"), // Max Base & Critical Damage
		}
	});
	
	game.settings.register("betterrolls5e", "critString", {
		name: i18n("br5e.critString.name"),
		hint: i18n("br5e.critString.hint"),
		scope: "world",
		config: true,
		default: "Crit",
		type: String,
		choices: {
			" ": "",
			"br5e.critString.choices.2": i18n("br5e.critString.choices.2"),
			"br5e.critString.choices.3": i18n("br5e.critString.choices.3"),
			"br5e.critString.choices.4": i18n("br5e.critString.choices.4"),
			"br5e.critString.choices.5": i18n("br5e.critString.choices.5"),
			"br5e.critString.choices.6": i18n("br5e.critString.choices.6"),
			"br5e.critString.choices.7": i18n("br5e.critString.choices.7"),
			"br5e.critString.choices.8": i18n("br5e.critString.choices.8")
		}
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
});

// Disable context menu for damage rolls (they break)
Hooks.on("getChatLogEntryContext", (html, options) => {
	if (game.settings.get("betterrolls5e", "diceEnabled")) {
		options.splice(0,4);
		console.log("Deleted context menu for dnd5e chat cards!");
	}
});