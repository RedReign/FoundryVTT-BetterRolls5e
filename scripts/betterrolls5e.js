// Hook into different sheet via their rendering
Hooks.on(`renderActorSheet5eNPC`, (app, html, data) => {
	game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app, html, data) : null;
	game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app, html, data) : null;
});
Hooks.on(`renderActorSheet5eCharacter`, (app, html, data) => {
	game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app, html, data) : null;
	game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app, html, data) : null;
});
Hooks.on(`renderSky5eSheet`, (app, html, data) => {
	game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app, html, data) : null;
	game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app, html, data) : null;
});
Hooks.on(`renderBetterNPCActor5eSheet`, (app, html, data) => {
	game.settings.get("betterrolls5e", "rollButtonsEnabled") ? addItemSheetButtons(app, html, data, '.item .npc-item-name') : null;
	game.settings.get("betterrolls5e", "diceEnabled") ? changeRollsToDual(app, html, data, '', '', '.item .npc-item-header > .rollable') : null;
});

/**
 * Adds buttons and assign their functionality to the sheet
 * @param {String} triggeringElement - this is the html selector string that opens the description - mostly optional for different sheetclasses
 * @param {String} buttonContainer - this is the html selector string to which the buttons will be prepended - mostly optional for different sheetclasses
 */
function addItemSheetButtons(app, html, data, triggeringElement = '', buttonContainer = '') {
    // Setting default element selectors
    if (triggeringElement === '') triggeringElement = '.item .item-name h4';
    if (buttonContainer === '') buttonContainer = '.item-properties';
	

    // adding an event for when the description is shown
    html.find(triggeringElement).click(event => {
        let li = $(event.currentTarget).parents(".item");
        let item = app.object.getOwnedItem(Number(li.attr("data-item-id")));
        let chatData = item.getChatData();
		
		// Check settings
		let diceEnabled = game.settings.get("betterrolls5e", "diceEnabled");
		
		//console.log(item);

        if (!li.hasClass("expanded")) return;  // this is a way to not continue if the items description is not shown, but its only a minor gain to do this while it may break this module in sheets that dont use "expanded"

        // Create the buttons
        let buttons = $(`<div class="item-buttons"></div>`);
        switch (item.data.type) {
            case 'weapon':
				if ((diceEnabled) && item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="combinedWeaponRoll">Roll</button></span>`);
                if ((diceEnabled) && item.data.data.damage2.value) buttons.append(`<span class="tag"><button data-action="combinedWeaponRoll2">Alt. Roll</button></span>`);
                buttons.append(`<span class="tag"><button data-action="weaponAttack">Attack</button></span>`);
                if (item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="weaponDamage">Damage</button></span>`);
                if (item.data.data.damage2.value) buttons.append(`<span class="tag"><button data-action="weaponDamage2">Alt. Damage</button></span>`);
                break;
            case 'spell':
				if ((diceEnabled) && (chatData.isAttack) && item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="spellAttackDamage">Roll (Atk & Dmg)</button></span>`);
				if ((diceEnabled) && (chatData.isSave) && item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="spellSaveDamage">Roll (Save & Dmg)</button></span>`);
                if (chatData.isAttack) buttons.append(`<span class="tag"><button data-action="spellAttack">Attack</button></span>`);
				if (chatData.isSave) buttons.append(`<span class="tag"><button data-action="spellSave">Save DC ${chatData.save.dc} (${chatData.save.str})</button></span>`);
                if (item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="spellDamage">${chatData.damageLabel}</button></span>`);
                break;
            case 'consumable':
                if (chatData.hasCharges) buttons.append(`<span class="tag"><button data-action="consume">Use ${item.name}</button></span>`);
                break;
            case 'tool':
                buttons.append(`<span class="tag"><button data-action="toolCheck" data-ability="${chatData.ability.value}">Use ${item.name}</button></span>`);
                break;
			case 'feat':
				if ((diceEnabled) && (chatData.isAttack) && (item.data.data.damage.value)) buttons.append(`<span class="tag"><button data-action="featAttackDamage">Roll (Atk & Dmg)</button></span>`);
				if ((diceEnabled) && (chatData.isSave) && (item.data.data.damage.value)) buttons.append(`<span class="tag"><button data-action="featSaveDamage">Roll (Save & Dmg)</button></span>`);
				if (chatData.isAttack) buttons.append(`<span class="tag"><button data-action="featAttack">Attack</button></span>`);
				if (chatData.isSave) buttons.append(`<span class="tag"><button data-action="featSave">Save</button></span>`);
				if (item.data.data.damage.value) buttons.append(`<span class="tag"><button data-action="featDamage">Damage</button></span>`);
        }
		let buttonsWereAdded = false;
		if (((item.data.data.damage !== undefined) && item.data.data.damage.value) || ((item.data.data.damage2 !== undefined) && item.data.data.damage2.value) || (chatData.isAttack) || (chatData.isSave) || (chatData.hasCharges)) {buttonsWereAdded = true;}
		if (buttonsWereAdded) {buttons.append(`<br><header style="margin-top:6px"></header>`);}
		
        // adding the buttons to the sheet
        targetHTML = $(event.target.parentNode.parentNode)
        targetHTML.find(buttonContainer).prepend(buttons);

        //html.find(buttonContainer).prepend(buttons);

        // adding click event for all buttons
        buttons.find('button').click(ev => {
            ev.preventDefault();
            ev.stopPropagation();

            // which function gets called depends on the type of button stored in the dataset attribute action
			if (diceEnabled) {
				// If better rolls are on
				switch (ev.target.dataset.action) {
					case 'weaponAttack': RedDice5e.fullRoll(item, ev, {attack: true}); break;
					case 'weaponDamage': RedDice5e.fullRoll(item, ev, {damage: true}); break;
					case 'weaponDamage2': RedDice5e.fullRoll(item, ev, {altDamage: true}); break;
					case 'spellAttack': RedDice5e.fullRoll(item, ev, {itemType: "spell", attack: true}); break;
					case 'spellSave': RedDice5e.fullRoll(item, ev, {itemType: "spell", save:true, info:true}); break;
					case 'spellDamage': RedDice5e.fullRoll(item, ev, {itemType: "spell", damage:true, info:true}); break;
					case 'featAttack': RedDice5e.fullRoll(item, ev, {itemType: "feat", attack:true, info:true}); break;
					case 'featDamage': RedDice5e.fullRoll(item, ev, {itemType: "feat", damage:true}); break;
					case 'featAttackDamage': RedDice5e.fullRoll(item, ev, {itemType: "feat", attack:true, damage:true, info:true}); break;
					case 'featSave': RedDice5e.fullRoll(item, ev, {itemType: "feat", save:true, info:true}); break;
					case 'featSaveDamage': RedDice5e.fullRoll(item, ev, {itemType: "feat", save:true, damage:true, info:true}); break;
					case 'consume': item.rollConsumable(ev); break;
					case 'toolCheck': RedDice5e.fullRoll(item, ev, {itemType: "tool", info:true}); break;
					case 'combinedWeaponRoll': RedDice5e.fullRoll(item, ev, {attack: true, damage: true}); break;
					case 'combinedWeaponRoll2': RedDice5e.fullRoll(item, ev, {attack: true, altDamage: true}); break;
					case 'spellAttackDamage': RedDice5e.fullRoll(item, ev, {itemType: "spell", attack: true, damage: true, info: true}); break;
					case 'spellSaveDamage': RedDice5e.fullRoll(item, ev, {itemType: "spell", save: true, damage: true, info: true}); break;
				}
			} else {
				// If better rolls are off
				switch (ev.target.dataset.action) {
					case 'weaponAttack': item.rollWeaponAttack(ev); break;
					case 'weaponDamage': item.rollWeaponDamage(ev); break;
					case 'weaponDamage2': item.rollWeaponDamage(ev, true); break;
					case 'spellAttack': item.rollSpellAttack(ev); break;
					case 'spellDamage': item.rollSpellDamage(ev); break;
					case 'featAttack': item.rollFeatAttack(ev); break;
					case 'featDamage': item.rollFeatDamage(ev); break;
					case 'consume': item.rollConsumable(ev); break;
					case 'toolCheck': item.rollToolCheck(ev); break;
				}
			}
		});
	});
}


/**
 * Replaces the sheet's d20 rolls for ability checks, skill checks, and saving throws into dual d20s.
 * Also replaces the default button on items with a "standard" roll.
 */
function changeRollsToDual (app, html, data, abilityButton = '', skillButton = '', itemButton = '') {
	// Set default selectors
	if (abilityButton === '') abilityButton = '.ability-name';
    if (skillButton === '') skillButton = '.skill-name';
	if (itemButton === '') itemButton = '.item .item-image';
	
	let actor = app.object;
	
	// Assign new action to ability check button
	let abilityName = html.find(abilityButton);
	console.log(abilityName);
	console.log(abilityButton);
	abilityName.off();
	abilityName.click(event => {
		event.preventDefault();
		let ability = event.currentTarget.parentElement.getAttribute("data-ability"),
			abl = actor.data.data.abilities[ability];
		//console.log("Ability: ", ability);
		if ( event.ctrlKey ) {
			RedDice5e.fullRollAttribute(app.object, ability, "check");
		} else if ( event.shiftKey ) {
			RedDice5e.fullRollAttribute(app.object, ability, "save");
		} else {
			new Dialog({
				title: `${abl.label} Ability Roll`,
				content: `<p>What type of ${abl.label} roll?</p>`,
				buttons: {
					test: {
						label: "Ability Check",
						callback: () => RedDice5e.fullRollAttribute(app.object, ability, "check")
					},
					save: {
						label: "Saving Throw",
						callback: () => RedDice5e.fullRollAttribute(app.object, ability, "save")
					}
				}
			}).render(true);
		}
	});
	
	// Assign new action to skill button
	let skillName = html.find(skillButton);
	skillName.off();
	skillName.click(event => {
		event.preventDefault();
		let skill = event.currentTarget.parentElement.getAttribute("data-skill");
		RedDice5e.fullRollSkill(app.object, skill);
	});
	
	// Assign new action to item image button
	let itemImage = html.find(itemButton);
	itemImage.off();
	itemImage.click(event => {
		//console.log("EVENT:");
		//console.log(event);
		let li = $(event.currentTarget).parents(".item"),
			item = app.object.getOwnedItem(Number(li.attr("data-item-id")));
		if (event.altKey || !game.settings.get("betterrolls5e", "imageButtonEnabled")) {
			item.actor.sheet._onItemRoll(event);
		}
		else {
			event.preventDefault();
			let chatData = item.getChatData(),
				itemData = item.data.data,
				itemType = "weapon",
				attack = false,
				save = false,
				damage = false,
				altDamage = false,
				info = false;
			
			// Assume new action of the button based on which properties it has
			switch (item.data.type) {
				case 'weapon':
					itemType = "weapon";
					if (itemData.damage.value) {attack = true; damage = true;}
					else if (itemData.damage2.value) {attack = true; altDamage = true;}
					break;
				case 'spell':
					itemType = "spell";
					info = true;
					if ((chatData.isAttack) && itemData.damage.value) {attack = true; damage = true;}
					else if ((chatData.isSave) && itemData.damage.value) {save = true; damage = true;}
					else if (chatData.isAttack) {attack = true;}
					else if (chatData.isSave) {save = true;}
					else if (itemData.damage.value) {damage = true;}
					break;
				case 'consumable':
					break;
				case 'tool':
					itemType = "tool";
					break;
				case 'feat':
					itemType = "feat";
					info = true;
					if ((chatData.isAttack) && itemData.damage.value) {attack = true; damage = true;}
					else if ((chatData.isSave) && itemData.damage.value) {save = true; damage = true;}
					else if (chatData.isAttack) {attack = true;}
					else if (chatData.isSave) {save = true;}
					else if (itemData.damage.value) {damage = true;}
					break;
			}
			
			if (!attack && !save && !damage && !altDamage) {
				RedDice5e.fullRoll(item, event, {info:true});
			} else {
				let params = {
					itemType: itemType,
					attack: attack,
					save: save,
					damage: damage,
					altDamage: altDamage,
					info: info
				}
				RedDice5e.fullRoll(item, event, params);
			}
		}
	});
}


class RedDice5e extends Dice5e {
	
	/**
	* Creates a chat message with the requested ability check or saving throw.
	* @param {Actor5e} actor		The actor object to reference for the roll.
	* @param {String} ability		The ability score to roll.
	* @param {String} rollType		String of either "check" or "save" 
	*/
	static async fullRollAttribute(actor, ability, rollType) {
		let rollWhisper = null,
			rollBlind = false,
			dualRoll = null,
			titleString = null,
			abl = actor.data.data.abilities[ability];
		let rollMode = game.settings.get("core", "rollMode");
		if ( ["gmroll", "blindroll"].includes(rollMode) ) rollWhisper = ChatMessage.getWhisperIDs("GM");
		if ( rollMode === "blindroll" ) rollBlind = true;
		
		
		if (rollType === "check") {
			dualRoll = await RedDice5e.rollAbilityCheck(actor, abl);
			titleString = `${abl.label} Check`;
		} else if (rollType === "save") {
			dualRoll = await RedDice5e.rollAbilitySave(actor, abl);
			titleString = `${abl.label} Save`;
		}
		
		
		let titleImage = (actor.data.img == "icons/svg/mystery-man.svg") ? actor.data.token.img : actor.data.img;
		
		let titleTemplate = await renderTemplate("public/modules/betterrolls5e/templates/red-header.html", {
			item: {
				img: titleImage,
				name: titleString
			}
		});
		
		let content = await renderTemplate("public/modules/betterrolls5e/templates/red-fullroll.html", {
			title: titleTemplate,
			dual: dualRoll["html"]
		});
		
		// Output the rolls to chat
		ChatMessage.create({
			user: game.user._id,
			content: content,
			speaker: {
				actor: actor._id,
				token: actor.token,
				alias: actor.name
			},
			type: CHAT_MESSAGE_TYPES.OTHER,
			whisper: rollWhisper,
			blind: rollBlind,
			sound: CONFIG.sounds.dice
		});
	}
	
	/**
	* Creates a chat message with the requested skill check.
	*/
	static async fullRollSkill(actor, skill) {
		let rollWhisper = null,
			rollBlind = false,
			skl = actor.data.data.skills[skill];
		let rollMode = game.settings.get("core", "rollMode");
		if ( ["gmroll", "blindroll"].includes(rollMode) ) rollWhisper = ChatMessage.getWhisperIDs("GM");
		if ( rollMode === "blindroll" ) rollBlind = true;
		
		let dualRoll = await RedDice5e.rollSkillCheck(actor, skl);
		
		let titleImage = (actor.data.img == "icons/svg/mystery-man.svg") ? actor.data.token.img : actor.data.img;
		
		let titleTemplate = await renderTemplate("public/modules/betterrolls5e/templates/red-header.html", {
			item: {
				img: titleImage,
				name: `${skl.label}`
			}
		});
		
		let content = await renderTemplate("public/modules/betterrolls5e/templates/red-fullroll.html", {
			title: titleTemplate,
			dual: dualRoll["html"]
		});
		
		// Output the rolls to chat
		ChatMessage.create({
			user: game.user._id,
			content: content,
			speaker: {
				actor: actor._id,
				token: actor.token,
				alias: actor.name
			},
			type: CHAT_MESSAGE_TYPES.OTHER,
			whisper: rollWhisper,
			blind: rollBlind,
			sound: CONFIG.sounds.dice
		});
	}
	
	/**
	* Handles the creation of a chat message with the requested fields.
	* @param {Item} item			The desired item on the sheet to take data from
	* @param {Event} event			The triggering event which initiated the roll
	* @param {Array} params			Array of parameters:
	*		{String} itemType					Whether an item is a weapon, spell, tool, or feat
	*		{Boolean} attack						Whether to show the attack roll
	*		{Boolean} save						Whether to show the save DC
	*		{Boolean} damage						Whether to show the damage roll
	*		{Boolean} altDamage					Whether to show the alternate damage roll
	*		{Boolean} title						Title of the Chat Message. Defaults to item header
	*		{Boolean} info						Information written in the Chat Message
	*		{Boolean} forceCrit					Whether to force a critical damage roll
	*		{Boolean} sendMessage				Whether to send the message to chat, false simply returns the content of the roll
	*/
	static async fullRoll(item, event, params) {
		let rollRequests = mergeObject({
			itemType: "weapon",
			attack: false,
			save: false,
			damage: false,
			altDamage: false,
			title: null,
			info: false,
			forceCrit: false,
			sendMessage: true
		},params || {});
		
		let rollWhisper = null,
			rollBlind = false;
			
		// Figure out if roll labels are necessary
		let labelsShown = 0,
			showLabels = true;
		if (game.settings.get("betterrolls5e", "rollTitlesEnabled") == false) {
			let templates = ["attack", "damage", "altDamage"];
			for (var i = 0; i < templates.length; i++) {
				if (rollRequests[templates[i]] == true) {
					labelsShown += 1;
				}
			}
			showLabels = (labelsShown > 1) ? false : true;
		}
		
		let itemData = item.data.data,
			chatData = item.getChatData(),
			rollMode = game.settings.get("core", "rollMode");
		if ( ["gmroll", "blindroll"].includes(rollMode) ) rollWhisper = ChatMessage.getWhisperIDs("GM");
		if ( rollMode === "blindroll" ) rollBlind = true;
		
		let save = null,
			actor = item.actor,
			title = (rollRequests["title"] || await renderTemplate("public/modules/betterrolls5e/templates/red-header.html",{item:item})),
			attackRoll = (rollRequests["attack"] == true) ? await RedDice5e.rollAttack(item, rollRequests["itemType"], showLabels) : null,
			toolRoll = ((rollRequests["itemType"] == "tool") || (item.data.type == "tool")) ? await RedDice5e.rollTool(item) : null,
			isCrit = (rollRequests["forceCrit"] || (attackRoll ? attackRoll["isCrit"] : false)),
			damageRoll = (rollRequests["damage"] == true) ? await RedDice5e.rollDamage(item, false, isCrit, showLabels) : null,
			altDamageRoll = (rollRequests["altDamage"] == true) ? await RedDice5e.rollDamage(item, true, isCrit, showLabels) : null;
		if (attackRoll) {attackRoll = attackRoll["html"];}
		if (toolRoll) {toolRoll = toolRoll["html"];}
		if (rollRequests["save"]) {
			save = ["Save DC ", chatData.save.dc, " (", chatData.save.str, ")"].join("");
			//console.log(itemData);
			//console.log(save);
		}
		let info = ((rollRequests["info"]) && (itemData["description"])) ? itemData["description"].value : null;
		//console.log("info: ", info);
		
		let content = await renderTemplate("public/modules/betterrolls5e/templates/red-fullroll.html", {
			title: title,
			info: info,
			dual: attackRoll || toolRoll,
			save: save,
			damage: damageRoll,
			altdamage: altDamageRoll
		});
		
		if (rollRequests.sendMessage == true) {
			// Output the rolls to chat in one message
			ChatMessage.create({
				user: game.user._id,
				content: content,
				speaker: {
					actor: actor._id,
					token: actor.token,
					alias: actor.name
				},
				type: CHAT_MESSAGE_TYPES.OTHER,
				whisper: rollWhisper,
				blind: rollBlind,
				sound: CONFIG.sounds.dice
			});
		} else return content;
	}
	
	/**
	* A function for returning a roll template with crits and fumbles appropriately colored.
	* @param {Object} array			Object containing the html for the roll and whether or not the roll is a crit
	*	{HTMLElement} html
	*	{Boolean} isCrit
	* @param {Roll} roll			The desired roll to check for crits or fumbles
	* @param {String} selector		The CSS class selection to add the colors to
	*/
	static tagCrits(array, roll, selector, critThreshold, debug=false) {
		if (!roll) {return array;}
		let $html = $(array.html),
			high = 0,
			low = 0;
		roll.dice.forEach( function(d) {
			// Add crit for improved crit threshold
			let threshold = critThreshold || d.faces;
			if (debug) {
				//console.log("SIZE",d.faces,"VALUE",d.total);
			}
			if (d.faces > 1) {
				d.results.forEach( function(result) {
					if (result >= threshold) { high += 1; }
					else if (result == 1) { low += 1; }
				});
			}
		});
		if (debug) {
			//console.log("CRITS",high);
			//console.log("FUMBLES",low);
		}
		
		if ((high > 0) && (low == 0)) $html.find(selector).addClass("success");
		else if ((high == 0) && (low > 0)) $html.find(selector).addClass("failure");
		else if ((high > 0) && (low > 0)) $html.find(selector).addClass("mixed");
		let isCrit = false;
		if ((high > 0) || (array.isCrit == true)) isCrit = true;
		
		let output = {
			html: $html[0].outerHTML,
			isCrit: isCrit
		};
		return output;
	}
	
	/**
	* A function for rolling dual d20 rolls
	* @param {Array} parts			An array of parts for the Roll object
	* @param {Object} data			The data to compare to for the Roll object
	* @param {String} title			The title of the dual roll. By default, appears as small text centered above the rolls.
	*/
	static async rollDual20(parts, data, title, critThreshold) {
		let d20parts = ["1d20"].concat(parts);
		
		
		// Step 1 - Roll left and right die
		let leftRoll = new Roll(d20parts.join("+"), data).roll();
		let rightRoll = leftRoll.reroll();
		
		// Step 2 - Setup chatData
		let leftTooltip = await leftRoll.getTooltip(),
			rightTooltip = await rightRoll.getTooltip(),
			dualtooltip = await renderTemplate("public/modules/betterrolls5e/templates/red-dualtooltip.html", {lefttooltip: leftTooltip, righttooltip: rightTooltip}),
			chatData = {
				title: title,
				dualtooltip: dualtooltip,
				formula: leftRoll.formula,
				lefttotal: leftRoll.total,
				righttotal: rightRoll.total
			};
		
		// Step 3 - Create HTML using custom template
		let html = {
			html: await renderTemplate("public/modules/betterrolls5e/templates/red-dualroll.html", chatData),
			crit: false
		};
		html = RedDice5e.tagCrits(html, leftRoll, ".dice-total.dual-left", critThreshold);
		html = RedDice5e.tagCrits(html, rightRoll, ".dice-total.dual-right", critThreshold);
		return html;
	}
	
	static rollAttack(itm, type, titleEnabled) {
		// Prepare roll data
		let itemData = itm.data.data,
			actorData = itm.actor.data.data,
			title = titleEnabled ? "Attack" : null,
			parts = [],
			rollData = {};
		
		
		// Add Improved Critical threshold
		let critThreshold = 20;
		if (itm.data.type == "weapon") {
			critThreshold = itm.actor.getFlag("dnd5e", "weaponCriticalThreshold") || 20;
		}
		
		// Add ability modifier bonus
		if ( (itemData.ability.value.length > 0) || itm.data.type == "spell" ) {
			let abl = "";
			if (itm.data.type == "spell") {
				abl = itemData.ability.value || actorData.attributes.spellcasting.value;
			}
			else abl = itemData.ability.value;
			if (abl.length > 0) {
				parts.push(`@abl`);
				rollData.abl = actorData.abilities[abl].mod;
				//console.log("Adding Ability mod!");
			}
		}
		
		// Add proficiency, expertise, or Jack of all Trades
		if (itm.data.type == "spell" || itm.data.type == "feat" || (itemData.proficient && itemData.proficient.value) ) {
			parts.push(`@prof`);
			rollData.prof = Math.floor(actorData.attributes.prof.value);
			//console.log("Adding Proficiency mod!");
		}
		
		// Add item's bonus
		if ( (itemData.bonus) && (itemData.bonus.value != 0) && (itemData.bonus.value !== "") ) {
			parts.push(`@bonus`);
			rollData.bonus = itemData.bonus.value;
			//console.log("Adding Bonus mod!", itemData);
		}
		// // // // //
		
		let dualRoll = RedDice5e.rollDual20(parts, rollData, title, critThreshold);
		//console.log(dualRoll);
		return dualRoll;
	}
	
	static async damageTemplate (baseRoll, critRoll, title, damType) {
		let labelPlacement = game.settings.get("betterrolls5e", "damageRollPlacement"),
			baseTooltip = await baseRoll.getTooltip(),
			templateTooltip = null;
		
		if (critRoll) {
			let critTooltip = await critRoll.getTooltip();
			templateTooltip = await renderTemplate("public/modules/betterrolls5e/templates/red-dualtooltip.html", {lefttooltip: baseTooltip, righttooltip: critTooltip});
		} else {templateTooltip = baseTooltip;}
		
		let chatData = {
			tooltip: templateTooltip,
			lefttotal: baseRoll.total,
			righttotal: (critRoll ? critRoll.total : null),
			title: title,
			formula: baseRoll.formula,
			crittext: game.settings.get("betterrolls5e", "critString")
		};
		
		switch (labelPlacement) {
			case '2':
				chatData.damagemid = damType; break;
			case '3':
				chatData.damagebottom = damType; break;
		}
		
		let html = {
			html: await renderTemplate("public/modules/betterrolls5e/templates/red-damageroll.html", chatData)
		};
		html = RedDice5e.tagCrits(html, baseRoll, ".red-left-die");
		html = RedDice5e.tagCrits(html, critRoll, ".red-right-die");
		
		let output = html["html"];
		
		
		return output;
	}
	
	static rollDamage(itm, alternate = false, isCrit = false, showLabel = true) {
		let itemData = itm.data.data,
			rollData = duplicate(itm.actor.data.data),
			abl = itemData.ability.value || "str";
			
			rollData.item = itemData;
			
		let labelPlacement = game.settings.get("betterrolls5e", "damageRollPlacement"),
			type = itm.type,
			parts = [],
			dtype = (CONFIG.damageTypes[alternate ? itemData.damage2Type.value : itemData.damageType.value] || CONFIG.healingTypes[itemData.damageType.value]);
		if (itm.type === "weapon") {
			parts = [`@abilities.${abl}.mod`];
		}
		
		// Prepare roll label
		let title = [''];
		if (showLabel) {
			title[0] = ( (((itemData.type === "spell") && (itemData.spellType.value === "heal")) ? `Healing` : `Damage`) );
			if (alternate) {
				title[0] = `Alt. `.concat(title[0]);
			}
		}
		if (labelPlacement == '1') {
			title.push(dtype);
		}
		title = title.join(" - ");
		
		let baseDice = (alternate ? itemData.damage2.value : itemData.damage.value);
		let baseWithParts = [baseDice];
		if (parts) {baseWithParts = [baseDice].concat(parts);}
		
		let baseRoll = new Roll(baseWithParts.join("+"), rollData).roll();
		let critRoll = null;
		if (isCrit) {
			console.log(baseDice);
			let startCritRoll = new Roll(baseDice, rollData);
			let add = (itm.actor && itm.actor.getFlag("dnd5e", "savageAttacks")) ? 1 : 0;
			startCritRoll.alter(add);
			let newTerms = RedDice5e.removeFlatBonus(startCritRoll.terms);
			critRoll = new Roll(newTerms).roll();
		}
			
		let damageRoll = RedDice5e.damageTemplate(baseRoll, critRoll, title, dtype);
		return damageRoll;
	}
	
	static removeFlatBonus(terms) {
		terms.forEach( function(t) {
			console.log(t);
			if ((t.indexOf('+') === -1) && (t.indexOf('-') === -1) && (t.indexOf('*') === -1) && (t.indexOf('/') === -1) &&
				((t.indexOf('d') === -1) && (terms[t-1] !== '*') && (terms[t-1] !== '/'))) {
				terms[t] = "0";
			}
			//console.log("New t: ", terms[t]);
		});
		let output = terms.join('');
		//console.log("OUTPUT: ", output);
		return output;
	}
	
	static async rollAbilityCheck(actor, abl) {
		let parts = ["@mod"],
			data = {mod: abl.mod},
			flavor = null;
		
		return await RedDice5e.rollDual20(parts, data, flavor);
	}
	
	static async rollAbilitySave(actor, abl) {
		let parts = ["@mod"],
			data = {mod: abl.save},
			flavor = null;
		
		// Support global save bonus
		const saveBonus = actor.data.flags.dnd5e && actor.data.flags.dnd5e.saveBonus;
		if ( Number.isFinite(saveBonus) && parseInt(saveBonus) !== 0 ) {
			parts.push("@savebonus");
			data["savebonus"] = saveBonus;
		}
		
		return await RedDice5e.rollDual20(parts, data, flavor);
	}
	
	static async rollSkillCheck(actor, skill) {
		let parts = ["@mod"],
			data = {mod: skill.mod},
			flavor = null;
		
		return await RedDice5e.rollDual20(parts, data, flavor);
	}
	
	static async rollTool(itm) {
		// Prepare roll data
		let itemData = itm.data.data,
			actorData = itm.actor.data.data,
			title = null,
			parts = [],
			rollData = {};
		
		// Add ability modifier bonus
		if ( itemData.ability.value ) {
			let abl = (itemData.ability.value || 'str'),
				mod = actorData.abilities[abl].mod;
			if (mod !== 0) {
				parts.push(`@abl`);
				rollData.abl = mod;
				//console.log("Adding Ability mod!");
			}
		}
		
		// Add proficiency, expertise, or Jack of all Trades
		if ( itemData.proficient.value ) {
			parts.push(`@prof`);
			rollData.prof = Math.floor(itemData.proficient.value * actorData.attributes.prof.value);
			//console.log("Adding Proficiency mod!");
		}
		
		// Add item's bonus
		if ( itemData.bonus ) {
			parts.push(`@bonus`);
			rollData.bonus = itemData.bonus.value;
			//console.log("Adding Bonus mod!");
		}
		
		
		let dualRoll = await RedDice5e.rollDual20(parts, rollData, title);
		return dualRoll;
	}
}