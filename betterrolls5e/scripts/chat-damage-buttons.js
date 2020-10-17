import { i18n, getTargetActors } from "./betterrolls5e.js";

Hooks.on('renderChatMessage', (_, html, _) => {
	const chatCard = html.find('.red-full');

	if (!game.settings.get("betterrolls5e", "chatDamageButtonsEnabled")) { return; }
	if (chatCard.length === 0) { return; }
	
	function addButtons(dmgElement) {
		// creating the buttons and container
		const fullDamageButton = $(`
			<button data-modifier="1">
				<i class="fas fa-user-minus" title="${i18n("br5e.chat.damageButtons.fullDamage.hint")}"></i>
			</button>
		`);

		const halfDamageButton = $(`
			<button data-modifier="0.5">
				<i class="fas fa-user-shield" title="${i18n("br5e.chat.damageButtons.halfDamage.hint")}"></i>
			</button>
		`);

		const doubleDamageButton = $(`
			<button data-modifier="2">
				<i class="fas fa-user-injured" title="${i18n("br5e.chat.damageButtons.doubleDamage.hint")}"></i>
			</button>
		`);

		const fullHealingButton = $(`
			<button data-modifier="-1">
				<i class="fas fa-user-plus" title="${i18n("br5e.chat.damageButtons.healing.hint")}"></i>
			</button>
		`);

		const btnContainer = $('<span class="dmgBtn-container-br"></span>');
		btnContainer.append(fullDamageButton, halfDamageButton, doubleDamageButton, fullHealingButton);

		// adding the buttons to the the target element
		$(dmgElement).append(btnContainer);
	}

	const dmgElements = html.find('.red-base-die').parents('.dice-total').toArray(); 
	const customElements = html.find('[data-type=custom] .red-base-die').toArray();
	
	[...dmgElements, ...customElements].forEach(element => { addButtons(element) });

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

			dmg = await applyCritDamage(Number(dmg), Number(critDmg), dialogPosition);
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
});

async function applyCritDamage(dmg, critdmg, position) {
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
