import { i18n, isAttack, isSave } from "./betterrolls5e.js";
import { DND5E as dnd5e } from "../../../systems/dnd5e/module/config.js";
import { BRSettings } from "./settings.js";

/**
 * Check if maestro is turned on.
 */
function isMaestroOn() {
	let output = false;
	try { if (game.settings.get("maestro", "enableItemTrack")) {
		output = true;
	} }
	catch { return false; }
	return output;
}

export class Utils {
	/**
	 * The sound to play for dice rolling. Returns null if an alternative sound
	 * from maestro or dice so nice is registered.
	 * This should be added to the chat message under sound.
	 * @param {boolean} hasMaestroSound optional parameter to denote that maestro is enabled
	 * @returns {string}
	 */
	static getDiceSound(hasMaestroSound=false) {
		const has3DDiceSound = game.dice3d ? game.settings.get("dice-so-nice", "settings").enabled : false;
		const playRollSounds = game.settings.get("betterrolls5e", "playRollSounds")

		if (playRollSounds && !has3DDiceSound && !hasMaestroSound) {
			return CONFIG.sounds.dice;
		}
		
		return null;
	}
	
	/**
	 * Additional data to attach to the chat message.
	 */
	static getWhisperData() {
		let rollMode = null;
		let whisper = undefined;
		let blind = null;
		
		rollMode = game.settings.get("core", "rollMode");
		if ( ["gmroll", "blindroll"].includes(rollMode) ) whisper = ChatMessage.getWhisperRecipients("GM");
		if ( rollMode === "blindroll" ) blind = true;
		else if ( rollMode === "selfroll" ) whisper = [game.user._id];
		
		return { rollMode, whisper, blind }
	}

	/**
	 * Tests a roll to see if it crit, failed, or was mixed.
	 * @param {Roll} roll 
	 * @param {number} threshold optional crit threshold
	 * @param {boolean|number[]} critChecks dice to test, true for all
	 */
	static processRoll(roll, threshold, critChecks=true) {
		if (!roll) return null;

		let high = 0;
		let low = 0;
		for (const d of roll.dice) {
			if (d.faces > 1 && (critChecks == true || critChecks.includes(d.faces))) {
				for (const result of d.results) {
					if (result.result >= (threshold || d.faces)) {
						high += 1;
					} else if (result.result == 1) {
						low += 1;
					}
				}
			}
		}

		let critType = null;
		if (high > 0 && low > 0) {
			critType = "mixed";
		} else if (high > 0) {
			critType = "success";
		} else if (low > 0) {
			critType = "failure";
		}

		return {
			roll,
			total: roll.total,
			ignored: roll.ignored ? true : undefined, 
			critType, 
			isCrit: high > 0,
		};
	}

	/**
	 * Get Roll modifiers given a browser event
	 * @param {*} ev 
	 */
	static getEventRollModifiers(eventToCheck) {
		const result = {};
		if (!eventToCheck) { return; }
		if (eventToCheck.shiftKey) {
			result.adv = 1;
		}
		if (keyboard.isCtrl(eventToCheck)) {
			result.disadv = 1;
		}

		return result;
	}
}

export class ActorUtils {
	/**
	 * Returns a special id for a token that can be used to retrieve it
	 * from anywhere.
	 * @param {*} token 
	 */
	static getTokenId(token) {
		return [canvas.tokens.get(token.id).scene.id, token.id].join(".")
	}

	/**
	 * Determine total character level
	 * @param {Actor} actor 
	 */
	static getCharacterLevel(actor) {
		const level = actor.data.items.reduce((runningTotal, item) => {
			if ( item.type === "class" ) {
				const classLevels = parseInt(item.data.levels) || 1;
				runningTotal += classLevels;
			}

			return runningTotal;
		}, 0);

		return level;
	}

	/**
	 * True if the actor has the halfling luck special trait.
	 * @param {Actor} actor 
	 */
	static isHalfling(actor) {
		return getProperty(actor, "data.flags.dnd5e.halflingLucky");
	}
		
	/**
	 * True if the actor has the reliable talent special trait.
	 * @param {Actor} actor 
	 */
	static hasReliableTalent(actor) {
		return getProperty(actor, "data.flags.dnd5e.reliableTalent");
	}

	/**
	 * True if the actor has the elven accuracy feature
	 * @param {Actor} actor 
	 */
	static hasElvenAccuracy(actor) {
		return getProperty(actor, "data.flags.dnd5e.elvenAccuracy");
	}
	
	/**
	 * True if the actor has elven accuracy and the ability
	 * successfully procs it.
	 * @param {Actor} actor 
	 * @param {string} ability ability mod shorthand
	 */
	static testElvenAccuracy(actor, ability) {
		return ActorUtils.hasElvenAccuracy(actor) && ["dex", "int", "wis", "cha"].includes(ability);
	}

	static hasSavageAttacks(actor) {
		try { 
			return actor.getFlag("dnd5e", "savageAttacks");
		} catch(error) {
			return actor.getFlag("dnd5eJP", "savageAttacks");
		}
	}

	/**
	 * Returns the crit threshold of an actor
	 * @param {*} actor 
	 */
	static getCritThreshold(actor) {
		try { 
			return Number(getProperty(actor, "data.flags.dnd5e.weaponCriticalThreshold")) || 20;
		} catch(error) { 
			return actor.data.flags.dnd5e.weaponCriticalThreshold || 20;
		}
	}

	/**
	 * Returns the image to represent the actor. The result depends on BR settings.
	 * @param {Actor} actor
	 */
	static getImage(actor) {
		const actorImage = (actor.data.img && actor.data.img !== DEFAULT_TOKEN && !actor.data.img.includes("*")) ? actor.data.img : false;
		const tokenImage = actor.token?.data?.img ? actor.token.data.img : actor.data.token.img;

		switch(game.settings.get("betterrolls5e", "defaultRollArt")) {
			case "actor":
				return actorImage || tokenImage;
			case "token":
				return tokenImage || actorImage;
		}
	}

	/**
	 * Returns a roll object that can be used to roll a skill check
	 * @param {*} actor 
	 * @param {*} skill
	 * @returns {Roll} 
	 */
	static getSkillCheckRoll(actor, skill) {
		const skillData = actor.data.data.skills[skill];

		const parts = ["@mod"];
		const data = {mod: skillData.total};
		
		const skillBonus = getProperty(actor, "data.data.bonuses.abilities.skill");
		if (skillBonus) {
			parts.push("@skillBonus");
			data["skillBonus"] = skillBonus;
		}
		
		// Halfling Luck + Reliable Talent check
		let d20String = ActorUtils.isHalfling(actor) ? "1d20r<2" : "1d20";
		if (ActorUtils.hasReliableTalent(actor) && skillData.value >= 1) {
			d20String = `{${d20String},10}kh`;
		}

		return new Roll([d20String, ...parts].join("+"), data);
	}

	static getAbilityCheckRoll(actor, abl) {
		let parts = ["@mod"];
		
		const data = actor.getRollData();
		data.mod = data.abilities[abl].mod;
	
		const checkBonus = getProperty(actor, "data.data.bonuses.abilityCheck");
		const secondCheckBonus = getProperty(actor, "data.data.bonuses.abilities.check");
		
		if (checkBonus && parseInt(checkBonus) !== 0) {
			parts.push("@checkBonus");
			data["checkBonus"] = checkBonus;
		} else if (secondCheckBonus && parseInt(secondCheckBonus) !== 0) {
			parts.push("@secondCheckBonus");
			data["secondCheckBonus"] = secondCheckBonus;
		}

		if (actor.getFlag("dnd5e", "jackOfAllTrades")) {
			parts.push(`floor(@attributes.prof / 2)`);
		}

		// Halfling Luck check
		const d20String = ActorUtils.isHalfling(actor) ? "1d20r<2" : "1d20";
		return new Roll([d20String, ...parts].join("+"), data);
	}

	static getAbilitySaveRoll(actor, abl) {
		let actorData = actor.data.data;
		let parts = [];
		let data = {mod: []};

		// Support modifiers and global save bonus
		const saveBonus = getProperty(actorData, "bonuses.abilities.save") || null;
		let ablData = actor.data.data.abilities[abl];
		let ablParts = {};
		ablParts.mod = ablData.mod !== 0 ? ablData.mod.toString() : null;
		ablParts.prof = ((ablData.proficient || 0) * actorData.attributes.prof).toString();
		let mods = [ablParts.mod, ablParts.prof, saveBonus];
		for (let i=0; i<mods.length; i++) {
			if (mods[i] && mods[i] !== "0") {
				data.mod.push(mods[i]);
			}
		}
		data.mod = data.mod.join("+");

		// Halfling Luck check
		const d20String = ActorUtils.isHalfling(actor) ? "1d20r<2" : "1d20";

		if (data.mod !== "") {
			parts.push("@mod");
		}

		return new Roll([d20String, ...parts].join("+"), data);
	}
}

export class ItemUtils {
	static getActivationData(item) {
		const { activation } = item.data.data;
		const activationCost = activation.cost ? activation.cost : ""

		if (activation?.type !== "" && activation?.type !== "none") {
			return `${activationCost} ${dnd5e.abilityActivationTypes[activation.type]}`.trim();
		}

		return null;
	}

	/**
	 * Creates the lower of the item crit threshold, the actor crit threshold, or 20.
	 * Returns null if null is given.I mea
	 * @param {*} item 
	 */
	static getCritThreshold(item) {
		if (!item) return null;

		const itemData = item.data.data;
		const itemCrit = Number(getProperty(item, "data.flags.betterRolls5e.critRange.value")) || 20;
		if (['mwak', 'rwak'].includes(itemData.actionType)) {
			let characterCrit = ActorUtils.getCritThreshold(this.actor);
			return Math.min(20, characterCrit, itemCrit);
		} else {
			return Math.min(20, itemCrit);
		}
	}

	static getDuration(item) {
		const {duration} = item.data.data;

		if (!duration?.units) {
			return null;
		}

		return `${duration.value ? duration.value : ""} ${dnd5e.timePeriods[duration.units]}`.trim()
	}

	static getRange(item) {
		const { range } = item.data.data;
	
		if (!range?.value && !range?.units) {
			return null;
		}
	
		const standardRange = range.value || "";
		const longRange = (range.long && range.long !== range.value) ? `/${range.long}` : "";
		const rangeUnit = range.units ? dnd5e.distanceUnits[range.units] : "";
	
		return `${standardRange}${longRange} ${rangeUnit}`.trim();
	}

	static getSpellComponents(item) {
		const { vocal, somatic, material } = item.data.data.components;

		let componentString = "";

		if (vocal) {
			componentString += i18n("br5e.chat.abrVocal");
		}

		if (somatic) {
			componentString += i18n("br5e.chat.abrSomatic");
		}

		if (material) {
			const materials = item.data.data.materials;
			componentString += i18n("br5e.chat.abrMaterial");

			if (materials.value) {
				const materialConsumption = materials.consumed ? i18n("br5e.chat.consumedBySpell") : ""
				componentString += ` (${materials.value}` + ` ${materialConsumption})`;
			}
		}

		return componentString || null;
	}

	static getTarget(item) {
		const { target } = item.data.data;

		if (!target?.type) {
			return null;
		}

		const targetDistance = target.units && target?.units !== "none" ? ` (${target.value} ${dnd5e.distanceUnits[target.units]})` : "";
		return i18n("Target: ") + dnd5e.targetTypes[target.type] + targetDistance;
	}

	/**
	 * Ensures that better rolls flag data is set on the item if applicable.
	 * Performs an item update if anything was set.
	 * @param {*} item 
	 * @param {boolean} commit whether to update at the end or not
	 */
	static async ensureFlags(item, { commit=true } = {}) {
		if (!item.data || CONFIG.betterRolls5e.validItemTypes.indexOf(item.data.type) == -1) { return; }
		
		// Initialize flags
		const baseFlags = duplicate(CONFIG.betterRolls5e.allFlags[item.data.type.concat("Flags")]);
		let flags = duplicate(item.data.flags.betterRolls5e ?? {});
		flags = mergeObject(baseFlags, flags ?? {});
		
		// If quickDamage flags should exist, update them based on which damage formulae are available
		if (CONFIG.betterRolls5e.allFlags[item.data.type.concat("Flags")].quickDamage) {
			let newQuickDamageValues = [];
			let newQuickDamageAltValues = [];
			
			// Make quickDamage flags if they don't exist
			if (!flags.quickDamage) {
				flags.quickDamage = {type: "Array", value: [], altValue: []};
			}
			
			for (let i = 0; i < item.data.data.damage.parts.length; i++) {
				newQuickDamageValues[i] = flags.quickDamage.value[i] ?? true;
				newQuickDamageAltValues[i] = flags.quickDamage.altValue[i] ?? true;
			}
	
			flags.quickDamage.value = newQuickDamageValues;
			flags.quickDamage.altValue = newQuickDamageAltValues;
		}
	
		// Save the updates. Foundry checks for diffs to avoid unnecessary updates
		if (commit) {
			await item.update({"flags.betterRolls5e": flags}, { diff: true });
		} else {
			item.data.flags.betterRolls5e = flags;
		}

		return item.data.flags.betterRolls5e;
	}

	/** 
	 * Finds if an item has a Maestro sound on it, in order to determine whether or not the dice sound should be played.
	 */
	static hasMaestroSound(item) {
		return (isMaestroOn() && item.data.flags.maestro && item.data.flags.maestro.track) ? true : false;
	}

	static getAbilityMod(itm) {
		const itemData = itm.data.data;
		const actorData = itm.actor.data.data;
	
		let abl = itemData.ability || "";
	
		if ((itm.data.type == "weapon") && itemData.properties.fin && ["","str","dex"].includes(abl)) {
			// If the item is a finesse weapon, and abl is "", "str", or "dex"
			if (actorData.abilities.str.mod >= actorData.abilities.dex.mod) {
				abl = "str";
			} else {
				abl = "dex";
			}
		} else if (!abl) {
			if (itm.data.type == "spell") {
				// Spells
				abl = actorData.attributes.spellcasting;
			} else if (["weapon", "feat"].includes(itm.data.type)) {
				// Weapons / Feats, based on the "Action Type" field
				switch (itemData.actionType) {
					case "mwak":
						abl = "str";
						break;
					case "rwak":
						abl = "dex";
						break;
					case "msak":
					case "rsak":
						abl = actorData.attributes.spellcasting;
						break;
				}
			}
		}

		return abl;
	}

	/**
	 * Checks if the item applies savage attacks (bonus crit).
	 * Returns false if the actor doesn't have savage attacks, if the item
	 * is not a weapon, or if there is no item.
	 * @param {item?} item 
	 */
	static appliesSavageAttacks(item) {
		if (item?.actor && item?.data.type === "weapon") {
			return ActorUtils.hasSavageAttacks(item.actor);
		}

		return false;
	}

	/**
	 * Gets the item's roll data.
	 * This is similar to item.getRollData(), but with a different
	 * ability mod formula that handles feat weapon types.
	 * If core ever swaps supports feat weapon types / levels, swap back.
	 * @param {*} item 
	 */
	static getRollData(item, { abilityMod, slotLevel=undefined } = {}) {
		const rollData = item.actor.getRollData();
		rollData.item = duplicate(item.data.data);

		const abl = abilityMod ?? this.getAbilityMod(item);
		rollData.mod = rollData.abilities[abl]?.mod || 0;

		if (slotLevel) {
			rollData.item.level = slotLevel;
		}

		const prof = "proficient" in rollData.item ? (rollData.item.proficient || 0) : 1;
		rollData["prof"] = Math.floor(prof * rollData.attributes.prof);

		return rollData;
	}

	static getAttackRoll(itm, { abilityMod, ammoBonus=null, bonus=null }={}) {
		const itemData = itm.data.data;
		const actorData = itm.actor.data.data;
		const parts = ["@mod"];
		const rollData = ItemUtils.getRollData(itm, { abilityMod });
		
		// Add proficiency, expertise, or Jack of all Trades
		if (itm.data.type == "spell" || itm.data.type == "feat" || itemData.proficient ) {
			parts.push(`@prof`);
			rollData.prof = Math.floor(actorData.attributes.prof);
		}
		
		// Add item's bonus
		if (itemData.attackBonus) {
			parts.push(`@bonus`);
			rollData.bonus = itemData.attackBonus;
		}

		if (ammoBonus) {
			parts.push("@ammo");
			rollData["ammo"] = ammoBonus;
		}
		
		// Add custom situational bonus
		if (bonus) {
			parts.push(bonus);
		}
		
		if (actorData.bonuses && isAttack(itm)) {
			let actionType = `${itemData.actionType}`;
			if (actorData?.bonuses[actionType]?.attack) {
				parts.push("@" + actionType);
				rollData[actionType] = actorData.bonuses[actionType].attack;
			}
		}

		// Halfling Luck check and final result
		const d20String = ActorUtils.isHalfling(itm.actor) ? "1d20r<2" : "1d20";
		return new Roll([d20String, ...parts].join("+"), rollData);
	}

	static getToolRoll(itm, bonus=null) {
		const itemData = itm.data.data;
		const actorData = itm.actor.data.data;

		const parts = [];
		const rollData = ItemUtils.getRollData(itm);

		// Add ability modifier bonus
		if (itemData.ability) {
			const abl = itemData.ability;
			const mod = abl ? actorData.abilities[abl].mod : 0;
			if (mod !== 0) {
				parts.push("@mod");
				rollData.mod = mod;
			}
		}

		// Add proficiency, expertise, or Jack of all Trades
		if (itemData.proficient) {
			parts.push("@prof");
			rollData.prof = Math.floor(itemData.proficient * actorData.attributes.prof);
			//console.log("Adding Proficiency mod!");
		}
		
		// Add item's bonus
		if (itemData.bonus) {
			parts.push("@bonus");
			rollData.bonus = itemData.bonus.value;
			//console.log("Adding Bonus mod!");
		}
		
		if (bonus) {
			parts.push(bonus);
		}
		
		// Halfling Luck check and final result
		const d20String = ActorUtils.isHalfling(itm, actor) ? "1d20r<2" : "1d20";
		return new Roll([d20String, ...parts].join("+"), rollData);
	}

	/**
	 * Derives the formula for what should be rolled when a crit occurs.
	 * Note: Item is not necessary to calculate it.
	 * @param {string} rollFormula
	 * @returns {string?} the crit formula
	 */
	static getCritRoll(baseFormula, baseTotal, {critBehavior=null, savage=false}={}) {
		const critFormula = baseFormula.replace(/[+-]+\s*(?:@[a-zA-Z0-9.]+|[0-9]+(?![Dd]))/g,"").concat();
		let critRoll = new Roll(critFormula);
		
		// If the crit formula has no dice, return null
		if (critRoll.terms.length === 1 && typeof critRoll.terms[0] === "number") {
			return null;
		}
		
		const add = savage ? 1 : 0;
		critRoll.alter(1, add);
		critRoll.roll();

		if (!critBehavior) {
			critBehavior = BRSettings.critBehavior;
		}

		// If critBehavior = 2, maximize base dice
		if (critBehavior === "2") {
			critRoll = new Roll(critRoll.formula).evaluate({maximize:true});
		}
		
		// If critBehavior = 3, maximize base and crit dice
		else if (critBehavior === "3") {
			let maxDifference = Roll.maximize(baseFormula).total - baseTotal;
			let newFormula = critRoll.formula + "+" + maxDifference.toString();
			critRoll = new Roll(newFormula).evaluate({maximize:true});
		}

		return critRoll;
	}

	static scaleDamage(item, spellLevel, damageIndex, versatile, rollData) {
		let itemData = item.data.data;
		let actorData = item.actor.data.data;
		
		// Scaling for cantrip damage by level. Affects only the first damage roll of the spell.
		if (item.data.type === "spell" && itemData.scaling.mode === "cantrip") {
			let parts = itemData.damage.parts.map(d => d[0]);
			let level = item.actor.data.type === "character" ? ActorUtils.getCharacterLevel(item.actor) : actorData.details.cr;
			let scale = itemData.scaling.formula;
			let formula = parts[damageIndex];
			const add = Math.floor((level + 1) / 6);
			if ( add === 0 ) {}
			else {
				formula = item._scaleDamage([formula], scale || formula, add, rollData);
				if (versatile) { 
					formula = item._scaleDamage([itemData.damage.versatile], itemData.damage.versatile, add, rollData);
				}
			}
			return formula;
		}
		
		// Scaling for spell damage by spell slot used. Affects only the first damage roll of the spell.
		if (item.data.type === "spell" && itemData.scaling.mode === "level" && spellLevel) {
			let parts = itemData.damage.parts.map(d => d[0]);
			let level = itemData.level;
			let scale = itemData.scaling.formula;
			let formula = parts[damageIndex];
			const add = Math.floor(spellLevel - level);
			if (add > 0) {
				formula = item._scaleDamage([formula], scale || formula, add, rollData);
				if (versatile) {
					formula = item._scaleDamage([itemData.damage.versatile], itemData.damage.versatile, add, rollData);
				}
			}
			
			return formula;
		}
		
		return null;
	}

	
	/**
	 * A function for returning the properties of an item, which can then be printed as the footer of a chat card.
	 */
	static getPropertyList(item) {
		const data = item.data.data;
		let properties = [];
		
		const range = ItemUtils.getRange(item);
		const target = ItemUtils.getTarget(item);
		const activation = ItemUtils.getActivationData(item)
		const duration = ItemUtils.getDuration(item);

		switch(item.data.type) {
			case "weapon":
				properties = [
					dnd5e.weaponTypes[data.weaponType],
					range,
					target,
					data.proficient ? "" : i18n("Not Proficient"),
					data.weight ? data.weight + " " + i18n("lbs.") : null
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

				properties = [
					dnd5e.spellSchools[data.school],
					dnd5e.spellLevels[data.level],
					data.components.ritual ? i18n("Ritual") : null,
					activation,
					duration,
					data.components.concentration ? i18n("Concentration") : null,
					ItemUtils.getSpellComponents(item),
					range,
					target
				];
				break;
			case "feat":
				properties = [
					data.requirements,
					activation,
					duration,
					range,
					target,
				];
				break;
			case "consumable":
				properties = [
					data.weight ? data.weight + " " + i18n("lbs.") : null,
					activation,
					duration,
					range,
					target,
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
		let output = properties.filter(p => (p) && (p.length !== 0) && (p !== " "));
		return output;
	}

	/**
	 * Returns an object with the save DC of the item.
	 * If no save is written in, one is calculated.
	 * @param {Item} item
	 */
	static getSave(item) {
		if (!isSave(item)) {
			return null;
		}

		let itemData = item.data.data,
			output = {};
		output.ability = getProperty(itemData, "save.ability");
		
		// If a DC is written in, use that by default
		// Otherwise, calculate one
		if (itemData.save.dc && itemData.save.dc != 0 && itemData.save.scaling !== "spell") {
			output.dc = itemData.save.dc
		} else {
			// If spell DC is calculated with normal spellcasting DC, use that
			// Otherwise, calculate one
			if (item.data.type === "spell" && itemData.save.scaling == "spell") {
				output.dc = getProperty(item.actor,"data.data.attributes.spelldc");
			} else {
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
	}
}

/**
 * Class used to build a growing number of dice
 * that will be flushed to a system like Dice So Nice.
 */
export class DiceCollection {
	pool = new Roll("0").roll();

	/**
	 * Creates a new DiceCollection object
	 * @param {...Roll} initialRolls optional additional dice to start with 
	 */
	constructor(...initialRolls) {
		if (initialRolls.length > 0) {
			this.push(...initialRolls);
		}
	}

	/**
	 * Creates a new dice pool from a set of rolls 
	 * and immediately flushes it, returning a promise that is
	 * true if any rolls had dice.
	 * @param {Roll[]} rolls
	 * @returns {Promise<boolean>}
	 */
	static createAndFlush(rolls) {
		return new DiceCollection(...rolls).flush();
	}

	/**
	 * Adds one or more rolls to the dice collection,
	 * for the purposes of 3D dice rendering.
	 * @param  {...Roll} rolls 
	 */
	push(...rolls) {
		for (const roll of rolls.filter(r => r)) {
			this.pool._dice.push(...roll.dice);
		}
	}

	/**
	 * Displays the collected dice to any subsystem that is interested.
	 * Currently its just Dice So Nice (if enabled).
	 * @returns {Promise<boolean>} if there were dice in the pool
	 */
	async flush() {
		// Get and reset immediately (stacking flush calls shouldn't reroll more dice)
		const pool = this.pool;
		this.pool = new Roll("0").roll();

		const hasDice = pool.dice.length > 0;
		if (game.dice3d && hasDice) {
			const wd = Utils.getWhisperData();
			await game.dice3d.showForRoll(pool, game.user, true, wd.whisper, wd.blind || false);
		}

		return hasDice;
	}
}
