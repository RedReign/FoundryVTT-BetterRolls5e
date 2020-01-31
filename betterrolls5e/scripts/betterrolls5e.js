import { DND5E } from "../../../systems/dnd5e/module/config.js";
import { addChatMessageContextOptions } from "../../../systems/dnd5e/module/chat.js";
import { SpellCastDialog } from "../../../systems/dnd5e/module/apps/spell-cast-dialog.js";
import { AbilityTemplate } from "../../../systems/dnd5e/module/pixi/ability-template.js";

export function i18n(key) {
	return game.i18n.localize(key);
}

function hasProperty(object, key) {
  if ( !key ) return false;
  let target = object;
  for ( let p of key.split('.') ) {
    if ( target.hasOwnProperty(p) ) target = target[p];
    else return false;
  }
  return true;
}

// Checks for Maestro, allowing for cross-module compatibility
function isMaestroOn() {
	let output = false;
	try { if (game.settings.get("maestro", "enableItemTrack")) {
		output = true;
	} }
	catch { return false; }
	return output;
}

// Finds if an item has a Maestro sound on it, in order to determine whether or not the dice sound should be played.
function hasMaestroSound(item) {
	return (isMaestroOn() && item.data.flags.maestro && item.data.flags.maestro.track) ? true : false;
}

// Gets the IDs to send a message to
function getWhisperData() {
	let rollMode = null,
		whisper = null,
		blind = null;
	
	rollMode = game.settings.get("core", "rollMode");
	if ( ["gmroll", "blindroll"].includes(rollMode) ) whisper = ChatMessage.getWhisperIDs("GM");
	if ( rollMode === "blindroll" ) blind = true;
	else if ( rollMode === "selfroll" ) whisper = [game.user._id];
	
	let output = {
		rollMode: rollMode,
		whisper: whisper,
		blind: blind
	}
	
	return output;
}

// Returns whether an item makes an attack roll
function isAttack(item) {
	let attacks = ["mwak", "rwak", "msak", "rsak"];
	let output = (attacks.indexOf(item.data.data.actionType) !== -1) ? true : false;
	return output;
}

// Returns whether an item requires a saving throw
function isSave(item) {
	let itemData = item.data.data,
		isTypeSave = (itemData.actionType === "save") ? true : false,
		hasSaveDC = (itemData.save && itemData.save.ability) ? true : false,
		output = (isTypeSave || hasSaveDC) ? true : false;
	return output;
}

// Returns an array with the save of the item. If no save is written in, one is calculated.
function getSave(item) {
	if (isSave(item)) {
		let itemData = item.data.data,
			output = {};
		output.ability = itemData.save.ability;
		// If a DC is written in, use that by default
		if (itemData.save.dc && itemData.save.dc != 0) { output.dc = itemData.save.dc }
		// Otherwise, calculate one
		else {
			if (item.data.type === "spell") { output.dc = item.actor.data.data.attributes.spelldc; }
			else {
				let mod = null,
					abl = null,
					prof = item.actor.data.data.attributes.prof;
				abl = itemData.ability;
				if (abl) { mod = item.actor.data.data.abilities[abl].mod; }
				else { mod = 0; }
				output.dc = 8 + prof + mod;
			}
		}
		return output;
	} else { return null; }
}

function isCheck(item) {
	let itemData = item.data.data;
	let output = (item.data.type === "tool" || (itemData.proficient && typeof itemData.proficient === "number")) ? true : false;
	return output;
}

let dnd5e = DND5E;

function getQuickDescriptionDefault() {
	return game.settings.get("betterrolls5e", "quickDefaultDescriptionEnabled");
}

CONFIG.betterRolls5e = {
	validItemTypes: ["weapon", "spell", "equipment", "feat", "tool", "consumable"],
	allFlags: {
		weaponFlags: {
			critRange: { type: "String", value: "" },
			quickDesc: { type: "Boolean", get value() { return getQuickDescriptionDefault() }, get altValue() { return getQuickDescriptionDefault() } },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: false, altValue: false },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickVersatile: { type: "Boolean", value: false, altValue: false },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			quickCharges: { type: "Boolean", value: true, altValue: true },
		},
		spellFlags: {
			critRange: { type: "String", value: "" },
			quickDesc: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickVersatile: { type: "Boolean", value: false, altValue: false },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			quickCharges: { type: "Boolean", value: true, altValue: true },
		},
		equipmentFlags: {
			critRange: { type: "String", value: "" },
			quickDesc: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			quickCharges: { type: "Boolean", value: true, altValue: true },
		},
		featFlags: {
			critRange: { type: "String", value: "" },
			quickDesc: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			quickCharges: { type: "Boolean", value: true, altValue: true },
		},
		toolFlags: {
			quickDesc: { type: "Boolean", get value() { return getQuickDescriptionDefault() }, get altValue() { return getQuickDescriptionDefault() } },
			quickCheck: { type: "Boolean", value: true, altValue: true },
			quickProperties: { type: "Boolean", value: true, altValue: true },
		},
		consumableFlags: {
			critRange: { type: "String", value: "" },
			quickDesc: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			quickCharges: { type: "Boolean", value: true, altValue: true },
		}
	}
};

Hooks.on(`ready`, () => {
	// Make a combined damage type array that includes healing
	CONFIG.betterRolls5e.combinedDamageTypes = mergeObject(duplicate(dnd5e.damageTypes), dnd5e.healingTypes);
});

// Hook into different sheet via their rendering
Hooks.on(`renderActorSheet5eNPC`, (app, html, data) => {
	setTimeout(() => {
	game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app, html, data) : null;
	game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app, html, data) : null;
	}, 50);
});
Hooks.on(`renderActorSheet5eCharacter`, (app, html, data) => {
	setTimeout(() => {
	game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app, html, data) : null;
	game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app, html, data) : null;
	}, 50);
});
Hooks.on(`renderSky5eSheet`, (app, html, data) => {
	setTimeout(() => {
	game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app, html, data) : null;
	game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app, html, data) : null;
	}, 50);
});
Hooks.on(`renderBetterNPCActor5eSheet`, (app, html, data) => {
	setTimeout(() => {
	game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app, html, data, '.item .npc-item-name') : null;
	game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app, html, data, {itemButton: '.item .npc-item-header > .rollable'}) : null;
	}, 50);
});

// Hook into the item sheets via their rendering
Hooks.on(`renderItemSheet5e`, (app, html, data) => {
	game.settings.get("betterrolls5e", "diceEnabled") ? addBetterRollsContent(app, html, data) : null;
});

// Create flags for item when it's first created
Hooks.on(`createOwnedItem`, (outerData, id, innerData) => {
	game.settings.get("betterrolls5e", "diceEnabled") ? redUpdateFlags(outerData) : null;
});

Hooks.on(`renderChatMessage`, (message, html, data) => {
	updateSaveButtons(html);
});

/**
 * Adds buttons and assign their functionality to the sheet
 * @param {String} triggeringElement - this is the html selector string that opens the description - mostly optional for different sheetclasses
 * @param {String} buttonContainer - this is the html selector string to which the buttons will be prepended - mostly optional for different sheetclasses
 */
function addItemSheetButtons(app, html, data, triggeringElement = '', buttonContainer = '') {
    // Setting default element selectors
    if (triggeringElement === '') triggeringElement = '.item .item-name h4';
    if (buttonContainer === '') buttonContainer = '.item-properties';

    // adding an event for when the description is shown
    html.find(triggeringElement).click(event => {
		//console.log(event);
        let li = $(event.currentTarget).parents(".item");
        let item = app.object.getOwnedItem(String(li.attr("data-item-id")));
		let itemData = item.data.data;
		let flags = item.data.flags.betterRolls5e;
		
		// Check settings
		let diceEnabled = game.settings.get("betterrolls5e", "diceEnabled"),
			extraDamage = false;
		
		if (flags && (flags.extraDamage) && (flags.extraDamage.value)) {
			extraDamage = true;
		}
		
        if (!li.hasClass("expanded")) return;  // this is a way to not continue if the items description is not shown, but its only a minor gain to do this while it may break this module in sheets that dont use "expanded"
		
		
        // Create the buttons
        let buttons = $(`<div class="item-buttons"></div>`);
		let buttonsWereAdded = false;
        switch (item.data.type) {
			case 'weapon':
			case 'feat':
            case 'spell':
			case 'consumable':
				buttonsWereAdded = true;
				if (diceEnabled) buttons.append(`<span class="tag"><button data-action="quickRoll">${i18n("br5e.buttons.roll")}</button></span>`);
                if (diceEnabled) buttons.append(`<span class="tag"><button data-action="altRoll">${i18n("br5e.buttons.altRoll")}</button></span>`);
				if (isAttack(item)) buttons.append(`<span class="tag"><button data-action="attackRoll">${i18n("br5e.buttons.attack")}</button></span>`);
				if (isSave(item)) {
					let saveData = getSave(item);
					buttons.append(`<span class="tag"><button data-action="save">${i18n("br5e.buttons.saveDC")} ${saveData.dc} ${dnd5e.abilities[saveData.ability]}</button></span>`);
				}
                if (itemData.damage.parts.length > 0) {
					buttons.append(`<span class="tag"><button data-action="damageRoll" data-value="all">${i18n("br5e.buttons.damage")}</button></span>`);
					if (itemData.damage.versatile) {
						buttons.append(`<span class="tag"><button data-action="verDamageRoll" data-value="all">${i18n("br5e.buttons.verDamage")}</button></span>`);
					}
					// Make a damage button for each damage type
					for (let i = 0; i < itemData.damage.parts.length; i++) {
						if (i === 0) { buttons.append(`<br>`); }
						buttons.append(`<span class="tag"><button data-action="damageRoll" data-value=${i}>${i}: ${CONFIG.betterRolls5e.combinedDamageTypes[itemData.damage.parts[i][1]]}</button></span>`);
						if (i === 0 && itemData.damage.versatile) {
							buttons.append(`<span class="tag"><button data-action="verDamageRoll" data-value=0>${0}: ${CONFIG.betterRolls5e.combinedDamageTypes[itemData.damage.parts[i][1]]} (${dnd5e.weaponProperties.ver})</button></span>`);
						}
					}
				}
                break;
            case 'tool':
				buttonsWereAdded = true;
                buttons.append(`<span class="tag"><button data-action="toolCheck" data-ability="${itemData.ability.value}">${i18n("br5e.buttons.itemUse")} ${item.name}</button></span>`);
                break;
			/*case 'feat':
				if ((diceEnabled) && (chatData.isAttack) && (item.data.data.damage.value)) buttons.append(`<span class="tag"><button data-action="featAttackDamage">${i18n("br5e.buttons.attackAndDamage")}</button></span>`);
				if ((diceEnabled) && (chatData.isSave) && (item.data.data.damage.value)) buttons.append(`<span class="tag"><button data-action="featSaveDamage">${i18n("br5e.buttons.saveAndDamage")}</button></span>`);
				if (chatData.isAttack) buttons.append(`<span class="tag"><button data-action="featAttack">${i18n("br5e.buttons.attack")}</button></span>`);
				if (chatData.isSave) buttons.append(`<span class="tag"><button data-action="featSave">${i18n("br5e.buttons.save")}</button></span>`);
				if (item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="featDamage">${i18n(chatData.damageLabel)}</button></span>`);
				break;
				*/
        }
		
		if (buttonsWereAdded) { buttons.append(`<br>`); }
		
		// Add info button
		buttons.append(`<span class="tag"><button data-action="infoRoll">${i18n("br5e.buttons.info")}</button></span>`);
		
		// Add default roll button
		buttons.append(`<span class="tag"><button data-action="vanillaRoll">${i18n("br5e.buttons.defaultSheetRoll")}</button></span>`);
		
		//if (((item.data.data.damage !== undefined) && item.data.data.damage.value) || ((item.data.data.damage2 !== undefined) && item.data.data.damage2.value) || (chatData.isAttack) || (chatData.isSave) || (chatData.hasCharges)) {buttonsWereAdded = true;}
		if (buttonsWereAdded) {buttons.append(`<br><header style="margin-top:6px"></header>`);}
		
        // adding the buttons to the sheet
        let targetHTML = $(event.target.parentNode.parentNode)
        targetHTML.find(buttonContainer).prepend(buttons);
		
        //html.find(buttonContainer).prepend(buttons);
		
        // adding click event for all buttons
        buttons.find('button').click(ev => {
            ev.preventDefault();
            ev.stopPropagation();
			
            // which function gets called depends on the type of button stored in the dataset attribute action
			// If better rolls are on
			if (diceEnabled) {
				// The arguments compounded into a table, to be served to the fullRoll function as the rollRequests argument
				let roll = {};
				
				// Sets the damage roll in the argument to the value of the button
				function setDamage() {
					let damage = [];
					if (ev.target.dataset.value === "all") {
						damage = "all";
					} else {
						for (let i = 0; i < itemData.damage.parts.length; i++) {
							if (ev.target.dataset.value == i) { damage[i] = true; }
							else { damage[i] = false; }
						}
					}
					roll.damage = damage;
				}
				
				
				switch (ev.target.dataset.action) {
					case 'quickRoll': 
						roll.quickRoll = true; break;
					case 'altRoll': 
						roll.quickRoll = true; roll.alt = true; break;
					case 'attackRoll': 
						roll.attack = true; break;
					case 'save': 
						roll.save = true; break;
					case 'damageRoll': 
						setDamage(); break;
					case 'verDamageRoll':
						setDamage(); roll.versatile = true; break;
					case 'toolCheck' :
						roll.check = true; roll.properties = true; break;
					
					/*
					case 'spellAttack': BetterRollsDice.fullRoll(item, ev, {itemType: "spell", attack: true}); break;
					case 'spellSave': BetterRollsDice.fullRoll(item, ev, {itemType: "spell", save:true, info:true}); break;
					case 'spellDamage': BetterRollsDice.fullRoll(item, ev, {itemType: "spell", damage:true, info:true}); break;
					case 'featAttack': BetterRollsDice.fullRoll(item, ev, {itemType: "feat", attack:true, info:true}); break;
					case 'featDamage': BetterRollsDice.fullRoll(item, ev, {itemType: "feat", damage:true}); break;
					case 'featAttackDamage': BetterRollsDice.fullRoll(item, ev, {itemType: "feat", attack:true, damage:true, info:true}); break;
					case 'featSave': BetterRollsDice.fullRoll(item, ev, {itemType: "feat", save:true, info:true}); break;
					case 'featSaveDamage': BetterRollsDice.fullRoll(item, ev, {itemType: "feat", save:true, damage:true, info:true}); break;
					case 'combinedWeaponRoll': BetterRollsDice.fullRoll(item, ev, {attack: true, damage: true, properties: true}); break;
					case 'combinedWeaponRoll2': BetterRollsDice.fullRoll(item, ev, {attack: true, altDamage: true, properties: true}); break;
					case 'spellAttackDamage': BetterRollsDice.fullRoll(item, ev, {itemType: "spell", attack: true, damage: true, info: true, properties: true}); break;
					case 'spellSaveDamage': BetterRollsDice.fullRoll(item, ev, {itemType: "spell", save: true, damage: true, info: true, properties: true}); break;
					*/
					
					case 'infoRoll':
						roll.info = true; roll.properties = true; break;
					
					case 'vanillaRoll':
						item.actor.sheet._onItemRoll(event); break;
				}
				
				if (ev.altKey) {
					roll.forceCrit = true;
				}
				
				if (ev.target.dataset.action !== 'vanillaRoll') {
					BetterRollsDice.fullRoll(item, roll);
				}
			// If better rolls are off
			} else {
				switch (ev.target.dataset.action) {
					case 'weaponAttack': item.rollWeaponAttack(ev); break;
					case 'weaponDamage': item.rollWeaponDamage(ev); break;
					case 'weaponDamage2': item.rollWeaponDamage(ev, true); break;
					case 'spellAttack': item.rollSpellAttack(ev); break;
					case 'spellDamage': item.rollSpellDamage(ev); break;
					case 'featAttack': item.rollFeatAttack(ev); break;
					case 'featDamage': item.rollFeatDamage(ev); break;
					case 'consume': item.rollConsumable(ev); break;
					case 'toolCheck': item.rollToolCheck(ev); break;
					case 'infoRoll': BetterRollsDice.fullRoll(item, {info: true, properties:true}); break;
				}
			}
		});
	});
}

async function redUpdateFlags(item) {
	if (CONFIG.betterRolls5e.validItemTypes.indexOf(item.data.type) == -1) { return; }
	if (item.data.flags.betterRolls5e === undefined) {
		item.data.flags.betterRolls5e = {};
	}
	
	let flags = duplicate(CONFIG.betterRolls5e.allFlags[item.data.type.concat("Flags")]);
	item.data.flags.betterRolls5e = mergeObject(flags, item.data.flags.betterRolls5e);
	
	// If quickDamage flags should exist, update them based on which damage formulae are available
	if (CONFIG.betterRolls5e.allFlags[item.data.type.concat("Flags")].quickDamage) {
		let newQuickDamageValues = [];
		let newQuickDamageAltValues = [];
		
		// Make quickDamage flags if they don't exist
		if (!item.data.flags.betterRolls5e.quickDamage) {
			item.data.flags.betterRolls5e.quickDamage = {type: "Array", value: [], altValue: []};
		}
		
		for (let i = 0; i < item.data.data.damage.parts.length; i++) {
			newQuickDamageValues[i] = true;
			newQuickDamageAltValues[i] = true;
			if (item.data.flags.betterRolls5e.quickDamage.value[i] != null) {
				newQuickDamageValues[i] = item.data.flags.betterRolls5e.quickDamage.value[i];
			}
			if (item.data.flags.betterRolls5e.quickDamage.altValue[i] != null) {
				newQuickDamageAltValues[i] = item.data.flags.betterRolls5e.quickDamage.altValue[i];
			}
		}
		item.data.flags.betterRolls5e.quickDamage.value = newQuickDamageValues;
		item.data.flags.betterRolls5e.quickDamage.altValue = newQuickDamageAltValues;
	}
	
	return item.data.flags.betterRolls5e;
}

/**
 * Adds adds the Better Rolls tab to an item's sheet. Should only be called when the sheet is rendered.
 */
async function addBetterRollsContent(app, protoHtml, data) {
	let item = app.object;
	//console.log(item);
	if (CONFIG.betterRolls5e.validItemTypes.indexOf(item.data.type) == -1) { return; }
	redUpdateFlags(item);
	
	let html = protoHtml;
	
	if (html[0].localName !== "div") {
		html = $(html[0].parentElement.parentElement);
	}
	
	let tabSelector = html.find(`form nav.sheet-navigation.tabs`),
		settingsContainer = html.find(`.sheet-body`),
		betterRollsTabString = `<a class="item" data-group="primary" data-tab="betterRolls5e">${i18n("Better Rolls")}</a>`,
		tab = tabSelector.append($(betterRollsTabString));
	
	
	
	let betterRollsTemplateString = `modules/betterrolls5e/templates/red-item-options.html`,
		altSecondaryEnabled = game.settings.get("betterrolls5e", "altSecondaryEnabled");
	let betterRollsTemplate = await renderTemplate(betterRollsTemplateString, {
		DND5E: CONFIG.DND5E,
		item: item,
		isAttack: isAttack(item),
		isSave: isSave(item),
		flags: item.data.flags,
		damageTypes: CONFIG.betterRolls5e.combinedDamageTypes,
		altSecondaryEnabled: altSecondaryEnabled
	});
	let extraTab = settingsContainer.append(betterRollsTemplate);
	
	// Add damage context input
	if (game.settings.get("betterrolls5e", "damageContextEnabled")) {
		let damageRolls = html.find(`.tab.details .damage-parts .damage-part input`);
		// Placeholder is either "Context" or "Label" depending on system settings
		let placeholder = game.settings.get("betterrolls5e", "contextReplacesDamage") ? "br5e.settings.label" : "br5e.settings.context";
		for (let i = 0; i < damageRolls.length; i++) {
			let contextField = $(`<input type="text" name="flags.betterRolls5e.quickDamage.context.${i}" value="${(item.data.flags.betterRolls5e.quickDamage.context[i] || "")}" placeholder="${i18n(placeholder)}" data-dtype="String" style="margin-left:5px;">`);
			damageRolls[i].after(contextField[0]);
			// Add event listener to delete context when damage is deleted
			$($($(damageRolls[i])[0].parentElement).find(`a.delete-damage`)).click(async event => {
				let contextFlags = Object.values(item.data.flags.betterRolls5e.quickDamage.context);
				contextFlags.splice(i, 1);
				item.update({
					[`flags.betterRolls5e.quickDamage.context`]: contextFlags,
				});
			});
		}
	}
}

function updateSaveButtons(html) {
	html.find(".card-buttons").off()
	html.find(".card-buttons button").off().click(event => {
		const button = event.currentTarget;
		if (button.dataset.action === "save") {
			event.preventDefault();
			let actors = getTargetActors();
			let ability = button.dataset.ability;
			for (let i = 0; i < actors.length; i++) {
				if (actors[i]) {
					BetterRollsDice.fullRollAttribute(actors[i], ability, "save");
				}
			}
			setTimeout(() => {button.disabled = false;}, 1);
		}
	});
}

function getTargetActors() {
	const character = game.user.character;
	const controlled = canvas.tokens.controlled;
	let actors = [];
	if ( controlled.length === 0 ) return [character] || null;
	if ( controlled.length > 0 ) {
		let actors = [];
		for (let i = 0; i < controlled.length; i++) {
			actors.push(controlled[i].actor);
		}
		return actors;
	}
	else throw new Error(`You must designate a specific Token as the roll target`);
}

/**
 * Replaces the sheet's d20 rolls for ability checks, skill checks, and saving throws into dual d20s.
 * Also replaces the default button on items with a "standard" roll.
 */
function changeRollsToDual (app, html, data, params) {
	let paramRequests = mergeObject({
			abilityButton: '.ability-name',
			checkButton: '.ability-mod',
			saveButton: '.ability-save',
			skillButton: '.skill-name',
			itemButton: '.item .item-image',
			singleAbilityButton: true
		},params || {});
	
	let actor = app.object;
	//console.log(paramRequests);
	
	// Assign new action to ability check button
	let abilityName = html.find(paramRequests.abilityButton);
	if (paramRequests.singleAbilityButton === true) {
		//console.log(abilityName);
		//console.log(paramRequests.singleAbilityButton);
		abilityName.off();
		abilityName.click(event => {
			event.preventDefault();
			let ability = event.currentTarget.parentElement.getAttribute("data-ability"),
				abl = actor.data.data.abilities[ability];
			//console.log("Ability: ", ability);
			if ( event.ctrlKey ) {
				BetterRollsDice.fullRollAttribute(app.object, ability, "check");
			} else if ( event.shiftKey ) {
				BetterRollsDice.fullRollAttribute(app.object, ability, "save");
			} else {
				new Dialog({
					title: `${i18n(dnd5e.abilities[ability])} ${i18n("Ability Roll")}`,
					content: `<p><span style="font-weight: bold;">${i18n(dnd5e.abilities[ability])}:</span> ${i18n("What type of roll?")}</p>`,
					buttons: {
						test: {
							label: i18n("Ability Check"),
							callback: () => BetterRollsDice.fullRollAttribute(app.object, ability, "check")
						},
						save: {
							label: i18n("Saving Throw"),
							callback: () => BetterRollsDice.fullRollAttribute(app.object, ability, "save")
						}
					}
				}).render(true);
			}
		});
	}
	
	// Assign new action to ability button
	let checkName = html.find(paramRequests.checkButton);
	checkName.off();
	checkName.addClass("rollable");
	checkName.click(event => {
		event.preventDefault();
		let ability = event.currentTarget.parentElement.parentElement.getAttribute("data-ability"),
			abl = actor.data.data.abilities[ability];
		//console.log("Ability: ", ability);
		BetterRollsDice.fullRollAttribute(app.object, ability, "check");
	});
	
	// Assign new action to save button
	let saveName = html.find(paramRequests.saveButton);
	saveName.off();
	saveName.addClass("rollable");
	saveName.click(event => {
		event.preventDefault();
		let ability = event.currentTarget.parentElement.parentElement.getAttribute("data-ability"),
			abl = actor.data.data.abilities[ability];
		//console.log("Ability: ", ability);
		BetterRollsDice.fullRollAttribute(app.object, ability, "save");
	});
	
	// Assign new action to skill button
	let skillName = html.find(paramRequests.skillButton);
	skillName.off();
	skillName.click(event => {
		event.preventDefault();
		let skill = event.currentTarget.parentElement.getAttribute("data-skill");
		BetterRollsDice.fullRollSkill(app.object, skill);
	});
	
	// Assign new action to item image button
	let itemImage = html.find(paramRequests.itemButton);
	itemImage.off();
	itemImage.click(async event => {
		//console.log("EVENT:");
		//console.log(event);
		let li = $(event.currentTarget).parents(".item"),
			item = app.object.getOwnedItem(String(li.attr("data-item-id")));
		if (!game.settings.get("betterrolls5e", "imageButtonEnabled")) {
			item.actor.sheet._onItemRoll(event);
		} else if (event.altKey) {
			if (game.settings.get("betterrolls5e", "altSecondaryEnabled")) {
				event.preventDefault();
				BetterRollsDice.fullRoll(item, {quickRoll: true, alt: true});
			} else {
				item.actor.sheet._onItemRoll(event);
			}
		} else {
			event.preventDefault();
			BetterRollsDice.fullRoll(item, {quickRoll: true});
		}
	});
}

// Frontend for macros
function BetterRolls() {
	async function assignMacro(item, slot, mode) {
		function command() {
			switch (mode) {
				case "name": return `BetterRolls.quickRoll("${item.name}");`; break;
				case "id": return `BetterRolls.quickRollById("${item.actorId}", "${item.data._id}");`; break;
			}
		}
		let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
		if (!macro) {
			macro = await Macro.create({
				name: item.data.name,
				type: "script",
				img: item.data.img,
				command: command(),
				flags: {"dnd5e.itemMacro": true}
			}, {displaySheet: false});
		}
		game.user.assignHotbarMacro(macro, slot);
	};
	
	function quickRoll(itemName) {
		let speaker = ChatMessage.getSpeaker();
		let actor;
		if (speaker.token) actor = game.actors.tokens[speaker.token];
		if (!actor) actor = game.actors.get(speaker.actor);
		let item = actor ? actor.items.find(i => i.name === itemName) : null;
		if (!actor) { return ui.notifications.warn(`${i18n("br5e.error.noSelectedActor")}`); }
		else if (!item) { return ui.notifications.warn(`${actor.name} ${i18n("br5e.error.noKnownItemOnActor")} ${itemName}`); }
		BetterRollsDice.fullRoll(item, {quickRoll: true, alt: isAlt(event)});
	};
	
	function quickRollById(actorId, itemId) {
		let actor = game.actors.get(actorId);
		if (!actor) { return ui.notifications.warn(`${i18n("br5e.error.noActorWithId")}`); }
		let item = actor.getOwnedItem(itemId);
		if (!item) { return ui.notifications.warn(`${i18n("br5e.error.noItemWithId")}`); }
		if (actor.permission != 3) { return ui.notifications.warn(`${i18n("br5e.error.noActorPermission")}`); }
		BetterRollsDice.fullRoll(item, {quickRoll: true, alt: isAlt(event)});
	};
	
	function quickRollByName(actorName, itemName) {
		let actor = game.actors.entities.find(i => i.name === actorName);
		if (!actor) { return ui.notifications.warn(`${i18n("br5e.error.noKnownActorWithName")}`); }
		let item = actor.items.find(i => i.name === itemName);
		if (!item) { return ui.notifications.warn(`${actor.name} ${i18n("br5e.error.noKnownItemOnActor")} ${itemName}`); }
		if (actor.permission != 3) { return ui.notifications.warn(`${i18n("br5e.error.noActorPermission")}`); }
		BetterRollsDice.fullRoll(item, {quickRoll: true, alt: isAlt(event)});
	}
	
	function isAlt(event) {
		if (event && event.altKey && game.settings.get("betterrolls5e", "altSecondaryEnabled")) { return true; }
		else { return false; }
	}
	
	let oldHotBarHook = Hooks._hooks[0];
	Hooks._hooks.hotbarDrop.splice(0,1)
	Hooks.on("hotbarDrop", (bar, data, slot) => {
		if ( data.type !== "Item" ) return;
		assignMacro(data, slot, "id");
		return true;
	});
	
	return {
		assignMacro:assignMacro,
		quickRoll:quickRoll,
		quickRollById:quickRollById,
		quickRollByName:quickRollByName,
	}
}
window.BetterRolls = BetterRolls();

class BetterRollsDice {
	/**
	* Creates a chat message with the requested ability check or saving throw.
	* @param {Actor5e} actor		The actor object to reference for the roll.
	* @param {String} ability		The ability score to roll.
	* @param {String} rollType		String of either "check" or "save" 
	*/
	
	static async fullRollAttribute(actor, ability, rollType) {
		let dualRoll,
			titleString,
			abl = ability,
			label = dnd5e.abilities[ability];
		
		let wd = getWhisperData();
		
		if (rollType === "check") {
			dualRoll = await BetterRollsDice.rollAbilityCheck(actor, abl);
			titleString = `${i18n(label)} ${i18n("br5e.chat.check")}`;
		} else if (rollType === "save") {
			dualRoll = await BetterRollsDice.rollAbilitySave(actor, abl);
			titleString = `${i18n(label)} ${i18n("br5e.chat.save")}`;
		}
		
		
		let titleImage = ((actor.data.img == "icons/svg/mystery-man.svg") || actor.data.img == "") ? actor.data.token.img : actor.data.img;
		
		let titleTemplate = await renderTemplate("modules/betterrolls5e/templates/red-header.html", {
			item: {
				img: titleImage,
				name: titleString
			}
		});
		
		let content = await renderTemplate("modules/betterrolls5e/templates/red-fullroll.html", {
			title: titleTemplate,
			dual: dualRoll["html"]
		});
		
		let chatData = {
			user: game.user._id,
			content: content,
			speaker: {
				actor: actor._id,
				token: actor.token,
				alias: actor.name
			},
			type: CONST.CHAT_MESSAGE_TYPES.OTHER,
			rollMode: wd.rollMode,
			blind: wd.blind,
			sound: CONFIG.sounds.dice
		};
		
		if (wd.whisper) { chatData.whisper = wd.whisper; }
		
		// Output the rolls to chat
		ChatMessage.create(chatData);
	}
	
	/**
	* Creates a chat message with the requested skill check.
	*/
	static async fullRollSkill(actor, skill) {
		let skl = actor.data.data.skills[skill],
			label = dnd5e.skills[skill];
			
		let wd = getWhisperData();
		
		let dualRoll = await BetterRollsDice.rollSkillCheck(actor, skl);
		
		let titleImage = (actor.data.img == "icons/svg/mystery-man.svg") ? actor.data.token.img : actor.data.img;
		
		let titleTemplate = await renderTemplate("modules/betterrolls5e/templates/red-header.html", {
			item: {
				img: titleImage,
				name: `${i18n(label)}`
			}
		});
		
		let content = await renderTemplate("modules/betterrolls5e/templates/red-fullroll.html", {
			title: titleTemplate,
			dual: dualRoll["html"]
		});
		
		let chatData = {
			user: game.user._id,
			content: content,
			speaker: {
				actor: actor._id,
				token: actor.token,
				alias: actor.name
			},
			type: CONST.CHAT_MESSAGE_TYPES.OTHER,
			rollMode: wd.rollMode,
			blind: wd.blind,
			sound: CONFIG.sounds.dice
		};
		
		if (wd.whisper) { chatData.whisper = wd.whisper; }
		
		// Output the rolls to chat
		ChatMessage.create(chatData);
	}
	
	/**
	* Handles the creation of a chat message with the requested fields.
	* @param {Item} item			The desired item on the sheet to take data from
	* @param {Event} event			The triggering event which initiated the roll
	* @param {Array} params			Array of parameters:
	*		{String} itemType					Whether an item is a weapon, spell, tool, or feat
	*		{Boolean} attack					Whether to show the attack roll
	*		{Boolean} save						Whether to show the save DC
	*		{Boolean} damage					Whether to show the damage roll
	*		{Boolean} alt						Whether to use the versatile damage roll
	*		{Boolean} title						Title of the Chat Message. Defaults to item header
	*		{Boolean} info						Information written in the Chat Message
	*		{Boolean} forceCrit					Whether to force a critical damage roll
	*		{Boolean} sendMessage				Whether to send the message to chat, false simply returns the content of the roll
	*/
	static async fullRoll(item, params) {
		let rollRequests = mergeObject({
			itemType: "weapon",
			attack: false,
			check: false,
			save: false,
			alt: false,
			damage: [],
			versatile: false,
			title: null,
			info: false,
			properties: false,
			forceCrit: false,
			quickRoll: false,
			sendMessage: true,
			slotLevel: null,
			useCharge: false,
		},params || {});
		
		redUpdateFlags(item);
		//console.log(item);
		
		if (rollRequests.quickRoll) {
			rollRequests = mergeObject(rollRequests, BetterRollsDice.updateForQuickRoll(item, rollRequests.alt));
		}
		
		// Check to consume charges. Prevents the roll if charges are required and none are left.
		let consumedCharge = {value:"", destroy:false};
		if (rollRequests.useCharge) {
			consumedCharge = await BetterRollsDice.consumeCharge(item);
			if (consumedCharge.value === "noCharges") {
				return "error";
			}
		}
		
		// If damage is "all", all damages should be rolled
		if (rollRequests.damage === "all") {
			rollRequests.damage = [];
			for (let i = 0; i < item.data.data.damage.parts.length; i++) {
				rollRequests.damage[i] = true;
			}
		}
		
		// Figure out if roll labels are necessary
		let labelsShown = 0,
			showLabels = game.settings.get("betterrolls5e", "rollTitlesEnabled"),
			properties = (rollRequests.properties) ? BetterRollsDice.listProperties(item) : null;
		/*if (game.settings.get("betterrolls5e", "rollTitlesEnabled") == false) {
			if (rollRequests.attack) { labelsShown += 1; }
			if (rollRequests.save) { labelsShown += 1; }
			if (rollRequests.check) { labelsShown += 1; }
			if (rollRequests.damage) {
				for (let i = 0; i < rollRequests.damage.length; i++) {
					if (rollRequests.damage[i] === true) { labelsShown += 1; }
				}
			}
			showLabels = (labelsShown > 1) ? false : true;
		}*/
		
		let itemData = item.data.data;
		if (!rollRequests.slotLevel) {
			if (item.data.type === "spell") {
				rollRequests.slotLevel = await BetterRollsDice.configureSpell(item);
				if (rollRequests.slotLevel === "error") { return "spellPromptClosed"; }
			}
		}
		
		let wd = getWhisperData();
		
		let flags = item.data.flags,
			save,
			actor = item.actor,
			printedSlotLevel = ( item.data.type === "spell" && rollRequests.slotLevel != item.data.data.level ) ? dnd5e.spellLevels[rollRequests.slotLevel] : null,
			title = (rollRequests.title || await renderTemplate("modules/betterrolls5e/templates/red-header.html",{item:item, slotLevel:printedSlotLevel})),
			attackRoll = (rollRequests.attack == true) ? await BetterRollsDice.rollAttack(item, rollRequests.itemType, showLabels) : null,
			toolRoll = ((item.data.type == "tool") && rollRequests.check == true) ? await BetterRollsDice.rollTool(item) : null,
			isCrit = (rollRequests.forceCrit || (attackRoll ? attackRoll.isCrit : false)),
			damages = [];
		
		let toolCrit = (toolRoll ? toolRoll.isCrit : false);
		
		// Add damage rolls to the "damages" value to be rendered to template
		for (let i=0; i < rollRequests.damage.length; i++) {
			if ((rollRequests.damage[i] === true) && (item.data.data.damage.parts[i])) {
				damages.push(await BetterRollsDice.rollDamage(item, i, rollRequests.alt, rollRequests.versatile, isCrit, showLabels, rollRequests.slotLevel));
			}
		}
		
		if (attackRoll) {attackRoll = attackRoll["html"];}
		if (toolRoll) {toolRoll = toolRoll["html"];}
		if (rollRequests.save) {
			save = await BetterRollsDice.saveRollButton(item);
		}
		let info = ((rollRequests.info) && (itemData.description)) ? itemData.description.value : null;
		
		// Add token's ID to chat roll, if valid
		let tokenId;
		if (actor.token) {
			tokenId = [canvas.tokens.get(actor.token.id).scene.id, actor.token.id].join(".");
		}
		
		let content = await renderTemplate("modules/betterrolls5e/templates/red-fullroll.html", {
			item: item,
			actor: actor,
			tokenId: tokenId,
			itemId: item.id,
			isCritical: isCrit || toolCrit,
			title: title,
			info: info,
			dual: attackRoll || toolRoll,
			save: save,
			damages: damages,
			properties: properties
		});
		
		let chatData = {
			user: game.user._id,
			content: content,
			speaker: {
				actor: actor._id,
				token: actor.token,
				alias: actor.name
			},
			type: CONST.CHAT_MESSAGE_TYPES.OTHER,
			rollMode: wd.rollMode,
			blind: wd.blind,
			sound: (game.settings.get("betterrolls5e", "playRollSounds") && !hasMaestroSound(item)) ? CONFIG.sounds.dice : null,
		};
		
		if (wd.whisper) { chatData.whisper = wd.whisper; }
		
		if (consumedCharge.destroy === true) { setTimeout(() => {item.actor.deleteOwnedItem(item.id);}, 100);}
		
		if (rollRequests.sendMessage == true) { ChatMessage.create(chatData); }
		else return message;
	}
	
	/*
	* Updates the rollRequests based on the br5e flags.
	*/
	static updateForQuickRoll(item, alt) {
		let chatData = item.getChatData(),
			itemData = item.data.data,
			flags = item.data.flags,
			brFlags = flags.betterRolls5e,
			itemType = "weapon",
			quickRoll = true,
			attack = false,
			check = false,
			save = false,
			damage = [false],
			info = false,
			properties = false,
			useCharge = false;
		
		
		if (brFlags) {
			// Assume new action of the button based on which fields are enabled for Quick Rolls
			
			function flagIsTrue(flag) {
				let val = "value";
				if (alt) { val = "altValue"; }
				return (brFlags[flag] && (brFlags[flag][val] == true));
			}
			
			if (flagIsTrue("quickDesc")) { info = true; }
			if (flagIsTrue("quickAttack")) {
				attack = isAttack(item);
			}
			if (flagIsTrue("quickSave")) {
				save = isSave(item);
			}
			if (flagIsTrue("quickCheck")) {
				check = isCheck(item);
			}
			if (!alt) {
				if (brFlags.quickDamage && (brFlags.quickDamage.value.length > 0)) {
					for (let i = 0; i < brFlags.quickDamage.value.length; i++) {
						damage[i] = brFlags.quickDamage.value[i];
					}
				}
			} else {
				if (brFlags.quickDamage && (brFlags.quickDamage.altValue.length > 0)) {
					for (let i = 0; i < brFlags.quickDamage.altValue.length; i++) {
						damage[i] = brFlags.quickDamage.altValue[i];
					}
				}
			}
			if (flagIsTrue("quickProperties")) properties = true;
			if (flagIsTrue("quickCharges")) useCharge = true;
		} else { 
			//console.log("Request made to Quick Roll item without flags!");
			info = true;
			properties = true;
		}
		
		let rollRequests = {
			itemType: itemType,
			quickRoll: quickRoll,
			attack: attack,
			check: check,
			save: save,
			damage: damage,
			info: info,
			properties: properties,
			useCharge: useCharge
		}
		return rollRequests;
	}
	
	/**
	* A function for returning the properties of an item, which can then be printed as the footer of a chat card.
	* @param {Object} item			Desired item's properties to list
	*/
	static listProperties(item) {
		let properties = [];
		let data = duplicate(item.data.data),
			ad = duplicate(item.actor.data.data);
		
		let range = ((data.range) && (data.range.value || data.range.units)) ? (data.range.value || "") + (((data.range.long) && (data.range.long !== 0) && (data.rangelong != data.range.value)) ? "/" +data.range.long : "") + " " + (data.range.units ? dnd5e.distanceUnits[data.range.units] : "") : null;
		let target = (data.target && data.target.type) ? i18n("Target: ").concat(dnd5e.targetTypes[data.target.type]) + ((data.target.units ) && (data.target.units !== "none") ? " (" + data.target.value + " " + dnd5e.distanceUnits[data.target.units] + ")" : "") : null;
		let activation = (data.activation && (data.activation.type !== "") && (data.activation.type !== "none")) ? data.activation.cost + " " + data.activation.type : null;
		let duration = (data.duration && data.duration.units) ? (data.duration.value ? data.duration.value + " " : "") + dnd5e.timePeriods[data.duration.units] : null;
		let activationCondition = (data.activation && data.activation.condition) ? "(" + data.activation.condition + ")" : null;
		
		switch(item.data.type) {
			case "weapon":
				properties = [
					dnd5e.weaponTypes[data.weaponType],
					range,
					target,
					data.proficient ? "" : i18n("Not Proficient"),
					data.weight ? data.weight + i18n(" lbs.") : null
				];
				for (const prop in data.properties) {
					if (data.properties[prop] === true) {
						properties.push(dnd5e.weaponProperties[prop]);
					}
				}
				break;
			case "spell":
				// Spell attack labels
				data.damageLabel = data.actionType === "heal" ? i18n("br5e.chat.healing") : i18n("br5e.chat.damage");
				data.isAttack = data.actionType === "attack";
				
				let components = data.components,
					componentString = "";
				if (components.vocal) { componentString += i18n("br5e.chat.abrVocal"); }
				if (components.somatic) { componentString += i18n("br5e.chat.abrSomatic"); }
				if (components.material) { 
					componentString += i18n("br5e.chat.abrMaterial");
					if (data.materials.value) { componentString += " (" + data.materials.value + (data.materials.consumed ? i18n("br5e.chat.consumedBySpell") : "") + ")"; }
				}
				
				properties = [
					dnd5e.spellSchools[data.school],
					dnd5e.spellLevels[data.level],
					components.ritual ? i18n("Ritual") : null,
					activation,
					duration,
					data.components.concentration ? i18n("Concentration") : null,
					componentString ? componentString : null,
					range,
					target
				];
				break;
			case "feat":
				properties = [
					((data.activation.type !== "") && (data.activation.type !== "none")) ? data.activation.cost + " " + data.activation.type : null,
					(data.duration.units) ? (data.duration.value ? data.duration.value + " " : "") + dnd5e.timePeriods[data.duration.units] : null,
					range,
					data.target.type ? i18n("Target: ").concat(dnd5e.targetTypes[data.target.type]) + ((data.target.units ) && (data.target.units !== "none") ? " (" + data.target.value + " " + dnd5e.distanceUnits[data.target.units] + ")" : "") : null,
				];
				break;
			case "equipment":
				properties = [
					dnd5e.equipmentTypes[data.armor.type],
					data.equipped ? i18n("Equipped") : null,
					data.armor.value ? data.armor.value + " " + i18n("AC") : null,
					data.stealth ? i18n("Stealth Disadv.") : null,
					data.weight ? data.weight + " lbs." : null,
				];
				break;
			case "tool":
				properties = [
					dnd5e.proficiencyLevels[data.proficient],
					data.ability ? dnd5e.abilities[data.ability] : null,
					data.weight ? data.weight + " lbs." : null,
				];
				break;
			case "loot":
				properties = [data.weight ? item.data.totalWeight + " lbs." : null]
				break;
		}
		properties = properties.filter(p => (p) && (p.length !== 0) && (p !== " "));
		return properties;
	}
	
	/**
	* A function for returning a roll template with crits and fumbles appropriately colored.
	* @param {Object} array			Object containing the html for the roll and whether or not the roll is a crit
	*	{HTMLElement} html
	*	{Boolean} isCrit
	* @param {Roll} roll			The desired roll to check for crits or fumbles
	* @param {String} selector		The CSS class selection to add the colors to
	*/
	static tagCrits(array, roll, selector, critThreshold, debug=false) {
		if (!roll) {return array;}
		let $html = $(array.html),
			high = 0,
			low = 0;
		roll.dice.forEach( function(d) {
			// Add crit for improved crit threshold
			let threshold = critThreshold || d.faces;
			if (debug) {
				//console.log("SIZE",d.faces,"VALUE",d.total);
			}
			if (d.faces > 1) {
				d.results.forEach( function(result) {
					if (result >= threshold) { high += 1; }
					else if (result == 1) { low += 1; }
				});
			}
		});
		if (debug) {
			//console.log("CRITS",high);
			//console.log("FUMBLES",low);
		}
		
		if ((high > 0) && (low == 0)) $html.find(selector).addClass("success");
		else if ((high == 0) && (low > 0)) $html.find(selector).addClass("failure");
		else if ((high > 0) && (low > 0)) $html.find(selector).addClass("mixed");
		let isCrit = false;
		if ((high > 0) || (array.isCrit == true)) isCrit = true;
		
		let output = {
			html: $html[0].outerHTML,
			isCrit: isCrit
		};
		return output;
	}
	
	/**
	* A function for rolling dual d20 rolls
	* @param {Array} parts			An array of parts for the Roll object
	* @param {Object} data			The data to compare to for the Roll object
	* @param {String} title			The title of the dual roll. By default, appears as small text centered above the rolls.
	*/
	static async rollDual20(parts, data, title, critThreshold) {
		let d20parts = ["1d20"].concat(parts);
		
		// Step 1 - Roll left and right die
		let leftRoll = new Roll(d20parts.join("+"), data).roll();
		let rightRoll = leftRoll.reroll();
		
		// Step 2 - Setup chatData
		let leftTooltip = await leftRoll.getTooltip(),
			rightTooltip = await rightRoll.getTooltip(),
			dualtooltip = await renderTemplate("modules/betterrolls5e/templates/red-dualtooltip.html", {lefttooltip: leftTooltip, righttooltip: rightTooltip}),
			chatData = {
				title: title,
				dualtooltip: dualtooltip,
				formula: leftRoll.formula,
				lefttotal: leftRoll.total,
				righttotal: rightRoll.total
			};
		
		// Step 3 - Create HTML using custom template
		let html = {
			html: await renderTemplate("modules/betterrolls5e/templates/red-dualroll.html", chatData),
			crit: false
		};
		html = BetterRollsDice.tagCrits(html, leftRoll, ".dice-total.dual-left", critThreshold);
		html = BetterRollsDice.tagCrits(html, rightRoll, ".dice-total.dual-right", critThreshold);
		return html;
	}
	
	static rollAttack(itm, type, titleEnabled) {
		// Prepare roll data
		let itemData = itm.data.data,
			actorData = itm.actor.data.data,
			title = titleEnabled ? i18n("br5e.chat.attack") : null,
			parts = [],
			rollData = duplicate(actorData);
		
		// Add critical threshold
		let critThreshold = 20;
		let characterCrit = 20;
		try { characterCrit = itm.actor.getFlag("dnd5e", "weaponCriticalThreshold") || 20; }
		catch(error) { characterCrit = itm.actor.getFlag("dnd5eJP", "weaponCriticalThreshold") || 20; }
		
		let itemCrit = itm.data.flags.betterRolls5e.critRange ? Number(itm.data.flags.betterRolls5e.critRange.value) : 20;
		
		if (itm.data.type == "weapon") {
			critThreshold = Math.min(critThreshold, characterCrit, itemCrit);
		} else {
			critThreshold = Math.min(critThreshold, itemCrit);
		}
		
		// Add ability modifier bonus
		let abl = "";
		if (itm.data.type == "spell") {
			abl = itemData.ability || actorData.attributes.spellcasting;
		} else if (itm.data.type == "weapon") {
			if (itemData.properties.fin && (itemData.ability === "str" || itemData.ability === "dex" || itemData.ability === "")) {
				if (actorData.abilities.str.mod >= actorData.abilities.dex.mod) { abl = "str"; }
				else { abl = "dex"; }
			} else { abl = itemData.ability; }
		} else {
			abl = itemData.ability || "";
		}
		
		if (abl.length > 0) {
			parts.push(`@abl`);
			rollData.abl = actorData.abilities[abl].mod;
			//console.log("Adding Ability mod", abl);
		}
		
		// Add proficiency, expertise, or Jack of all Trades
		if (itm.data.type == "spell" || itm.data.type == "feat" || itemData.proficient ) {
			parts.push(`@prof`);
			rollData.prof = Math.floor(actorData.attributes.prof);
			//console.log("Adding Proficiency mod!");
		}
		
		// Add item's bonus
		if ( (itemData.attackBonus != 0) && (itemData.attackBonus !== "") ) {
			parts.push(`@bonus`);
			rollData.bonus = itemData.attackBonus;
			//console.log("Adding Bonus mod!", itemData);
		}
		
		
		let dualRoll = BetterRollsDice.rollDual20(parts, rollData, title, critThreshold);
		//console.log(dualRoll);
		return dualRoll;
	}
	
	static async damageTemplate (baseRoll, critRoll, labels) {
		let baseTooltip = await baseRoll.getTooltip(),
			templateTooltip;
		
		if (baseRoll.parts.length === 0) return;
		
		if (critRoll) {
			let critTooltip = await critRoll.getTooltip();
			templateTooltip = await renderTemplate("modules/betterrolls5e/templates/red-dualtooltip.html", {lefttooltip: baseTooltip, righttooltip: critTooltip});
		} else {templateTooltip = baseTooltip;}
		
		let chatData = {
			tooltip: templateTooltip,
			lefttotal: baseRoll.total,
			righttotal: (critRoll ? critRoll.total : null),
			damagetop: labels[1],
			damagemid: labels[2],
			damagebottom: labels[3],
			formula: baseRoll.formula,
			crittext: i18n(game.settings.get("betterrolls5e", "critString"))
		};
		
		let html = {
			html: await renderTemplate("modules/betterrolls5e/templates/red-damageroll.html", chatData)
		};
		html = BetterRollsDice.tagCrits(html, baseRoll, ".red-left-die");
		html = BetterRollsDice.tagCrits(html, critRoll, ".red-right-die");
		
		let output = html["html"];
		
		
		return output;
	}
	
	static rollDamage(itm, damageIndex = 0, isAlt = false, forceVersatile = false, isCrit = false, showLabel = true, slotLevel = null) {
		let itemData = itm.data.data,
			rollData = duplicate(itm.actor.data.data),
			abl = itemData.ability,
			flags = itm.data.flags.betterRolls5e,
			damageFormula,
			damageType = itemData.damage.parts[damageIndex][1],
			isVersatile = false;
		
		rollData.item = itemData;
		
		// Change first damage formula if versatile
		if (!isAlt) {
			if ((forceVersatile || (flags.quickVersatile && flags.quickVersatile.value === true)) && itemData.damage.versatile.length > 0 && damageIndex === 0) {
				damageFormula = itemData.damage.versatile;
				isVersatile = true;
			} else {
				damageFormula = itemData.damage.parts[damageIndex][0];
			}
		} else {
			if ((forceVersatile || (flags.quickVersatile && flags.quickVersatile.altValue === true)) && itemData.damage.versatile.length > 0 && damageIndex === 0) {
				damageFormula = itemData.damage.versatile;
				isVersatile = true;
			} else {
				damageFormula = itemData.damage.parts[damageIndex][0];
			}
		}
		
		let type = itm.data.type,
			parts = [],
			dtype = CONFIG.betterRolls5e.combinedDamageTypes[damageType];
		
		let generalMod = rollData.attributes.spellcasting;
		
		// Spells don't push their ability modifier to damage by default. This is here so the user can add "+ @mod" to their damage roll if they wish.
		if (type === "spell") {
			abl = itemData.ability ? itemData.ability : generalMod;
		}
		
		// Applies ability modifier on weapon and feat damage rolls, but only for the first damage roll listed on the item.
		if ((type === "weapon" || type === "feat") && damageIndex === 0) {
			if (type === "weapon") {
				if (itemData.properties.fin && (itemData.ability === "str" || itemData.ability === "dex" || itemData.ability === "")) {
					if (rollData.abilities.str.mod >= rollData.abilities.dex.mod) { abl = "str"; }
					else { abl = "dex"; }
				}
			}
		}
		
		// Users may add "+ @mod" to their rolls to manually add the ability modifier to their rolls.
		rollData.mod = (abl !== "") ? rollData.abilities[abl].mod : 0;
		//console.log(rollData.mod);
		
		// Prepare roll label
		let titlePlacement = game.settings.get("betterrolls5e", "rollTitlePlacement"),
			damagePlacement = game.settings.get("betterrolls5e", "damageRollPlacement"),
			labels = {
				"1": [],
				"2": [],
				"3": []
			};
		
		let titleString = "";
		let damageStrings = [dtype];
		
		if (showLabel) {
			// Show "Healing" prefix only if it's not inherently a heal action
			if (itemData.actionType === "heal" && !dnd5e.healingTypes[damageType]) { titleString += i18n("br5e.chat.healing"); }
			// Show "Damage" prefix if it's a damage roll
			else if (dnd5e.damageTypes[damageType]) { titleString += i18n("br5e.chat.damage"); }
		
		
			// Modify label for context
			if (game.settings.get("betterrolls5e", "damageContextEnabled") && flags.quickDamage.context[damageIndex]) {
				if (game.settings.get("betterrolls5e", "contextReplacesDamage") === false) {
					titleString = titleString + " " + flags.quickDamage.context[damageIndex];
				} else {
					titleString = flags.quickDamage.context[damageIndex];
				}
			}
			
			if (isVersatile) { damageStrings.push("(" + dnd5e.weaponProperties.ver + ")"); }
			
			if (titlePlacement !== "0") {
				labels[titlePlacement].push(titleString);
			}
			
			if (damagePlacement !== "0") {
				labels[damagePlacement].push(damageStrings.join(" "));
			}
		}
		
		for (let p in labels) {
			labels[p] = labels[p].join(" - ");
		};
		
		if (damageIndex === 0) { damageFormula = BetterRollsDice.scaleDamage(itm, damageIndex, slotLevel) || damageFormula; }
		let baseDice = damageFormula;
		let baseWithParts = [baseDice];
		if (parts) {baseWithParts = [baseDice].concat(parts);}
		
		let rollFormula = baseWithParts.join("+");
		
		let baseRoll = new Roll(rollFormula, rollData).roll();
		let critRoll;
		if (isCrit) {
			let critFormula = rollFormula.replace(/[+-]\s*(?:@[a-zA-Z0-9.]+|[0-9]+(?![Dd]))/g,"");
			let critRollData = duplicate(rollData);
			critRollData.mod = 0;
			critRoll = new Roll(critFormula, critRollData);
			let savage;
			if (itm.data.type === "weapon") {
				try { savage = itm.actor.getFlag("dnd5e", "savageAttacks"); }
				catch(error) { savage = itm.actor.getFlag("dnd5eJP", "savageAttacks"); }
			}
			let add = (itm.actor && savage) ? 1 : 0;
			critRoll.alter(add);
			critRoll.roll();
		}
			
		let damageRoll = BetterRollsDice.damageTemplate(baseRoll, critRoll, labels);
		return damageRoll;
	}
	
	static scaleDamage(item, damageIndex, spellLevel = null, scaleInterval = null) {
		let itemData = item.data.data;
		let actorData = item.actor.data.data;
		
		// Scaling for cantrip damage by level. Affects only the first damage roll of the spell.
		if (item.data.type === "spell" && itemData.scaling.mode === "cantrip") {
			let parts = itemData.damage.parts.map(d => d[0]);
			let level = item.actor.data.type === "character" ? actorData.details.level.value : actorData.details.cr;
			let scale = itemData.scaling.formula;
			let formula = parts[damageIndex];
			const add = Math.floor((level + 1) / 6);
			if ( add === 0 ) {}
			else if ( scale && (scale !== formula) ) {
				formula = formula + " + " + scale.replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${add}d${d}`);
			} else {
				formula = formula.replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${parseInt(nd)+add}d${d}`);
			}
			return formula;
		}
		
		// Scaling for spell damage by spell slot used. Affects only the first damage roll of the spell.
		if (item.data.type === "spell" && itemData.scaling.mode === "level" && spellLevel) {
			let parts = itemData.damage.parts.map(d => d[0]);
			let level = itemData.level;
			let scale = itemData.scaling.formula;
			let formula = parts[damageIndex];
			const add = Math.floor((spellLevel - itemData.level)/(scaleInterval || 1));
			if (add > 0) {
				if ( scale && (scale !== formula) ) {
					formula = formula + " + " + scale.replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${Math.floor(add*nd)}d${d}`);
				} else {
					formula = formula.replace(new RegExp(Roll.diceRgx, "g"), (match, nd, d) => `${Math.floor(parseInt(nd)+add)}d${d}`);
				}
			}
			
			return formula;
		}
		
		return null;
	}
	
	/*
	static removeFlatBonus(terms) {
		//console.log(terms.length)
		for (let i = 0; i < terms.length; i++) {
			let term = terms[i];
			// If the term is not an operation, and does not contain a dice roll, set its value to 0
			if ((term.indexOf('+') === -1) && (term.indexOf('-') === -1) && (term.indexOf('*') === -1) && (term.indexOf('/') === -1) &&
			((term.indexOf('d') === -1) && (terms[i-1] !== '*') && (terms[i-1] !== '/'))) {
				terms[i] = "0";
				//console.log("Term changed! New term:", terms[i]);
			}
		}
		let output = terms.join('');
		//console.log("OUTPUT: ", output);
		return output;
	}
	*/
	
	// Generates the html for a save button to be inserted into a chat message. Players can click this button to perform a roll through their controlled token.
	static async saveRollButton(item) {
		let itemData = item.data.data;
		let actor = item.actor;
		let actorData = actor.data.data;
		let saveData = getSave(item);
		let saveLabel = `${i18n("br5e.buttons.saveDC")} ${saveData.dc} ${dnd5e.abilities[saveData.ability]}`;
		
		let button = await renderTemplate("modules/betterrolls5e/templates/red-save-button.html", {data: saveData, saveLabel: saveLabel});
		
		return button;
	}
	
	static async rollAbilityCheck(actor, abl) {
		let parts = ["@mod"],
			data = {mod: actor.data.data.abilities[abl].mod},
			flavor = null;
		
		return await BetterRollsDice.rollDual20(parts, data, flavor);
	}
	
	static async rollAbilitySave(actor, abl) {
		//console.log(abl);
		let parts = ["@mod"];
		let data = {mod: actor.data.data.abilities[abl].save};
		let flavor = null;
		
		// Support global save bonus
		// ALREADY ADDED TO THE SAVE MODIFIER - Do not use
		/*
		const saveBonus = actor.data.flags.dnd5e && actor.data.flags.dnd5e.saveBonus;
		if ( Number.isFinite(saveBonus) && parseInt(saveBonus) !== 0 ) {
			parts.push("@savebonus");
			data["savebonus"] = saveBonus;
		}
		*/
		
		return await BetterRollsDice.rollDual20(parts, data, flavor);
	}
	
	static async rollSkillCheck(actor, skill) {
		let parts = ["@mod"],
			data = {mod: skill.mod},
			flavor = null;
		
		return await BetterRollsDice.rollDual20(parts, data, flavor);
	}
	
	static async rollTool(itm) {
		// Prepare roll data
		let itemData = itm.data.data,
			actorData = itm.actor.data.data,
			title = null,
			parts = [],
			rollData = duplicate(actorData);
		
		// Add ability modifier bonus
		if ( itemData.ability ) {
			let abl = (itemData.ability),
				mod = abl ? actorData.abilities[abl].mod : 0;
			if (mod !== 0) {
				parts.push(`@mod`);
				rollData.mod = mod;
			}
		}
		
		// Add proficiency, expertise, or Jack of all Trades
		if ( itemData.proficient ) {
			parts.push(`@prof`);
			rollData.prof = Math.floor(itemData.proficient * actorData.attributes.prof);
			//console.log("Adding Proficiency mod!");
		}
		
		// Add item's bonus
		if ( itemData.bonus ) {
			parts.push(`@bonus`);
			rollData.bonus = itemData.bonus.value;
			//console.log("Adding Bonus mod!");
		}
		
		let dualRoll = await BetterRollsDice.rollDual20(parts, rollData, title);
		return dualRoll;
	}
	
	static async configureSpell(item) {
		let actor = item.actor;
		let lvl = null;
		let consume = false;
		let placeTemplate = false;
		
		// Only run the dialog if the spell is not a cantrip
		if (item.data.data.level > 0) {
			try {
				const spellFormData = await SpellCastDialog.create(actor, item);
				console.log(spellFormData);
				lvl = parseInt(spellFormData.get("level"));
				consume = Boolean(spellFormData.get("consume"));
				placeTemplate = Boolean(spellFormData.get("placeTemplate"));
			}
			catch(error) { return "error"; }
		}
		
		if ( lvl !== item.data.data.level ) {
			item = item.constructor.createOwned(mergeObject(item.data, {"data.level": lvl}, {inplace: false}), actor);
		}
		
		// Update Actor data
		if ( consume && (lvl > 0) ) {
			await actor.update({
				[`data.spells.spell${lvl}.value`]: Math.max(parseInt(actor.data.data.spells["spell"+lvl].value) - 1, 0)
			});
		}
		
		// Initiate ability template placement workflow if selected
		if (item.hasAreaTarget && placeTemplate) {
			const template = AbilityTemplate.fromItem(item);
			if ( template ) template.drawPreview(event);
			if (item.actor && item.actor.sheet) item.sheet.minimize();
		}
		
		return lvl;
	}
	
	// Consumes one charge on an item. Will do nothing if item.data.data.uses.per is blank. Will warn the user if there are no charges left.
	static async consumeCharge(itm, chargesToConsume = 1) {
		let item = duplicate(itm);
		let itemData = item.data;
		let output = {value: "success", destroy: false};
		
		function noChargesLeft() {
			ui.notifications.warn(`${i18n("br5e.error.noChargesLeft")}`);
			output.value = "noCharges";
		}
		
		function checkQuantity() {
			let autoUse = itemData.uses.autoUse;
			let autoDestroy = itemData.uses.autoDestroy;
			if (autoUse && itemData.uses.value <= 0) { // If the item should reduce in quantity when out of charges
				console.log("autoUse!");
				if (itemData.quantity <= 1 && autoDestroy) {
					output.destroy = true;
				} else if (itemData.quantity <= 1 && itemData.uses.value < 0 && !autoDestroy) {
					noChargesLeft();
				} else if (itemData.quantity > 1 &&  itemData.uses.value >= 0 && !autoDestroy) {
					itemData.quantity -= 1;
					itemData.uses.value += itemData.uses.max;
				} else if (itemData.quantity > 1) {
					itemData.quantity -= 1;
					itemData.uses.value += itemData.uses.max;
				} else if (itemData.quantity == 1 && itemData.uses.value >= 0) {
					itemData.quantity = 0;
				} else {
					noChargesLeft();
				}
			} else if (itemData.uses.value < 0) {
				noChargesLeft();
			}
		}
		
		if (itemData.uses && itemData.uses.per) {
			let itemCharges = itemData.uses.value;
			let itemChargesMax = itemData.uses.max;
			
			if (itemCharges >= chargesToConsume) {
				itemData.uses.value -= chargesToConsume;
				checkQuantity();
			} else if (item.type !== "consumable") {
				noChargesLeft();
			} else {
				itemData.uses.value -= chargesToConsume;	
				checkQuantity();
			}
		}
		itm.update({
			[`data.uses.value`]: Math.max(itemData.uses.value, 0),
			[`data.quantity`]: itemData.quantity,
		});
		return output;
	}
}