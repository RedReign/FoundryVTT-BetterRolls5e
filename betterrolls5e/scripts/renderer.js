import { CustomItemRoll } from "./custom-roll.js";
import { BRSettings, getSettings } from "./settings.js";
import { DiceCollection, i18n, Utils } from "./utils.js";

/**
 * Model data for rendering the header template.
 * Not part of the entry list
 * @typedef HeaderDataProps
 * @type {object}
 * @property {string} img image path to show in the box
 * @property {string} title header title text
 */

/**
 * Model data for rendering description or flavor text
 * @typedef DescriptionDataProps
 * @type {object}
 * @property {"description"} type
 * @property {boolean} isFlavor
 * @property {string} content
 */

/**
 * Model data for rendering a multi roll.
 * @typedef MultiRollDataProps
 * @type {object}
 * @property {"multiroll"} type
 * @property {string} title
 * @property {"highest" | "lowest" | "first" | null} rollState advantage/disadvantage/normal/none
 * @property {string?} group Damage group used to identify what damage entries would be affected by a crit
 * @property {number} critThreshold
 * @property {boolean?} elvenAccuracy whether elven accuracy applies to this attack
 * @property {string} rollType
 * @property {string} formula
 * @property {boolean} isCrit
 * @property {Array<{roll: Roll; total: number; ignored: boolean; critType: string}>} entries
 * @property {Roll} bonus
 */

/**
 * Model data for rendering damage information.
 * @typedef DamageDataProps
 * @type {object}
 * @property {"damage"} type
 * @property {number | "versatile" | "other"} damageIndex
 * @property {boolean?} hidden
 * @property {string?} group Damage group used to identify damage entries as related
 * @property {string} title
 * @property {string} damageType
 * @property {string} context
 * @property {Roll} baseRoll
 * @property {Roll?} critRoll
 * @property {boolean?} isVersatile
 */

/**
 * Model data for save buttons
 * @typedef ButtonSaveProps
 * @property {"button-save"} type
 * @property {string} ability
 * @property {boolean} hideDC
 * @property {number} dc
 */

 /**
 * Model data for damage buttons
 * @typedef ButtonDamageProps
 * @property {"button-damage"} type
 * @property {string} group
 */

/**
 * Union type of all possible render model types, separatable by the type property.
 * @typedef { HeaderDataProps | DescriptionDataProps | 
 * 		MultiRollDataProps | DamageDataProps | ButtonSaveProps | ButtonDamageProps
 * } RenderModelEntry
 */

/**
 * Shortcut function to render a templates in the better rolls template folder.
 * @param {string} path sub path of the template in the templates folder
 * @param {Object} props the props to render with
 * @returns {Promise<string>} rendered template 
 */
function renderModuleTemplate(path, props) {
	return renderTemplate(`modules/betterrolls5e/templates/${path}`, props);
}

/**
 * A collection of functions used to build html from metadata.
 */
export class Renderer {
	/**
	 * Current id that is auto-incremented.
	 * IDs need to be unique within a render, but between runs it is unimportant,
	 * therefore this does not need to be persisted.
	 * @private
	 */
	static _currentId = 1;

	/**
	 * Renders a model by checking the type. Calls the other render functions depending on what it is
	 * @param {RenderModel} model
	 * @returns {Promise<string>}
	 */
	static async renderModel(model, settings=null) {
		if (typeof model === "string" || !model) {
			return model;
		}

		// Assign an id if we need to
		if (!model.id) {
			model.id = `${Renderer._currentId++}`;
		}

		switch (model.type) {
			case "header":
				return Renderer.renderHeader(model, settings);
			case "description":
				return Renderer.renderDescription(model, settings);
			case "multiroll":
				return Renderer.renderMultiRoll(model, settings);
			case "damage":
				return Renderer.renderDamage(model, settings);
			case "button-save":
				return Renderer.renderSaveButton(model, settings);
			case "button-damage":
				return Renderer.renderDamageButton(model, settings);
			case "raw":
				// todo: print a warning, this means its unconverted
				return model.content?.html ?? model.content;
			default:
				console.error(`Unknown render model type ${model.type}`)
		}
	}

	/**
	 * Renders the header template
	 * @param {HeaderDataProps} properties 
	 */
	static renderHeader(properties) {
		const { img, title, slotLevel } = properties;
		return renderModuleTemplate("red-header.html", {
			id: properties.id,
			item: { img: img ?? "icons/svg/mystery-man.svg", name: title },
			slotLevel
		});
	}

	/**
	 * Renders the description template
	 * @param {DescriptionDataProps} properties 
	 */
	static renderDescription(properties) {
		return renderModuleTemplate("red-description.html", properties);
	}

	/**
	 * Renders a multiroll, which represent most D20 rolls.
	 * @param {MultiRollDataProps} properties
	 * @param {BRSettings} settings
	 */
	static async renderMultiRoll(properties, settings) {
		const { rollTitlePlacement, d20RollIconsEnabled } = getSettings(settings);
		const title = rollTitlePlacement !== "0" ? properties.title : null;
		
		// Show D20 die icons if enabled
		let entries = properties.entries;
		if (d20RollIconsEnabled) {
			// Inner function to recursively find the first d20 die term and show it
			function findD20Result(d20Roll) {
				if (!d20Roll) return null;

				for (const term of d20Roll.terms ?? d20Roll.rolls ?? []) {
					if (term.faces === 20) return term.total;
					if (term.terms ?? term.rolls) {
						const innerResult = findD20Result(term);
						if (innerResult) return innerResult;
					}
				}
			}
			entries = entries.map(e => ({ ...e, d20Result: findD20Result(e.roll) }));
		}

		// Create roll templates
		const tooltips = await Promise.all(properties.entries.map(e => e.roll.getTooltip())); 
		const bonusTooltip = await properties.bonus?.getTooltip();

		return renderModuleTemplate("red-multiroll.html", {
			...properties, title, entries, tooltips, bonusTooltip
		});
	}

	/**
	 * Renders damage html data
	 * @param {DamageDataProps} properties 
	 */
	static async renderDamage(properties, settings) {
		const { damageType, baseRoll, critRoll, isVersatile, context } = properties;
		if (baseRoll.terms.length === 0) return;
		
		const tooltips = [await baseRoll.getTooltip()];
		if (critRoll) {
			tooltips.push(await critRoll.getTooltip());
		}

		settings = getSettings(settings);
		const critString = settings.critString;
		const titlePlacement = settings.damageTitlePlacement.toString();
		const damagePlacement = settings.damageRollPlacement.toString();
		const contextPlacement = settings.damageContextPlacement.toString();
		const replaceTitle = settings.contextReplacesTitle;
		const replaceDamage = settings.contextReplacesDamage;

		const labels = {
			"1": [],
			"2": [],
			"3": []
		};

		const dtype = CONFIG.betterRolls5e.combinedDamageTypes[damageType];

		let titleString = properties.title ?? "";
		if (!titleString && CONFIG.DND5E.healingTypes[damageType]) { 
			// Show "Healing" prefix only if it's not inherently a heal action
			titleString = ""; 
		} else if (!titleString && CONFIG.DND5E.damageTypes[damageType]) {	
			// Show "Damage" prefix if it's a damage roll
			titleString += i18n("br5e.chat.damage");
		}

		// Title
		let pushedTitle = false;
		if (titlePlacement !== "0" && titleString && !(replaceTitle && context && titlePlacement == contextPlacement)) {
			labels[titlePlacement].push(titleString);
			pushedTitle = true;
		}
		
		// Context
		if (context) {
			if (contextPlacement === titlePlacement && pushedTitle) {
				labels[contextPlacement][0] = (labels[contextPlacement][0] ? labels[contextPlacement][0] + " " : "") + "(" + context + ")";
			} else {
				labels[contextPlacement].push(context);
			}
		}
		
		// Damage type
		const damageStringParts = [];
		if (dtype) { 
			damageStringParts.push(dtype);
		}
		if (isVersatile) {
			damageStringParts.push("(" + CONFIG.DND5E.weaponProperties.ver + ")");
		}

		const damageString = damageStringParts.join(" ");
		if (damagePlacement !== "0" && damageString.length > 0 && !(replaceDamage && context && damagePlacement == contextPlacement)) {
			labels[damagePlacement].push(damageString);
		}
		
		for (let p in labels) {
			labels[p] = labels[p].join(" - ");
		};

		return renderModuleTemplate("red-damageroll.html", {
			id: properties.id,
			tooltips,
			base: Utils.processRoll(baseRoll),
			crit: Utils.processRoll(critRoll),
			crittext: critString,
			damagetop: labels[1],
			damagemid: labels[2],
			damagebottom: labels[3],
			formula: baseRoll.formula,
			damageType,
			hidden: properties.hidden,
			group: properties.group,
			maxRoll: new Roll(baseRoll.formula).evaluate({maximize:true}).total,
			maxCrit: critRoll ? new Roll(critRoll.formula).evaluate({maximize:true}).total : null
		});
	}

	/**
	 * Renders an html save button
	 * @param {ButtonSaveProps} properties 
	 */
	static async renderSaveButton(properties) {
		const abilityLabel = CONFIG.DND5E.abilities[properties.ability];
		return renderModuleTemplate("red-save-button.html", {
			id: properties.id,
			abilityLabel,
			...properties
		});
	}

	/**
	 * Renders an html damage button
	 * @param {ButtonDamageProps} properties 
	 */
	static async renderDamageButton(properties) {
		return renderModuleTemplate("red-damage-button.html", {
			id: properties.id,
			group: encodeURIComponent(properties.group)
		})
	}

	/**
	 * Renders a full card
	 * @param {CustomItemRoll} data
	 * @param {*} param1 
	 */
	static async renderCard(data) {
		const templates = await Promise.all(data.entries.map(m => Renderer.renderModel(m, settings)));
		return renderModuleTemplate("red-fullroll.html", {
			item: data.item,
			actor: data.actor,
			tokenId: data.tokenId,
			isCritical: data.isCrit,
			templates,
			properties: data.properties
		});
	}
}
