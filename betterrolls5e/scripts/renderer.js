import { ActorUtils } from "./utils.js";

/**
 * Model data for rendering the header template.
 * @typedef HeaderDataProps
 * @type {object}
 * @property {"header"} type
 * @property {string} img image path
 * @property {string} label visible label
 * @property {number?} slotLevel Optional displayed slot level 
 * 
 * Model data for rendering description or flavor text
 * @typedef DescriptionDataProps
 * @type {object}
 * @property {"description"} type
 * @property {boolean} isFlavor
 * @property {string} content
 *
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
 * 
 * Model data for rendering damage information.
 * @typedef DamageDataProps
 * @type {object}
 * @property {"damage"} type
 * 
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
			tooltips
		});
	}

	/**
	 * Renders damage html data
	 * @param {DamageDataProps} properties 
	 */
	static async renderDamage(properties) {
		return "";
	}

	/**
	 * Renders a full card
	 * @param {Array<string | Promise<string>>} templates
	 * @param {*} param1 
	 */
	static async renderCard(templates, {actor=null, item=null, slotLevel=0, isCrit=false, properties=[]}) {
		// Add token's ID to chat roll, if valid
		let tokenId = actor?.token ? ActorUtils.getTokenId(actor.token) : null;

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