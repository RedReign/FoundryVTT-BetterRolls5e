import { DND5E } from "../../../systems/dnd5e/module/config.js";
import { Actor5e } from "../../../systems/dnd5e/module/actor/entity.js";
import { i18n } from "./betterrolls5e.js";

Hooks.on('renderChatMessage', (message, html, data) => {
	if (!game.settings.get("betterrolls5e", "chatDamageButtonsEnabled")) { return; }
    let chatCard = html.find('.red-full');
    if (chatCard.length === 0) { return; }
	
    let dmgElements = html.find('.red-left-die').parents('.dice-total'); 
    for (let dmgElement of dmgElements) {
        // creating the buttons and container
        let fullDamageButton = $(`<button data-modifier="1"><i class="fas fa-user-minus" title="${i18n("br5e.chat.damageButtons.fullDamage.hint")}"></i></button>`);
        let halfDamageButton = $(`<button data-modifier="0.5"><i class="fas fa-user-shield" title="${i18n("br5e.chat.damageButtons.halfDamage.hint")}"></i></button>`);
        let doubleDamageButton = $(`<button data-modifier="2"><i class="fas fa-user-injured" title="${i18n("br5e.chat.damageButtons.doubleDamage.hint")}"></i></button>`);
        let fullHealingButton = $(`<button data-modifier="-1"><i class="fas fa-user-plus" title="${i18n("br5e.chat.damageButtons.healing.hint")}"></i></button>`);

        let btnContainer = $('<span class="dmgBtn-container-br"></span>');

        btnContainer.append(fullDamageButton);
        btnContainer.append(halfDamageButton);
        btnContainer.append(doubleDamageButton);
        btnContainer.append(fullHealingButton);

        // adding the buttons to the the target element
        $(dmgElement).append(btnContainer);
    }

    // adding click events to the buttons, this gets redone since they can break through rerendering of the card
    html.find('.dmgBtn-container-br button').click(async ev => {
 ev.preventDefault();
        ev.stopPropagation();
        // find out the proper dmg thats supposed to be applied
        let dmgElement = $(ev.target.parentNode.parentNode.parentNode);
        let dmg = dmgElement.find('.red-left-die').text();
        if (dmgElement.find('.red-right-die').length > 0) {
            let critDmg = dmgElement.find('.red-right-die').text();

            // set position on where to put the dialog
            let position = { x: ev.originalEvent.screenX, y: ev.originalEvent.screenY };
            dmg = await applyCritDamage(Number(dmg), Number(critDmg), position);
        }
        // wrapping in html since thats what the applyDamage function expects
        let dmgHtml = $(`<div><h4 class="dice-total">${dmg}</h4></div>`)

        // getting the modifier depending on which of the buttons was pressed
        let modifier = ev.target.dataset.modifier;

        // sometimes the image within the button triggers the event, so we have to make sure to get the proper modifier value
        if (modifier === undefined) {
            modifier = $(ev.target).parent().attr('data-modifier');
        }

        // applying dmg to the targeted token and sending only the span that the button sits in 
        Actor5e.applyDamage(dmgHtml, modifier);
		setTimeout(() => { 
			if (canvas.hud.token._displayState && canvas.hud.token._displayState !== 0) {
				canvas.hud.token.render();
			}
		}, 50);
    });

    // logic to only show the buttons when the mouse is within the chatcard
    html.find('.dmgBtn-container-br').hide();
    $(html).hover(evIn => {
		if (canvas.tokens.controlledTokens.length > 0) {
			html.find('.dmgBtn-container-br').show();
		}
    }, evOut => {
        html.find('.dmgBtn-container-br').hide();
    });
});

async function applyCritDamage(dmg, critdmg, position) {
    let dialogResult = await new Promise(async (resolve, reject) => {
        let options = {};
        options.left = position.x;
        options.top = position.y;
        options.width = 100;
        
        let d = new Dialog({
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
            default: "two",
        }, options);
        d.render(true);
    });
    return dialogResult;
}