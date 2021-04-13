import { getSettings } from "../settings.js";
import { libWrapper } from "./libWrapper.js";

import { d20Roll } from "../../../../systems/dnd5e/module/dice.js";
import { i18n } from "../utils/utils.js";

export function patchCoreFunctions() {
	if (!libWrapper.is_fallback && !libWrapper.version_at_least?.(1, 4, 0)) {
		Hooks.once("ready", () => {
			const version = "v1.4.0.0";
			ui.notifications.error(i18n("br5e.error.libWrapperMinVersion", { version }));
		});

		return;
	}

	override("CONFIG.Item.entityClass.prototype.roll", itemRoll);
	override("CONFIG.Item.entityClass.prototype.rollAttack", itemRollAttack);
}

/**
 * A version of libwrapper OVERRIDE that tries to get the original function.
 * We want Better Rolls and Core 5e to be swappable between each other,
 * and for other modules to wrap over it.
 * @param {*} target
 * @param {*} fn A curried function that takes the original and returns a function to pass to libwrapper
 */
function override(target, fn) {
	libWrapper.register("betterrolls5e", target, fn, "OVERRIDE", {chain: true});
}

/**
 * Override for Item5e.roll(). This is an OVERRIDE however we still want
 * a passthrough. We need to be lower on priority than Midi.
 * @param {} wrapped
 * @returns
 */
function itemRoll(defaultRoll, options) {
	// Handle options, same defaults as core 5e
	options = mergeObject({
		configureDialog: true,
		createMessage: true,
		event
	}, options, { recursive: false });
	const { rollMode, createMessage, vanilla } = options;
	const altKey = options.event?.altKey;
	const item = this;

	// Case - If the image button should roll a vanilla roll, UNLESS vanilla is defined and is false
	const { imageButtonEnabled, altSecondaryEnabled } = getSettings();
	if (vanilla || (!imageButtonEnabled && vanilla !== false) || (altKey && !altSecondaryEnabled)) {
		return defaultRoll.bind(item)(options);
	}

	const preset = altKey ? 1 : 0;
	const card = BetterRolls.rollItem(item, { preset, event: options.event });
	return card.toMessage({ rollMode, createMessage });
}

/**
 * Override for Item5e.rollAttack(). Only kicks in if options.chatMessage is off.
 * It is basically an exact copy of the built in rollAttack, except that it doesn't consume ammo.
 * Unfortunately D&D does not allow a rollAttack() to not consume ammo.
 * @param {} wrapped
 * @returns
 */
async function itemRollAttack(defaultRoll, options) {
	// Call the default version if chatMessage is enabled
	if (options?.chatMessage !== false) {
		return defaultRoll.bind(this)(options);
	}

    const flags = this.actor.data.flags.dnd5e || {};
    if ( !this.hasAttack ) {
      throw new Error("You may not place an Attack Roll with this Item.");
    }

    let title = `${this.name} - ${game.i18n.localize("DND5E.AttackRoll")}`;

    // get the parts and rollData for this item's attack
    const {parts, rollData} = this.getAttackToHit();

    // Compose roll options
    const rollConfig = mergeObject({
      parts: parts,
      actor: this.actor,
      data: rollData,
      title: title,
      flavor: title,
      speaker: ChatMessage.getSpeaker({actor: this.actor}),
      dialogOptions: {
        width: 400,
        top: options.event ? options.event.clientY - 80 : null,
        left: window.innerWidth - 710
      },
      messageData: {"flags.dnd5e.roll": {type: "attack", itemId: this.id }}
    }, options);
    rollConfig.event = options.event;

    // Expanded critical hit thresholds
    if (( this.data.type === "weapon" ) && flags.weaponCriticalThreshold) {
      rollConfig.critical = parseInt(flags.weaponCriticalThreshold);
    } else if (( this.data.type === "spell" ) && flags.spellCriticalThreshold) {
      rollConfig.critical = parseInt(flags.spellCriticalThreshold);
    }

    // Elven Accuracy
    if ( ["weapon", "spell"].includes(this.data.type) ) {
      if (flags.elvenAccuracy && ["dex", "int", "wis", "cha"].includes(this.abilityMod)) {
        rollConfig.elvenAccuracy = true;
      }
    }

    // Apply Halfling Lucky
    if ( flags.halflingLucky ) rollConfig.halflingLucky = true;

    // Invoke the d20 roll helper
    const roll = await d20Roll(rollConfig);
    if ( roll === false ) return null;
    return roll;
}
