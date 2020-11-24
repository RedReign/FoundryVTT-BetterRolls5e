import { i18n } from "./betterrolls5e.js";
import { CustomRoll } from "./custom-roll.js";
import { BRSettings } from "./settings.js";

// todo: move this hook to init or hooks, then remove chat-message.js from modules.json
Hooks.on('renderChatMessage', async (message, html, data) => {
	BetterRollsChatCard.bind(message, html);
});

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
class BetterRollsChatCard {
	constructor(id, html) {
		this.id = id;
		this.html = html;
		this._setupDamageButtons();
		this._setupSaveButtons();
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
		html.find('.dmgBtn-container-br button').click(async ev => {
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
	
				dmg = await this._applyCritDamage(Number(dmg), Number(critDmg), dialogPosition);
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
	
		// logic to only show the buttons when the mouse is within the chatcard
		html.find('.dmgBtn-container-br').hide();
		$(html).hover(evIn => {
			if (canvas?.tokens.controlled.length > 0) {
				html.find('.dmgBtn-container-br').show();
			}
		}, evOut => {
			html.find('.dmgBtn-container-br').hide();
		});
	}
	
	async _applyCritDamage(dmg, critdmg, position) {
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
	 * Bind save button events
	 * @private
	 */
	_setupSaveButtons() {
		this.html.find(".card-buttons").off()
		this.html.find(".card-buttons button").off().click(async event => {
			const button = event.currentTarget;
			if (button.dataset.action === "save") {
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
			}
		});
	}
}
