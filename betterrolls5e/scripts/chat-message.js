import { i18n } from "./betterrolls5e.js";
import { CustomRoll } from "./custom-roll.js";
import { Renderer } from "./renderer.js";
import { BRSettings } from "./settings.js";
import { DiceCollection, ItemUtils, Utils } from "./utils.js";

function getTargetActors() {
	const character = game.user.character;
	const controlled = canvas.tokens.controlled;

	if ( controlled.length === 0 ) return [character] || null;
	if ( controlled.length > 0 ) {
		const actors = controlled.map(character => character.actor);
		return actors;
	}
	else throw new Error(`You must designate a specific Token as the roll target`);
}

/**
 * Class that encapsulates a better rolls card at runtime.
 * When a chat message enters the chat it should be binded 
 * with BetterRollsChatCard.bind().
 */
export class BetterRollsChatCard {
	constructor(message, html) {
		this.id = message.id;
		this.flags = message.data.flags?.betterrolls5e ?? {};
		this.speaker = game.actors.get(message.data.speaker.actor);
		this.dicePool = new DiceCollection();
		this.bindHtml(html);
	}

	bindHtml(html) {
		this.html = html;
		this._renderHtml = null;
		this.actorId = this.html.attr("data-actor-id");
		this.itemId = this.html.attr("data-item-id");
		this.tokenId = this.html.attr("data-token-id");
		this._setupDamageButtons();
		this._setupCardButtons();

		// Hide Save DCs
		const actor = this.speaker;
		if ((!actor && !game.user.isGM) || actor?.permission != 3) {
			this.html.find(".hideSave").text(i18n("br5e.hideDC.string"));
		}
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
			existing.bindHtml(chatCard);

			// Scroll to bottom if the last card had updated
			const last = ChatMessage.collection.entries[ChatMessage.collection.entries.length - 1];
			if (last?.id === existing.id) {
				window.setTimeout(() => {
					ui.chat.scrollBottom();
				}, 0);
			}

			return existing;
		} else {
			const newCard = new BetterRollsChatCard(message, chatCard);
			message.BetterRollsCardBinding = newCard;
			return newCard;
		}
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
		const item = this.itemId ? this.actor?.getOwnedItem(this.itemId) : null;
		if (this.itemId && !item) {
			const message = this.actor ? i18n("br5e.error.noItemWithId") : i18n("br5e.error.noActorWithId");
			ui.notifications.warn(message);
			throw new Error(message);
		}

		return item;
	}

	/**
	 * Returns a duplicate of the internal html which can be updated with affecting visibility.
	 * When update is called, it will use this as its value.
	 */
	get renderHtml() {
		if (!this._renderHtml) {
			this._renderHtml = this.html.clone();
			this._renderHtml.find('.temporary').remove();
		}

		return this._renderHtml;
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
	 * @returns if the crit roll went through
	 */
	async rollCrit() {
		// Do nothing if crit is already rolled or if we don't have permission
		if (this._critAlreadyRolled || !this.hasPermission) {
			return false;
		}

		const item = this.item;
		const html = this.renderHtml;

		// Add crit to UI 
		const damageRows = html.find('.red-base-damage').parents(".dice-roll");
		for (const row of damageRows) {
			await this._rollCritForDamageRow(item, row);
		}

		// Add crit extra if applicable
		const flags = item?.data.flags.betterRolls5e;
		const critExtraIndex = parseInt(flags?.critDamage?.value, 10);
		if (critExtraIndex >= 0) {
			const entry = CustomRoll.constructDamageRoll({ item, damageIndex: critExtraIndex });
			const template = await Renderer.renderModel(entry);
			html.find("div.dice-roll").last().after($(template));
			
			this.dicePool.push(entry.baseRoll);
		}

		// Mark as critical
		html.attr("data-critical", "true");
		return true;
	}

	async rollDamage(group) {
		if (!this.hasPermission) {
			return;
		}

		// Get the item, and check if it exists
		const item = this.item;
		const html = this.renderHtml;
		group = encodeURIComponent(group);

		// Show associated damage rows. If already set to critical, roll critical
		const isCritical = html.attr("data-critical") === "true";
		const damageRows = html.find('.red-base-damage').parents(`.dice-roll[data-group="${group}"]`);
		for (const row of damageRows) {
			$(row).removeClass("br5e-hidden");
			if (isCritical) {
				await this._rollCritForDamageRow(item, row);
			}
		}

		// Hide the damage buttons. No longer relevant
		html.find(`button[data-action="damage"][data-group="${group}"]`)
			.parents(".card-buttons")
			.hide();

		// Add the associated dice to the dice pool
		const rollData = this.flags?.damageDicePools[group];
		if (rollData) {
			this.dicePool.push(Roll.fromData(rollData));
		}
	}
	
	/**
	 * Updates a chat message to have this HTML as its content.
	 * Nothing updates until this method is called.
	 * @param message 
	 */
	async update() {
		const newRender = this.renderHtml;
		const chatMessage = ChatMessage.collection.get(this.id);

		if (chatMessage) {
			await this.dicePool.flush();
			await chatMessage.update({
				content: newRender.get(0).outerHTML
			});
		}
	}

	/**
	 * Returns true if crit damage has already been rolled.
	 */
	get _critAlreadyRolled() {
		return this.html.attr("data-critical") === "true";
	}

	/**
	 * Private helper to roll crit for a damage row
	 * @param {Item} item
	 * @param {*} row
	 * @private
	 */
	async _rollCritForDamageRow(item, row) {
		row = $(row);

		// Skip if crit already rolled for this row
		if (row.find(".red-crit-damage").length > 0) {
			return;
		}

		const formula = row.find(".dice-formula").text();
		const total = Number(row.find(".red-base-damage").data("value"));
		const savage = ItemUtils.appliesSavageAttacks(item);
		const critRoll = ItemUtils.getCritRoll(formula, total, { savage });

		// Render crit roll tooltip
		if (critRoll) {
			// Render crit roll damage
			const template = await renderTemplate("modules/betterrolls5e/templates/red-damage-crit.html", {
				crit: Utils.processRoll(critRoll),
				crittext: BRSettings.critString
			});

			// Add crit die roll
			row.find(".red-base-damage").after(template);

			const tooltip = await critRoll.getTooltip();
			row.find('.dice-row.tooltips').append(
				$(`<div class="tooltip dual-left dice-row-item">${tooltip}</div>`)
			);

			this.dicePool.push(critRoll);
		}
	}

	/**
	 * Internal method to setup the temporary buttons that that affect damage
	 * entries, like crit rolls and damage application.
	 */
	async _setupDamageButtons() {
		if (!BRSettings.chatDamageButtonsEnabled) {
			return;
		}

		const { html } = this;
		const template = await renderTemplate("modules/betterrolls5e/templates/red-damage-overlay.html");
		const dmgElements = html.find('.red-base-die').parents('.dice-total').toArray(); 
		const customElements = html.find('[data-type=custom] .red-base-die').toArray();
		
		[...dmgElements, ...customElements].forEach(element => {
			$(element).append($(template));
		});
	
		// adding click events to the buttons, this gets redone since they can break through rerendering of the card
		html.find('.dmgBtn-container-br.right button').click(async ev => {
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
			const targetActors = getTargetActors() || [];
			targetActors.forEach(actor => { actor.applyDamage(dmg, modifier) })
			
			setTimeout(() => { 
				if (canvas.hud.token._displayState && canvas.hud.token._displayState !== 0) {
					canvas.hud.token.render();
				}
			}, 50);
		});

		// Enable crit button
		html.find('.crit-button').on('click', async (ev) => {
			ev.preventDefault();
			ev.stopPropagation();
			if (await this.rollCrit()) {
				await this.update();
			}
		});
	
		// logic to only show the buttons when the mouse is within the chatcard
		html.find('.dmgBtn-container-br').hide();
		html.hover(evIn => {
			if (!this._critAlreadyRolled && this.hasPermission) {
				html.find('.dmgBtn-container-br.left').show();
			}
			if (canvas?.tokens.controlled.length > 0) {
				html.find('.dmgBtn-container-br.right').show();
			}
		}, evOut => {
			html.find('.dmgBtn-container-br').hide();
		});
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
	 * Bind card button events
	 * @private
	 */
	_setupCardButtons() {
		this.html.find(".card-buttons").off()
		this.html.find(".card-buttons button").off().click(async event => {
			const button = event.currentTarget;
			const action = button.dataset.action;
			if (action === "save") {
				event.preventDefault();
				let actors = getTargetActors();
				let ability = button.dataset.ability;
				let params = await CustomRoll.eventToAdvantage(event);
				for (let i = 0; i < actors.length; i++) {
					if (actors[i]) {
						CustomRoll.fullRollAttribute(actors[i], ability, "save", params);
					}
				}
				setTimeout(() => {button.disabled = false;}, 1);
			} else if (action === "damage") {
				event.preventDefault();
				await this.rollDamage(button.dataset.group);
				await this.update();
				setTimeout(() => {button.disabled = false;}, 1);
			}
		});
	}
}
