import { CustomRoll } from "./custom-roll.js";
import { Renderer } from "./renderer.js";
import { BRSettings, getSettings } from "./settings.js";
import { i18n, DiceCollection, ItemUtils, Utils, FoundryProxy } from "./utils.js";

/**
 * Class that encapsulates a better rolls card at runtime.
 * When a chat message enters the chat it should be binded 
 * with BetterRollsChatCard.bind().
 */
export class BetterRollsChatCard {
	constructor(message, html) {
		this.dicePool = new DiceCollection();
		this.updateBinding(message, html);
	}

	get message() {
		return ChatMessage.collection.get(this.id);
	}

	/**
	 * Initializes data. Used in the constructor or by BetterRollsChatCard.bind().
	 * @param {*} message 
	 * @param {*} html
	 * @private
	 */
	updateBinding(message, html) {
		// IMPLEMENTATION WARNING: DO NOT STORE html into the class properties (NO this.html AT ALL)
		// Foundry will sometimes call renderChatMessage() multiple times with un-bound HTML,
		// and we can't do anything except rely on closures to handle those events.
		this.id = message.id;
		const flags = FoundryProxy.create(message.data.flags?.betterrolls5e ?? {});
		
		/** @type {import("./renderer.js").RenderModel} */
		this.data = flags.data;

		this.params = flags.params;
		
		this.speaker = game.actors.get(message.data.speaker.actor);
		this.actorId = html.attr("data-actor-id");
		this.itemId = html.attr("data-item-id");
		this.tokenId = html.attr("data-token-id");

		// Hide Save DCs
		const actor = this.speaker;
		if ((!actor && !game.user.isGM) || actor?.permission != 3) {
			html.find(".hideSave").text(i18n("br5e.hideDC.string"));
		}

		// Setup the events for card buttons (the permanent ones, not the hover ones)
		this._setupCardButtons(html);
		
		// Setup hover buttons when hovered (for optimization)
		// Just like with html, we cannot save hoverInitialized to the object
		let hoverInitialized = false;
		html.hover(async () => {
			if (!hoverInitialized) {
				hoverInitialized = true;
				await this._setupOverlayButtons(html);
				this._onHover(html);
				console.log("BetterRolls5e | Hover Buttons Initialized");
			}
		})
	}

	/**
	 * Inflates an existing chat message, adding runtime elements
	 * and events to it. Does nothing if the message is not the correct type.
	 * @param {ChatMessage} message 
	 * @param {JQuery} html 
	 */
	static bind(message, html) {
		const chatCard = html.find('.red-full');
		if (chatCard.length === 0) { 
			return null;
		}

		// Check if the card already exists
		const existing = message.BetterRollsCardBinding;
		if (existing) {
			console.log("BetterRolls5e | Retrieved existing card");
			existing.updateBinding(message, chatCard);

			// Scroll to bottom if the last card had updated
			const last = ChatMessage.collection.entries[ChatMessage.collection.entries.length - 1];
			if (last?.id === existing.id) {
				window.setTimeout(() => { ui.chat.scrollBottom(); }, 0);
			}

			return existing;
		} else {
			const newCard = new BetterRollsChatCard(message, chatCard);
			message.BetterRollsCardBinding = newCard;
			return newCard;
		}
	}

	/**
	 * Returns the settings saved into this card.
	 * Currently returns global settings, but eventually 
	 * setting overrides should be saved onto this card.
	 */
	get settings() {
		return getSettings();
	}

	/**
	 * Returns Actor5e object associated with this card,
	 * preferring the token actor.
	 */
	get actor() {
		if (this.tokenId) {
			const [sceneId, tokenId] = this.tokenId.split(".");
			
			const scene = game.scenes.get(sceneId);
			if (!scene) return null;

			const tokenData = scene.getEmbeddedEntity("Token", tokenId);
			if (!tokenData) return null;

			const token = new Token(tokenData);
			return token.actor;
		}

		return game.actors.get(this.actorId);
	}

	/**
	 * Returns the item instance associated with this card.
	 */
	get item() {
		const storedData = this.message.getFlag("dnd5e", "itemData");
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

		return item;
	}

	/**
	 * Getter to retrieve if the current user has advanced permissions over the chat card.
	 */
	get hasPermission() {
		const message = game.messages.get(this.id);
		return game.user.isGM || message?.isAuthor;
	}

	/**
	 * Rolls crit dice if its not already rolled for the current card.
	 * This is used when *augmenting* a roll to a crit, and not the initial render.
	 * The change is not sent to users until update() is called.
	 * @param {string | null} group If not null, limits the updates to the specified group
	 * @param {boolean} isCrit Whether to enable or disable crits
	 * @returns if the crit roll went through
	 */
	async updateCritStatus(group, isCrit) {
		// Do nothing if crit is already rolled or if we don't have permission
		const settings = this.settings;
		const critBehavior = settings.critBehavior;
		if ((isCrit && critBehavior === "0") || !this.hasPermission) {
			return false;
		}

		const item = this.item;
		let updated = false;

		for (const damage of this.data.entries) {
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
		if (!this.hasPermission || !this.data) {
			return false;
		}

		// Get the relevant damage group
		group = encodeURIComponent(group);

		const newEntries = [];
		for (const entry of this.data.entries) {
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
		this.data.entries = newEntries;
		return true;
	}

	/**
	 * Assigns a RollState to a multiroll entry. Cannot be used to unset it.
	 * @param {*} id 
	 * @param {*} rollState 
	 */
	async updateRollState(id, rollState) {
		if (!this.hasPermission || !this.data || !rollState) {
			return false;
		}

		const multiroll = this.data.entries.find(m => m.id === id);
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
			const roll = new Roll(multiroll.formula).roll();
			multiroll.entries.push(Utils.processRoll(roll, multiroll.critThreshold, [20]));
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
	 * Updates a chat message to have this HTML as its content.
	 * Nothing updates until this method is called.
	 * @param message 
	 */
	async update() {
		const chatMessage = this.message;
		if (chatMessage) {
			const { actor, item, params, data } = this;
			const settings = this.settings;
			const content = await Renderer.renderCard(data, { actor, item, settings })

			await this.dicePool.flush();
			await chatMessage.update({
				'flags.betterrolls5e': duplicate({data, params}),
				content
			}, { diff: true });
		}
	}

	/**
	 * Internal method to setup the temporary buttons used to update advantage or disadvantage,
	 * as well as those that that affect damage
	 * entries, like crit rolls and damage application.
	 */
	async _setupOverlayButtons(html) {
		// Multiroll buttons (perhaps introduce a new toggle property?)
		if (this.data && BRSettings.chatDamageButtonsEnabled) {
			const templateMulti = await renderTemplate("modules/betterrolls5e/templates/red-multiroll-overlay.html");
			
			// Add multiroll overlay buttons to the DOM.
			for (const entry of this.data.entries) {
				if (entry.type === "multiroll" && !entry.rollState) {
					const element = html.find(`.red-dual[data-id=${entry.id}] .dice-row.red-totals`);
					element.append($(templateMulti));
				}
			}

			// Handle clicking the multi-roll overlay buttons
			html.find(".multiroll-overlay-br button").click(async event => {
				event.preventDefault();
				event.stopPropagation();
				const button = event.currentTarget;
				const id = $(button).parents(".red-dual").attr('data-id');
				const action = button.dataset.action;
				if (action === "rollState") {
					const rollState = button.dataset.state;
					if (await this.updateRollState(id, rollState)) {
						await this.update();
					}
				}
			});
		}

		// Setup augment crit and apply damage button
		if (BRSettings.chatDamageButtonsEnabled) {
			const templateDamage = await renderTemplate("modules/betterrolls5e/templates/red-damage-overlay.html");
			const dmgElements = html.find('.red-base-die').parents('.dice-total').toArray(); 
			const customElements = html.find('[data-type=custom] .red-base-die').toArray();
			
			[...dmgElements, ...customElements].forEach(element => {
				element = $(element);
				element.append($(templateDamage));

				// Remove crit button if already rolled
				const id = element.parents('.dice-roll').attr('data-id');
				const entry = this.data?.entries.find(m => m.id === id);
				if (!entry || entry?.critRoll != null || entry?.damageIndex === "other") {
					element.find('.crit-button').remove();
				}
			});
		
			// Handle apply damage overlay button events
			html.find('.apply-damage-buttons button').click(async ev => {
				ev.preventDefault();
				ev.stopPropagation();
		
				// find out the proper dmg thats supposed to be applied
				const dmgElement = $(ev.target.parentNode.parentNode.parentNode.parentNode);
				let dmg = dmgElement.find('.red-base-die').text();
		
				if (dmgElement.find('.red-extra-die').length > 0) {
					const critDmg = dmgElement.find('.red-extra-die').text();
					const dialogPosition = {
						x: ev.originalEvent.screenX,
						y: ev.originalEvent.screenY
					};
		
					dmg = await this._applyCritDamageToActor(Number(dmg), Number(critDmg), dialogPosition);
				}
		
				// getting the modifier depending on which of the buttons was pressed
				let modifier = ev.target.dataset.modifier;
		
				// sometimes the image within the button triggers the event, so we have to make sure to get the proper modifier value
				if (modifier === undefined) {
					modifier = $(ev.target).parent().attr('data-modifier');
				}
		
				// applying dmg to the targeted token and sending only the span that the button sits in 
				const targetActors = Utils.getTargetActors() || [];
				targetActors.forEach(actor => { actor.applyDamage(dmg, modifier) })
				
				setTimeout(() => { 
					if (canvas.hud.token._displayState && canvas.hud.token._displayState !== 0) {
						canvas.hud.token.render();
					}
				}, 50);
			});

			// Handle crit button application event
			html.find('.crit-button').on('click', async (ev) => {
				ev.preventDefault();
				ev.stopPropagation();
				const group = $(ev.target).parents('.dice-roll').attr('data-group');
				if (await this.updateCritStatus(group, true)) {
					await this.update();
				}
			});
		}

		// Enable Hover Events (to show/hide the elements)
		this._onHoverEnd(html);
		html.hover(this._onHover.bind(this, html), this._onHoverEnd.bind(this, html));
	}

	_onHover(html) {
		const { hasPermission } = this;
		html.find(".die-result-overlay-br").show();

		// Apply Damage / Augment Crit
		const controlled = canvas?.tokens.controlled.length > 0;
		html.find('.multiroll-overlay-br').toggle(hasPermission);
		html.find('.crit-button').toggle(hasPermission);
		html.find('.apply-damage-buttons').toggle(controlled);
	}

	_onHoverEnd(html) {
		html.find(".die-result-overlay-br").attr("style", "display: none;");
	}
	
	async _applyCritDamageToActor(dmg, critdmg, position) {
		const dialogResult = await new Promise(async (resolve, reject) => {
			const options = {
				left: position.x,
				top: position.y,
				width: 100 
			};

			const data = {
				title: i18n("br5e.chat.damageButtons.critPrompt.title"),
				content: "",
				buttons: {
					one: {
						icon: '<i class="fas fa-check"></i>',
						label: i18n("br5e.chat.damageButtons.critPrompt.yes"),
						callback: () => { resolve(dmg + critdmg); }
					},
					two: {
						icon: '<i class="fas fa-times"></i>',
						label: i18n("br5e.chat.damageButtons.critPrompt.no"),
						callback: () => { resolve(dmg); }
					}
				},
				default: "two"
			}

			new Dialog(data, options).render(true);
		});

		return dialogResult;
	}
	
	/**
	 * Bind card button events. These are the clickable action buttons.
	 * @private
	 */
	_setupCardButtons(html) {
		html.find(".card-buttons").off()
		html.find(".card-buttons button").off().click(async event => {
			event.preventDefault();
			const button = event.currentTarget;
			button.disabled = true;

			const action = button.dataset.action;
			
			if (action === "save") {
				const actors = Utils.getTargetActors({ required: true });
				const ability = button.dataset.ability;
				const params = await CustomRoll.eventToAdvantage(event);
				for (const actor of actors) {
					CustomRoll.fullRollAttribute(actor, ability, "save", params);
				}
			} else if (action === "damage") {
				if (await this.rollDamage(button.dataset.group)) {	
					await this.update();
				}
			}

			// Re-enable the button
			setTimeout(() => {button.disabled = false;}, 1);
		});
	}
}
