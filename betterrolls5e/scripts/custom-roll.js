import { isAttack, isSave, isCheck } from "./betterrolls5e.js";
import { dnd5e, i18n, DiceCollection, ActorUtils, ItemUtils, Utils, FoundryProxy } from "./utils.js";
import { Renderer } from "./renderer.js";
import { getSettings } from "./settings.js";
import { RollFields } from "./fields.js";

/**
 * Parameters used when full rolling an actor
 * @typedef FullRollActorParams
 * @type {object}
 * @property {number?} adv 
 * @property {number?} disadv 
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
	 */
	static async fullRollActor(actor, title, formula, rollType, params) {		
		// Entries to show for the render
		return new CustomItemRoll(actor, {}, [
			['header', { title }],
			['check', {
				formula,
				rollState: Utils.getRollState({ event, ...params }), 
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
		return CustomRoll.fullRollActor(actor, label, formula, "skill", params);
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

		return CustomRoll.fullRollActor(actor, titleString, formula, rollType, params);
	}
	
	static newItemRoll(itemOrActor, params, fields) {		
		return new CustomItemRoll(itemOrActor, params, fields);
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
		params.rollState = Utils.getRollState(params);
		delete params.event;

		this.params = mergeObject(duplicate(defaultParams), params || {});	// General parameters for the roll as a whole.
		this.fields = fields ?? [];	// Where requested roll fields are stored, in the order they should be rendered.

		/** @type {Array<import("./renderer.js").RenderModelEntry>} */
		this.entries = []; // Data results from fields, which get turned into templates
		this.properties = [];
		
		this.rolled = false;
		this.isCrit = this.params.forceCrit || false;			// Defaults to false, becomes "true" when a valid attack or check first crits.
		this.dicePool = new DiceCollection();
	}

	static fromMessage(message) {
		const data = message.data.flags.betterrolls5e;
		const roll = new CustomItemRoll(null, data.params, []);
		roll.messageId = message.id;
		roll.rolled = true;
		roll.isCrit = data.isCrit;
		roll.entries = FoundryProxy.create(data.entries);
		roll.properties = data.properties;
		roll.params = data.params;

		// Set these up so that lazy loading can be done
		roll.actorId = data.actorId;
		roll.itemId = data.itemId;
		roll.tokenId = data.tokenId;
		roll.storedItemData = message.getFlag("dnd5e", "itemData");

		return roll;
	}

	set item(item) {
		this._item = item;
		this.itemId = item.id;
		this.actor = item?.actor;
	}

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
		if (!item) {
			const message = this.actor ? i18n("br5e.error.noItemWithId") : i18n("br5e.error.noActorWithId");
			ui.notifications.error(message);
			throw new Error(message);
		}

		this._item = item; // store a backup so we don't need to fetch again
		return item;
	}

	set actor(actor) {
		this._actor = actor;
		this.actorId = actor.id;
		this.tokenId = actor?.token ? ActorUtils.getTokenId(actor.token) : null;
	}

	/**
	 * Returns the actor associated 
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
	 */
	get hasPermission() {
		const message = game.messages.get(this.messageId);
		return game.user.isGM || message?.isAuthor;
	}
	
	/**
	 * Rolls crit dice if its not already rolled for the current card.
	 * This is used when *augmenting* an existing roll to a crit.
	 * @param {string | null} group If not null, limits the updates to the specified group
	 * @param {boolean} isCrit Whether to enable or disable crits
	 * @returns if the crit roll went through
	 */
	async updateCritStatus(group, isCrit) {
		// Do nothing if crit is already rolled or if we don't have permission
		const critBehavior = this.settings.critBehavior;
		if ((isCrit && critBehavior === "0") || !this.hasPermission) {
			return false;
		}

		const item = this.item;
		let updated = false;

		for (const damage of this.entries) {
			if (damage.type === "damage" && damage.damageIndex !== "other") {
				if (group && damage.group !== group) {
					continue;
				}

				if (isCrit && damage.critRoll == null) {
					// Enable Crit (from backup if available)
					if (damage.critBackup) {
						damage.critRoll = damage.critBackup;
					} else {
						const baseRoll = damage.baseRoll;
						const savage = ItemUtils.appliesSavageAttacks(item);
						damage.critRoll = ItemUtils.getCritRoll(baseRoll.formula, baseRoll.total, { settings, savage });
						this.dicePool.push(damage.critRoll);	
					}

					updated = true;
				} else if (!isCrit && damage.critRoll) {
					// Disable crit but keep a backup
					damage.critBackup = damage.critRoll;
					damage.critRoll = undefined;
					updated = true;
				}
			}
		}

		return updated;
	}

	/**
	 * Rolls damage for a damage group. Returns true if successful
	 * @param {string} group
	 */
	async rollDamage(group) {
		if (!this.hasPermission || !this.entries?.length) {
			return false;
		}

		// Get the relevant damage group
		group = encodeURIComponent(group);

		const newEntries = [];
		for (const entry of this.entries) {
			if (entry.type === "button-damage" && entry.group === group) {
				continue;
			}

			if (entry.type === "damage" && entry.group === group) {
				entry.hidden = false;
				this.dicePool.push(entry.baseRoll, entry.critRoll);
			}

			newEntries.push(entry);
		}

		// New data render entries with damage prompts removed
		this.entries = newEntries;
		return true;
	}

	/**
	 * Assigns a RollState to a multiroll entry. Cannot be used to unset it.
	 * @param {*} id 
	 * @param {*} rollState 
	 */
	async updateRollState(id, rollState) {
		if (!this.hasPermission || !this.entries?.length || !rollState) {
			return false;
		}

		const multiroll = this.entries.find(m => m.id === id);
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
		multiroll.rollState = rollState;
		multiroll.isCrit = multiroll.entries.some(e => !e.ignored && e.isCrit);

		// Update crit status
		this.updateCritStatus(multiroll.group, multiroll.isCrit);
		
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
		if (Number.isInteger(params.preset)) {
			this.updateForPreset();
		}

		let placeTemplate = false;

		// Pre-update item configurations
		if (item) {
			await ItemUtils.ensureFlags(item, { commit: true });
			const itemData = item?.data.data;

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
				if (config === "error") { 
					this.error = true;
					return;
				}

				placeTemplate = config.placeTemplate;
			}
		}

		// Process all fields (this builds the data entries)
		for (const field of this.fields) {
			this._processField(field);
		}

		// If this was a crit and there are damage entries, handle any bonus crit damage
		const hasDamage = this.entries.some(m => m.type === "damage");
		if (this.isCrit && hasDamage && this.item?.data.flags.betterRolls5e?.critDamage?.value) {
			this._processField(["crit"]);
		}

		// Post-build item updates
		if (item) {
			// Check to consume charges. Prevents the roll if charges are required and none are left.
			let chargeCheck = await this.consume();
			if (chargeCheck === "error") {
				this.error = true;
				return;
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

		// If damage buttons are enabled, hide damage entries under certain conditions
		if (getSettings(this.settings)) {
			// Insert damage buttons before all damage entries
			const newEntries = [];
			const injectedGroups = new Set();
			for (const entry of this.entries) {
				if (entry.type === "damage" && entry.hidden && !injectedGroups.has(entry.group)) {
					injectedGroups.add(entry.group);
					newEntries.push({
						type: "button-damage",
						group: entry.group
					});
				}
				newEntries.push(entry);
			}

			this.entries = newEntries;
		}
		
		// Add models (non-hidden) to dice pool
		for (const entry of this.entries.filter(e => !e.hidden)) {
			if (entry.type === "multiroll") {
				this.dicePool.push(...entry.entries.map(e => e.roll), entry.bonus);
			} else if (entry.type === "damage") {
				this.dicePool.push(entry.baseRoll, entry.critRoll);
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
				version: game.modules.get("betterrolls5e").data.version,
				actorId: this.actorId,
				itemId: this.itemId,
				tokenId: this.tokenId,
				isCrit: this.isCrit,
				entries: this.entries,
				properties: this.properties,
				params: this.params
			}
		}

		// If the Item was destroyed in the process of displaying its card - embed the item data in the chat message
		const { actor, item } = this;
		if ((item?.data.type === "consumable") && !actor.items.has(item.id) ) {
			flags["dnd5e.itemData"] = item.data;
		}

		return flags;
	}

	/**
	 * Creates and sends a chat message to all players (based on whisper config).
	 * If not already rolled and rendered, roll() is called first.
	 * @returns {Promise<ChatMessage>} the created chat message
	 */
	async toMessage() {
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
			roll: new Roll("0").roll(),
			...Utils.getWhisperData(),
			sound: Utils.getDiceSound(hasMaestroSound)
		};
		
		await Hooks.callAll("messageBetterRolls", this, chatData);

		// Send the chat message
		await this.dicePool.flush();
		return ChatMessage.create(chatData);
	}

	/**
	 * Updates the associated chat message to have this HTML as its content.
	 * Nothing updates until this method is called.
	 * Requires the chat message to already exist.
	 */
	async update() {
		const chatMessage = game.messages.get(this.messageId);
		if (chatMessage) {
			const content = await this.render();
			await Hooks.callAll("updateBetterRolls", this, content);
			await this.dicePool.flush();
			await chatMessage.update({
				...flattenObject({ flags: duplicate(this._getFlags()) }),
				content
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
	 * @param {[string, Object]} field
	 */
	addField(field) {
		this.fields.push(field);
		if (this.rolled) {
			return this._processField(field);
		}
	}

	/**
	 * Function that immediately processes the field and adds the result to data
	 * @param {[string, Object]} field
	 * @private
	 */
	_processField(field) {
		const metadata = {
			item: this.item,
			actor: this.actor,
			rollState: this.params.rollState,
			ammo: this.ammo,
			slotLevel: this.params.slotLevel,
			isCrit: this.isCrit,
			settings: this.settings
		};

		// Add non-null entries
		const newEntries = RollFields.constructModelsFromField(field, metadata);
		newEntries.forEach(this.addRenderEntry.bind(this));
	}

	/**
	 * Adds a render entry to the list. Does not add to dicepool, but does flag for crit.
	 * If damage prompt is enabled, any damage entries will be hidden unless hiden has a value.
	 * @param {import("./renderer.js").RenderModelEntry} entry 
	 */
	addRenderEntry(entry) {
		if (!entry) return;

		if (entry.type === "multiroll") {
			if (!this.params.forceCrit && (entry.triggersCrit ?? true)) {
				this.isCrit = entry.isCrit;
			}
		}

		if (entry.type === "multiroll" || entry.type === "button-save") {
			// Assign roll group
			this._lastGroupIdx = (this._lastGroupIdx ?? -1) + 1;
			entry.group = `br!${this._lastGroupIdx}`
		}

		if (entry.type === "damage") {
			entry.hidden = entry.hidden ?? getSettings(this.settings).damagePromptEnabled;
			const lastGroup = [...this.entries].reverse().find(e => e.group)?.group;
			if (lastGroup) {
				entry.group = lastGroup;
			}
		}

		this.entries.push(entry);
	}
	
	/**
	 * Updates the rollRequests based on the br5e flags.
	 * This creates the default set of fields to process.
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
		
		this.fields = fields.concat((this.fields || []).slice());
	}

	/**
	 * Determine the spell level and spell slot consumption if this is an item,
	 * and returns the spell configuration, or "error" on forced close.
	 */
	async configureSpell() {
		let { item, actor } = this;
		let lvl = null;
		let consume = false;
		let placeTemplate = false;
		
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
			lvl = getProperty(actor, `data.data.spells.pact.level`) || lvl;
		}
		
		if (lvl !== item.data.data.level) {
			item = item.constructor.createOwned(mergeObject(duplicate(item.data), {"data.level": lvl}, {inplace: false}), actor);
		}
		
		this.params.slotLevel = lvl;
		this.params.consumeSlot = consume;
		return { lvl, consume, placeTemplate };
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

		const actorUpdates = {};
		const itemUpdates = {};
		const resourceUpdates = {};

		// Determine spell slot to consume (this can eventually be fed into _getUsageUpdates())
		const spellLevel = this.params.slotLevel;
		let consumeSpellSlot = false;
		if (this.params.consumeSlot) {
			consumeSpellSlot = spellLevel === "pact" ? "pack" : `spell${spellLevel}`;
		}

		// Update Actor data to deduct spell slots
		if (consumeSpellSlot) {
			const slots = parseInt(actor.data.data.spells[consumeSpellSlot].value);
			if (slots === 0 || Number.isNaN(slots)) {
				const label = game.i18n.localize(consumeSpellSlot === "pact" ? "DND5E.SpellProgPact" : `DND5E.SpellLevel${spellLevel}`);
				ui.notifications.warn(game.i18n.format("DND5E.SpellCastNoSlots", {name: item.name, level: label}));
				return "error";
			}

			actorUpdates[`data.spells.${consumeSpellSlot}.value`] = Math.max(slots - 1, 0);
		}

		const itemData = item.data.data;
		const hasUses = !!(itemData.uses?.value || itemData.uses?.max); // Actual check to see if uses exist on the item, even if params.useCharge.use == true
		const hasResource = !!(itemData.consume?.target); // Actual check to see if a resource is entered on the item, even if params.useCharge.resource == true

		const request = this.params.useCharge; // Has bools for quantity, use, resource, and charge
		const recharge = itemData.recharge || {};
		const uses = itemData.uses || {};
		const current = uses.value || 0;
		const quantity = itemData.quantity;
		
		const autoDestroy = uses.autoDestroy || request.quantity;

		let output = "success";

		// Check for consuming uses, but not quantity
		if (hasUses && request.use && !request.quantity) {
			if (!current) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming quantity, but not uses
		if (request.quantity && !request.use) {
			if (!quantity) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming quantity and uses
		if (hasUses && request.use && request.quantity) {
			if (!current && quantity <= 1) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
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

		// Handle quantity when uses are not consumed
		// While the rest can be handled by Item._getUsageUpdates() as of DND 1.2.0, this one thing cannot
		// We are waiting and seeing what the DND system uses before moving everything over
		if (request.quantity && !request.use) {
			if (quantity <= 1 && autoDestroy) {
				output = "destroy";
			}
			itemUpdates["data.quantity"] = quantity - 1;
		}

		// Handle cases where charge consumption is a thing (uses with quantity consumption OR auto destroy)
		// This can be handled by Item._getUsageUpdates() in DND 1.2.0, but leaving it here just in case
		if (request.use && hasUses) {
			const remaining = request.use ? Math.max(current - 1, 0) : current;
			
			if (!autoDestroy) {
				// Handle uses if quantity is not affected
				itemUpdates["data.uses.value"] = remaining;
			} else {
				// Handle quantity and uses
				let remainingU = remaining;
				let remainingQ = quantity;
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
		if (output === "destroy") {
			await actor.deleteOwnedItem(item.id);
		}

		return output;
	}
}
