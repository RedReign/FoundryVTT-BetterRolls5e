import { i18n, getTargetActors } from "./betterrolls5e.js";
import { CustomRoll } from "./custom-roll.js";
import { Renderer } from "./renderer.js";
import { BRSettings } from "./settings.js";
import { DiceCollection, ItemUtils, Utils } from "./utils.js";

/**
 * Class that encapsulates a better rolls card at runtime.
 * When a chat message enters the chat it should be binded 
 * with BetterRollsChatCard.bind().
 */
export class BetterRollsChatCard {
	constructor(id, html) {
		this.id = id;
		this.html = html;
		this.actorId = this.html.attr("data-actor-id");
		this.itemId = this.html.attr("data-item-id");
		this.tokenId = this.html.attr("data-token-id");
		this.dicePool = new DiceCollection();
		this._setupDamageButtons();
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

		return new BetterRollsChatCard(message.id, chatCard);
	}

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

	get item() {
		return this.actor?.getOwnedItem(this.itemId);
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

		// Get the item, and check if it exists
		const item = this.item;
		if (!item) {
			const message = this.actor ? i18n("br5e.error.noItemWithId") : i18n("br5e.error.noActorWithId");
			await ui.notifications.warn(message);
			return false;
		}

		// Add crit to UI 
		const damageRows = this.html.find('.red-base-damage').parents(".dice-roll");
		for (const row of damageRows) {
			const formula = $(row).find(".dice-formula").text();
			const total = Number($(row).find(".red-base-damage").data("value"));
			const critBehavior = game.settings.get("betterrolls5e", "critBehavior");
			const savage = ItemUtils.appliesSavageAttacks(item);
			const critRoll = ItemUtils.getCritRoll(formula, total, { critBehavior, savage });

			// Render crit roll tooltip
			if (critRoll) {
				// Render crit roll damage
				const template = await renderTemplate("modules/betterrolls5e/templates/red-damage-crit.html", {
					crit: Utils.processRoll(critRoll),
					crittext: BRSettings.critString
				});

				// Add crit die roll
				$(row).find(".red-base-damage").after(template);

				// Check if the tooltip is showing on the row
				// We will need to show the new one if it is
				const showing = $(row).find(".dice-tooltip").is(":visible");

				const tooltip = await critRoll.getTooltip();
				$(row).find('.dice-row.tooltips').append(
					$(`<div class="tooltip dual-left dice-row-item">${tooltip}</div>`)
				);

				// Show all newly rendered tooltips if showing
				if (showing) {
					$(row).find(".dice-tooltip").show();
				}

				this.dicePool.push(critRoll);
			}
		}

		// Add crit extra if applicable
		const flags = this.item.data.flags.betterRolls5e;
		const critExtraIndex = parseInt(flags?.critDamage?.value, 10);
		if (critExtraIndex >= 0) {
			const entry = CustomRoll.constructItemDamageRoll(item, critExtraIndex);
			const template = await Renderer.renderModel(entry);
			this.html.find("div.dice-roll").last().after($(template));
			
			this.dicePool.push(entry.baseRoll);
		}

		// Mark as critical
		this.html.attr("data-critical", "true");
		return true;
	}
	
	/**
	 * Updates a chat message to have this HTML as its content.
	 * Nothing updates until this method is called.
	 * @param message 
	 */
	async update() {
		const newRender = this.html.clone();
		newRender.find('.temporary').remove();

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
	 * Internal method to setup the temporary buttons that that affect damage
	 * entries, like crit rolls and damage application.
	 */
	async _setupDamageButtons() {
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
		$(html).hover(evIn => {
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
}
