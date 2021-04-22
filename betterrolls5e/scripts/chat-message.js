import { CustomItemRoll, CustomRoll } from "./custom-roll.js";
import { migrateChatMessage } from "./migration.js";
import { BRSettings } from "./settings.js";
import { i18n, Utils } from "./utils/index.js";

/**
 * Class that encapsulates a better rolls card at runtime.
 * When a chat message enters the chat it should be binded
 * with BetterRollsChatCard.bind().
 */
export class BetterRollsChatCard {
	/** Min version to enable the card on, to prevent breakage */
	static min_version = "1.4";

	constructor(message, html) {
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
		this.roll = CustomItemRoll.fromMessage(message);
		this.speaker = game.actors.get(message.data.speaker.actor);
		message.BetterRoll = this.roll;

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
	static async bind(message, html) {
		const chatCard = html.find('.red-full');
		if (chatCard.length === 0) {
			return null;
		}

		// If the card needs to be migrated, skip the binding
		if (await migrateChatMessage(message)) {
			return null;
		}

		// Check if the card already exists
		const existing = message.BetterRollsCardBinding;
		if (existing) {
			console.log("BetterRolls5e | Retrieved existing card");
			existing.updateBinding(message, chatCard);

			// Pulse the card to make it look more obvious
			// Wait for the event queue before doing so to allow CSS calculations to work,
			// otherwise the border color will be incorrectly transparent
			window.setTimeout(() => {
				gsap?.from(html.get(), {
					"border-color": "red",
					"box-shadow": "0 0 6px inset #ff6400",
					duration: 2});
			}, 0);

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
	 * Adds right click menu options
	 * @param {*} html
	 * @param {*} options
	 */
	static addOptions(html, options) {
		const getBinding = (li) => game.messages.get(li.data("messageId"))?.BetterRollsCardBinding;

		options.push({
			name: i18n("br5e.chatContext.repeat"),
			icon: '<i class="fas fa-redo"></i>',
			condition: li => {
				const binding = getBinding(li);
				return binding && binding.roll.canRepeat();
			},
			callback: li => getBinding(li)?.roll.repeat()
		})
	}

	/**
	 * Internal method to setup the temporary buttons used to update advantage or disadvantage,
	 * as well as those that that affect damage
	 * entries, like crit rolls and damage application.
	 * @private
	 */
	async _setupOverlayButtons(html) {
		// Add reroll button
		if (this.roll?.canRepeat() && BRSettings.chatDamageButtonsEnabled) {
			const templateHeader = await renderTemplate("modules/betterrolls5e/templates/red-overlay-header.html");
			html.find(".card-header").append($(templateHeader));
		}

		// Multiroll buttons (perhaps introduce a new toggle property?)
		if (this.roll) {
			const templateMulti = await renderTemplate("modules/betterrolls5e/templates/red-overlay-multiroll.html");

			// Add multiroll overlay buttons to the DOM.
			for (const entry of this.roll.entries) {
				if (entry.type === "multiroll" && !entry.rollState && entry.entries?.length === 1) {
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
					if (await this.roll.updateRollState(id, rollState)) {
						await this.roll.update();
					}
				}
			});
		}

		// Setup augment crit and apply damage button
		const templateName = (BRSettings.chatDamageButtonsEnabled) ? "red-overlay-damage" : "red-overlay-damage-crit-only";
		const templateDamage = await renderTemplate(`modules/betterrolls5e/templates/${templateName}.html`);
		const dmgElements = html.find('.dice-total .red-base-die, .dice-total .red-extra-die').parents('.dice-row').toArray();
		const customElements = html.find('[data-type=custom] .red-base-die').toArray();

		// Add chat damage buttons
		[...dmgElements, ...customElements].forEach(element => {
			element = $(element);
			element.append($(templateDamage));

			// Remove crit button if already rolled
			// TODO: Move this elsewhere. There's a known bug when crit settings are changed suddenly
			// If Crit (setting) is disabled, then re-enabled, crit buttons don't get re-added
			const id = element.parents('.dice-roll').attr('data-id');
			const entry = this.roll?.getEntry(id);
			if (!this.roll?.canCrit(entry)) {
				element.find('.crit-button').remove();
			}
		});

		// Handle apply damage overlay button events
		html.find('.apply-damage-buttons button').click(async ev => {
			ev.preventDefault();
			ev.stopPropagation();

			// find out the proper dmg thats supposed to be applied
			const dmgElement = $(ev.target.parentNode.parentNode.parentNode.parentNode);
			const damageType = dmgElement.find(".dice-total").attr("data-damagetype");
			let dmg = dmgElement.find('.red-base-die').text();

			if (dmgElement.find('.red-extra-die').length > 0) {
				const critDmg = dmgElement.find('.red-extra-die').text();
				const dialogPosition = {
					x: ev.originalEvent.screenX,
					y: ev.originalEvent.screenY
				};

				dmg = await this._resolveCritDamage(Number(dmg), Number(critDmg), dialogPosition);
			}

			// getting the modifier depending on which of the buttons was pressed
			const modifier = $(ev.target).closest("button").attr('data-modifier');

			// applying dmg to the targeted token and sending only the span that the button sits in
			for (const actor of Utils.getTargetActors()) {
				await this.applyDamage(actor, damageType, dmg, modifier)
			}

			setTimeout(() => {
				if (canvas.hud.token._displayState && canvas.hud.token._displayState !== 0) {
					canvas.hud.token.render();
				}
			}, 50);
		});

		// Handle crit button application event
		html.find('.crit-button').off().on('click', async (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			const group = $(ev.target).parents('.dice-roll').attr('data-group');
			if (await this.roll.forceCrit(group)) {
				await this.roll.update();
			}
		});

		// Enable Hover Events (to show/hide the elements)
		this._onHoverEnd(html);
		html.hover(this._onHover.bind(this, html), this._onHoverEnd.bind(this, html));
	}

	async applyDamage(actor, damageType, damage, modifier) {
		if (damageType === "temphp" && modifier < 0) {
			const healing = Math.abs(modifier) * damage;
			const actorData = actor.data.data;
			if (actorData.attributes.hp.temp > 0) {
				const overwrite = await Dialog.confirm({
					title: i18n("br5e.chat.damageButtons.tempOverwrite.title"),
					content: i18n("br5e.chat.damageButtons.tempOverwrite.content", {
						original: actorData.attributes.hp.temp,
						new: healing
					})
				});

				if (!overwrite) return;
			}

			await actor.update({ "data.attributes.hp.temp": healing });
		} else {
			await actor.applyDamage(damage, modifier);
		}
	}

	_onHover(html) {
		const hasPermission = this.roll.hasPermission;
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

	/**
	 * Displays a dialog if both dmg and critdmg have a value, otherwise just returns the first not null one.
	 * @private
	 */
	async _resolveCritDamage(dmg, critdmg, position) {
		if (dmg && critdmg) {
			return await new Promise(async (resolve, reject) => {
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
		}

		return dmg || critdmg;
	}

	/**
	 * Bind card button events. These are the clickable action buttons.
	 * @private
	 */
	_setupCardButtons(html) {
		html.find(".card-buttons").off()
		html.off().click(async event => {
			const button = event.target.closest("button");
			if (!button) return;

			event.preventDefault();
			button.disabled = true;

			const action = button.dataset.action;
			try {
				await this._performAction(action, button.dataset, event);
			} finally {
				// Re-enable the button after a delay
				setTimeout(() => (button.disabled = false), 0);
			}
		});
	}

	async _performAction(action, data, event={}) {
		if (action === "save") {
			const actors = Utils.getTargetActors({ required: true });
			const ability = data.ability;
			const params = Utils.eventToAdvantage(event);
			for (const actor of actors) {
				CustomRoll.rollAttribute(actor, ability, "save", params);
			}
		} else if (action === "damage") {
			const group = encodeURIComponent(data.group);
			if (await this.roll.rollDamage(group)) {
				await this.roll.update();
			}
		} else if (action === "repeat") {
			await this.roll.repeat();
		} else if (action === "apply-active-effects") {
			if (!window.DAE) {
				return ui.notifications.warn(i18n("br5e.error.noDAE"));
			}

			const roll = this.roll;
			const item = roll.item;
			const targets = game.user.targets.size ? game.user.targets : Utils.getTargetTokens();
			window.DAE.doEffects(item, true, targets, {
				whisper: false,
				spellLevel: roll.params.slotLevel,
				damageTotal: roll.totalDamage,
				critical: roll.isCrit,
				itemCardId: this.id
			});
		}
	}
}
