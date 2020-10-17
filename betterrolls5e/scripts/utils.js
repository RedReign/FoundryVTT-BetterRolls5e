import { i18n, getWhisperData } from "./betterrolls5e.js";
import { DND5E as dnd5e } from "../../../systems/dnd5e/module/config.js";

export class Utils {
	static getCharacterLevel(actor) {
		// Determine character level
		const level = actor.data.items.reduce((runningTotal, item) => {
			if ( item.type === "class" ) {
				const classLevels = parseInt(item.data.levels) || 1;
				runningTotal += classLevels;
			}
			return runningTotal;
		});
		return level;
	}

	static getActivationData(item) {
		const { activation } = item.data.data;
		const activationCost = activation.cost ? activation.cost : ""

		if (activation?.type !== "" && activation?.type !== "none") {
			return `${activationCost} ${dnd5e.abilityActivationTypes[activation.type]}`.trim();
		}

		return null;
	}

	static getDuration(item) {
		const {duration} = item.data.data;

		if (!duration?.units) { return null; }

		return `${duration.value ? duration.value : ""} ${dnd5e.timePeriods[duration.units]}`.trim()
	}

	static getRange(item) {
		const { range } = item.data.data;
	
		if (!range?.value && !range?.units) { return null; }
	
		const standardRange = range.value || "";
		const longRange = (range.long && range.long != range.value) ? `/${range.long}` : "";
		const rangeUnit = range.units ? dnd5e.distanceUnits[range.units] : "";
	
		return `${standardRange}${longRange} ${rangeUnit}`.trim();
	}

	static getSpellComponents(item) {
		const { vocal, somatic, material, materials } = item.data.data.components;

		let componentString = "";

		if (vocal) { componentString += i18n("br5e.chat.abrVocal"); }
		if (somatic) { componentString += i18n("br5e.chat.abrSomatic"); }
		if (material) { 
			componentString += i18n("br5e.chat.abrMaterial");

			if (materials.value) {
				const materialConsumption = materials.consumed ? i18n("br5e.chat.consumedBySpell") : ""
				componentString += ` (${materials.value}` +  ` ${materialConsumption})`;
			}
		}

		return componentString || null;
	}

	static getTarget(item) {
		const { target } = item.data.data;

		if (!target?.type) { return null; }

		const targetDistance = target?.units !== "none" ? ` (${target.value} ${dnd5e.distanceUnits[target.units]})` : "";
		
		return i18n("Target: ") + dnd5e.targetTypes[target.type] + targetDistance;
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
		return Utils.hasElvenAccuracy(actor) && ["dex", "int", "wis", "cha"].includes(ability);
	}

	/**
	 * Returns the image to represent the actor. The result depends on BR settings.
	 * @param {Actor} actor
	 */
	static getImage(actor) {
		let actorImage = (actor.data.img && actor.data.img != DEFAULT_TOKEN && !actor.data.img.includes("*")) ? actor.data.img : false;
		let tokenImage = actor.token?.data?.img ? actor.token.data.img : actor.data.token.img;

		switch(game.settings.get("betterrolls5e", "defaultRollArt")) {
			case "actor":
				return actorImage || tokenImage;
			case "token":
				return tokenImage || actorImage;
		}
	}

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
		for (const roll of rolls) {
			this.pool._dice.push(...roll.dice);
		}
	}

	/**
	 * Displays the collected dice to any subsystem that is interested.
	 * Currently its just Dice So Nice (if enabled).
	 * @returns {Promise<boolean>} if there were dice in the pool
	 */
	async flush() {
		const hasDice = this.pool.dice.length > 0;
		if (game.dice3d && hasDice) {
			const wd = getWhisperData();
			await game.dice3d.showForRoll(this.pool, game.user, true, wd.whisper, wd.blind || false);
		}

		this.pool = new Roll("0").roll();
		return hasDice;
	}
}
