Hooks.once("init", () => {
	
	/**
	* Register better rolls setting
	*/
	game.settings.register("betterRolls5e", "diceEnabled", {
		name: "Enable Better Rolls",
		hint: "Enables the improved dice outputs for DnD5e. Affects all ability checks, saving throws, items, spells, and features on the sheet. Requires reopening the sheet.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	/**
	* Register added roll buttons
	*/
	game.settings.register("betterRolls5e", "rollButtonsEnabled", {
		name: "Add Roll Buttons to Sheet",
		hint: "Adds buttons to items, spells, and features in the sheet, which display when the item is expanded. May be incompatible with the Item Sheet Buttons mod. Requires reopening the sheet.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	/**
	* Register better roll for icon
	*/
	game.settings.register("betterRolls5e", "imageButtonEnabled", {
		name: "Make Item Image Auto-roll",
		hint: "When clicking on an item's image, output a Better Roll message to chat instead of the normal chat output. Can be bypassed by holding Alt when clicking.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	/**
	* Register roll title options
	*/
	game.settings.register("betterRolls5e", "rollTitlesEnabled", {
		name: "Show Roll Labels",
		hint: "Adds small roll labels for messages with multiple sets of rolls, such as \"Attack\" and \"Damage\". Only works on Better Rolls. If a message only has one roll type, a label will still be applied.",
		scope: "world",
		config: true,
		default: true,
		type: Boolean
	});
	
	game.settings.register("betterRolls5e", "damageRollPlacement", {
		name: "Show Damage Labels",
		hint: "Determines where the damage type label is placed, relative to a damage roll.",
		scope: "world",
		config: true,
		default: "1",
		type: String,
		choices: {
			"1": "Above",
			"2": "Below & Inside",
			"3": "Below & Outside"
		}
	});
	
	game.settings.register("betterRolls5e", "critString", {
		name: "Critical Indicator",
		hint: "Determines how criticals are labeled. Appears as text to the right of the critical damage roll. Only works on Better Rolls.",
		scope: "world",
		config: true,
		default: "Crit",
		type: String,
		choices: {
			"": "Blank",
			"Crit": "'Crit'",
			"Crit!": "'Crit!'",
			"(Crit)": "'(Crit)'",
			"Critical": "'Critical'",
			"Critical!": "'Critical!'",
			"(Critical)": "'(Critical)'",
			"BAMMMM!" : "'BAMMMM!'"
		}
	});
});