import { DND5E } from "../../../systems/dnd5e/module/config.js";
import { CustomRoll, CustomItemRoll } from "./custom-roll.js";
import { i18n, Utils, ItemUtils } from "./utils/index.js";
import { getSettings } from "./settings.js";

// Returns whether an item makes an attack roll
export function isAttack(item) {
	const attacks = ["mwak", "rwak", "msak", "rsak"];
	return attacks.includes(item.data.data.actionType);
}

// Returns whether an item requires a saving throw
export function isSave(item) {
	const itemData = item.data.data,
		isTypeSave = itemData.actionType === "save",
		hasSaveDC = (itemData.save && itemData.save.ability) ? true : false;

	return isTypeSave || hasSaveDC;
}

export function isCheck(item) {
	return item.data.type === "tool" || typeof item.data.data?.proficient === "number";
}

/**
 * Function for adding Better Rolls content to html data made after a sheet is rendered.
 * actor				The actor object
 * html					The target html to add content to
 * triggeringElement	Container for the element that must be clicked for the extra buttons to be shown.
 * buttonContainer		Container for the element the extra buttons will display in.
 * itemButton			Selector for the item button.
 */
export function addItemContent(actor, html,
	triggeringElement = ".item .item-name h4",
	buttonContainer = ".item-properties",
	itemButton = ".item .rollable") {
	(game.settings.get("betterrolls5e", "rollButtonsEnabled") && triggeringElement && buttonContainer) ? addItemSheetButtons(actor, html, null, triggeringElement, buttonContainer) : null;
	itemButton ? changeRollsToDual(actor, html, null, {itemButton}) : null;
}

const dnd5e = DND5E;

function getQuickDescriptionDefault() {
	return getSettings().quickDefaultDescriptionEnabled;
}

CONFIG.betterRolls5e = {
	validItemTypes: ["weapon", "spell", "equipment", "feat", "tool", "consumable"],
	allFlags: {
		weaponFlags: {
			critRange: { type: "String", value: "" },
			critDamage: { type: "String", value: "" },
			quickDesc: { type: "Boolean", get value() { return getQuickDescriptionDefault() }, get altValue() { return getQuickDescriptionDefault() } },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickVersatile: { type: "Boolean", value: false, altValue: false },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			quickCharges: { type: "Boolean", value: {quantity: false, use: false, resource: true}, altValue: {quantity: false, use: false, resource: true} },
			quickTemplate: { type: "Boolean", value: true, altValue: true },
			quickOther: { type: "Boolean", value: true, altValue: true, context: "" },
			quickFlavor: { type: "Boolean", value: true, altValue: true },
			quickPrompt: { type: "Boolean", value: false, altValue: false },
		},
		spellFlags: {
			critRange: { type: "String", value: "" },
			critDamage: { type: "String", value: "" },
			quickDesc: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickVersatile: { type: "Boolean", value: false, altValue: false },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			quickCharges: { type: "Boolean", value: {use: false, resource: true}, altValue: {use: false, resource: true} },
			quickTemplate: { type: "Boolean", value: true, altValue: true },
			quickOther: { type: "Boolean", value: true, altValue: true, context: "" },
			quickFlavor: { type: "Boolean", value: true, altValue: true },
			quickPrompt: { type: "Boolean", value: false, altValue: false },
		},
		equipmentFlags: {
			critRange: { type: "String", value: "" },
			critDamage: { type: "String", value: "" },
			quickDesc: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			quickCharges: { type: "Boolean", value: {quantity: false, use: false, resource: true}, altValue: {quantity: false, use: false, resource: true} },
			quickOther: { type: "Boolean", value: true, altValue: true, context: "" },
			quickFlavor: { type: "Boolean", value: true, altValue: true },
			quickPrompt: { type: "Boolean", value: false, altValue: false },
		},
		featFlags: {
			critRange: { type: "String", value: "" },
			critDamage: { type: "String", value: "" },
			quickDesc: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			// Feats consume uses by default in vanilla 5e
			quickCharges: { type: "Boolean", value: {use: true, resource: true, charge: false}, altValue: {use: true, resource: true, charge: false} },
			quickTemplate: { type: "Boolean", value: true, altValue: true },
			quickOther: { type: "Boolean", value: true, altValue: true, context: "" },
			quickFlavor: { type: "Boolean", value: true, altValue: true },
			quickPrompt: { type: "Boolean", value: false, altValue: false },
		},
		toolFlags: {
			critRange: { type: "String", value: "" },
			quickDesc: { type: "Boolean", get value() { return getQuickDescriptionDefault() }, get altValue() { return getQuickDescriptionDefault() } },
			quickCheck: { type: "Boolean", value: true, altValue: true },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			quickFlavor: { type: "Boolean", value: true, altValue: true },
			quickPrompt: { type: "Boolean", value: false, altValue: false },
		},
		consumableFlags: {
			critRange: { type: "String", value: "" },
			critDamage: { type: "String", value: "" },
			quickDesc: { type: "Boolean", value: true, altValue: true },
			quickAttack: { type: "Boolean", value: true, altValue: true },
			quickSave: { type: "Boolean", value: true, altValue: true },
			quickDamage: { type: "Array", value: [], altValue: [], context: [] },
			quickProperties: { type: "Boolean", value: true, altValue: true },
			// Consumables consume uses by default in vanilla 5e
			quickCharges: { type: "Boolean", value: {quantity: false, use: true, resource: true}, altValue: {quantity: false, use: true, resource: true} },
			quickTemplate: { type: "Boolean", value: true, altValue: true },
			quickOther: { type: "Boolean", value: true, altValue: true, context: "" },
			quickFlavor: { type: "Boolean", value: true, altValue: true },
			quickPrompt: { type: "Boolean", value: false, altValue: false },
		}
	}
};

/**
 * Adds buttons and assign their functionality to the sheet
 * @param {String} triggeringElement - this is the html selector string that opens the description - mostly optional for different sheetclasses
 * @param {String} buttonContainer - this is the html selector string to which the buttons will be prepended - mostly optional for different sheetclasses
 */
export async function addItemSheetButtons(actor, html, data, triggeringElement = '', buttonContainer = '') {
	// Do not modify the sheet if the user does not have permission to use the sheet
	if (actor.permission < 3) { return; }

	// Setting default element selectors
	if (triggeringElement === '') triggeringElement = '.item:not(.magic-item) .item-name h4';
	if (buttonContainer === '') buttonContainer = '.item-properties';

	// adding an event for when the description is shown
	html.find(triggeringElement).click(event => {
		let li = $(event.currentTarget).parents(".item");
		addButtonsToItemLi(li, actor, buttonContainer);
	});

	for (let element of html.find(triggeringElement)) {
		let li = $(element).parents('.item:not(.magic-item)');
		addButtonsToItemLi(li, actor, buttonContainer);
	}
}

/**
 * Helper function for creating roll buttons.
 * @param {Object} button
 * @param {String} button.content - The text to display inside the button.
 * @param {String} button.action - The value of the data-action attribute.
 * @param {(String|Number|null)} [button.value=null] - The value of the data-value attribute.
 */
const createButton = ({ content, action, value = null }) => (
	`<span class="tag">
		<button data-action=${action} ${value == null ? "" : `data-value="${value}"`}>
			${content}
		</button>
	</span>`
)

async function addButtonsToItemLi(li, actor, buttonContainer) {
	const itemId = String(li.attr("data-item-id") ?? "");
	if (!itemId) {
		return;
	}

	const item = actor.getOwnedItem(itemId);
	const itemData = item.data.data;
	const flags = item.data.flags.betterRolls5e;

	// Check settings
	const settings = getSettings();
	const contextEnabled = settings.damageContextPlacement !== "0" ? true : false;

	if (!li.hasClass("expanded")) return;  // this is a way to not continue if the items description is not shown, but its only a minor gain to do this while it may break this module in sheets that dont use "expanded"


	// Create the buttons
	let buttons = $(`<div class="item-buttons"></div>`);
	let buttonsWereAdded = false;

	// TODO: Make the logic in this switch statement simpler.
	switch (item.data.type) {
		case 'weapon':
		case 'feat':
		case 'spell':
		case 'consumable':
			buttonsWereAdded = true;
			buttons.append(
				createButton({ content: i18n("br5e.buttons.roll"), action: "quickRoll" }),
				createButton({ content: i18n("br5e.buttons.altRoll"), action: "altRoll"})
			);

			if (isAttack(item)) {
				buttons.append(
					createButton({ content: i18n("br5e.buttons.attack"), action: "attackRoll"})
				);
			}

			if (isSave(item)) {
				const saveData = ItemUtils.getSave(item);

				buttons.append(
					createButton({
						content: `${i18n("br5e.buttons.saveDC")} ${saveData.dc} ${dnd5e.abilities[saveData.ability]}`,
						action: "save"
					})
				);
			}

			if (itemData.damage.parts.length > 0) {
				buttons.append(
					createButton({ content: i18n("br5e.buttons.damage"), action: "damageRoll", value: "all" })
				);

				if (itemData.damage.versatile) {
					buttons.append(
						createButton({ content: i18n("br5e.buttons.verDamage"), action: "verDamageRoll", value: "all" })
					);
				}

				// Make a damage button for each damage type
				if (itemData.damage.parts.length > 1) {
					buttons.append(`<br>`);

					itemData.damage.parts.forEach(([_, damageType], i) => {
						const damageString =
							(contextEnabled && flags.quickDamage.context[i]) ||
							CONFIG.betterRolls5e.combinedDamageTypes[damageType];

						let content = `${i}: ${damageString}`;

						if (i === 0 && itemData.damage.versatile) {
							content += ` (${dnd5e.weaponProperties.ver})`;
						}

						buttons.append(
							createButton({ content, action: "damageRoll", value: i })
						);
					});
				}
			}

			if (itemData.formula.length > 0) {
				const otherString = contextEnabled && flags.quickOther.context || "br5e.settings.otherFormula";

				buttons.append(
					createButton({ content: otherString, action: "otherFormulaRoll" })
				);
			}

			break;

		case 'tool':
			buttonsWereAdded = true;

			buttons.append(
				createButton({
					content: `${i18n("br5e.buttons.itemUse")} ${item.name}`,
					action: "toolCheck",
					value: itemData.ability.value
				})
			);

			if (itemData.formula && itemData.formula.length > 0) {
				const otherString = (contextEnabled && flags.quickOther.context) || "br5e.settings.otherFormula";

				buttons.append(
					createButton({ content: otherString, action: "otherFormulaRoll" })
				);
			}

			break;
	}

	if (buttonsWereAdded) {
		buttons.append(`<br>`);
	}

	// Add info button
	buttons.append(
		createButton({ content: i18n("br5e.buttons.info"), action: "infoRoll" })
	);

	// Add default roll button
	buttons.append(
		createButton({ content: i18n("br5e.buttons.defaultSheetRoll"), action: "vanillaRoll" })
	);

	if (buttonsWereAdded) {
		buttons.append(`<br><header style="margin-top:6px"></header>`);
	}

	// adding the buttons to the sheet
	const targetHTML = li; //$(event.target.parentNode.parentNode)
	targetHTML.find(buttonContainer).prepend(buttons);

	// adding click event for all buttons
	buttons.find('button').click((ev) => {
		ev.preventDefault();
		ev.stopPropagation();

		// The arguments compounded into an object and an array of fields, to be served to the roll() function as the params and fields arguments
		const params = {forceCrit: ev.altKey, event: ev};
		const fields = [];
		if (params.forceCrit) {
			fields.push([
				"flavor",
				{ text: `${getSettings().critString}` }
			]);
		}

		// Sets the damage roll in the argument to the value of the button
		function setDamage(versatile = false) {
			if (ev.target.dataset.value === "all") {
				fields.push(["damage", { index:"all", versatile:versatile} ]);
			} else {
				fields.push(["damage", { index:Number(ev.target.dataset.value) }]);
			}
		}

		switch (ev.target.dataset.action) {
			case 'quickRoll':
				params.preset = 0; break;
			case 'altRoll':
				params.preset = 1; break;
			case 'attackRoll':
				fields.push(["attack"]); break;
			case 'save':
				fields.push(["savedc"]); break;
			case 'damageRoll':
				setDamage(); break;
			case 'verDamageRoll':
				setDamage(true); params.versatile = true; break;
			case 'toolCheck':
				fields.push(["toolcheck"]); break;
			case 'otherFormulaRoll':
				fields.push(["other"]); break;
			case 'infoRoll':
				fields.push(["desc"]); params.properties = true; break;
			case 'vanillaRoll':
				item.roll({ vanilla: true });
		}

		if (ev.target.dataset.action !== 'vanillaRoll') {
			new CustomItemRoll(item, params, fields).toMessage();
		}
	});
}

/**
 * Replaces the sheet's d20 rolls for ability checks, skill checks, and saving throws into dual d20s.
 * Also replaces the default button on items with a "standard" roll.
 */
export function changeRollsToDual (actor, html, data, params) {
	if (actor && actor.permission < 3) { return; }

	let paramRequests = mergeObject({
			abilityButton: '.ability-name',
			checkButton: '.ability-mod',
			saveButton: '.ability-save',
			skillButton: '.skill-name',
			itemButton: '.item:not(.magic-item) .item-image',
			singleAbilityButton: true
		},params || {});

	function getAbility(target) {
		let ability = null;
		for (let i=0; i <= 3; i++) {
			ability = target.getAttribute("data-ability");
			if (ability) { break; }
			else {
				target = target.parentElement;
			}
		}
		return ability;
	}

	// Assign new action to ability check button
	let abilityName = html.find(paramRequests.abilityButton);
	if (abilityName.length > 0 && paramRequests.singleAbilityButton === true) {
		abilityName.off();
		abilityName.click(event => {
			event.preventDefault();
			const ability = getAbility(event.currentTarget);
			if (event.ctrlKey || event.metaKey) {
				CustomRoll.rollAttribute(actor, ability, "check");
			} else if (event.shiftKey) {
				CustomRoll.rollAttribute(actor, ability, "save");
			} else {
				new Dialog({
					title: `${i18n(dnd5e.abilities[ability])} ${i18n("Ability Roll")}`,
					content: `<p><span style="font-weight: bold;">${i18n(dnd5e.abilities[ability])}:</span> ${i18n("What type of roll?")}</p>`,
					buttons: {
						test: {
							label: i18n("Ability Check"),
							callback: async () => { CustomRoll.rollAttribute(actor, ability, "check"); }
						},
						save: {
							label: i18n("Saving Throw"),
							callback: async () => { CustomRoll.rollAttribute(actor, ability, "save"); }
						}
					}
				}).render(true);
			}
		});
	}

	// Assign new action to ability button
	let checkName = html.find(paramRequests.checkButton);
	if (checkName.length > 0) {
		checkName.off();
		checkName.addClass("rollable");
		checkName.click(async event => {
			event.preventDefault();
			let ability = getAbility(event.currentTarget),
				abl = actor.data.data.abilities[ability],
				params = Utils.eventToAdvantage(event);
			CustomRoll.rollAttribute(actor, ability, "check", params);
		});
	}

	// Assign new action to save button
	let saveName = html.find(paramRequests.saveButton);
	if (saveName.length > 0) {
		saveName.off();
		saveName.addClass("rollable");
		saveName.click(async event => {
			event.preventDefault();
			let ability = getAbility(event.currentTarget),
				abl = actor.data.data.abilities[ability],
				params = Utils.eventToAdvantage(event);
			CustomRoll.rollAttribute(actor, ability, "save", params);
		});
	}

	// Assign new action to skill button
	let skillName = html.find(paramRequests.skillButton);
	if (skillName.length > 0) {
		skillName.off();
		skillName.click(async event => {
			event.preventDefault();
			let params = Utils.eventToAdvantage(event);
			let skill = event.currentTarget.parentElement.getAttribute("data-skill");
			CustomRoll.rollSkill(actor, skill, params);
		});
	}
}

/** Frontend for macros */
export function BetterRolls() {
	async function assignMacro(item, slot, mode) {
		function command() {
			switch (mode) {
				case "name": return `BetterRolls.quickRoll("${item.name}");`;
				case "id": return `BetterRolls.quickRollById("${item.actorId}", "${item.data._id}");`;
				case "vanillaRoll": return `BetterRolls.vanillaRoll("${item.actorId}", "${item.data._id}");`;
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

	// Performs a vanilla roll message, searching the actor and item by ID.
	function vanillaRoll(actorId, itemId) {
		let actor = getActorById(actorId);
		if (!actor) { return ui.notifications.warn(`${i18n("br5e.error.noActorWithId")}`); }
		let item = actor.getOwnedItem(itemId);
		if (!item) { return ui.notifications.warn(`${i18n("br5e.error.noItemWithId")}`); }
		if (actor.permission != 3) { return ui.notifications.warn(`${i18n("br5e.error.noActorPermission")}`); }
		return item.roll({ vanilla: true, event });
	};

	// Performs a Quick Roll, searching for an item in the controlled actor by name.
	function quickRoll(itemName) {
		let speaker = ChatMessage.getSpeaker();
		let actor = getActorById(speaker.actor);
		let item = actor ? actor.items.find(i => i.name === itemName) : null;
		if (!actor) { return ui.notifications.warn(`${i18n("br5e.error.noSelectedActor")}`); }
		else if (!item) { return ui.notifications.warn(`${actor.name} ${i18n("br5e.error.noKnownItemOnActor")} ${itemName}`); }
		return item.roll({ vanilla: false, event });
	};

	// Performs a Quick Roll, searching the actor and item by ID.
	function quickRollById(actorId, itemId) {
		let actor = getActorById(actorId);
		if (!actor) { return ui.notifications.warn(`${i18n("br5e.error.noActorWithId")}`); }
		let item = actor.getOwnedItem(itemId);
		if (!item) { return ui.notifications.warn(`${i18n("br5e.error.noItemWithId")}`); }
		if (actor.permission != 3) { return ui.notifications.warn(`${i18n("br5e.error.noActorPermission")}`); }
		return item.roll({ vanilla: false, event });
	};

	// Performs a Quick Roll, searching the actor and item by name.
	function quickRollByName(actorName, itemName) {
		let actor = getActorByName(actorName);
		if (!actor) { return ui.notifications.warn(`${i18n("br5e.error.noKnownActorWithName")}`); }
		let item = actor.items.find(i => i.name === itemName);
		if (!item) { return ui.notifications.warn(`${actor.name} ${i18n("br5e.error.noKnownItemOnActor")} ${itemName}`); }
		if (actor.permission != 3) { return ui.notifications.warn(`${i18n("br5e.error.noActorPermission")}`); }
		return item.roll({ vanilla: false, event });
	};

	// Returns if an event should have its corresponding Quick Roll be an Alt Roll.
	function isAlt(event) {
		const { altSecondaryEnabled } = getSettings();
		return event && event.altKey && altSecondaryEnabled;
	};

	// Prefer synthetic actors over game.actors to avoid consumables and spells being missdepleted.
	function getActorById(actorId) {
		let actor = canvas.tokens.placeables.find(t => t.actor?._id === actorId)?.actor;
		if (!actor) actor = game.actors.entities.find(a => a._id === actorId);
		return actor;
	}

	// Prefer token actors over game.actors to avoid consumables and spells being missdepleted.
	function getActorByName(actorName) {
		let actor = canvas.tokens.placeables.find(p => p.data.name === actorName)?.actor;
		if (!actor) actor = game.actors.entities.find(e => e.name === actorName);
		return actor;
	}

	Hooks._hooks.hotbarDrop = [(bar, data, slot) => {
		if ( data.type !== "Item" ) return true;
		if (event && event.altKey) { // not using isAlt(event) because it's not related to alternative roll
			assignMacro(data, slot, "vanillaRoll");
		} else {
			assignMacro(data, slot, "id");
		}
		return false;
	}].concat(Hooks._hooks.hotbarDrop || []);

	return {
		version: Utils.getVersion(),
		assignMacro:assignMacro,
		vanillaRoll:vanillaRoll,
		quickRoll:quickRoll,
		quickRollById:quickRollById,
		quickRollByName:quickRollByName,
		addItemContent:addItemContent,
		rollCheck:CustomRoll.rollCheck,
		rollSave:CustomRoll.rollSave,
		rollAbilityCheck:CustomRoll.rollAbilityCheck,
		rollSavingThrow:CustomRoll.rollAbilitySave,
		rollSkill:CustomRoll.rollSkill,
		rollItem:CustomRoll.newItemRoll,
		getRollState: (params) => Utils.getRollState({ event, ...(params ?? {})}),

		// These are still here for compatibility, but will be removed in future versions
		hooks:{
			addActorSheet: () => {
				console.warn("WARNING: BetterRolls.hooks.addActorSheet() is deprecated");
			},
			addItemSheet: () => {
				console.warn("WARNING: BetterRolls.hooks.addItemSheet() is deprecated");
			},
		},
	};
}
