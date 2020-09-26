import { addBetterRollsContent, addItemSheetButtons, changeRollsToDual, updateSaveButtons, i18n } from "./betterrolls5e.js";


export class BetterRollsHooks {
	
	/*
	Registers the necessary hooks to support a sheet in Better Rolls.
	sheetName			Class name of the sheet to be supported.
	triggeringElement	Container for the element that must be clicked for the extra buttons to be shown.
	buttonContainer		Container for the element the extra buttons will display in.
	params {			Object with various other selectors for Quick Rolls compatibility, which contains the following:
		abilityButton		Selector for the generic ability button, if it exists.
		checkButton			Selector for the ability check (NOT skill check) button.
		saveButton			Selector for the ability save button.
		skillButton			Selector for the skill check button.
		itemButton			Selector for the item button.
		singleAbilityButton	Boolean to determine if the ability button should be able to roll both checks AND saves.
	}
	*/
	static addActorSheet(
		sheetName,
		triggeringElement = ".item .item-name h4",
		buttonContainer = ".item-properties",
		params = {}) {
		let sheetString = "render" + sheetName;
		Hooks.on(sheetString, (app, html, data) => {
			game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app.object, html, data, triggeringElement, buttonContainer) : null;
			game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app.object, html, data, params) : null;
		});
	}
	
	static addItemSheet(sheetName) {
		let sheetString = "render" + sheetName;
		Hooks.on(sheetString, (app, html, data) => {
			game.settings.get("betterrolls5e", "diceEnabled") ? addBetterRollsContent(app.object, html, data) : null;
		});
	}
	
	/*
	Function for adding Better Rolls content to html data made after a sheet is rendered.
	actor				The actor object
	html				The target html to add content to
	triggeringElement	Container for the element that must be clicked for the extra buttons to be shown.
	buttonContainer		Container for the element the extra buttons will display in.
	itemButton			Selector for the item button.
	*/
	static addItemContent(actor, html, 
		triggeringElement = ".item .item-name h4", 
		buttonContainer = ".item-properties",
		itemButton = ".item .rollable") {
		game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(actor, html, null, triggeringElement, buttonContainer) : null;
		game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(actor, html, null, {itemButton: itemButton}) : null;
	}
}

BetterRollsHooks.addActorSheet("ActorSheet5eNPC");
BetterRollsHooks.addActorSheet("ActorSheet5eCharacter");
BetterRollsHooks.addActorSheet("BetterNPCActor5eSheet", ".item .npc-item-name", ".item-summary", {
	itemButton: '.item .rollable', 
	abilityButton: ".ability h4.ability-name.rollable", 
	checkButton: ".ability div span.ability-mod", 
	saveButton: ".saves-div .save .rollable"
});
BetterRollsHooks.addActorSheet("BetterNPCActor5eSheetDark", ".item .npc-item-name", ".item-summary", {
	itemButton: '.item .rollable', 
	abilityButton: ".ability h4.ability-name.rollable", 
	checkButton: ".ability div span.ability-mod", 
	saveButton: ".saves-div .save .rollable"
});
BetterRollsHooks.addActorSheet("ActorSheet5eCharacterDark");
BetterRollsHooks.addActorSheet("ActorSheet5eNPCDark");
BetterRollsHooks.addActorSheet("Alt5eSheet");
BetterRollsHooks.addItemSheet("ItemSheet5e");
BetterRollsHooks.addItemSheet("ItemSheet5eDark");


Hooks.on("renderChatMessage", (message, html, data) => {
	if (!html.find(".red-full").length) { return; }

	let actor = game.actors.get(message.data.speaker.actor);
	if ((!actor && !game.user.isGM) || actor?.permission != 3) {
		html.find(".hideSave").text(i18n("br5e.hideDC.string"));
	}
});