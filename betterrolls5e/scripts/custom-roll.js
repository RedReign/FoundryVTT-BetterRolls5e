import { i18n, isAttack, isSave, isCheck } from "./betterrolls5e.js";
import { DiceCollection, ActorUtils, ItemUtils, Utils } from "./utils.js";
import { Renderer } from "./renderer.js";

/**
 * Roll type for advantage/disadvantage/etc
 * @typedef {"highest" | "lowest" | "first" | null} RollState
 */

/**
 * Parameters used when full rolling an actor
 * @typedef FullRollActorParams
 * @type {object}
 * @property {number?} adv 
 * @property {number?} disadv 
 * @property {number?} critThreshold
 */

import { DND5E } from "../../../systems/dnd5e/module/config.js";
import { BRSettings } from "./settings.js";

let dnd5e = DND5E;
let DEBUG = false;

const blankRoll = new Roll("0").roll(); // Used for CHAT_MESSAGE_TYPES.ROLL, which requires a roll that Better Rolls otherwise does not need

function debug() {
	if (DEBUG) {
		console.log.apply(console, arguments);
	}
}

function createChatData(actor, content, { hasMaestroSound = false, flags={} }={}) {
	return {
		user: game.user._id,
		content: content,
		speaker: {
			actor: actor?._id,
			token: actor?.token,
			alias: actor?.token?.name || actor?.name
		},
		flags: (flags) ? { betterrolls5e: flags } : {},
		type: CONST.CHAT_MESSAGE_TYPES.ROLL,
		roll: blankRoll,
		...Utils.getWhisperData(),
		sound: Utils.getDiceSound(hasMaestroSound)
	};
}

/**
 * Populates a dice pool using a render model or a list of render models
 * @param {import("./renderer.js").RenderModel | Array<import("./renderer.js").RenderModel>} models 
 * @param {DiceCollection} dicePool 
 */
function populateDicePool(models, dicePool) {
	// If this is an array, recursively run on sub entries
	if (models instanceof Array) {
		models.forEach(e => populateDicePool(e, dicePool));
		return;
	}

	if (models.type === "multiroll") {
		dicePool?.push(...models.entries.map(e => e.roll));
	} else if (models.type === "damage") {
		dicePool.push(models.baseRoll, models.critRoll);
	}
}

/**
 * Returns an item and its actor if given an item, or just the actor otherwise.
 * @param {Item | Actor} actorOrItem
 */
function resolveActorOrItem(actorOrItem) {
	if (!actorOrItem) {
		return {};
	}

	if (actorOrItem instanceof Item) {
		return { item: actorOrItem, actor: actorOrItem?.actor };
	} else {
		return { actor: actorOrItem };
	}
}

/**
 * General class for macro support, actor rolls, and most static rolls.
 * It provides utility functions that can be used to create a new roll,
 * as well as the most common Actor roll functions.
 */
export class CustomRoll {
	/**
	 * Returns header data to be used for rendering
	 * @param {object} options
	 * @param {string?} options.img image to show, falls back to item image
	 * @param {string} options.title label, falls back to item name
	 * @param {Item?} options.item
	 * @param {Actor?} options.actor
	 * @param {number?} options.slotLevel
	 * @returns {import("./renderer.js").HeaderDataProps}
	 */
	static constructHeaderData(options={}) {
		const { item, slotLevel } = options;
		const actor = options?.actor ?? item?.actor;
		const img = options.img ?? item?.img ?? ActorUtils.getImage(actor);
		let title = options.title ?? item?.name ?? actor?.name ?? '';
		if (item?.data.type === "spell" && slotLevel && slotLevel != item.data.data.level) {
			title += ` (${dnd5e.spellLevels[slotLevel]})`;
		}

		return { type: "header", img, title };
	}
	
	/**
	 * Constructs multiroll data to be used for rendering
	 * @param {Object} options Roll options used to construct the multiroll.
	 * @param {string?} options.formula formula to use when constructing the multiroll
	 * @param {number?} options.critThreshold minimum roll on the dice to cause a critical roll.
	 * @param {number?} options.numRolls number of rolls to perform
	 * @param {string?} options.title title to display above the roll
	 * @param {RollState?} options.rollState highest or lowest or first or none
	 * @param {string?} options.rollType metadata param for attack vs damage.
	 * @param {boolean?} options.elvenAccuracy whether the actor should apply elven accuracy 
	 * @returns {import("./renderer.js").MultiRollDataProps}
	 */
	static constructMultiRoll(options={}) {
		const { formula, critThreshold, title, rollState, rollType, elvenAccuracy } = options;
		if (!formula) {
			console.error("No formula given for multi-roll");
			return;
		}

		let numRolls = options.numRolls || game.settings.get("betterrolls5e", "d20Mode");
		if (!options.numRolls) {
			if (rollState === "first" && !options.numRolls) {
				numRolls = 1;
			} else if (rollState && numRolls == 1) {
				numRolls = 2;
			}
	
			// Apply elven accuracy
			if (numRolls == 2 && elvenAccuracy && rollState !== "lowest") {
				numRolls = 3;
			}
		}

		const entries = [];
		for (let i = 0; i < numRolls; i++) {
			const roll = new Roll(formula).roll();
			entries.push(Utils.processRoll(roll, critThreshold, [20]));
		}

		// Mark ignored rolls due to advantage/disadvantage
		if (rollState) {
			let rollTotals = entries.map(r => r.roll.total);
			let chosenResult = rollTotals[0];
			if (rollState == "highest") {
				chosenResult = rollTotals.sort(function(a, b){return a-b})[rollTotals.length-1];
			} else if (rollState == "lowest") {
				chosenResult = rollTotals.sort(function(a, b){return a-b})[0];
			}

			// Mark the non-results as ignored
			entries.filter(r => r.roll.total != chosenResult).forEach(r => r.ignored = true);
		}

		const results = {
			type: "multiroll",
			title,
			rollState,
			rollType,
			formula,
			entries,
			isCrit: entries.some(e => !e.ignored && e.isCrit)
		};

		return results;
	}

	/**
	 * 
	 * @param {object} options
	 * @param {string?} options.formula optional formula to use instead of the attack formula
	 * @param {Item?} options.item Item to derive attack formula or roll data from
	 * @param {number?} options.numRolls number of rolls to perform
	 * @param {string?} options.title Alternative title to use
	 * @param {number?} options.critThreshold override
	 * @param {string?} options.abilityMod override for the default item abilty mod
	 * @param {Item?} options.ammo
	 * @param {RollState} options.rollState
	 * @param {number} options.bonus Extra bonus value
	 * @param {number} options.slotLevel 
	 */
	static constructAttackRoll(options={}) {
		const { formula, item, ammo, bonus, rollState, slotLevel } = options;
		const actor = options.actor ?? item?.actor;

		// Get critical threshold
		const critThreshold = options.critThreshold ??
			ItemUtils.getCritThreshold(item) ??
			ActorUtils.getCritThreshold(actor) ??
			20;

		const abilityMod = options.abilityMod ?? ItemUtils.getAbilityMod(item);
		const elvenAccuracy = ActorUtils.testElvenAccuracy(actor, abilityMod);
		const ammoBonus = ammo?.data.data.attackBonus;

		// Get ammo bonus and add to title if title not given
		// Note that "null" is a valid title, so we can't override that
		let title = options.title;
		if (typeof title === 'undefined') {
			title = i18n("br5e.chat.attack");
			if (ammoBonus) {
				title += ` [${ammo.name}]`;
			}
		}

		// Get Formula
		let roll = null;
		if (formula) {
			const rollData = item ?
				ItemUtils.getRollData(item, { abilityMod, slotLevel }) :
				actor?.getRollData();
			roll = new Roll(formula, rollData ?? {});
		} else if (item) {
			roll = ItemUtils.getAttackRoll(item, { abilityMod, ammoBonus, bonus });
		} else {
			return null;
		}

		// Construct the multiroll
		return CustomRoll.constructMultiRoll({
			...options,
			formula: roll.formula,
			rollState,
			title,
			critThreshold,
			elvenAccuracy,
			rollType: "attack"
		});
	}

	/**
	 * Constructs and rolls damage data for a damage entry in an item.
	 * Can roll for an index, versatile (replaces first), or other.
	 * @param {object} options
	 * @param {string} options.formula optional formula to use, higher priority over the item formula
	 * @param {Actor} options.actor
	 * @param {Item} options.item 
	 * @param {number | "versatile" | "other" } options.damageIndex 
	 * @param {number?} options.slotLevel
	 * @param {string?} options.context Optional damage context. Defaults to the configured damage context
	 * @param {string?} options.damageType
	 * @param {string?} options.title title to display. If not given defaults to damage type
	 * @param {boolean?} options.isCrit Whether to roll crit damage
	 * @param {boolean?} options.savage If true/false, sets the savage property. Falls back to using the item if not given, or false otherwise.
	 * @param {boolean?} options.hidden true if damage prompt required, false if damage prompt never
	 * @param {} options.critBehavior
	 * @returns {import("./renderer.js").DamageDataProps}
	 */
	static constructDamageRoll(options={}) {
		const { item, damageIndex, slotLevel, isCrit, hidden } = options;
		const actor = options?.actor ?? item?.actor;
		const isVersatile = damageIndex === "versatile";
		const isFirst = damageIndex === 0 || damageIndex === "versatile";
		const savage = options.savage ?? ItemUtils.appliesSavageAttacks(item);
		const critBehavior = options.critBehavior || BRSettings.critBehavior;

		const rollData =  item ?
			ItemUtils.getRollData(item, { slotLevel }) :
			actor?.getRollData();

		// Bonus parts to add to the formula
		const parts = [];

		// Determine certain fields based on index 
		let title = options.title;
		let context = options.context;
		let damageType = options.damageType;
		let formula = options.formula;

		// If no formula was given, derive from the item
		if (!formula && item) {
			const itemData = item.data.data;
			const flags = item.data.flags.betterRolls5e;

			if (damageIndex === "other") {
				formula = itemData.formula;
				title = title ?? i18n("br5e.chat.other");
				context = context ?? flags.quickOther.context;
			} else {
				// If versatile, use properties from the first entry
				const trueIndex = isFirst ? 0 : damageIndex;

				formula = isVersatile ? itemData.damage.versatile : itemData.damage.parts[trueIndex][0]; 
				damageType = damageType ?? itemData.damage.parts[trueIndex][1];
				context = context ?? flags.quickDamage.context?.[trueIndex];

				// Scale damage if its the first entry
				if (formula && isFirst) {
					formula = ItemUtils.scaleDamage(item, slotLevel, damageIndex, isVersatile, rollData) || formula;
				}

				// Add any roll bonuses but only to the first entry
				if (isFirst && rollData.bonuses && isAttack(item)) {
					let actionType = `${itemData.actionType}`;
					if (rollData.bonuses[actionType].damage) {
						parts.unshift(rollData.bonuses[actionType].damage);
					}
				}
			}
		}

		// Require a formula to continue
		if (!formula) { 
			return null;
		}

		// Assemble roll data and defer to the general damage construction
		const rollFormula = [formula, ...parts].join("+");
		const baseRoll = new Roll(rollFormula, rollData).roll();
		const total = baseRoll.total;

		// Roll crit damage if relevant
		let critRoll = null;
		if (damageIndex !== "other") {
			if (isCrit && critBehavior !== "0") {
				critRoll = ItemUtils.getCritRoll(baseRoll.formula, total, { critBehavior, savage });
			}
		}

		return {
			type: "damage",
			title: options.title ?? title,
			damageType,
			context,
			baseRoll,
			critRoll,
			hidden,
			isVersatile: isVersatile ?? false
		};
	}

	/**
	 * Creates multiple item damage rolls. This returns an array,
	 * so when adding to a model list, add them separately or use the splat operator.
	 * @param {object} options Remaining options that get funneled to createDamageRoll.
	 * @param {*} options.item 
	 * @param {number[] | "all" | number} options.index one more or damage indices to roll for.
	 * @param {boolean?} options.versatile should the first damage entry be replaced with versatile
	 * @returns {import("./renderer.js").DamageDataProps[]}
	 */
	static constructItemDamageRange(options={}) {
		let index = options.index;
		const { formula, item } = options;
		
		// If formula is given or there is a single index, fallback to the singular function
		if (formula || Number.isInteger(index) || !index) {
			let damageIndex = Number.isInteger(index) ? Number(index) : options.damageIndex;
			if (index === 0 && options.versatile) {
				damageIndex = "versatile";
			}

			if (!formula && damageIndex == null) {
				console.error("BetterRolls | Missing damage index on item range roll...invalid data");
				return [];
			}

			return [CustomRoll.constructDamageRoll({ ...options, damageIndex })].filter(d => d);
		}

		const wasAll = index === "all";

		// If all, damage indices between a sequential list from 0 to length - 1
		if (index === "all") {
			const numEntries = item.data.data.damage.parts.length;
			index = [...Array(numEntries).keys()];
		}

		// If versatile, replace any "first" entry (only those)
		if (options.versatile && wasAll) {
			index = index.map(i => i === 0 ? "versatile" : i);
		}

		return index.map(i => { 
			return CustomRoll.constructDamageRoll({...options, item, damageIndex: i});
		}).filter(d => d);
	}

	/**
	 * Generates the html for a save button to be inserted into a chat message. Players can click this button to perform a roll through their controlled token.
	 * @returns {import("./renderer.js").ButtonSaveProps}
	 */
	static constructSaveButton({ item, abl = null, dc = null}) {
		const actor = item?.actor;
		const saveData = ItemUtils.getSave(item);
		if (abl) { saveData.ability = abl; }
		if (dc) { saveData.dc = dc; }

		// Determine whether the DC should be hidden
		const hideDCSetting = BRSettings.hideDC;
		const hideDC = (hideDCSetting == "2" || (hideDCSetting == "1" && actor.data.type == "npc"));
		
		return { type: "button-save", hideDC, ...saveData };
	}

	/**
	 * Sends a chat message using the given models, that can be created using
	 * the CustomRoll.constructX() methods.
	 * @param {*} actor 
	 * @param {import("./renderer.js").RenderModel[]} models 
	 * @param {object} param3
	 * @param {Item?} param3.item Optional Item to put in the card props and to use for certain defaults.
	 * @param {string[]?} param3.properties List of properties to show at the bottom. Uses item properties if null.
	 * @param {boolean} param3.isCrit If the card should be labeled as a crit in the properties
	 * @param {object} param3.builder The class used to build the chat message (CustomItemRoll usually)
	 */
	static async sendChatMessage(actor, models, { item=null, properties=null, isCrit=null, damagePromptEnabled=null, builder=null }={}) {
		const hasMaestroSound = item && ItemUtils.hasMaestroSound(item);
		const flags = {};

		// If any models are promises, await on them
		models = await Promise.all(models);

		// If damage buttons need to show, we need to hide damage entries under certain conditions
		if (damagePromptEnabled ?? BRSettings.damagePromptEnabled) {
			let group = -1;
			flags.damageDicePools = {};

			// Assign groups
			for (const model of models) {
				if (!model) continue;

				if (["multiroll", "button-save"].includes(model.type)) {
					group++;
				} else if (model.type === "damage") {
					// Damage entries are only prompted after attacks/saves
					if (group < 0) continue;

					model.hidden = model.hidden ?? true;
					if (model.hidden) {
						model.group = `br!${group}`;
					}
				}
			}

			// Insert damage buttons before all damage entries
			const oldModels = models;
			models = [];
			const injectedGroups = new Set();
			for (const model of oldModels) {
				if (model.type === "damage" && model.hidden && !injectedGroups.has(model.group)) {
					injectedGroups.add(model.group);
					models.push({
						type: "button-damage",
						group: model.group
					});
				}
				models.push(model);
			}

			// Create dicepools of all hidden dice entries
			const dicePools = {};
			for (const model of models.filter(m => m.type === "damage" && m.hidden)) {
				if (!dicePools[model.group]) {
					dicePools[model.group] = new DiceCollection();
				}
				dicePools[model.group].push(model.baseRoll, model.critRoll);
			}
			
			// Push dicepools into flags
			for (const [group, pool] of Object.entries(dicePools)) {
				flags.damageDicePools[group] = pool.pool;
			}
		}

		// Render the models
		const templates = await Promise.all(models.map(Renderer.renderModel));
		const content = await Renderer.renderCard(templates, { actor, item, properties, isCrit });
		
		// Output the rolls to chat
		const dicePool = new DiceCollection();
		populateDicePool(models.filter(e => !e?.hidden), dicePool);
		await dicePool.flush();

		// Create the chat message
		const chatData = createChatData(actor, content, { hasMaestroSound, flags });
		if (builder) {
			await Hooks.callAll("messageBetterRolls", builder, chatData);
		}

		// Send the chat message
		return ChatMessage.create(chatData);
	}
	
	/**
	 * Converts {args, disadv} params into a roll state object
	 * @param {*} args
	 * @returns {RollState} 
	 */
	static getRollState(args) {
		if (!args) {
			return null;
		}

		let adv = args.adv || 0;
		let disadv = args.disadv || 0;
		if (adv > 0 || disadv > 0) {
			if (adv > disadv) { return "highest"; }
			else if (adv < disadv) { return "lowest"; }
		} else { return null; }
	}
	
	// Returns an {adv, disadv} object when given an event
	static async eventToAdvantage(ev, itemType) {
		if (ev.shiftKey) {
			return {adv:1, disadv:0};
		} else if ((keyboard.isCtrl(ev))) {
			return {adv:0, disadv:1};
		} else if (game.settings.get("betterrolls5e", "queryAdvantageEnabled")) {
			// Don't show dialog for items that aren't tool or weapon.
			if (itemType != null && !itemType.match(/^(tool|weapon)$/)) {
				return {adv:0, disadv:0};
			}
			return new Promise(resolve => {
				new Dialog({
					title: i18n("br5e.querying.title"),
					buttons: {
						disadvantage: {
							label: i18n("br5e.querying.disadvantage"),
							callback: () => resolve({adv:0, disadv:1})
						},
						normal: {
							label: i18n("br5e.querying.normal"),
							callback: () => resolve({adv:0, disadv:0})
						},
						advantage: {
							label: i18n("br5e.querying.advantage"),
							callback: () => resolve({adv:1, disadv:0})
						}
					}
				}).render(true);
			});
		} else {
			return {adv:0, disadv:0};
		}
	}

	/**
	 * Internal method to perform a basic actor full roll of "something".
	 * It creates and display a chat message on completion.
	 * @param {Actor} actor The actor being rolled for 
	 * @param {string} title The title to show on the header card
	 * @param {string} formula The formula to multiroll
	 * @param {string} rollType 
	 * @param {FullRollActorParams} params 
	 */
	static async fullRollActor(actor, title, formula, rollType, params) {		
		// Entries to show for the render
		return CustomRoll.sendChatMessage(actor, [
			CustomRoll.constructHeaderData({ actor, title }),
			CustomRoll.constructMultiRoll({
				formula,
				rollState: CustomRoll.getRollState(params), 
				critThreshold: params?.critThreshold,
				rollType
			})
		]);
	}
	
	/**
	 * Creates and displays a chat message to show a full skill roll
	 * @param {*} actor 
	 * @param {string} skill shorthand referring to the skill name
	 * @param {FullRollActorParams} params parameters
	 */
	static async fullRollSkill(actor, skill, params={}) {
		const label = i18n(dnd5e.skills[skill]);
		const formula = ActorUtils.getSkillCheckRoll(actor, skill).formula;
		return CustomRoll.fullRollActor(actor, label, formula, "skill", params);
	}

	/**
	 * Rolls a skill check for an actor
	 * @param {*} actor 
	 * @param {string} ability Ability shorthand 
	 * @param {FullRollActorParams} params 
	 */
	static async rollCheck(actor, ability, params) {
		return await CustomRoll.fullRollAttribute(actor, ability, "check", params);
	}
	
	/**
	 * Rolls a saving throw for an actor
	 * @param {*} actor 
	 * @param {string} ability Ability shorthand 
	 * @param {FullRollActorParams} params 
	 */
	static async rollSave(actor, ability, params) {
		return await CustomRoll.fullRollAttribute(actor, ability, "save", params);
	}
	
	/**
	 * Creates and displays a chat message with the requested ability check or saving throw.
	 * @param {Actor5e} actor		The actor object to reference for the roll.
	 * @param {String} ability		The ability score to roll.
	 * @param {String} rollType		String of either "check" or "save"
	 * @param {FullRollActorParams} params
	 */
	static async fullRollAttribute(actor, ability, rollType, params={}) {
		const label = dnd5e.abilities[ability];

		let titleString;
		let formula = "";
		if (rollType === "check") {
			formula = ActorUtils.getAbilityCheckRoll(actor, ability).formula;
			titleString = `${i18n(label)} ${i18n("br5e.chat.check")}`;
		} else if (rollType === "save") {
			formula = ActorUtils.getAbilitySaveRoll(actor, ability).formula;
			titleString = `${i18n(label)} ${i18n("br5e.chat.save")}`;
		}

		return CustomRoll.fullRollActor(actor, titleString, formula, rollType, params);
	}
	
	static newItemRoll(item, params, fields) {
		return new CustomItemRoll(item, params, fields);
	}
}

let defaultParams = {
	title: "",
	forceCrit: false,
	preset: false,
	properties: true,
	slotLevel: null,
	useCharge: {},
	useTemplate: false,
	event: null,
	adv: 0,
	disadv: 0,
};

/*
	CustomItemRoll(item,
	{
		forceCrit: false,
		quickRoll: false,
		properties: true,
		slotLevel: null,
		useCharge: {},
		useTemplate: false,
		adv: 0,
		disadv: 0,
	},
	[
		["attack", {triggersCrit: true}],
		["damage", {index:0, versatile:true}],
		["damage", {index:[1,2,4]}],
	]
	).toMessage();
*/

// A custom roll with data corresponding to an item on a character's sheet.
export class CustomItemRoll {
	constructor(actorOrItem, params, fields) {
		const { item, actor } = resolveActorOrItem(actorOrItem);
		this.item = item;
		this.actor = actor;
		this.itemFlags = item?.data.flags;

		this.params = mergeObject(duplicate(defaultParams), params || {});	// General parameters for the roll as a whole.
		this.fields = fields ?? [];	// Where requested roll fields are stored, in the order they should be rendered.

		/** @type {Array<import("./renderer.js").RenderModel>} */
		this.models = [];		// Data results from fields, which get turned into templates
		
		this.rolled = false;
		this.isCrit = this.params.forceCrit || false;			// Defaults to false, becomes "true" when a valid attack or check first crits.
		this.params.event = this.params.event || event;
		this.config = BRSettings.serialize();

		// Add adv/disadv flags to the params
		const modifiers = Utils.getEventRollModifiers(this.params.event);
		this.params = mergeObject(this.params, modifiers);
	}
	
	/**
	 * Returns configured roll state for this roll, allowing object params
	 * to override it. Prioritizes rollState override, then adv/disadv override, then the native settings.
	 * @param {object} extraParams
	 * @param {RollState} extraParams.rollState highest priority override
	 * @param {number} extraParams.adv override to set advantage
	 * @param {number} extraParams.disadv override to set disadvantage
	 * @returns {RollState}
	 */
	getRollState(extraParams={}) {
		if (extraParams.rollState) {
			return extraParams.rollState;
		}

		if (extraParams.adv || extraParams.disadv) {
			const { adv, disadv } = extraParams;
			return CustomRoll.getRollState({ adv, disadv });
		} else {
			const { adv, disadv } = this.params ?? {};
			return this.rollState ?? CustomRoll.getRollState({ adv, disadv });
		} 
	}
	
	/**
	 * Internal function to process fields and populate the internal data.
	 * Call toMessage() to create the final chat message and show the result
	 */
	async roll() {
		if (this.rolled) {
			console.log("Already rolled!", this);
			return;
		}

		const { params, item } = this;
		
		await ItemUtils.ensureFlags(item, { commit: true });
		const actor = this.actor ?? item?.actor;
		const itemData = item?.data.data;
		
		Hooks.call("preRollItemBetterRolls", this);
		
		if (Number.isInteger(params.preset)) {
			this.updateForPreset();
		}

		let lvl, consume, placeTemplate;

		if (item) {
			// Set ammo (if needed)
			if (this.params.useCharge.resource) {
				const consume = itemData.consume;
				if ( consume?.type === "ammo" ) {
					this.ammo = this.actor.items.get(consume.target);
				}
			}
			
			// Determine spell level and configuration settings
			if (!params.slotLevel && item.data.type === "spell") {
				const config = await this.configureSpell();
				if (config === "error") { return "error"; }

				({lvl, consume, placeTemplate } = config);
				params.slotLevel = lvl;
			}
		}

		// Convert all requested fields into templates to be entered into the chat message.
		this.models = this._processFields();
		
		// Load Item Footer Properties if params.properties is true
		this.properties = (params.properties) ? ItemUtils.getPropertyList(item) : [];
		
		if (item) {
			// Check to consume charges. Prevents the roll if charges are required and none are left.
			let chargeCheck = await this.consumeCharge();
			if (chargeCheck === "error") {
				this.error = true;
				return;
			}

			if (placeTemplate || (params.useTemplate && (item.data.type == "feat" || item.data.data.level == 0))) {
				ItemUtils.placeTemplate(item);
			}
		}
		
		this.rolled = true;
		
		await Hooks.callAll("rollItemBetterRolls", this);
		await new Promise(r => setTimeout(r, 25));
		
		if (chargeCheck === "destroy") {
			await actor.deleteOwnedItem(item.id);
		}
	}

	/**
	 * @param {*} field
	 * @deprecated
	 */
	fieldToTemplate(field) {
		return this.addField(field);
	}

	/**
	 * Adds to the list of fields, and if already rolled, processes it immediately
	 * @param {[string, Object]} field
	 */
	addField(field) {
		this.fields.push(field);
		if (this.rolled) {
			return this._processField(field);
		}
	}

	/**
	 * Function that immediately processes and renders a given field
	 * @param {[string, Object]} field
	 * @private
	 */
	_processField(field) {
		let [fieldType, data] = field;
		data = mergeObject({
			item: this.item,
			actor: this.actor,
			rollState: this.getRollState(data),
			ammo: this.ammo,
			slotLevel: this.params.slotLevel,
			isCrit: this.isCrit
		}, data ?? {}, { recursive: false});

		const item = data?.item;

		switch (fieldType) {
			case 'header':
				return this._handleHeaderField(data);
			case 'attack':
				return this._handleAttackField(data);
			case 'toolcheck':
			case 'tool':
			case 'check':
				return this._handleToolField(data);
			case 'damage':
				return this._handleDamageField(data);
			case 'ammo':
				return this._handleAmmoField(data);
			case 'savedc':
				// {customAbl: null, customDC: null}
				this.models.push(CustomRoll.constructSaveButton(data));
				break;
			case 'other':
				return this._handleDamageField({ ...data, damageIndex: "other" })
			case 'custom':
				return this._handleCustom(data);
			case 'description':
			case 'desc':
				// Display info from Components module
				let componentField = "";
				if (game.modules.get("components5e") && game.modules.get("components5e").active) {
					componentField = window.ComponentsModule.getComponentHtml(item, 20);
				}
				data = {text: `${componentField}${item.data.data.description.value ?? ''}`.trim()};
			case 'text':
				if (data.text) {
					this.models.push({
						type: "description",
						content: data.text
					});
				}
				break;
			case 'flavor':
				const message = data?.text ?? this.item.data.data.chatFlavor;
				if (message) {
					this.models.push({
						type: "description",
						isFlavor: true,
						content: message
					});
				}
				break;
			case 'crit':
				return this._handleCritExtraField(data);
		}
	}

	/**
	 * Processes all fields, building a collection of models and returning them
	 */
	_processFields() {
		for (const field of this.fields) {
			this._processField(field);
		}

		const hasDamage = this.models.some(m => m.type === "damage");
		if (this.isCrit && hasDamage && this.item?.data.flags.betterRolls5e?.critDamage?.value) {
			this._processField(["crit"]);
		}

		return this.models;
	}
	
	/**
	 * Creates and sends a chat message to all players (based on whisper settings).
	 * If not already rolled and rendered, roll() is called first.
	 */
	async toMessage() {
		if (!this.rolled) {
			await this.roll();
		}

		if (this.error) return;

		// Render and send the chat message
		const { item, isCrit, properties } = this;
		const actor = this?.actor ?? item;
		return await CustomRoll.sendChatMessage(actor, this.models, { 
			item,
			isCrit,
			properties,
			builder: this
		});
	}
	
	/**
	 * Updates the rollRequests based on the br5e flags.
	 */
	updateForPreset() {
		let item = this.item,
			itemData = item.data.data,
			flags = item.data.flags,
			brFlags = flags.betterRolls5e,
			preset = this.params.preset,
			properties = false,
			useCharge = {},
			useTemplate = false,
			fields = [],
			val = (preset === 1) ? "altValue" : "value";
		
		fields.push(["header"]);
		
		if (brFlags) {
			// Assume new action of the button based on which fields are enabled for Quick Rolls
			function flagIsTrue(flag) {
				return (brFlags[flag] && (brFlags[flag][val] == true));
			}

			function getFlag(flag) {
				return (brFlags[flag] ? (brFlags[flag][val]) : null);
			}
			
			if (flagIsTrue("quickFlavor") && itemData.chatFlavor) { fields.push(["flavor"]); }
			if (flagIsTrue("quickDesc")) { fields.push(["desc"]); }
			if (flagIsTrue("quickAttack") && isAttack(item)) { fields.push(["attack"]); }
			if (flagIsTrue("quickCheck") && isCheck(item)) { fields.push(["check"]); }
			if (flagIsTrue("quickSave") && isSave(item)) { fields.push(["savedc"]); }
			
			if (brFlags.quickDamage && (brFlags.quickDamage[val].length > 0)) {
				for (let i = 0; i < brFlags.quickDamage[val].length; i++) {
					const versatile = (i == 0) && flagIsTrue("quickVersatile");
					if (brFlags.quickDamage[val][i]) { 
						fields.push(["damage", { index:i, versatile }]);
					}
				}

				// Roll ammo after damage (if any)
				fields.push(["ammo"]);
			}

			if (flagIsTrue("quickOther")) { fields.push(["other"]); }
			if (flagIsTrue("quickProperties")) { properties = true; }

			if (brFlags.quickCharges) {
				useCharge = duplicate(getFlag("quickCharges"));
			}
			if (flagIsTrue("quickTemplate")) { useTemplate = true; }
		} else { 
			//console.log("Request made to Quick Roll item without flags!");
			fields.push(["desc"]);
			properties = true;
		}
		
		this.params = mergeObject(this.params, {
			properties,
			useCharge,
			useTemplate,
		});

		console.log(this.params);
		
		this.fields = fields.concat((this.fields || []).slice());
	}

	_handleHeaderField(field) {
		this.models.push(CustomRoll.constructHeaderData(field));
	}

	/**
	 * Rolls attack governed by the given field data,
	 * adding the data to the list of models.
	 * @private
	 */
	_handleAttackField(data) {
		// {adv, disadv, bonus, triggersCrit, critThreshold}
		const attack = CustomRoll.constructAttackRoll(data);
		if (attack) {
			if (data?.triggersCrit ?? true) {
				this.isCrit = attack.isCrit;
			}
			
			this.models.push(attack);
		}
	}

	/**
	 * Rolls an item proficiency check governed by the given field data,
	 * adding the data to the list of models.
	 * @private
	 */
	_handleToolField(data) {
		const formula = data.formula ?? ItemUtils.getToolRoll(data.item, data.bonus).formula;
		const tool = CustomRoll.constructMultiRoll({
			...data,
			formula,
			title: data.title || i18n("br5e.chat.check")
		});

		if (data.triggersCrit ?? true) {
			this.isCrit = tool.isCrit;
		}

		this.models.push(tool);
	}

	/**
	 * Rolls item or formula damage governed by the given field data,
	 * adding the data to the list of models.
	 * @private
	 */
	_handleDamageField(data) {
		const damage = CustomRoll.constructItemDamageRange(data);
		this.models.push(...damage);
	}

	/**
	 * Rolls item or formula damage data governed by the given field data for the ammo property,
	 * adding the data to the list of models.
	 * @private
	 */
	_handleAmmoField(data) {
		if (!data.ammo) return;

		this._handleDamageField({
			item: data.ammo,
			index: "all",
			isCrit: data.crit,
			context: `[${data.ammo.name}]`
		});
	}

	/**
	 * Rolls crit extra damage for the given item data and adds it to the list of models.
	 * @private
	 */
	_handleCritExtraField(props={}) {
		const { item } = props;
		let damageIndex = props.damageIndex ??
			item?.data.flags.betterRolls5e?.critDamage?.value;
		if (damageIndex) {
			this._handleDamageField({ item, damageIndex:Number(damageIndex) });
		}
	}

	/**
	 * TODO: Consider removing this? What's it for?
	 * @param {*} args
	 * @private 
	 */
	_handleCustom(args) {
		/* args:
				title			title of the roll
				formula			the roll formula
				rolls			number of rolls
				rollState		"adv" or "disadv" converts to "highest" or "lowest"
		*/
		let rollStates = {
			null: null,
			"adv": "highest",
			"disadv": "lowest"
		};
		
		const { rolls, formula, rollState } = args;
		let rollData = ItemUtils.getRollData(this.item);
		const resolvedFormula = new Roll(formula, rollData).formula;
		this.models.push(CustomRoll.constructMultiRoll({
			formula: resolvedFormula || "1d20",
			numRolls: rolls || 1,
			rollState: rollStates[rollState],
			rollType: "custom",
		}));
	}
	
	async configureSpell() {
		let item = this.item;
		let actor = item.actor;
		let lvl = null;
		let consume = false;
		let placeTemplate = false;
		let isPact = false;
		
		// Only run the dialog if the spell is not a cantrip
		if (item.data.data.level > 0) {
			try {
				console.log("level > 0")
				window.PH = {};
				window.PH.actor = actor;
				window.PH.item = item;
				const spellFormData = await game.dnd5e.applications.AbilityUseDialog.create(item);
				lvl = spellFormData.level;
				consume = Boolean(spellFormData.consumeSlot);
				placeTemplate = Boolean(spellFormData.placeTemplate);
			}
			catch(error) { return "error"; }
		}
		
		if (lvl == "pact") {
			isPact = true;
			lvl = getProperty(actor, `data.data.spells.pact.level`) || lvl;
		}
		
		if (lvl !== item.data.data.level) {
			item = item.constructor.createOwned(mergeObject(duplicate(item.data), {"data.level": lvl}, {inplace: false}), actor);
		}
		
		// Update Actor data to deduct spell slots
		// Will eventually be removed once all consumptions move to use the new Item._getUsageUpdates() in a later release
		if (consume && (lvl !== 0)) {
			let spellSlot = isPact ? "pact" : "spell"+lvl;
			const slots = parseInt(actor.data.data.spells[spellSlot].value);
			if (slots === 0 || Number.isNaN(slots)) {
				const label = game.i18n.localize(spellSlot === "pact" ? "DND5E.SpellProgPact" : `DND5E.SpellLevel${lvl}`);
				ui.notifications.warn(game.i18n.format("DND5E.SpellCastNoSlots", {name: item.name, level: label}));
				return "error";
			}
			await actor.update({
				[`data.spells.${spellSlot}.value`]: Math.max(parseInt(actor.data.data.spells[spellSlot].value) - 1, 0)
			});
		}
		
		return { lvl, consume, placeTemplate };
	}
	
	/**
	 * Consumes charges & resources assigned on an item.
	 * NOTE: As of D&D System 1.2, all of this can now be handled internally by Item._handleConsumeResource.
	 * This was tweaked to support 1.2, but we are waiting and seeing before moving everything over.
	 * We might no longer need specialized use/consume code.
	 * That function also handles spell slot updates, so we will need slot consumption from configureSpell()
	 */
	async consumeCharge() {
		const { item, actor } = this;
		if (!item) return;

		const itemData = item.data.data;
		const hasUses = !!(itemData.uses?.value || itemData.uses?.max); // Actual check to see if uses exist on the item, even if params.useCharge.use == true
		const hasResource = !!(itemData.consume?.target); // Actual check to see if a resource is entered on the item, even if params.useCharge.resource == true

		const request = this.params.useCharge; // Has bools for quantity, use, resource, and charge
		const recharge = itemData.recharge || {};
		const uses = itemData.uses || {};
		const autoDestroy = uses.autoDestroy;
		const current = uses.value || 0;
		const remaining = request.use ? Math.max(current - 1, 0) : current;
		const q = itemData.quantity;

		const actorUpdates = {};
		const itemUpdates = {};
		const resourceUpdates = {};

		let output = "success";

		// Check for consuming uses, but not quantity
		if (hasUses && request.use && !request.quantity) {
			if (!current) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming quantity, but not uses
		if (request.quantity && !request.use) {
			if (!q) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming quantity and uses
		if (hasUses && request.use && request.quantity) {
			if (!current && q <= 1) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming charge ("Action Recharge")
		if (request.charge) {
			if (!recharge.charged) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming resource. The results are in resourceUpdates
		if (hasResource && request.resource) {
			const allowed = await item._handleConsumeResource(itemUpdates, actorUpdates, resourceUpdates);
			if (allowed === false) { return "error"; }
		}

		// Handle uses, but not quantity
		if (hasUses && request.use && !request.quantity) {
			itemUpdates["data.uses.value"] = remaining;
		}
		
		// Handle quantity, but not uses
		else if (request.quantity && !request.use) {
			if (q <= 1 && autoDestroy) {
				output = "destroy";
			}
			itemUpdates["data.quantity"] = q - 1;
		}

		// Handle quantity and uses
		else if (hasUses && request.use && request.quantity) {
			let remainingU = remaining;
			let remainingQ = q;
			console.log(remainingQ, remainingU);
			if (remainingU < 1) {
				remainingQ -= 1;
				ui.notifications.warn(game.i18n.format("br5e.error.autoDestroy", {name: item.name}));
				if (remainingQ >= 1) {
					remainingU = itemData.uses.max || 0;
				} else { remainingU = 0; }
				if (remainingQ < 1 && autoDestroy) { output = "destroy"; }
			}

			itemUpdates["data.quantity"] = Math.max(remainingQ,0);
			itemUpdates["data.uses.value"] = Math.max(remainingU,0);
		}

		// Handle charge ("Action Recharge")
		if (request.charge) {
			itemUpdates["data.recharge.charged"] = false;
		}

		if (!isObjectEmpty(itemUpdates)) await item.update(itemUpdates);
		if (!isObjectEmpty(actorUpdates)) await actor.update(actorUpdates);

		if (!isObjectEmpty(resourceUpdates)) {
			const resource = actor.items.get(itemData.consume?.target);
			if (resource) await resource.update(resourceUpdates);
		}

		return output;
	}
}
