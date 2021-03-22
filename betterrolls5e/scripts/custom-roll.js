import { isAttack, isSave, isCheck } from "./betterrolls5e.js";
import {
	dnd5e,
	i18n,
	DiceCollection,
	ActorUtils,
	ItemUtils,
	Utils,
	FoundryProxy,
	pick,
	findLast
} from "./utils/index.js";
import { Renderer } from "./renderer.js";
import { getSettings } from "./settings.js";
import { RollFields } from "./fields.js";

/**
 * Parameters used when full rolling an actor
 * @typedef FullRollActorParams
 * @type {object}
 * @property {number?} adv
 * @property {number?} disadv
 * @property {@param {import("./fields.js").RollState}} rollState
 * @property {number?} critThreshold
 */

/**
 * General class for macro support, actor rolls, and most static rolls.
 * It provides utility functions that can be used to create a new roll,
 * as well as the most common Actor roll functions.
 */
export class CustomRoll {
	/**
	 * Internal method to perform a basic actor full roll of "something".
	 * It creates and display a chat message on completion.
	 * @param {Actor} actor The actor being rolled for
	 * @param {string} title The title to show on the header card
	 * @param {string} formula The formula to multiroll
	 * @param {string} rollType
	 * @param {FullRollActorParams} params
	 * @private
	 */
	static async _fullRollActor(actor, title, formula, rollType, params) {
		// Entries to show for the render
		const rollState = Utils.getRollState({ event, ...params });
		return new CustomItemRoll(actor, { rollState }, [
			['header', { title }],
			['check', {
				formula,
				critThreshold: params?.critThreshold,
				rollType
			}]
		]).toMessage();
	}

	/**
	 * Creates and displays a chat message to show a full skill roll
	 * @param {*} actor
	 * @param {string} skill shorthand referring to the skill name
	 * @param {FullRollActorParams} params parameters
	 */
	static async rollSkill(actor, skill, params={}) {
		const label = i18n(dnd5e.skills[skill]);
		const formula = (await ActorUtils.getSkillCheckRoll(actor, skill)).formula;
		return CustomRoll._fullRollActor(actor, label, formula, "skill", params);
	}

	/**
	 * Rolls a skill check for an actor
	 * @param {*} actor
	 * @param {string} ability Ability shorthand
	 * @param {FullRollActorParams} params
	 */
	static async rollCheck(actor, ability, params) {
		return await CustomRoll.rollAttribute(actor, ability, "check", params);
	}

	/**
	 * Rolls a saving throw for an actor
	 * @param {*} actor
	 * @param {string} ability Ability shorthand
	 * @param {FullRollActorParams} params
	 */
	static async rollSave(actor, ability, params) {
		return await CustomRoll.rollAttribute(actor, ability, "save", params);
	}

	/**
	 * Creates and displays a chat message with the requested ability check or saving throw.
	 * @param {Actor5e} actor		The actor object to reference for the roll.
	 * @param {String} ability		The ability score to roll.
	 * @param {String} rollType		String of either "check" or "save"
	 * @param {FullRollActorParams} params
	 */
	static async rollAttribute(actor, ability, rollType, params={}) {
		const label = dnd5e.abilities[ability];

		let titleString;
		let formula = "";
		if (rollType === "check") {
			formula = (await ActorUtils.getAbilityCheckRoll(actor, ability)).formula;
			titleString = `${i18n(label)} ${i18n("br5e.chat.check")}`;
		} else if (rollType === "save") {
			formula = (await ActorUtils.getAbilitySaveRoll(actor, ability)).formula;
			titleString = `${i18n(label)} ${i18n("br5e.chat.save")}`;
		}

		return CustomRoll._fullRollActor(actor, titleString, formula, rollType, params);
	}

	static newItemRoll(itemOrActor, params, fields) {
		return new CustomItemRoll(itemOrActor, params, fields);
	}
}

let defaultParams = {
	title: "",
	forceCrit: false,
	preset: null,
	properties: true,
	slotLevel: null,
	useCharge: {},
	useTemplate: false,
	event: null,
	adv: 0,
	disadv: 0,
	consume: true
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
	/**
	 * Current id that is auto-incremented.
	 * IDs need to be unique within a card
	 * @private
	 */
	_currentId = 1;

	constructor(itemOrActor, params, fields) {
		if (itemOrActor) {
			const { item, actor } = Utils.resolveActorOrItem(itemOrActor);
			if (item) {
				this.item = item;
			} else if (actor) {
				this.actor = actor;
			}
		}

		// params.event is an available parameter for backwards compatibility reasons
		// but really we're interested in the rollState. Replace it here.
		// We don't want event to be serialized when flags are set
		this.params = mergeObject(duplicate(defaultParams), params || {});	// General parameters for the roll as a whole.
		this.params.rollState = Utils.getRollState(this.params);
		delete this.params.event;

		// Where requested roll fields are stored, in the order they should be rendered.
		// Fields represent "intents"
		this.fields = fields ?? [];

		// Data results from fields, which get turned into templates
		// Entries represent "results"
		/** @type {Array<import("./renderer.js").RenderModelEntry>} */
		this.entries = [];

		this.properties = [];
		this.rolled = false;
		this.isCrit = this.params.forceCrit || false;			// Defaults to false, becomes "true" when a valid attack or check first crits.
		this.dicePool = new DiceCollection();
	}

	static fromMessage(message) {
		const data = message.data.flags.betterrolls5e;
		const roll = new CustomItemRoll(null, data?.params ?? {}, data?.fields ?? []);
		roll._currentId = -1;
		roll.messageId = message.id;
		roll.rolled = true;
		if (data) {
			roll.isCrit = data.isCrit;
			roll.entries = FoundryProxy.create(data.entries);
			roll.properties = data.properties;
			roll.params = data.params;

			// Set these up so that lazy loading can be done
			roll.actorId = data.actorId;
			roll.itemId = data.itemId;
			roll.tokenId = data.tokenId;
		}

		roll.storedItemData = message.getFlag("dnd5e", "itemData");

		return roll;
	}

	set item(item) {
		this._item = item;
		this.itemId = item.id;
		this.actor = item?.actor;
	}

	/**
	 * Retrieves the item associated with this roll. This may have to load the item from the associated actor,
	 * and in those cases can throw an exception if the actor/item no longer exists.
	 */
	get item() {
		if (this._item) return this._item;

		let storedData = null;
		if (this.messageId) {
			const message = game.messages.get(this.messageId);
			storedData = message.getFlag("dnd5e", "itemData");
		}

		if (!storedData && !this.itemId) {
			return null;
		}

		const actor = this.actor;
		const Item5e = game.dnd5e.entities.Item5e;
		const item = storedData && actor ? Item5e.createOwned(storedData, actor) : actor?.getOwnedItem(this.itemId);
		if (item) {
			console.info(`BetterRolls | Card loaded existing item data ${item.name}`);
		}

		this._item = item; // store a backup so we don't need to fetch again
		return item;
	}

	set actor(actor) {
		this._actor = actor;
		this.actorId = actor?.id;
		this.tokenId = actor?.token ? ActorUtils.getTokenId(actor.token) : null;
	}

	/**
	 * Returns the actor associated this item, loading it from the game
	 */
	get actor() {
		if (this._actor) return this._actor;

		let actor = null;
		if (this.tokenId) {
			const [sceneId, tokenId] = this.tokenId.split(".");

			const scene = game.scenes.get(sceneId);
			if (!scene) return null;

			const tokenData = scene.getEmbeddedEntity("Token", tokenId);
			if (!tokenData) return null;

			actor = new Token(tokenData).actor;
		} else {
			actor = game.actors.get(this.actorId);
		}

		this._actor = actor;
		return actor;
	}

	get settings() {
		return getSettings(this.params.settings);
	}

	/**
	 * Getter to retrieve if the current user has advanced permissions over the chat card.
	 * @returns {boolean}
	 */
	get hasPermission() {
		const message = game.messages.get(this.messageId);
		return game.user.isGM || message?.isAuthor;
	}

	get totalDamage() {
		let total = 0;
		for (const entry of this.entries) {
			if (entry.type === "damage-group") {
				for (const subEntry of entry.entries) {
					total += subEntry.baseRoll?.total ?? 0;
					if (subEntry.revealed || entry.isCrit) {
						total += subEntry.critRoll?.total ?? 0;
					}
				}
			}
		}

		return total;
	}


	/**
	 * Generator to create an iterable flattened list
	 * @private
	 */
	*iterEntries(list=null) {
		list = list ?? this.entries;
		for (const entry of list) {
			yield entry;
			if (entry.entries) {
				yield *this.iterEntries(entry.entries);
			}
		}
	}

	/**
	 * Returns a list of all entries flattened, including the damage entries.
	 * Recomputes each time
	 * @returns {import("./renderer.js").RenderModelEntry[]}
	 */
	entriesFlattened() {
		return [...this.iterEntries()];
	}

	/**
	 * Returns an entry contained in this roll
	 * @param {string} id
	 * @param {*} list
	 */
	getEntry(id) {
		for (const entry of this.iterEntries()) {
			if (entry.id === id) {
				return entry;
			}
		}
	}

	/**
	 * Returns true if a damage entry can crit
	 * @param {import("./renderer.js").RenderModelEntry} entry
	 */
	canCrit(entry) {
		const group = this.getEntry(entry?.group) ?? this.getEntry(entry?.id);
		if (group?.type !== "damage-group") {
			return false;
		}

		if (entry.critRoll || group.isCrit || entry?.damageIndex === "other") {
			return false;
		}

		const formula = entry.formula ?? entry.baseRoll?.formula;
		return !!ItemUtils.getBaseCritRoll(formula);
	}

	/**
	 * Rolls crit dice if its not already rolled for the current card.
	 * This is used when *augmenting* an existing roll to a crit.
	 * @param {number} group updates the crit status for the specified group
	 * @param {boolean} isCrit Whether to enable or disable crits
	 * @returns {Promise<boolean>} if the crit roll went through
	 */
	async updateCritStatus(groupId, isCrit) {
		const group = this.getEntry(groupId);
		if (!group) return;

		// If crits were forced on, can't turn them off
		if (!isCrit && group.forceCrit) {
			return false;
		}

		// Do nothing if crits are disabled or if we don't have permission
		const critBehavior = this.settings.critBehavior;
		if ((isCrit && critBehavior === "0") || !this.hasPermission) {
			return false;
		}

		const baseExtraCritDice = ItemUtils.getExtraCritDice(this.item);
		let updated = false;

		// Update group crit status
		group.isCrit = isCrit;

		// Update group entry crit statuses
		for (const entry of group?.entries ?? []) {
			// "Junction" types are used to keep track of crit state
			if (["multiroll", "button-save"].includes(entry.type)) {
				entry.isCrit = isCrit;
			}

			// "Other" damage entries never crit
			if (entry.type === "damage" && entry.damageIndex !== "other") {
				if (isCrit && entry.critRoll == null) {
					// Enable Crit (from backup if available)
					if (entry._critBackup) {
						entry.critRoll = entry._critBackup;
					} else {
						const { formula, total } = entry.baseRoll;
						const extraCritDice = entry.extraCritDice ?? baseExtraCritDice;
						entry.extraCritDice = extraCritDice;
						entry.critRoll = ItemUtils.getCritRoll(formula, total, { settings, extraCritDice });
						entry._critBackup = entry.critRoll; // prevent undoing the crit
						this.dicePool.push(entry.critRoll);
					}

					updated = true;
				} else if (!isCrit && entry.critRoll && !entry._critBackup) {
					// Disable crit but keep a backup (so we don't re-roll the crit)
					entry._critBackup = entry.critRoll;
					entry.critRoll = undefined;
					updated = true;
				}
			}

			// If crit extra, show/hide depending on setting
			if (entry.type === "crit") {
				entry.revealed = entry._diceRolled ? true : isCrit;
				if (!entry._diceRolled && entry.revealed) {
					this.dicePool.push(entry.critRoll);
				}

				// Always set to true. If hidden > revealed, we just rolled it.
				// If revealed > hidden, it was rolled before, so set to true anyways
				entry._diceRolled = true;
			}
		}

		return updated;
	}

	/**
	 * Like setCritStatus(), but sets the forceCrit flag, preventing the crit
	 * from being unset by things like the attack roll being converted to disadvantage.
	 * @param {string?} group group to update. If not set will force crit on the whole roll.
	 * @returns {Promise<boolean>} a promise that resolves to true if the status changed for a group.
	 */
	async forceCrit(group) {
		// Force crit on the whole roll recursively
		if (group == null) {
			let updated = false;

			// In the current release, groups can be null/undefined, handle those
			// in a future release this won't be necessary
			if (await this._forceCritForGroup(group)) {
				updated = true;
			}

			const groups = new Set(this.entries.filter((g) => g.type === "damage-group").map((g) => g.id));
			for (const group of groups) {
				if (await this._forceCritForGroup(group)) {
					updated = true;
				}
			}

			return updated;
		}

		return this._forceCritForGroup(group);
	}

	/**
	 * Internal helper to force crit for a specific group
	 * @param {*} groupId
	 * @returns
	 * @private
	 */
	async _forceCritForGroup(groupId) {
		const updated = await this.updateCritStatus(groupId, true);

		// Note: if there's no group then forceCrit can't be set,
		// however currently the only way a crit could be unset is by converting to disadvantage
		// If there's no attack roll...it can't be unset anyways, so no big deal
		const group = this.getEntry(groupId);
		if (updated || (group.isCrit && !group.forceCrit)) {
			if (group) {
				group.forceCrit = true;
			}
			return true;
		}

		return updated;
	}

	/**
	 * Rolls damage for a damage group. Returns true if successful.
	 * This works by revealing all relevant hidden damage data, and visually rolling dice
	 * @param {string} id
	 */
	async rollDamage(id) {
		if (!id) {
			let updated = false;
			const groups = this.entries.filter((e) => e.type === "damage-group");
			for (const group of groups) {
				if (await this.rollDamage(group.id)) {
					updated = true;
				}
			}

			return updated;
		}

		const group = this.getEntry(id);
		const wasHidden = group?.prompt;
		if (!this.hasPermission || !group || !wasHidden) {
			return false;
		}

		// Get whether this was a crit or not
		const isCrit = group.isCrit || this.isCrit;

		// Disable the prompt for this group
		group.prompt = false;

		// Add to dicepool for dice so nice
		for (const entry of group.entries) {
			if (entry.type === "damage" || (entry.type === "crit" && isCrit)) {
				this.dicePool.push(entry.baseRoll, entry.critRoll);
			}
		}

		return true;
	}

	/**
	 * Assigns a RollState to an existing multiroll entry. Cannot be used to unset it.
	 * @param {string} id The id of the rollstate entry to update
	 * @param {import("./fields.js").RollState} rollState
	 */
	async updateRollState(id, rollState) {
		if (!this.hasPermission || !this.entries?.length || !rollState) {
			return false;
		}

		const multiroll = this.getEntry(id);
		if (multiroll?.type !== 'multiroll' || multiroll.rollState) {
			return false;
		}

		// Calculate required number of rolls
		let numRolls = Math.max(multiroll.entries?.length, 2);
		if (numRolls == 2 && multiroll.elvenAccuracy && rollState !== "lowest") {
			numRolls = 3;
		}

		// Add more rolls if necessary
		while (multiroll.entries?.length < numRolls) {
			const roll = multiroll.entries[0].roll.reroll();
			multiroll.entries.push(Utils.processRoll(roll, multiroll.critThreshold, [20], multiroll.bonus));
			this.dicePool.push(roll);
		}

		// Determine roll result
		const rollTotals = multiroll.entries.map(r => r.roll.total);
		let chosenResult = rollTotals[0];
		if (rollState == "highest") {
			chosenResult = Math.max(...rollTotals);
		} else if (rollState == "lowest") {
			chosenResult = Math.min(...rollTotals);
		}

		// Mark the non-results as ignored
		multiroll.entries.filter(r => r.roll.total != chosenResult).forEach(r => r.ignored = true);

		// Update remaining properties
		// Update crit status if not forcing crit
		multiroll.rollState = rollState;
		if (!multiroll.forceCrit) {
			const group = this.entries.find((e) => e.attackId === multiroll.id);
			this.updateCritStatus(group?.id, multiroll.isCrit);
		}

		return true;
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

		Hooks.call("preRollItemBetterRolls", this);

		const { params, item } = this;
		const consume = this.params.consume;
		let placeTemplate = false;

		// Pre-update item configurations
		if (item) {
			await ItemUtils.ensureFlags(item, { commit: true });

			// Set up preset but only if there aren't fields
			if (!this.fields || this.fields.length === 0) {
				params.preset = params.preset ?? 0;
				if (Number.isInteger(params.preset)) {
					this.updateForPreset();
				}
			}

			// Determine spell level and configuration settings
			if (item.data.type === "spell" && consume && !params.slotLevel) {
				const config = await this.configureSpell();
				if (config === "error") {
					this.error = true;
					return;
				}

				placeTemplate = config.placeTemplate;
			}
		}

		// Show Advantage/Normal/Disadvantage dialog if enabled
		const hasAttack = this.fields.some(
			(f) => ["attack", "check", "custom", "tool", "toolcheck"].includes(f[0]) && !f[1]?.rollState);
		if (!this.params.rollState && getSettings().queryAdvantageEnabled && hasAttack) {
			const rollState = await new Promise(resolve => {
				new Dialog({
					title: i18n("br5e.querying.title"),
					buttons: {
						disadvantage: {
							label: i18n("br5e.querying.disadvantage"),
							callback: () => resolve("lowest")
						},
						normal: {
							label: i18n("br5e.querying.normal"),
							callback: () => resolve("first")
						},
						advantage: {
							label: i18n("br5e.querying.advantage"),
							callback: () => resolve("highest")
						}
					},
					close: () => resolve("cancel")
				}).render(true);
			});

			if (rollState === "cancel") {
				this.error = true;
				return;
			}

			this.params.rollState = rollState;
		}

		// Set ammo, and then consume it if so
		// This consumes even if consuming is globally disabled. Roll repeats need to consume ammo.
		if (item && await this.consumeAmmo() === "error") {
			this.error = true;
			return;
		}

		// Process all fields (this builds the data entries)
		for (const field of this.fields) {
			await this._processField(field);
		}

		// Post-build item updates
		if (item) {
			// Check to consume charges. Prevents the roll if charges are required and none are left.
			if (consume) {
				let chargeCheck = await this.consume();
				if (chargeCheck === "error") {
					this.error = true;
					return;
				}
			}

			// Load Item Footer Properties if params.properties is true
			if (params.properties) {
				this.properties = ItemUtils.getPropertyList(item);
			}

			// Place the template if applicable
			if (placeTemplate || (params.useTemplate && (item.data.type == "feat" || item.data.data.level == 0))) {
				ItemUtils.placeTemplate(item);
			}
		}

		this.rolled = true;
		this.error = false;
		await Hooks.callAll("rollItemBetterRolls", this);
		await new Promise(r => setTimeout(r, 25));

		// Add models (non-hidden) to dice pool (for 3D Dice)
		for (const entry of this.entries) {
			if (entry.type === "multiroll") {
				this.dicePool.push(...entry.entries.map(e => e.roll), entry.bonus);
			} else if (entry.type === "damage-group" && !entry.prompt) {
				for (const subEntry of entry.entries) {
					if (subEntry.type === "damage" || (subEntry.type === "crit" && subEntry.revealed)) {
						this.dicePool.push(subEntry.baseRoll, subEntry.critRoll);
					}
				}
			}
		}
	}

	async render() {
		this.content = Renderer.renderCard(this);
		await Hooks.callAll("renderBetterRolls", this);
		return this.content;
	}

	/**
	 * Allows this roll to be serialized into message flags.
	 * @private
	 */
	_getFlags() {
		const flags = {
			betterrolls5e: {
				version: Utils.getVersion(),
				actorId: this.actorId,
				itemId: this.itemId,
				tokenId: this.tokenId,
				isCrit: this.isCrit,
				entries: this.entries,
				properties: this.properties,
				params: this.params,
				fields: this.fields
			}
		};

		// Clear fields if any has an actor or item,
		// its too complicated for rerolling
		// We can probably handle it in the future somehow using FoundryProxy
		if (this.fields?.some(f => f[1]?.actor || f[1]?.item)) {
			console.log("BetterRolls5e | Roll fields are too complex for serialization, removing fields");
			flags.betterrolls5e.fields = null;
		}

		if (this.fields.some(f => f[0] === "attack")) {
			flags["dnd5e.roll.type"] = "attack";
		}

		if (this.itemId) {
			flags["dnd5e.roll.itemId"] = this.itemId;
		}

		// If the Item was destroyed in the process of displaying its card - embed the item data in the chat message
		const { actor, item } = this;
		if ((item?.data.type === "consumable") && !actor.items.has(item.id) ) {
			flags["dnd5e.itemData"] = item.data;
		}

		// Allow the roll to popout
		flags["core.canPopout"] = true;

		return flags;
	}

	/**
	 * Creates and sends a chat message to all players (based on whisper config).
	 * If not already rolled and rendered, roll() is called first.
	 * @param {object} param0 options
	 * @param {string} param0.rollMode roll mode to determine if private/public/etc
	 * @returns {Promise<ChatMessage>} the created chat message
	 */
	async toMessage({ rollMode=null, createMessage=true }={}) {
		if (!this.rolled) {
			await this.roll();
		}

		if (this.error) return;

		const item = this.item;
		const actor = this.actor ?? item?.actor;
		const hasMaestroSound = item && ItemUtils.hasMaestroSound(item);

		// Create the chat message
		const chatData = {
			user: game.user._id,
			content: await this.render(),
			speaker: {
				actor: actor?._id,
				token: actor?.token,
				alias: actor?.token?.name || actor?.name
			},
			flags: this._getFlags(),
			type: CONST.CHAT_MESSAGE_TYPES.ROLL,
			...Utils.getWhisperData(rollMode),

			// If not blank, D&D will try to modify the card...
			roll: new Roll("0").roll()
		};

		await Hooks.callAll("messageBetterRolls", this, chatData);
		await this.dicePool.flush(hasMaestroSound);

		// Send the chat message
		if (createMessage) {
			const message = await ChatMessage.create(chatData);
			this.messageId = message.id;
			return message;
		} else {
			return chatData;
		}
	}

	/**
	 * Returns true if the item can be rerolled.
	 * Items that only have text field types cannot be rerolled.
	 */
	canRepeat() {
		if (!this.hasPermission || !this.fields || this.fields.length === 0) {
			return false;
		}

		const surplusTypes = new Set(["header", "flavor", "description", "desc"]);
		for (const field of this.fields) {
			if (!surplusTypes.has(field[0])) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Repeats the roll, sending out a new chat message.
	 * This repeat does not consume uses, and overrides advantage/disadvantage / prompts
	 * @returns {Promise<CustomItemRoll>}
	 */
	async repeat() {
		if (!this.canRepeat()) return;

		// Show error messages if the item/actor was deleted
		const subject = this.item ?? this.actor;
		if ((this.itemId || this.actorId) && !subject) {
			const message = this.actor ? i18n("br5e.error.noItemWithId") : i18n("br5e.error.noActorWithId");
			ui.notifications.error(message);
			throw new Error(message);
		}

		const invalidFields = ["description", "desc"];
		const fields = duplicate(this.fields.filter(f => !invalidFields.includes(f[0])));
		const params = duplicate(this.params);
		params.consume = false;
		params.rollState = Utils.getRollState({ event });

		const newRoll = new CustomItemRoll(subject, params, fields);
		await newRoll.toMessage();
		return newRoll;
	}

	/**
	 * Updates the associated chat message to have this HTML as its content.
	 * Nothing updates until this method is called.
	 * Requires the chat message to already exist.
	 */
	async update(additional={}) {
		const chatMessage = game.messages.get(this.messageId);
		if (chatMessage) {
			const hasMaestroSound = this.item && ItemUtils.hasMaestroSound(this.item);
			const content = await this.render();
			await Hooks.callAll("updateBetterRolls", this, content);
			await this.dicePool.flush(hasMaestroSound);
			await chatMessage.update({
				...flattenObject({ flags: duplicate(this._getFlags()) }),
				content,
				...additional
			}, { diff: true });
		}
	}

	/**
	 * Equivalent to addField()
	 * @param {*} field
	 * @deprecated
	 */
	fieldToTemplate(field) {
		return this.addField(field);
	}

	/**
	 * Adds to the list of fields, and if already rolled, processes it immediately
	 * @param {string | [string, Object]} field
	 * @param {Object?} data
	 */
	async addField(field, data) {
		// Backwards compatibility. String+data or an array of [name, data] are both supported
		if (typeof field === "string") {
			field = [field, data];
		}

		if (this.rolled) {
			await this._processField(field);
		} else {
			this.fields.push(field);
		}
	}

	/**
	 * Function that immediately processes the field and adds the result to data
	 * @param {[string, Object]} field
	 * @private
	 */
	async _processField(field) {
		let consume = this.item?.data.data.consume;
		const ammo = consume?.type === "ammo" ? this.actor?.items.get(consume.target) : null;

		const metadata = {
			item: this.item,
			actor: this.actor,
			rollState: this.params.rollState,
			ammo,
			slotLevel: this.params.slotLevel,
			isCrit: this.isCrit,
			settings: this.settings
		};

		// Add non-null entries
		const newEntries = await RollFields.constructModelsFromField(field, metadata, settings);
		newEntries.forEach(this._addRenderEntry.bind(this));
	}

	/**
	 * Creates and increments an id for internal identification
	 * @private
	 */
	_createId() {
		if (this._currentId < 0) {
			const existing = this.entriesFlattened().map(e => Number(e.id));
			this._currentId = Math.max(...existing.filter(id => !isNaN(id))) + 1;
		}
		return `${this._currentId++}`;
	}

	/**
	 * Adds a render entry to the list. Does not add to dicepool, but does flag for crit.
	 * If damage prompt is enabled, any damage entries will be hidden unless hidden has a value.
	 * @param {import("./renderer.js").RenderModelEntry} entry
	 * @private
	 */
	_addRenderEntry(entry) {
		if (!entry) return;

		if (entry.type === "multiroll") {
			if (!this.params.forceCrit && (entry.triggersCrit ?? true)) {
				this.isCrit = entry.isCrit;
			}
		}

		// Assign groups for damage
		const isDamageEntry = ["damage", "crit"].includes(entry.type);
		if (isDamageEntry) {
			// Try to add to the last existing group, however multiroll/saves are junctions (stopping points)
			let groupEntry = findLast(this.entries, (e) =>
				["damage-group", "multiroll", "button-save"].includes(e?.type)
			);

			// Create group if does not exist
			if (groupEntry?.type !== "damage-group") {
				// Find last attack roll, and link to it
				const reversedEntries = [...this.entries].reverse();
				const lastAttack = reversedEntries.find((e) => e.type === "multiroll");
				const hasAttackOrSave = this.entries.some((e) => e.type === "multiroll" || e.type === "button-save");
				groupEntry = {
					id: this._createId(),
					type: "damage-group",
					attackId: lastAttack?.id,
					isCrit: lastAttack?.isCrit,
					prompt: hasAttackOrSave && this.settings.damagePromptEnabled,
					entries: [],
				};

				this.entries.push(groupEntry);
			}

			// Reveal if this was a crit entry, and the group crit
			if (entry.type === "crit" && groupEntry.isCrit) {
				entry.revealed = true;
			}

			// Assign an id and add to group
			entry.id = this._createId();
			entry.group = groupEntry.id;
			groupEntry.entries.push(entry)
		} else {
			// Non-damage entry. Assign an id and add to list
			entry.id = this._createId();
			this.entries.push(entry);
		}
	}

	/**
	 * Updates the rollRequests based on the br5e flags.
	 * This creates the default set of fields to process.
	 */
	updateForPreset() {
		if (!this.item) return;

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

			// Returns the flag or alt-flag depending on setting
			function getFlag(flag) {
				return (brFlags[flag] ? (brFlags[flag][val]) : null);
			}

			if (flagIsTrue("quickFlavor") && itemData.chatFlavor) { fields.push(["flavor"]); }
			if (flagIsTrue("quickDesc")) { fields.push(["desc"]); }
			if (flagIsTrue("quickAttack") && isAttack(item)) { fields.push(["attack"]); }
			if (flagIsTrue("quickCheck") && isCheck(item)) { fields.push(["check"]); }
			if (flagIsTrue("quickSave") && isSave(item)) { fields.push(["savedc"]); }

			const quickDamage = Object.entries(getFlag("quickDamage") ?? []);
			if (quickDamage.length > 0) {
				for (let [i, damage] of quickDamage) {
					const index = Number(i);
					const versatile = (index == 0) && flagIsTrue("quickVersatile");
					if (damage) {
						fields.push(["damage", { index, versatile }]);
					}
				}

				// Roll ammo after damage (if any)
				fields.push(["ammo"]);
			}

			if (flagIsTrue("quickOther") && itemData?.formula) { fields.push(["other"]); }
			if (flagIsTrue("quickProperties")) { properties = true; }

			if (brFlags.quickCharges) {
				useCharge = duplicate(getFlag("quickCharges"));
			}
			if (flagIsTrue("quickTemplate")) { useTemplate = true; }

			if (quickDamage.length > 0 && brFlags.critDamage?.value) {
				fields.push(["crit"]);
			}
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

		this.fields = fields.concat((this.fields || []).slice());
	}

	/**
	 * Determine the spell level and spell slot consumption if this is an item,
	 * and returns the spell configuration, or "error" on forced close.
	 */
	async configureSpell() {
		let { item, actor } = this;
		let spellLevel = null;
		let consume = false;
		let placeTemplate = false;

		const data = item.data.data;

		// Only run the dialog if the spell is not a cantrip
		const isSpell = item.type === "spell";
		const requireSpellSlot = isSpell && (data.level > 0) && CONFIG.DND5E.spellUpcastModes.includes(data.preparation.mode);
		if (requireSpellSlot) {
			// The ability use dialog shows consumption prompts, but we cannot control the default values
			// therefore we have to remove them then add them back.
			const propsToRemove = ["uses", "recharge"];
			let extracted = {};
			try {
				extracted = pick(data, propsToRemove);
				propsToRemove.forEach((prop) => delete data[prop]);

				const spellFormData = await game.dnd5e.applications.AbilityUseDialog.create(item);
				if (!spellFormData) {
					return "error";
				}

				spellLevel = spellFormData.level;
				consume = Boolean(spellFormData.consumeSlot);
				placeTemplate = Boolean(spellFormData.placeTemplate);
			} catch(error) {
				console.error(error);
				return "error";
			} finally {
				// Restore the stripped props
				mergeObject(data, extracted);
			}
		} else {
			// If there's no dialog, always show the template if enabled
			placeTemplate = item.hasAreaTarget && this.params.useTemplate;
		}

		// If consume is enabled, mark which slot is getting consumed
		if (consume) {
			consume = spellLevel === "pact" ? "pact" : `spell${spellLevel}`;
		}

		if (spellLevel == "pact") {
			spellLevel = getProperty(actor, `data.data.spells.pact.level`) || spellLevel;
		}

		if (spellLevel !== item.data.data.level) {
			item = item.constructor.createOwned(mergeObject(duplicate(item.data), {"data.level": spellLevel}, {inplace: false}), actor);
		}

		this.params.slotLevel = spellLevel;
		this.params.consumeSpellSlot = consume;
		return { lvl: spellLevel, consume, placeTemplate };
	}

	/**
	 * Consumes resources assigned on an item, if that resource is ammo.
	 * If Item5e.rollAttack() ever allows a consumeAmmo flag, we can remove it.
	 */
	async consumeAmmo() {
		const { item, actor } = this;
		if (!item) return;

		const request = this.params.useCharge;
		const consume = item.data.data.consume;

		// Consume Ammo (if configured to do so)
		if (request.resource && consume?.type === "ammo") {
			const ammo = actor.items.get(consume.target);
			const usage = item._getUsageUpdates({consumeResource: true});
			if (usage === false) return "error";
			const ammoUpdate = usage.resourceUpdates || {};
			if (ammo && !isObjectEmpty(ammoUpdate)) {
				await ammo.update(ammoUpdate);
			}
		}

		return "success";
	}

	/**
	 * Consumes charges & resources assigned on an item.
	 * NOTE: As of D&D System 1.2, all of this can now be handled internally by Item._handleConsumeResource.
	 * This was tweaked to support 1.2, but we are waiting and seeing before moving everything over.
	 * We might no longer need specialized use/consume code.
	 * @private
	 */
	async consume() {
		const { item, actor } = this;
		if (!item) return;

		let actorUpdates = {};
		let itemUpdates = {};
		let resourceUpdates = {};

		// Merges update data from _getUsageUpdates() into the result dictionaries
		// Note: mergeObject() also resolves "." nesting which is not what we want
		function mergeUpdates(updates) {
			actorUpdates = { ...actorUpdates, ...(updates.actorUpdates ?? {})};
			itemUpdates = { ...itemUpdates, ...(updates.itemUpdates ?? {})};
			resourceUpdates = { ...resourceUpdates, ...(updates.resourceUpdates ?? {})};
		}

		const itemData = item.data.data;
		const hasUses = !!(itemData.uses?.value || itemData.uses?.max); // Actual check to see if uses exist on the item, even if params.useCharge.use == true
		const hasResource = !!(itemData.consume?.target); // Actual check to see if a resource is entered on the item, even if params.useCharge.resource == true

		const request = this.params.useCharge; // Has bools for quantity, use, resource, and charge
		const recharge = itemData.recharge || {};
		const uses = itemData.uses || {};
		const quantity = itemData.quantity;
		const autoDestroy = uses.autoDestroy;

		let output = "success";

		// Identify what's being consumed. Note that ammo is consumed elsewhere
		const consumeSpellSlot = this.params.consumeSpellSlot;
		const consumeResource = hasResource && request.resource && itemData.consume.type !== "ammo";
		const consumeUsage = request.use && hasUses;
		const consumeQuantity = request.quantity || autoDestroy;

		// Check for consuming quantity, but not uses
		if (request.quantity && !consumeUsage) {
			if (!quantity) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming charge ("Action Recharge")
		if (request.charge) {
			if (!recharge.charged) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Consume resources and spell slots
		if (consumeResource || consumeSpellSlot) {
			const updates = item._getUsageUpdates({ consumeResource, consumeSpellSlot });
			if (!updates) return "error";
			mergeUpdates(updates);
		}

		// Consume quantity and uses
		if (consumeQuantity && !consumeUsage) {
			// Handle quantity when uses are not consumed
			// While the rest can be handled by Item._getUsageUpdates() as of DND 1.2.0, this one thing cannot
			itemUpdates["data.quantity"] = Math.max(0, quantity - 1);
		} else if (consumeUsage) {
			// Handle cases where charge consumption is a thing (uses with quantity consumption OR auto destroy)
			const updates = item._getUsageUpdates({ consumeUsage, consumeQuantity });
			if (!updates) return "error";
			mergeUpdates(updates);

			// Work around a bug in Item._getUsageUpdates(). Once this bug is fixed we can remove this code
			if (itemUpdates["data.quantity"] === 0) {
				itemUpdates["data.uses.value"] = 0;
			}
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

		// Destroy item if it gets consumed
		if (itemUpdates["data.quantity"] === 0 && autoDestroy) {
			output = "destroy";
			await actor.deleteOwnedItem(item.id);
		}

		return output;
	}
}
