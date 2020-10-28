import { addItemSheetButtons, changeRollsToDual, i18n } from "./betterrolls5e.js";
import { addBetterRollsContent } from "./item-tab.js";
import { BetterRollsChatCard } from "./chat-message.js";

export class BetterRollsHooks {
	
	static addActorSheet() {
		return;
	}

	static addItemSheet() {
		return;
	}

	/*
	Registers the necessary hooks to support a sheet in Better Rolls. SHEET CREATORS SHOULD NO LONGER USE THIS!
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
	static registerActorSheet( // SHEET CREATORS SHOULD NO LONGER USE THIS!
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
	
	static registerItemSheet(sheetName) { // SHEET CREATORS SHOULD NO LONGER USE THIS!
		let sheetString = "render" + sheetName;
		Hooks.on(sheetString, (app, html, data) => {
			game.settings.get("betterrolls5e", "diceEnabled") ? addBetterRollsContent(app, html, data) : null;
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
		(game.settings.get("betterrolls5e", "rollButtonsEnabled") && triggeringElement && buttonContainer) ? addItemSheetButtons(actor, html, null, triggeringElement, buttonContainer) : null;
		(game.settings.get("betterrolls5e", "diceEnabled") && itemButton) ? changeRollsToDual(actor, html, null, {itemButton: itemButton}) : null;
	}
}

BetterRollsHooks.registerActorSheet("ActorSheet5e");
BetterRollsHooks.registerItemSheet("ItemSheet5e");

Hooks.on("renderChatMessage", (message, html, data) => {
	if (html.find(".red-full").length) {
		let actor = game.actors.get(message.data.speaker.actor);
		if ((!actor && !game.user.isGM) || actor?.permission != 3) {
			html.find(".hideSave").text(i18n("br5e.hideDC.string"));
		}
	}	

	if (game.settings.get("betterrolls5e", "chatDamageButtonsEnabled")) { 
		BetterRollsChatCard.bind(message, html);
	}
});

/*
Hooks.on("renderedMagicItems", (actor, html, data) => {
	if (window.MagicItems && game.settings.get("betterrolls5e", "diceEnabled")) {
		changeRollsToDual(actor.actor, html, null, {itemButton: ".magic-items-head ~ .item-list .item .rollable"});
	}
});
*/