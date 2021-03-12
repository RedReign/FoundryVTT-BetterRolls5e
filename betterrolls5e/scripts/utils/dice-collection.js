import { Utils } from "./utils.js";

/**
 * Class used to build a growing number of dice
 * that will be flushed to a system like Dice So Nice.
 */
export class DiceCollection {
	/** Roll object containing all the dice */
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
	async flush(hasMaestroSound=false) {
		// Get and reset immediately (stacking flush calls shouldn't reroll more dice)
		const pool = this.pop();

		const hasDice = pool.dice.length > 0;
		if (game.dice3d && hasDice) {
			const wd = Utils.getWhisperData();
			await game.dice3d.showForRoll(pool, game.user, true, wd.whisper, wd.blind || false);
		}

		const sound = Utils.getDiceSound(hasMaestroSound);
		if (sound && hasDice) {
			// Note: emited events aren't caught by the same client
			// the push argument didn't work for me, so using sockets instead
			Utils.playDiceSound();
			game.socket.emit("module.betterrolls5e", {
				action: "roll-sound",
				user: game.user.id
			}, () => console.log("Better Rolls | Roll Sound Message Sent"));
		}

		return hasDice;
	}

	/**
	 * Retrieves the dice pool and clears it without rolling it.
	 * @returns {Roll}
	 */
	pop() {
		const pool = this.pool;
		this.pool = new Roll("0").roll();
		return pool;
	}
}
