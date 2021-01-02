import { dnd5e, i18n, ActorUtils, ItemUtils, Utils } from "./utils.js";
import { BRSettings, getSettings } from "./settings.js";

/**
 * Roll type for advantage/disadvantage/etc
 * @typedef {"highest" | "lowest" | "first" | null} RollState
 */

/**
 * Provides utility functions that can be used to create model elements
 * for new rolls.
 */
export class RollFields {
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
	 * @param {number?} options.critThreshold optional minimum roll on the dice to cause a critical roll.
	 * @param {number?} options.numRolls number of rolls to perform
	 * @param {string?} options.title title to display above the roll
	 * @param {RollState?} options.rollState highest or lowest or first or none
	 * @param {string?} options.rollType metadata param for attack vs damage.
	 * @param {boolean?} options.elvenAccuracy whether the actor should apply elven accuracy
	 * @param {BRSettings} options.settings additional settings to override
	 * @returns {import("./renderer.js").MultiRollDataProps}
	 */
	static constructMultiRoll(options={}) {
		const { formula, critThreshold, title, rollState, rollType, elvenAccuracy } = options;
		if (!formula) {
			console.error("No formula given for multi-roll");
			return;
		}

		let numRolls = options.numRolls || getSettings(options.settings).d20Mode;
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
		
		// Split the D20 and bonuses. We assume the first is a d20 roll always...
		const fullRoll = new Roll(formula);
		const baseRoll = new Roll(fullRoll.terms[0].formula ?? fullRoll.terms[0]);
		const bonusRoll = new Roll([...fullRoll.terms.slice(1).map(t => t.formula ?? t)].join(' ')).roll();

		// Populate the roll entries
		const entries = [];
		try {
			for (let i = 0; i < numRolls; i++) {
				entries.push(Utils.processRoll(baseRoll.reroll(), critThreshold, [20], bonusRoll));
			}
		} catch (err) {
			ui.notifications.error(i18n("br5e.error.rollEvaluation", { msg: err.message}));
			throw err; // propagate the error
		}

		// Mark ignored rolls due to advantage/disadvantage
		if (rollState) {
			let rollTotals = entries.map(r => r.roll.total);
			let chosenResult = rollTotals[0];
			if (rollState == "highest") {
				chosenResult = Math.max(...rollTotals);
			} else if (rollState == "lowest") {
				chosenResult = Math.min(...rollTotals);
			}

			// Mark the non-results as ignored
			entries.filter(r => r.roll.total != chosenResult).forEach(r => r.ignored = true);
		}

		const results = {
			type: "multiroll",
			title,
			critThreshold,
			elvenAccuracy,
			rollState,
			rollType,
			formula,
			entries,
			isCrit: entries.some(e => !e.ignored && e.isCrit),
			bonus: bonusRoll
		};

		return results;
	}

	/**
	 * 
	 * @param {object} options
	 * @param {string?} options.formula optional formula to use instead of the attack formula
	 * @param {Actor?} options.actor Actor to derive roll data from if item is not given
	 * @param {Item?} options.item Item to derive attack formula or roll data from
	 * @param {"weapon" | "spell" | undefined} options.itemType Type of attack. Used if item is null.
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
			ActorUtils.getCritThreshold(actor, options.itemType) ??
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

		// Get Roll. Use Formula if given, otherwise get it from the item
		let roll = null;
		if (formula) {
			const rollData = Utils.getRollData({item, actor, abilityMod, slotLevel });
			roll = new Roll(formula, rollData);
		} else if (item) {
			roll = ItemUtils.getAttackRoll(item, { abilityMod, ammoBonus, bonus });
		} else {
			return null;
		}

		// Construct the multiroll
		return RollFields.constructMultiRoll({
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
	 * @param {number | "versatile" | "other"} options.damageIndex 
	 * @param {number?} options.slotLevel
	 * @param {string?} options.context Optional damage context. Defaults to the configured damage context
	 * @param {string?} options.damageType
	 * @param {string?} options.title title to display. If not given defaults to damage type
	 * @param {boolean?} options.isCrit Whether to roll crit damage
	 * @param {boolean?} options.extraCritDice sets the savage property. Falls back to using the item if not given, or false otherwise.
	 * @param {boolean?} options.hidden true if damage prompt required, false if damage prompt never
	 * @param {BRSettings} options.settings Override config to use for the roll
	 * @returns {import("./renderer.js").DamageDataProps}
	 */
	static constructDamageRoll(options={}) {
		const { item, damageIndex, slotLevel, isCrit, hidden } = options;
		const actor = options?.actor ?? item?.actor;
		const isVersatile = damageIndex === "versatile";
		const isFirst = damageIndex === 0 || isVersatile;
		const extraCritDice = options.extraCritDice ?? ItemUtils.getExtraCritDice(item);
		
		const settings = getSettings(options.settings);
		const { critBehavior } = settings;

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
				if (isFirst && rollData.bonuses) {
					const actionType = `${itemData.actionType}`;
					const bonus = rollData.bonuses[actionType]?.damage;
					if (bonus && (parseInt(bonus) !== 0)) {
						parts.unshift(bonus);
					}
				}
			}
		}

		// Require a formula to continue
		if (!formula) { 
			return null;
		}

		// Assemble roll data and defer to the general damage construction
		try {
			const rollFormula = [formula, ...parts].join("+");
			const baseRoll = new Roll(rollFormula, rollData).roll();
			const total = baseRoll.total;

			// Roll crit damage if relevant
			let critRoll = null;
			if (damageIndex !== "other") {
				if (isCrit && critBehavior !== "0") {
					critRoll = ItemUtils.getCritRoll(baseRoll.formula, total, { settings, extraCritDice });
				}
			}

			return {
				type: "damage",
				damageIndex,
				title: options.title ?? title,
				damageType,
				context,
				extraCritDice,
				baseRoll,
				critRoll,
				hidden,
				isVersatile: isVersatile ?? false
			};
		} catch (err) {
			ui.notifications.error(i18n("br5e.error.rollEvaluation", { msg: err.message}));
			throw err; // propagate the error
		}
	}

	/**
	 * Creates multiple item damage rolls. This returns an array,
	 * so when adding to a model list, add them separately or use the splat operator.
	 * @param {object} options Remaining options that get funneled to createDamageRoll.
	 * @param {*} options.item 
	 * @param {number[] | "all" | number} options.index one more or damage indices to roll for.
	 * @param {boolean?} options.versatile should the first damage entry be replaced with versatile
	 * @param {BRSettings} options.settings Override settings to use for the roll
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

			return [RollFields.constructDamageRoll({ ...options, damageIndex })].filter(d => d);
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
			return RollFields.constructDamageRoll({...options, item, damageIndex: i});
		}).filter(d => d);
	}

	/**
	 * Generates the html for a save button to be inserted into a chat message. Players can click this button to perform a roll through their controlled token.
	 * @returns {import("./renderer.js").ButtonSaveProps}
	 */
	static constructSaveButton({ item, abl = null, dc = null, settings }) {
		const actor = item?.actor;
		const saveData = ItemUtils.getSave(item);
		if (abl) { saveData.ability = abl; }
		if (dc) { saveData.dc = dc; }

		// Determine whether the DC should be hidden
		const hideDCSetting = getSettings(settings).hideDC;
		const hideDC = (hideDCSetting == "2" || (hideDCSetting == "1" && actor.data.type == "npc"));
		
		return { type: "button-save", hideDC, ...saveData };
	}

	/**
	 * Construct one or more model entries from a field and some metadata
	 * @param {} field 
	 * @param {*} metadata
	 * @param {object} settings BetterRoll settings overrides
	 * @returns {Array<import("./renderer.js").RenderModelEntry>}
	 */
	static constructModelsFromField(field, metadata, settings={}) {
		let [fieldType, data] = field;
		data = mergeObject(metadata, data ?? {}, { recursive: false });
		
		const { item, actor } = data;
		settings = getSettings(settings);

		switch (fieldType) {
			case 'header':
				return [RollFields.constructHeaderData(data)];
			case 'attack':
				return [RollFields.constructAttackRoll(data)];
			case 'toolcheck':
			case 'tool':
			case 'check':
				return [RollFields.constructMultiRoll({
					...data,
					formula: data.formula ?? ItemUtils.getToolRoll(data.item, data.bonus).formula,
				})];
			case 'damage':
				return RollFields.constructItemDamageRange(data);
			case 'other':
				return RollFields.constructItemDamageRange({ ...data, damageIndex: "other" });
			case 'ammo':
				if (!data.ammo) return [];

				return RollFields.constructItemDamageRange({
					...data,
					item: data.ammo,
					index: "all",
					context: `[${data.ammo.name}]`
				});
			case 'savedc':
				// {customAbl: null, customDC: null}
				return [RollFields.constructSaveButton({ settings, ...data })];
			case 'custom':
				const { title, rolls, formula, rollState } = data;
				const rollData = Utils.getRollData({ item, actor });
				const resolvedFormula = new Roll(formula, rollData).formula;
				return [RollFields.constructMultiRoll({
					title, rollState,
					formula: resolvedFormula || "1d20",
					numRolls: rolls || 1,
					rollType: "custom"
				})];
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
					return [{
						type: "description",
						content: data.text
					}];
				}
				break;
			case 'flavor':
				const message = data?.text ?? item.data.data.chatFlavor;
				if (message) {
					return [{
						type: "description",
						isFlavor: true,
						content: message
					}];
				}
				break;
			case 'crit':
				let damageIndex = data.damageIndex ??
					item?.data.flags.betterRolls5e?.critDamage?.value;
				if (damageIndex) {
					return RollFields.constructItemDamageRange({ item, damageIndex:Number(damageIndex) });
				}
		}

		return [];
	}
}
