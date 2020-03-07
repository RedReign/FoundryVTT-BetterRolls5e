import { DND5E } from "../../../systems/dnd5e/module/config.js";
import { addBetterRollsContent, addItemSheetButtons, changeRollsToDual, updateSaveButtons } from "./betterrolls5e.js";

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
			setTimeout(() => {
				game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app, html, data, triggeringElement, buttonContainer) : null;
				game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app, html, data, params) : null;
			}, 50);
		});
	}
	
	static addItemSheet(sheetName) {
		let sheetString = "render" + sheetName;
		Hooks.on(sheetString, (app, html, data) => {
			game.settings.get("betterrolls5e", "diceEnabled") ? addBetterRollsContent(app, html, data) : null;
		});
	}
	
}

BetterRollsHooks.addActorSheet("ActorSheet5eNPC");
BetterRollsHooks.addActorSheet("ActorSheet5eCharacter");
BetterRollsHooks.addActorSheet("BetterNPCActor5eSheet", ".item .npc-item-name", ".item-summary", {itemButton: '.item .rollable'});
BetterRollsHooks.addActorSheet("BetterNPCActor5eSheetDark", ".item .npc-item-name", ".item-summary", {itemButton: '.item .rollable'});
BetterRollsHooks.addActorSheet("ActorSheet5eCharacterDark");
BetterRollsHooks.addActorSheet("ActorSheet5eNPCDark");
BetterRollsHooks.addActorSheet("Alt5eSheet");

BetterRollsHooks.addItemSheet("ItemSheet5e");
BetterRollsHooks.addItemSheet("ItemSheet5eDark");