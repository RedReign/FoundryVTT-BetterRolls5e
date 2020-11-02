import { i18n } from "./betterrolls5e.js";
import { BRSettings } from "./settings.js";
import { Utils, ActorUtils, ItemUtils } from "./utils.js";

/**
 * Model data for rendering the header template.
 * @typedef HeaderDataProps
 * @type {object}
 * @property {"header"} type
 * @property {string} img image path
 * @property {string} label visible label
 * @property {number?} slotLevel Optional displayed slot level 
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
 * @property {string} rollState
 * @property {string} rollType
 * @property {string} formula
 * @property {boolean} isCrit
 * @property {Array<{roll: Roll; ignored: boolean; critType: string}>} entries
 */

/**
 * Model data for rendering damage information.
 * @typedef DamageDataProps
 * @type {object}
 * @property {"damage"} type
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
 * Union type of all possible render model types, separatable by the type property.
 * @typedef {HeaderDataProps | DescriptionDataProps | MultiRollDataProps | DamageDataProps} RenderModel
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
 * A collection of functions used to build html
 * Because of re-usability needs due to needing runtime editing,
 */
export class Renderer {
	/**
	 * Renders a model by checking the type. Calls the other render functions depending on what it is
	 * @param {RenderModel} model 
	 */
	static async renderModel(model) {
		if (typeof model === "string") {
			return model;
		}

		switch (model.type) {
			case "header":
				return Renderer.renderHeader(model);
			case "description":
				return Renderer.renderDescription(model);
			case "multiroll":
				return Renderer.renderMultiRoll(model);
			case "damage":
				return Renderer.renderDamage(model);
			case "raw":
				// todo: print a warning, this means its unconverted
				return model.content?.html ?? model.content;
			default:
				console.error(`Unknown render model type ${model.type}`)
		}
	}

	/**
	 * 
	 * @param {HeaderDataProps} properties 
	 */
	static renderHeader(properties) {
		const { img, label, slotLevel } = properties;
		return renderModuleTemplate("red-header.html", {
			item: { img, name: label },
			slotLevel
		});
	}

	/**
	 * 
	 * @param {DescriptionDataProps} properties 
	 */
	static renderDescription(properties) {
		return renderModuleTemplate("red-description.html", properties);
	}

	/**
	 * Renders a multiroll, which represent most D20 rolls.
	 * @param {MultiRollDataProps} properties 
	 */
	static async renderMultiRoll(properties) {
		const tooltips = await Promise.all(properties.entries.map(e => e.roll.getTooltip())); 
		return renderModuleTemplate("red-multiroll.html", {
			...properties,
			entries: properties.entries.map(e => ({
				...e,
				d20Result: e.roll?.terms.find(t => t.faces === 20)?.total
			})),
			tooltips
		});
	}

	/**
	 * Renders damage html data
	 * @param {DamageDataProps} properties 
	 */
	static async renderDamage(properties) {
		const { damageType, baseRoll, critRoll, isVersatile, context } = properties;
		if (baseRoll.terms.length === 0) return;
		
		const tooltips = [await baseRoll.getTooltip()];
		if (critRoll) {
			tooltips.push(await critRoll.getTooltip());
		}

		const critString = BRSettings.critString;
		const titlePlacement = BRSettings.damageTitlePlacement.toString();
		const damagePlacement = BRSettings.damageRollPlacement.toString();
		const contextPlacement = BRSettings.damageContextPlacement.toString();
		const replaceTitle = BRSettings.contextReplacesTitle;
		const replaceDamage = BRSettings.contextReplacesDamage;

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
			tooltips,
			base: Utils.processRoll(baseRoll),
			crit: Utils.processRoll(critRoll),
			crittext: critString,
			damagetop: labels[1],
			damagemid: labels[2],
			damagebottom: labels[3],
			formula: baseRoll.formula,
			damageType,
			maxRoll: new Roll(baseRoll.formula).evaluate({maximize:true}).total,
			maxCrit: critRoll ? new Roll(critRoll.formula).evaluate({maximize:true}).total : null
		});
	}

	/**
	 * Renders a full card
	 * @param {Array<string | RenderModel | Promise<string | RenderModel>>} templates
	 * @param {*} param1 
	 */
	static async renderCard(templates, {actor=null, item=null, isCrit=false, properties=null}) {
		// Add token's ID to chat roll, if valid
		let tokenId = actor?.token ? ActorUtils.getTokenId(actor.token) : null;

		templates = await Promise.all(templates);
		templates = templates.map(Renderer.renderModel);

		// Default properties to the item properties if item is given
		if (properties == null && item) {
			properties = ItemUtils.getPropertyList(item);
		}

		return renderModuleTemplate("red-fullroll.html", {
			item,
			actor,
			tokenId,
			isCritical: isCrit,
			templates: await Promise.all(templates),
			properties
		});
	}
}