import { i18n, hasMaestroSound, isAttack, isSave, getSave, isCheck, redUpdateFlags, getWhisperData, createMessage } from "./betterrolls5e.js";
import { Utils } from "./utils.js";

import { DND5E } from "../../../systems/dnd5e/module/config.js";

let dnd5e = DND5E;
let DEBUG = false;

const blankRoll = new Roll("0").roll(); // Used for CHAT_MESSAGE_TYPES.ROLL, which requires a roll that Better Rolls otherwise does not need

function debug() {
	if (DEBUG) {
		console.log.apply(console, arguments);
	}
}

// General class for macro support, actor rolls, and most static rolls.
export class CustomRoll {
	/**
	* A function for rolling multiple rolls. Returns the html code to inject into the chat message.
	* @param {Integer} numRolls			The number of rolls to put in the template.
	* @param {String} dice				The dice formula.
	* @param {Array} parts				The array of additional parts to add to the dice formula.
	* @param {Object} data				The actor's data to use as reference
	* @param {String} title				The roll's title.
	* @param {Boolean} critThreshold	The minimum roll on the dice to cause a critical roll.
	* @param {String} rollState			null, "highest", or "lowest"
	* @param {Boolean} triggersCrit		Whether this field marks the entire roll as critical
	* @param {String} rollType			The type of roll, such as "attack" or "damage"
	*/
	static async rollMultiple(numRolls = 1, dice = "1d20", parts = [], data = {}, title = "", critThreshold, rollState, triggersCrit = false, rollType = "") {
		let formula = [dice].concat(parts);
		let rolls = [];
		let tooltips = [];
		
		// Step 1 - Get all rolls
		for (let i=0; i<numRolls; i++) {
			rolls.push(await new Roll(formula.join("+"), data).roll());
			tooltips.push(await rolls[i].getTooltip());
		}
		
		let chatFormula = rolls[0].formula;
		
		// Step 2 - Setup chatData
		let chatData = {
			title: title,
			formula: chatFormula,
			tooltips: tooltips,
			rolls: rolls,
			rollState: rollState,
			rollType: rollType
		}
		
		function tagIgnored() {
			let rollTotals = rolls.map(r => r.total);
			let chosenResult = rollTotals[0];
			if (rollState) {
				if (rollState == "highest") {
					chosenResult = rollTotals.sort(function(a, b){return a-b})[rollTotals.length-1];
				} else if (rollState == "lowest") {
					chosenResult = rollTotals.sort(function(a, b){return a-b})[0];
				}
				
			
				rolls.forEach(r => {
					if (r.total != chosenResult) { r.ignored = true; }
				});
			}
		}
		
		switch (rollState) {
			case 'highest':
				break;
			case 'lowest':
				break;
		}
		
		tagIgnored();
		
		// Step 3 - Create HTML using custom template
		let multiRoll = await renderTemplate("modules/betterrolls5e/templates/red-multiroll.html", chatData);
		
		let template = CustomItemRoll.tagCrits(multiRoll, rolls, ".dice-total.dice-row-item", critThreshold, [20]);
		template.isCrit = template.isCrit && triggersCrit;
		
		let output = {
			html:template.html,
			isCrit:template.isCrit,
			data:chatData
		};
		return output;
	}
	
	static getRollState(args) {
		let adv = args.adv || 0;
		let disadv = args.disadv || 0;
		if (adv > 0 || disadv > 0) {
			if (adv > disadv) { return "highest"; }
			else if (adv < disadv) { return "lowest"; }
		} else { return null; }
	}

	// Gets the dice pool from a single template. Used for non-item rolls.
	static getDicePool(template) {
		let dicePool = new Roll("0").roll();
		template.data.rolls.forEach(roll => {
			roll.dice.forEach(die => {
				dicePool._dice.push(die);
			});
		});
		return dicePool;
	}
	
	// Returns an {adv, disadv} object when given an event
	static async eventToAdvantage(ev, itemType) {
		if (ev.shiftKey) {
			return {adv:1, disadv:0};
		} else if ((keyboard.isCtrl(ev))) {
			return {adv:0, disadv:1};
		} else if (game.settings.get("betterrolls5e", "queryAdvantageEnabled")) {
			// Don't show dialog for items that aren't tool or weapon.
			if (itemType != null && !itemType.match(/^(tool|weapon)$/)) {
				return {adv:0, disadv:0};
			}
			return new Promise(resolve => {
				new Dialog({
					title: i18n("br5e.querying.title"),
					buttons: {
						disadvantage: {
							label: i18n("br5e.querying.disadvantage"),
							callback: () => resolve({adv:0, disadv:1})
						},
						normal: {
							label: i18n("br5e.querying.normal"),
							callback: () => resolve({adv:0, disadv:0})
						},
						advantage: {
							label: i18n("br5e.querying.advantage"),
							callback: () => resolve({adv:1, disadv:0})
						}
					}
				}).render(true);
			});
		} else {
			return {adv:0, disadv:0};
		}
	}
	
	
	// Creates a chat message with the requested skill check.
	static async fullRollSkill(actor, skill, params) {
		let skl = actor.data.data.skills[skill],
			label = dnd5e.skills[skill];
			
		let wd = getWhisperData();
		
		let multiRoll = await CustomRoll.rollSkillCheck(actor, skl, params);
		
		// let titleImage = (actor.data.img == "icons/svg/mystery-man.svg") ? actor.data.token.img : actor.data.img;
		let titleImage = CustomRoll.getImage(actor);
		
		let titleTemplate = await renderTemplate("modules/betterrolls5e/templates/red-header.html", {
			item: {
				img: titleImage,
				name: `${i18n(label)}`
			}
		});
		
		let content = await renderTemplate("modules/betterrolls5e/templates/red-fullroll.html", {
			title: titleTemplate,
			templates: [multiRoll]
		});

		let has3DDiceSound = game.dice3d ? game.settings.get("dice-so-nice", "settings").enabled : false;
		let playRollSounds = game.settings.get("betterrolls5e", "playRollSounds");
		
		let output = {
			chatData: {
				user: game.user._id,
				content: content,
				speaker: {
					actor: actor._id,
					token: actor.token,
					alias: actor.token?.name || actor.name
				},
				type: CONST.CHAT_MESSAGE_TYPES.ROLL,
				roll: blankRoll,
				rollMode: wd.rollMode,
				blind: wd.blind,
				sound: (playRollSounds && !has3DDiceSound) ? CONFIG.sounds.dice : null,
			},
			dicePool: CustomRoll.getDicePool(multiRoll),
		};

		if (wd.whisper) { output.chatData.whisper = wd.whisper; }
		
		// Output the rolls to chat
		return await createMessage(output);
	}
	
	// Rolls a skill check through a character
	static async rollSkillCheck(actor, skill, params = {}) {
		let parts = ["@mod"],
			data = {mod: skill.total},
			flavor = null;
		
		const skillBonus = getProperty(actor, "data.data.bonuses.abilities.skill");
		if (skillBonus) {
			parts.push("@skillBonus");
			data["skillBonus"] = skillBonus;
		}
		
		// Halfling Luck check
		let d20String = "1d20";
		if (Utils.isHalfling(actor)) {
			d20String = "1d20r<2";
		}

		if (getProperty(actor, "data.flags.dnd5e.reliableTalent") && skill.value >= 1) {
			d20String = `{${d20String},10}kh`;
		}
		
		let rollState = params ? CustomRoll.getRollState(params) : null;
		
		let numRolls = game.settings.get("betterrolls5e", "d20Mode");
		if (rollState && numRolls == 1) {
			numRolls = 2;
		}
		
		return await CustomRoll.rollMultiple(numRolls, d20String, parts, data, flavor, params.critThreshold || null, rollState, params.triggersCrit, "skill");
	}

	static async rollCheck(actor, ability, params) {
		return await CustomRoll.fullRollAttribute(actor, ability, "check", params);
	}

	static async rollSave(actor, ability, params) {
		return await CustomRoll.fullRollAttribute(actor, ability, "save", params);
	}

	static getImage(actor) {
		let actorImage = (actor.data.img && actor.data.img != DEFAULT_TOKEN && !actor.data.img.includes("*")) ? actor.data.img : false;
		let tokenImage = actor.token?.data?.img ? actor.token.data.img : actor.data.token.img;

		switch(game.settings.get("betterrolls5e", "defaultRollArt")) {
			case "actor":
				return actorImage || tokenImage;
				break;
			case "token":
				return tokenImage || actorImage;
				break;
		}
	}
	
	/**
	* Creates a chat message with the requested ability check or saving throw.
	* @param {Actor5e} actor		The actor object to reference for the roll.
	* @param {String} ability		The ability score to roll.
	* @param {String} rollType		String of either "check" or "save" 
	*/
	static async fullRollAttribute(actor, ability, rollType, params) {
		let multiRoll,
			titleString,
			abl = ability,
			label = dnd5e.abilities[ability];
		
		let wd = getWhisperData();
		
		if (rollType === "check") {
			multiRoll = await CustomRoll.rollAbilityCheck(actor, abl, params);
			titleString = `${i18n(label)} ${i18n("br5e.chat.check")}`;
		} else if (rollType === "save") {
			multiRoll = await CustomRoll.rollAbilitySave(actor, abl, params);
			titleString = `${i18n(label)} ${i18n("br5e.chat.save")}`;
		}

		// let titleImage = ((actor.data.img == DEFAULT_TOKEN) || actor.data.img == "" || actor.data.img.includes("*")) ? (actor.token && actor.token.data ? actor.token.data.img : actor.data.token.img) : actor.data.img;
		let titleImage = CustomRoll.getImage(actor);
		
		let titleTemplate = await renderTemplate("modules/betterrolls5e/templates/red-header.html", {
			item: {
				img: titleImage,
				name: titleString
			}
		});
		
		let content = await renderTemplate("modules/betterrolls5e/templates/red-fullroll.html", {
			title: titleTemplate,
			templates: [multiRoll]
		});

		let has3DDiceSound = game.dice3d ? game.settings.get("dice-so-nice", "settings").enabled : false;
		let playRollSounds = game.settings.get("betterrolls5e", "playRollSounds")
		
		let rollMessage = {
			chatData: {
				user: game.user._id,
				content: content,
				speaker: {
					actor: actor._id,
					token: actor.token,
					alias: actor.token?.name || actor.name
				},
				type: CONST.CHAT_MESSAGE_TYPES.ROLL,
				roll: blankRoll,
				rollMode: wd.rollMode,
				blind: wd.blind,
				sound: (playRollSounds && !has3DDiceSound) ? CONFIG.sounds.dice : null,
			},
			dicePool: CustomRoll.getDicePool(multiRoll)
		};
		
		if (wd.whisper) { rollMessage.chatData.whisper = wd.whisper; }
		
		// Output the rolls to chat
		return await createMessage(rollMessage);
	}
	
	static async rollAbilityCheck(actor, abl, params = {}) {
		let parts = ["@mod"],
			data = duplicate(actor.data.data),
			flavor = null;

			data.mod = data.abilities[abl].mod;
		
		const checkBonus = getProperty(actor, "data.data.bonuses.abilityCheck");
		const secondCheckBonus = getProperty(actor, "data.data.bonuses.abilities.check");
		
		if (checkBonus && parseInt(checkBonus) !== 0) {
			parts.push("@checkBonus");
			data["checkBonus"] = checkBonus;
		} else if (secondCheckBonus && parseInt(secondCheckBonus) !== 0) {
			parts.push("@secondCheckBonus");
			data["secondCheckBonus"] = secondCheckBonus;
		}

		if (actor.getFlag("dnd5e", "jackOfAllTrades")) {
			parts.push(`floor(@attributes.prof / 2)`);
		}

		// Halfling Luck check
		let d20String = "1d20";
		if (Utils.isHalfling(actor)) {
			d20String = "1d20r<2";
		}
		
		let rollState = params ? CustomRoll.getRollState(params) : null;
		
		let numRolls = game.settings.get("betterrolls5e", "d20Mode");
		if (rollState && numRolls == 1) {
			numRolls = 2;
		}
		
		return await CustomRoll.rollMultiple(numRolls, d20String, parts, data, flavor, params.critThreshold || null, rollState);
	}
	
	static async rollAbilitySave(actor, abl, params = {}) {
		//console.log(abl);
		let actorData = actor.data.data;
		let parts = [];
		let data = {mod: []};
		let flavor = null;
		
		// Support modifiers and global save bonus
		const saveBonus = getProperty(actorData, "bonuses.abilities.save") || null;
		let ablData = actor.data.data.abilities[abl];
		let ablParts = {};
		ablParts.mod = ablData.mod !== 0 ? ablData.mod.toString() : null;
		ablParts.prof = ((ablData.proficient || 0) * actorData.attributes.prof).toString();
		let mods = [ablParts.mod, ablParts.prof, saveBonus];
		for (let i=0; i<mods.length; i++) {
			if (mods[i] && mods[i] !== "0") {
				data.mod.push(mods[i]);
			}
		}
		data.mod = data.mod.join("+");
		
		// Halfling Luck check
		let d20String = "1d20";
		if (Utils.isHalfling(actor)) {
			d20String = "1d20r<2";
		}
		
		if (data.mod !== "") {
			parts.push("@mod");
		}
		
		let rollState = params ? CustomRoll.getRollState(params) : null;
		
		let numRolls = game.settings.get("betterrolls5e", "d20Mode");
		if (rollState && numRolls == 1) {
			numRolls = 2;
		}
		
		return await CustomRoll.rollMultiple(numRolls, d20String, parts, data, flavor, params.critThreshold || null, rollState);
	}
	
	static newItemRoll(item, params, fields) {
		let roll = new CustomItemRoll(item, params, fields);
		return roll;
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

// A custom roll with data corresponding to an item on a character's sheet.
export class CustomItemRoll {
	constructor(item, params, fields) {
		this.item = item;
		this.actor = item.actor;
		this.itemFlags = item.data.flags;
		this.params = mergeObject(duplicate(defaultParams), params || {});	// General parameters for the roll as a whole.
		this.fields = fields;			 									// Where requested roll fields are stored, in the order they should be rendered.
		this.templates = [];			 									// Where finished templates are stored, in the order they should be rendered.
		
		this.rolled = false;
		this.isCrit = this.params.forceCrit || false;			// Defaults to false, becomes "true" when a valid attack or check first crits.
		this.rollState = null;
		
		if (!this.params.event) { this.params.event = event; }
		
		this.checkEvent();
		this.setRollState();
		this.updateConfig();
		this.dicePool = new Roll("0").roll();
	}
	
	// Update config settings in the roll.
	updateConfig() {
		this.config = {
			playRollSounds: game.settings.get("betterrolls5e", "playRollSounds"),
			hasMaestroSound: hasMaestroSound(this.item),
			damageRollPlacement: game.settings.get("betterrolls5e", "damageRollPlacement"),
			rollTitlePlacement: game.settings.get("betterrolls5e", "rollTitlePlacement"),
			damageTitlePlacement: game.settings.get("betterrolls5e", "damageTitlePlacement"),
			damageContextPlacement: game.settings.get("betterrolls5e", "damageContextPlacement"),
			contextReplacesTitle: game.settings.get("betterrolls5e", "contextReplacesTitle"),
			contextReplacesDamage: game.settings.get("betterrolls5e", "contextReplacesDamage"),
			critString: game.settings.get("betterrolls5e", "critString"),
			critBehavior: game.settings.get("betterrolls5e", "critBehavior"),
			quickDefaultDescriptionEnabled: game.settings.get("betterrolls5e", "quickDefaultDescriptionEnabled"),
			altSecondaryEnabled: game.settings.get("betterrolls5e", "altSecondaryEnabled"),
			d20Mode: game.settings.get("betterrolls5e", "d20Mode"),
			hideDC: game.settings.get("betterrolls5e", "hideDC"),
		};
	}
	
	checkEvent(ev) {
		let eventToCheck = ev || this.params.event;
		if (!eventToCheck) { return; }
		if (eventToCheck.shiftKey) {
			this.params.adv = 1;
		}
		if (keyboard.isCtrl(eventToCheck)) {
			this.params.disadv = 1;
		}
	}
	
	// Sets the roll's rollState to "highest" or "lowest" if the roll has advantage or disadvantage, respectively.
	setRollState() {
		this.rollState = null;
		let adv = this.params.adv;
		let disadv = this.params.disadv;
		if (adv > 0 || disadv > 0) {
			if (adv > disadv) { this.rollState = "highest"; }
			else if (adv < disadv) { this.rollState = "lowest"; }
		}
	}

	// Adds a roll's results to the custom roll's dice pool, for the purposes of 3D dice rendering.
	addToDicePool(roll) {
		roll?.dice?.forEach(die => {
			this.dicePool._dice.push(die);
		});
	}
	
	async roll() {
		let params = this.params,
			item = this.item,
			itemData = item.data.data,
			actor = item.actor,
			flags = item.data.flags,
			save;
		
		await redUpdateFlags(item);
		
		Hooks.call("preRollItemBetterRolls", this);
		
		if (Number.isInteger(params.preset)) {
			this.updateForPreset();
		}

		if (this.params.useCharge.resource) {
			const consume = itemData.consume;
			if ( consume?.type === "ammo" ) {
				this.ammo = this.actor.items.get(consume.target);
			}
		}
		
		if (!params.slotLevel) {
			if (item.data.type === "spell") {
				params.slotLevel = await this.configureSpell();
				if (params.slotLevel === "error") { return "error"; }
			}
		}

		// Convert all requested fields into templates to be entered into the chat message.
		this.templates = await this.allFieldsToTemplates();
		
		// Check to consume charges. Prevents the roll if charges are required and none are left.
		let chargeCheck = await this.consumeCharge();
		if (chargeCheck === "error") { return "error"; }
		
		// Show properties
		this.properties = (params.properties) ? this.listProperties() : null;
		
		let printedSlotLevel = ( item.data.type === "spell" && this.params.slotLevel != item.data.data.level ) ? dnd5e.spellLevels[this.params.slotLevel] : null;
			
		let title = (this.params.title || await renderTemplate("modules/betterrolls5e/templates/red-header.html", {item:item, slotLevel:printedSlotLevel}));
		
		// Add token's ID to chat roll, if valid
		let tokenId;
		if (actor.token) {
			tokenId = [canvas.tokens.get(actor.token.id).scene.id, actor.token.id].join(".");
		}
		
		if (params.useTemplate && (item.data.type == "feat" || item.data.data.level == 0)) {
			this.placeTemplate();
		}
		
		this.rolled = true;
		
		await Hooks.callAll("rollItemBetterRolls", this);
		
		await new Promise(r => setTimeout(r, 25));
		
		let content = await renderTemplate("modules/betterrolls5e/templates/red-fullroll.html", {
			item: item,
			actor: actor,
			tokenId: tokenId,
			itemId: item.id,
			isCritical: this.isCrit,
			title: title,
			templates: this.templates,
			properties: this.properties
		});
		this.content = content;
		
		if (chargeCheck === "destroy") { await actor.deleteOwnedItem(item.id); }

		return this.content;
	}
	
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
	async fieldToTemplate(field){
		let item = this.item;
		let fieldType = field[0].toLowerCase();
		let fieldArgs = field.slice();
		fieldArgs.splice(0,1);
		switch (fieldType) {
			case 'attack':
				// {adv, disadv, bonus, triggersCrit, critThreshold}
				this.templates.push(await this.rollAttack(fieldArgs[0]));
				break;
			case 'toolcheck':
			case 'tool':
			case 'check':
				this.templates.push(await this.rollTool(fieldArgs[0]));
				break;
			case 'damage':
				// {damageIndex: 0, forceVersatile: false, forceCrit: false}
				let index, versatile, crit, context;
				let damagesToPush = [];
				if (typeof fieldArgs[0] === "object") {
					index = fieldArgs[0].index;
					versatile = fieldArgs[0].versatile;
					crit = fieldArgs[0].crit;
					context = fieldArgs[0].context;
				}
				let oldIndex = index;
				if (index === "all") {
					let newIndex = [];
					for (let i=0;i<this.item.data.data.damage.parts.length;i++) {
						newIndex.push(i);
					}
					index = newIndex;
				} else if (Number.isInteger(index)) {
					let newIndex = [index];
					index = newIndex;
				}
				for (let i=0;i<index.length;i++) {
					this.templates.push(await this.rollDamage({
						damageIndex: index[i] || 0,
						// versatile damage will only replace the first damage formula in an "all" damage request
						forceVersatile: (i == 0 || oldIndex !== "all") ? versatile : false,
						forceCrit: crit,
						customContext: context
					}));
				}
				if (this.ammo) {
					this.item = this.ammo;
					delete this.ammo;
					await this.fieldToTemplate(['damage', {index: 'all', versatile: false, crit, context: `[${this.item.name}]`}]);
					this.item = item;
				}
				break;
			case 'savedc':
				// {customAbl: null, customDC: null}
				let abl, dc;
				if (fieldArgs[0]) {
					abl = fieldArgs[0].abl;
					dc = fieldArgs[0].dc;
				}
				this.templates.push(await this.saveRollButton({customAbl:abl, customDC:dc}));
				break;
			case 'other':
				if (item.data.data.formula) { this.templates.push(await this.rollOther()); }
				break;
			case 'custom':
				/* args:
						title			title of the roll
						formula			the roll formula
						rolls			number of rolls
						rollState		"adv" or "disadv" converts to "highest" or "lowest"
				*/
				let rollStates = {
					null: null,
					"adv": "highest",
					"disadv": "lowest"
				};
				if (!fieldArgs[0]) {
					fieldArgs[0] = {rolls:1, formula:"1d20", rollState:null};
				}
				let rollData = duplicate(this.item.actor.data.data);
				rollData.item = item.data.data;
				this.addToRollData(rollData);
				let output = await CustomRoll.rollMultiple(fieldArgs[0].rolls, fieldArgs[0].formula, ["0"], rollData, fieldArgs[0].title, null, rollStates[fieldArgs[0].rollState], false, "custom");
				output.type = 'custom';
				output.data.rolls.forEach(roll => {
					this.addToDicePool(roll);
				});
				this.templates.push(output);
				break;
			case 'description':
			case 'desc':
				// Display info from Components module
				let componentField = "";
				if (game.modules.get("components5e") && game.modules.get("components5e").active) {
					componentField = window.ComponentsModule.getComponentHtml(item, 20);
				}
				fieldArgs[0] = {text: componentField + item.data.data.description.value};
			case 'text':
				if(fieldArgs[0].text) {
					this.templates.push({
						type:'text',
						html:`<div class="card-content br-text">${fieldArgs[0].text}</div>`,
					});
				}
				break;
			case 'flavor':
				this.templates.push(this.rollFlavor(fieldArgs[0]));
				break;
			case 'crit':
				this.templates.push(await this.rollCritExtra());
				break;
		}
		return true;
	}
	
	async allFieldsToTemplates() {
		return new Promise(async (resolve, reject) => {
			
			for (let i=0;i<this.fields.length;i++) {
				await this.fieldToTemplate(this.fields[i]);
			}

			if (this.isCrit && this.hasDamage && this.item.data.flags.betterRolls5e?.critDamage?.value) {
				await this.fieldToTemplate(["crit"]);
			}
			
			resolve(this.templates);
		});
	}
	
	async toMessage() {
		if (this.rolled) {
			console.log("Already rolled!", this);
		} else {
		
			let content = await this.roll();
			if (content === "error") return;
			
			let wd = getWhisperData();
			
			// Configure sound based on Dice So Nice and Maestro sounds
			let has3DDiceSound = game.dice3d ? game.settings.get("dice-so-nice", "settings").enabled : false;
			let playRollSounds = this.config.playRollSounds;
			let hasMaestroSound = this.config.hasMaestroSound;

			this.chatData = {
				user: game.user._id,
				content: this.content,
				speaker: {
					actor: this.actor._id,
					token: this.actor.token,
					alias: this.actor.token?.name || this.actor.name
				},
				type: CONST.CHAT_MESSAGE_TYPES.ROLL,
				roll: blankRoll,
				rollMode: wd.rollMode,
				blind: wd.blind,
				sound: (playRollSounds && !hasMaestroSound && !has3DDiceSound) ? CONFIG.sounds.dice : null,
			};
			
			if (wd.whisper) { this.chatData.whisper = wd.whisper; }
			
			await Hooks.callAll("messageBetterRolls", this, this.chatData);
			return await createMessage(this);
		}
	}
	
	
	/*
	* Updates the rollRequests based on the br5e flags.
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
					let isVersatile = (i == 0) && flagIsTrue("quickVersatile");
					if (brFlags.quickDamage[val][i]) { fields.push(["damage", {index:i, versatile:isVersatile}]); }
				}
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

		console.log(this.params);
		
		this.fields = fields.concat((this.fields || []).slice());
	}
	
	/**
	* A function for returning the properties of an item, which can then be printed as the footer of a chat card.
	*/
	listProperties() {
		let item = this.item;
		let properties = [];
		let data = item.data.data,
		
		const range = Utils.getRange(item);
		const target = Utils.getTarget(item);
		const activation = Utils.getActivationData(item)
		const duration = Utils.getDuration(item);

		switch(item.data.type) {
			case "weapon":
				properties = [
					dnd5e.weaponTypes[data.weaponType],
					range,
					target,
					data.proficient ? "" : i18n("Not Proficient"),
					data.weight ? data.weight + " " + i18n("lbs.") : null
				];
				for (const prop in data.properties) {
					if (data.properties[prop] === true) {
						properties.push(dnd5e.weaponProperties[prop]);
					}
				}
				break;
			case "spell":
				// Spell attack labels
				data.damageLabel = data.actionType === "heal" ? i18n("br5e.chat.healing") : i18n("br5e.chat.damage");
				data.isAttack = data.actionType === "attack";

				properties = [
					dnd5e.spellSchools[data.school],
					dnd5e.spellLevels[data.level],
					data.components.ritual ? i18n("Ritual") : null,
					activation,
					duration,
					data.components.concentration ? i18n("Concentration") : null,
					Utils.getSpellComponents(item),
					range,
					target
				];
				break;
			case "feat":
				properties = [
					data.requirements,
					activation,
					duration,
					range,
					target,
				];
				break;
			case "consumable":
				properties = [
					data.weight ? data.weight + " " + i18n("lbs.") : null,
					activation,
					duration,
					range,
					target,
				];
				break;
			case "equipment":
				properties = [
					dnd5e.equipmentTypes[data.armor.type],
					data.equipped ? i18n("Equipped") : null,
					data.armor.value ? data.armor.value + " " + i18n("AC") : null,
					data.stealth ? i18n("Stealth Disadv.") : null,
					data.weight ? data.weight + " lbs." : null,
				];
				break;
			case "tool":
				properties = [
					dnd5e.proficiencyLevels[data.proficient],
					data.ability ? dnd5e.abilities[data.ability] : null,
					data.weight ? data.weight + " lbs." : null,
				];
				break;
			case "loot":
				properties = [data.weight ? item.data.totalWeight + " lbs." : null]
				break;
		}
		let output = properties.filter(p => (p) && (p.length !== 0) && (p !== " "));
		return output;
	}
	
	addToRollData(data) {
		data.classes = this.item.actor.items.reduce((obj, i) => {
			if ( i.type === "class" ) {
				obj[i.name.slugify({strict: true})] = i.data.data;
			}
			return obj;
		}, {});
		data.prof = this.item.actor.data.data.attributes.prof;
	}
	
	/**
	* A function for returning a roll template with crits and fumbles appropriately colored.
	* @param {Object} args					Object containing the html for the roll and whether or not the roll is a crit
	* @param {Roll} rolls						The desired roll to check for crits or fumbles
	* @param {String} selector			The CSS class selection to add the colors to
	* @param {Number} critThreshold	The minimum number required for a critical success (defaults to max roll on the die)
	*/
	static tagCrits(args, rolls, selector, critThreshold, critChecks=true) {
		if (typeof args !== "object") { args = {
			html: args,
			isCrit: false
		}; }
		if (!rolls) {return args;}
		if (!Array.isArray(rolls)) {rolls = [rolls];}
		let $html = $(args.html);
		let rollHtml = $html.find(selector);
		let isCrit = false;
		for (let i=0; i<rollHtml.length; i++) {
			let high = 0,
				low = 0;
			rolls[i].dice.forEach( function(d) {
				// Add crit for improved crit threshold
				let threshold = critThreshold || d.faces;
				debug("SIZE " + d.faces);
				debug("VALUE " + d.total);
				if (d.faces > 1 && (critChecks == true || critChecks.includes(d.faces))) {
					d.results.forEach( function(result) {
						if (result.result >= threshold) { high += 1; }
						else if (result.result == 1) { low += 1; }
					});
				}
			});
			debug("CRITS", high);
			debug("FUMBLES", low);
			
			if ((high > 0) && (low == 0)) $($html.find(selector)[i]).addClass("success");
			else if ((high == 0) && (low > 0)) $($html.find(selector)[i]).addClass("failure");
			else if ((high > 0) && (low > 0)) $($html.find(selector)[i]).addClass("mixed");
			if ((high > 0) || (args.isCrit == true)) isCrit = true;
		}
		return {
			html: $html[0].outerHTML,
			isCrit: isCrit
		};
	}
	
	/* 
		Rolls an attack roll for the item.
		@param {Object} args				Object containing all named parameters
			@param {Number} adv				1 for advantage
			@param {Number} disadv			1 for disadvantage
			@param {String} bonus			Additional situational bonus
			@param {Boolean} triggersCrit	Whether a crit for this triggers future damage rolls to be critical
			@param {Number} critThreshold	Minimum roll for a d20 is considered a crit
	*/
	async rollAttack(preArgs) {
		let args = mergeObject({adv: this.params.adv, disadv: this.params.disadv, bonus: null, triggersCrit: true, critThreshold: null}, preArgs || {});
		let itm = this.item;
		// Prepare roll data
		let itemData = itm.data.data,
			actorData = itm.actor.data.data,
			title = (this.config.rollTitlePlacement !== "0") ? i18n("br5e.chat.attack") : null,
			parts = [],
			rollData = duplicate(actorData);

		
		this.addToRollData(rollData);
		this.hasAttack = true;
		
		// Add critical threshold
		let critThreshold = 20;
		let characterCrit = 20;
		try { characterCrit = Number(getProperty(itm, "actor.data.flags.dnd5e.weaponCriticalThreshold")) || 20;  }
		catch(error) { characterCrit = itm.actor.data.flags.dnd5e.weaponCriticalThreshold || 20; }
		
		let itemCrit = Number(getProperty(itm, "data.flags.betterRolls5e.critRange.value")) || 20;
		//	console.log(critThreshold, characterCrit, itemCrit);
		
		// If a specific critThreshold is set, use that
		if (args.critThreshold) {
			critThreshold = args.critThreshold;
		// Otherwise, determine it from character & item data
		} else {
			if (['mwak', 'rwak'].includes(itemData.actionType)) {
				critThreshold = Math.min(critThreshold, characterCrit, itemCrit);
			} else {
				critThreshold = Math.min(critThreshold, itemCrit);
			}
		}
		
		// Add ability modifier bonus
		let abl = "";
		if (itm.data.type == "spell") {
			abl = itemData.ability || actorData.attributes.spellcasting;
		} else if (itm.data.type == "weapon") {
			if (itemData.properties.fin && (itemData.ability === "str" || itemData.ability === "dex" || itemData.ability === "")) {
				if (actorData.abilities.str.mod >= actorData.abilities.dex.mod) { abl = "str"; }
				else { abl = "dex"; }
			} else { abl = itemData.ability || (itemData.actionType === "mwak" ? "str" : itemData.actionType === "rwak" ? "dex" : "") }
		} else {
			abl = itemData.ability || "";
		}
		
		if (abl.length) {
			parts.push(`@abl`);
			rollData.abl = actorData.abilities[abl]?.mod;
			//console.log("Adding Ability mod", abl);
		}
		
		// Add proficiency, expertise, or Jack of all Trades
		if ( itm.data.type == "spell" || itm.data.type == "feat" || itemData.proficient ) {
			parts.push(`@prof`);
			rollData.prof = Math.floor(actorData.attributes.prof);
			//console.log("Adding Proficiency mod!");
		}
		
		// Add item's bonus
		if ( itemData.attackBonus ) {
			parts.push(`@bonus`);
			rollData.bonus = itemData.attackBonus;
			//console.log("Adding Bonus mod!", itemData);
		}

		if(this.ammo?.data) {
			const ammoBonus = this.ammo.data.data.attackBonus;
			if ( ammoBonus ) {
				parts.push("@ammo");
				rollData["ammo"] = ammoBonus;
				title += ` [${this.ammo.name}]`;
			}
		}
		
		// Add custom situational bonus
		if (args.bonus) {
			parts.push(args.bonus);
		}
		
		if (actorData.bonuses && isAttack(itm)) {
			let actionType = `${itemData.actionType}`;
			if (actorData?.bonuses[actionType]?.attack) {
				parts.push("@" + actionType);
				rollData[actionType] = actorData.bonuses[actionType].attack;
			}
		}	
		
		// Establish number of rolls using advantage/disadvantage
		let adv = this.params.adv;
		if (args.adv) { adv = args.adv; }
		
		let disadv = this.params.disadv;
		if (args.disadv) { disadv = args.disadv; }
		
		let rollState = CustomRoll.getRollState({adv:args.adv, disadv:args.disadv});
		
		let numRolls = this.config.d20Mode;
		
		if (rollState) {
			numRolls = 2;
		}
		
		// Elven Accuracy check
		if (numRolls == 2) {
			if (getProperty(itm, "actor.data.flags.dnd5e.elvenAccuracy") && ["dex", "int", "wis", "cha"].includes(abl) && rollState !== "lowest") {
				numRolls = 3;
			}
		}
		
		let d20String = "1d20";
		
		// Halfling Luck check
		if (Utils.isHalfling(itm.actor)) {
			d20String = "1d20r<2";
		}
		
		let output = mergeObject({type:"attack"}, await CustomRoll.rollMultiple(numRolls, d20String, parts, rollData, title, critThreshold, rollState, args.triggersCrit));
		if (output.isCrit) {
			this.isCrit = true;
		}
		output.type = "attack";

		output.data.rolls.forEach(roll => {
			this.addToDicePool(roll);
		});

		return output;
	}
	
	async damageTemplate ({baseRoll, critRoll, labels, type}) {
		let baseTooltip = await baseRoll.getTooltip(),
			templateTooltip;
		
		if (baseRoll.terms.length === 0) return;
		
		if (critRoll) {
			let critTooltip = await critRoll.getTooltip();
			templateTooltip = await renderTemplate("modules/betterrolls5e/templates/red-dualtooltip.html", {lefttooltip: baseTooltip, righttooltip: critTooltip});
		} else { templateTooltip = baseTooltip; }
		
		
		let chatData = {
			tooltip: templateTooltip,
			lefttotal: baseRoll.total,
			righttotal: (critRoll ? critRoll.total : null),
			damagetop: labels[1],
			damagemid: labels[2],
			damagebottom: labels[3],
			formula: baseRoll.formula,
			crittext: this.config.critString,
			damageType:type,
			maxRoll: await new Roll(baseRoll.formula).evaluate({maximize:true}).total,
			maxCrit: critRoll ? await new Roll(critRoll.formula).evaluate({maximize:true}).total : null
		};
		
		let html = {
			html: await renderTemplate("modules/betterrolls5e/templates/red-damageroll.html", chatData)
		};
		html = CustomItemRoll.tagCrits(html, baseRoll, ".red-base-die");
		html = CustomItemRoll.tagCrits(html, critRoll, ".red-extra-die");
		
		let output = {
			type: "damage",
			html: html["html"],
			data: chatData
		}

		return output;
	}
	
	async rollDamage({damageIndex = 0, forceVersatile = false, forceCrit = false, bonus = 0, customContext = null}) {
		let itm = this.item;
		let itemData = itm.data.data,
			rollData = duplicate(itm.actor.data.data),
			abl = itemData.ability,
			flags = itm.data.flags.betterRolls5e,
			damageFormula,
			damageType = itemData.damage.parts[damageIndex][1],
			isVersatile = false,
			slotLevel = this.params.slotLevel;
		
		rollData.item = duplicate(itemData);
		rollData.item.level = slotLevel;
		this.addToRollData(rollData);

		// Makes the custom roll flagged as having a damage roll.
		this.hasDamage = true;
		
		// Change first damage formula if versatile
		if (((this.params.versatile && damageIndex === 0) || forceVersatile) && itemData.damage.versatile.length > 0) {
			damageFormula = itemData.damage.versatile;
			isVersatile = true;
		} else {
			damageFormula = itemData.damage.parts[damageIndex][0];
		}

		if (!damageFormula) { return null; }
		
		let type = itm.data.type,
			parts = [],
			dtype = CONFIG.betterRolls5e.combinedDamageTypes[damageType];
		
		let generalMod = rollData.attributes.spellcasting;
		
		// Spells don't push their ability modifier to damage by default. This is here so the user can add "+ @mod" to their damage roll if they wish.
		if (type === "spell") {
			abl = itemData.ability ? itemData.ability : generalMod;
		}
		

		// Applies ability modifier on weapon and feat damage rolls, but only for the first damage roll listed on the item.
		if (!abl && (type === "weapon" || type === "feat") && damageIndex === 0) {
			if (type === "weapon") {
				if (itemData.properties.fin && (itemData.ability === "str" || itemData.ability === "dex" || itemData.ability === "")) {
					if (rollData.abilities.str.mod >= rollData.abilities.dex.mod) { abl = "str"; }
					else { abl = "dex"; }
				} else if (itemData.actionType == "mwak") {
					abl = "str";
				} else if (itemData.actionType == "rwak") {
					abl = "dex";
				}
			}
		}
		
		// Users may add "+ @mod" to their rolls to manually add the ability modifier to their rolls.
		rollData.mod = (abl !== "") ? rollData.abilities[abl]?.mod : 0;
		
		// Prepare roll label
		let titlePlacement = this.config.damageTitlePlacement.toString(),
			damagePlacement = this.config.damageRollPlacement.toString(),
			contextPlacement = this.config.damageContextPlacement.toString(),
			replaceTitle = this.config.contextReplacesTitle,
			replaceDamage = this.config.contextReplacesDamage,
			labels = {
				"1": [],
				"2": [],
				"3": []
			};
		
		let titleString = "",
			damageString = [],
			contextString = customContext || (flags.quickDamage.context && flags.quickDamage.context[damageIndex]);
		
		// Show "Healing" prefix only if it's not inherently a heal action
		if (dnd5e.healingTypes[damageType]) { titleString = ""; }
		// Show "Damage" prefix if it's a damage roll
		else if (dnd5e.damageTypes[damageType]) { titleString += i18n("br5e.chat.damage"); }
		
		// Title
		let pushedTitle = false;
		if (titlePlacement !== "0" && titleString && !(replaceTitle && contextString && titlePlacement == contextPlacement)) {
			labels[titlePlacement].push(titleString);
			pushedTitle = true;
		}
		
		// Context
		if (contextString) {
			if (contextPlacement === titlePlacement && pushedTitle) {
				labels[contextPlacement][0] = (labels[contextPlacement][0] ? labels[contextPlacement][0] + " " : "") + "(" + contextString + ")";
			} else {
				labels[contextPlacement].push(contextString);
			}
		}
		
		// Damage type
		if (dtype) { damageString.push(dtype); }
		if (isVersatile) { damageString.push("(" + dnd5e.weaponProperties.ver + ")"); }
		damageString = damageString.join(" ");
		if (damagePlacement !== "0" && damageString.length > 0 && !(replaceDamage && contextString && damagePlacement == contextPlacement)) {
			labels[damagePlacement].push(damageString);
		}
		
		for (let p in labels) {
			labels[p] = labels[p].join(" - ");
		};

		if (damageIndex === 0) { damageFormula = this.scaleDamage(damageIndex, isVersatile, rollData) || damageFormula; }
		
		let bonusAdd = "";
		if (damageIndex == 0 && rollData.bonuses && isAttack(itm)) {
			let actionType = `${itemData.actionType}`;
			if (rollData.bonuses[actionType].damage) {
				bonusAdd = "+" + rollData.bonuses[actionType].damage;
			}
		}
		
		let baseDice = damageFormula + bonusAdd;
		let baseWithParts = [baseDice];
		if (parts) {baseWithParts = [baseDice].concat(parts);}
		
		let rollFormula = baseWithParts.join("+");
		
		let baseRoll = await new Roll(rollFormula, rollData).roll(),
			critRoll = null,
			baseMaxRoll = null,
			critBehavior = this.params.critBehavior ? this.params.critBehavior : this.config.critBehavior;
			
		this.addToDicePool(baseRoll);

		if ((forceCrit == true || (this.isCrit && forceCrit !== "never")) && critBehavior !== "0") {
			critRoll = await this.critRoll(rollFormula, rollData, baseRoll);
		}
		
		let damageRoll = await this.damageTemplate({baseRoll: baseRoll, critRoll: critRoll, labels: labels, type:damageType});

		return damageRoll;
	}
	
	/*
	* Rolls critical damage based on a damage roll's formula and output.
	* This critical damage should not overwrite the base damage - it should be seen as "additional damage dealt on a crit", as crit damage may not be used even if it was rolled.
	*/

	async critRoll(rollFormula, rollData, baseRoll) {
		let itm = this.item;
		let critBehavior = this.params.critBehavior ? this.params.critBehavior : this.config.critBehavior;
		let critFormula = rollFormula.replace(/[+-]+\s*(?:@[a-zA-Z0-9.]+|[0-9]+(?![Dd]))/g,"").concat();
		let critRollData = duplicate(rollData);
		critRollData.mod = 0;
		let critRoll = await new Roll(critFormula);
		let savage;

		// If the crit formula has no dice, return null
		if (critRoll.terms.length === 1 && typeof critRoll.terms[0] === "number") { return null; }

		if (itm.data.type === "weapon") {
			try { savage = itm.actor.getFlag("dnd5e", "savageAttacks"); }
			catch(error) { savage = itm.actor.getFlag("dnd5eJP", "savageAttacks"); }
		}
		let add = (itm.actor && savage) ? 1 : 0;
		critRoll.alter(1, add);
		critRoll.roll();
		
		// If critBehavior = 2, maximize base dice
		if (critBehavior === "2") {
			critRoll = await new Roll(critRoll.formula).evaluate({maximize:true});
		}
		
		// If critBehavior = 3, maximize base and crit dice
		else if (critBehavior === "3") {
			let maxDifference = Roll.maximize(baseRoll.formula).total - baseRoll.total;
			let newFormula = critRoll.formula + "+" + maxDifference.toString();
			critRoll = await new Roll(newFormula).evaluate({maximize:true});
		}

		this.addToDicePool(critRoll);

		return critRoll;
	}
	
	scaleDamage(damageIndex, versatile, rollData) {
		let item = this.item;
		let itemData = item.data.data;
		let actorData = item.actor.data.data;
		let spellLevel = this.params.slotLevel;
		
		// Scaling for cantrip damage by level. Affects only the first damage roll of the spell.
		if (item.data.type === "spell" && itemData.scaling.mode === "cantrip") {
			let parts = itemData.damage.parts.map(d => d[0]);
			let level = item.actor.data.type === "character" ? Utils.getCharacterLevel(item.actor) : actorData.details.cr;
			let scale = itemData.scaling.formula;
			let formula = parts[damageIndex];
			const add = Math.floor((level + 1) / 6);
			if ( add === 0 ) {}
			else {
				formula = item._scaleDamage([formula], scale || formula, add, rollData);
				if (versatile) { formula = item._scaleDamage([itemData.damage.versatile], itemData.damage.versatile, add, rollData); }
			}
			return formula;
		}
		
		// Scaling for spell damage by spell slot used. Affects only the first damage roll of the spell.
		if (item.data.type === "spell" && itemData.scaling.mode === "level" && spellLevel) {
			let parts = itemData.damage.parts.map(d => d[0]);
			let level = itemData.level;
			let scale = itemData.scaling.formula;
			let formula = parts[damageIndex];
			const add = Math.floor(spellLevel - level);
			if (add > 0) {
				formula = item._scaleDamage([formula], scale || formula, add, rollData);
				if (versatile) { formula = item._scaleDamage([itemData.damage.versatile], itemData.damage.versatile, add, rollData); }
			}
			
			return formula;
		}
		
		return null;
	}

	async rollCritExtra(index) {
		let damageIndex = (index ? toString(index) : null) || this.item.data.flags.betterRolls5e?.critDamage?.value || "";
		let asdf;
		if (damageIndex) {
			return await this.rollDamage({damageIndex:Number(damageIndex), forceCrit:"never"});
		}
	}
	
	/*
	Rolls the Other Formula field. Is subject to crits.
	*/
	async rollOther(preArgs) {
		let args = mergeObject({}, preArgs || {});
		let item = this.item;
		let isCrit = this.isCrit;
		let itemData = item.data.data,
			formula = item.data.data.formula,
			rollData = duplicate(item.actor.data.data),
			flags = item.data.flags.betterRolls5e;
		
		this.addToRollData(rollData);
		
		let titlePlacement = this.config.damageTitlePlacement,
			contextPlacement = this.config.damageContextPlacement,
			replaceTitle = this.config.contextReplacesTitle,
			labels = {
				"1": [],
				"2": [],
				"3": []
			};
			
		// Title
		let titleString = i18n("br5e.chat.other"),
			contextString = flags.quickOther.context;
		
		let pushedTitle = false;
		if (titlePlacement !== "0" && !(replaceTitle && contextString && titlePlacement == contextPlacement)) {
			labels[titlePlacement].push(titleString);
			pushedTitle = true;
		}
		
		// Context
		if (contextString) {
			if (contextPlacement === titlePlacement && pushedTitle) {
				labels[contextPlacement][0] = (labels[contextPlacement][0] ? labels[contextPlacement][0] + " " : "") + "(" + contextString + ")";
			} else {
				labels[contextPlacement].push(contextString);
			}
		}
		
		let baseRoll = await new Roll(formula, rollData).roll(),
			critRoll = null,
			baseMaxRoll = null,
			critBehavior = this.params.critBehavior ? this.params.critBehavior : this.config.critBehavior;
			
		if (isCrit && critBehavior !== "0") {
			critRoll = await this.critRoll(formula, rollData, baseRoll);
		}
		
		let output = this.damageTemplate({baseRoll: baseRoll, critRoll: critRoll, labels: labels});

		
		[baseRoll, critRoll].forEach(roll => {
			this.addToDicePool(roll);
		});

		return output;
	}
	
	/* 	Generates the html for a save button to be inserted into a chat message. Players can click this button to perform a roll through their controlled token.
	*/
	async saveRollButton({customAbl = null, customDC = null}) {
		let item = this.item;
		let itemData = item.data.data;
		let actor = item.actor;
		let actorData = actor.data.data;
		let saveData = getSave(item);
		if (customAbl) { saveData.ability = saveArgs.customAbl; }
		if (customDC) { saveData.dc = saveArgs.customDC; }
		
		let hideDC = (this.config.hideDC == "2" || (this.config.hideDC == "1" && actor.data.type == "npc")); // Determine whether the DC should be hidden

		let divHTML = `<span ${hideDC ? 'class="hideSave"' : null} style="display:inline;line-height:inherit;">${saveData.dc}</span>`;
		
		let saveLabel = `${i18n("br5e.buttons.saveDC")} ` + divHTML + ` ${dnd5e.abilities[saveData.ability]}`;
		let button = {
			type: "saveDC",
			html: await renderTemplate("modules/betterrolls5e/templates/red-save-button.html", {data: saveData, saveLabel: saveLabel})
		}
		
		return button;
	}
	
	async rollTool(preArgs) {
		let args = mergeObject({adv: 0, disadv: 0, bonus: null, triggersCrit: true, critThreshold: null, rollState: this.rollState}, preArgs || {});
		let itm = this.item;
		// Prepare roll data
		let itemData = itm.data.data,
			actorData = itm.actor.data.data,
			title = args.title || ((this.config.rollTitlePlacement != "0") ? i18n("br5e.chat.check") : null),
			parts = [],
			rollData = duplicate(actorData);
		rollData.item = itemData;
		this.addToRollData(rollData);
		
		// Add ability modifier bonus
		if ( itemData.ability ) {
			let abl = (itemData.ability),
				mod = abl ? actorData.abilities[abl].mod : 0;
			if (mod !== 0) {
				parts.push("@mod");
				rollData.mod = mod;
			}
		}
		
		// Add proficiency, expertise, or Jack of all Trades
		if ( itemData.proficient ) {
			parts.push("@prof");
			rollData.prof = Math.floor(itemData.proficient * actorData.attributes.prof);
			//console.log("Adding Proficiency mod!");
		}
		
		// Add item's bonus
		if ( itemData.bonus ) {
			parts.push("@bonus");
			rollData.bonus = itemData.bonus.value;
			//console.log("Adding Bonus mod!");
		}
		
		if (args.bonus) {
			parts.push(bonus);
		}
		
		// Halfling Luck check
		let d20String = "1d20";
		if (Utils.isHalfling(itm,actor)) {
			d20String = "1d20r<2";
		}
		
		//(numRolls = 1, dice = "1d20", parts = [], data = {}, title, critThreshold, rollState, triggersCrit = false)
		let output = await CustomRoll.rollMultiple(this.config.d20Mode, d20String, parts, rollData, title, args.critThreshold, args.rollState, args.triggersCrit);
		if (output.isCrit && triggersCrit) {
			this.isCrit = true;
		}

		output.data.rolls.forEach(roll => {
			this.addToDicePool(roll);
		});

		return output;
	}
	
	// Rolls the flavor text of the item, or custom text if any was entered.
	rollFlavor(preArgs) {
		let args = mergeObject({text: this.item.data.data.chatFlavor}, preArgs || {});
		
		return {
			type: "flavor",
			html: `<div class="br5e-roll-label br-flavor">${args.text}</div>`
		};
	}
	
	async configureSpell() {
		let item = this.item;
		let actor = item.actor;
		let lvl = null;
		let consume = false;
		let placeTemplate = false;
		let isPact = false;
		
		// Only run the dialog if the spell is not a cantrip
		if (item.data.data.level > 0) {
			try {
				console.log("level > 0")
				window.PH = {};
				window.PH.actor = actor;
				window.PH.item = item;
				const spellFormData = await game.dnd5e.applications.AbilityUseDialog.create(item);
				lvl = spellFormData.get("level");
				consume = Boolean(spellFormData.get("consumeSlot"));
				placeTemplate = Boolean(spellFormData.get("placeTemplate"));
				// console.log(lvl, consume, placeTemplate);
			}
			catch(error) { return "error"; }
		}
		
		if (lvl == "pact") {
			isPact = true;
			lvl = getProperty(actor, `data.data.spells.pact.level`) || lvl;
		}
		
		if ( lvl !== item.data.data.level ) {
			item = item.constructor.createOwned(mergeObject(duplicate(item.data), {"data.level": lvl}, {inplace: false}), actor);
		}
		
		// Update Actor data
		if ( consume && (lvl !== 0) ) {
			let spellSlot = isPact ? "pact" : "spell"+lvl;
			const slots = parseInt(actor.data.data.spells[spellSlot].value);
      if ( slots === 0 || Number.isNaN(slots) ) {
				ui.notifications.error(game.i18n.localize("DND5E.SpellCastNoSlots"));
				return "error";
			}
			await actor.update({
				[`data.spells.${spellSlot}.value`]: Math.max(parseInt(actor.data.data.spells[spellSlot].value) - 1, 0)
			});
		}
		
		if (placeTemplate) {
			this.placeTemplate();
		}
		
		return lvl;
	}
	
	// Places a template if the item has an area of effect
	placeTemplate() {
		let item = this.item;
		if (item.hasAreaTarget) {
			const template = game.dnd5e.canvas.AbilityTemplate.fromItem(item);
			if ( template ) template.drawPreview(event);
			if (item.actor && item.actor.sheet) {
				if (item.sheet.rendered) item.sheet.minimize();
				if (item.actor.sheet.rendered) item.actor.sheet.minimize();
			}
		}
	}
	
	// Consumes charges & resources assigned on an item.
	async consumeCharge() {
		let item = this.item,
			itemData = item.data.data;
		
		const hasUses = !!(itemData.uses.value || itemData.uses.max || itemData.uses.per); // Actual check to see if uses exist on the item, even if params.useCharge.use == true
		const hasResource = !!(itemData.consume?.target); // Actual check to see if a resource is entered on the item, even if params.useCharge.resource == true

		const request = this.params.useCharge; // Has bools for quantity, use, resource, and charge
		const recharge = itemData.recharge || {};
		const uses = itemData.uses || {};
		const autoDestroy = uses.autoDestroy;
		const current = uses.value || 0;
		const remaining = request.use ? Math.max(current - 1, 0) : current;
		const q = itemData.quantity;
		const updates = {};
		let output = "success";

		// Check for consuming uses, but not quantity
		if (hasUses && request.use && !request.quantity) {
			if (!current) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming quantity, but not uses
		if (request.quantity && !request.use) {
			if (!q) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming quantity and uses
		if (hasUses && request.use && request.quantity) {
			if (!current && q <= 1) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming charge ("Action Recharge")
		if (request.charge) {
			if (!recharge.charged) { ui.notifications.warn(game.i18n.format("DND5E.ItemNoUses", {name: item.name})); return "error"; }
		}

		// Check for consuming resource.
		// Note that _handleResourceConsumption() will actually consume the resource as well as perform the check, hence why it must be performed last.
		if (hasResource && request.resource) {
			const allowed = await item._handleResourceConsumption({isCard: true, isAttack: true});
			if (allowed === false) { return "error"; }
		}

		// Handle uses, but not quantity
		if (hasUses && request.use && !request.quantity) {
			updates["data.uses.value"] = remaining;
		}
		
		// Handle quantity, but not uses
		else if (request.quantity && !request.use) {
			if (q <= 1 && autoDestroy) {
				output = "destroy";
			}
			updates["data.quantity"] = q - 1;
		}

		// Handle quantity and uses
		else if (hasUses && request.use && request.quantity) {
			let remainingU = remaining;
			let remainingQ = q;
			console.log(remainingQ, remainingU);
			if (remainingU < 1) {
				remainingQ -= 1;
				ui.notifications.warn(game.i18n.format("br5e.error.autoDestroy", {name: item.name}));
				if (remainingQ >= 1) {
					remainingU = itemData.uses.max || 0;
				} else { remainingU = 0; }
				if (remainingQ < 1 && autoDestroy) { output = "destroy"; }
			}

			updates["data.quantity"] = Math.max(remainingQ,0);
			updates["data.uses.value"] = Math.max(remainingU,0);
		}

		// Handle charge ("Action Recharge")
		if (request.charge) {
			updates["data.recharge.charged"] = false;
		}

		item.update(updates);

		return output;
	}
}