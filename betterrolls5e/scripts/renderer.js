import { CustomItemRoll } from "./custom-roll.js";
import { BRSettings, getSettings } from "./settings.js";
import { i18n, Utils } from "./utils/index.js";

/**
 * Model data for rendering the header template.
 * Not part of the entry list
 * @typedef HeaderDataProps
 * @type {object}
 * @property {number} id
 * @property {"header"} type
 * @property {string} img image path to show in the box
 * @property {string} title header title text
 */

/**
 * Model data for rendering description or flavor text
 * @typedef DescriptionDataProps
 * @type {object}
 * @property {number} id
 * @property {"description"} type
 * @property {boolean} isFlavor
 * @property {string} content
 */

/**
 * Model data for rendering a multi roll.
 * @typedef MultiRollDataProps
 * @type {object}
 * @property {number} id
 * @property {"multiroll"} type
 * @property {string} title
 * @property {"highest" | "lowest" | "first" | null} rollState advantage/disadvantage/normal/none
 * @property {string?} group Damage group used to identify what damage entries would be affected by a crit
 * @property {number} critThreshold
 * @property {boolean?} elvenAccuracy whether elven accuracy applies to this attack
 * @property {string} rollType If its an attack or custom
 * @property {string} formula The full roll formula to show. This is the entries + bonus
 * @property {boolean?} forceCrit was the crit status forced
 * @property {boolean} isCrit
 * @property {Array<{roll: Roll}>} entries Main d20 roll. Bonuses are added to this
 * @property {Roll} bonus Any bonuses to add to the roll (that only get rolled once)
 */

/**
 * Model data for rendering damage information.
 * @typedef DamageDataProps
 * @type {object}
 * @property {number} id
 * @property {"damage"} type
 * @property {number | "versatile" | "other"} damageIndex
 * @property {number?} group DamageGroup id used to identify damage entries as related
 * @property {string} title
 * @property {string} damageType If its something like bludgeoning or piercing
 * @property {string} context
 * @property {number?} extraCritDice Used for things like savage
 * @property {Roll} baseRoll
 * @property {Roll?} critRoll
 */

 /**
 * Model data for rendering bonus crit information.
 * @typedef CritDataProps
 * @type {object}
 * @property {number} id
 * @property {"crit"} type
 * @property {number?} group DamageGroup id used to identify damage entries as related
 * @property {string} title
 * @property {string} damageType If its something like bludgeoning or piercing
 * @property {string} context
 * @property {Roll?} critRoll
 * @property {boolean} revealed Has the crit entry been revealed
 */

/**
 * Model data for save buttons
 * @typedef ButtonSaveProps
 * @property {number} id
 * @property {"button-save"} type
 * @property {string} ability
 * @property {boolean} hideDC
 * @property {number} dc
 */

/**
 * @typedef DamageGroup
 * @property {number} id
 * @property {"damage-group"} type
 * @property {number} attackId id of the associated attack roll
 * @property {boolean} prompt
 * @property {boolean} isCrit
 * @property {boolean?} forceCrit whether crit can be unset or not
 * @property {DamageEntry[]} entries
 */

/**
 * Union type of all possible render model types, separatable by the type property.
 * @typedef { HeaderDataProps | DescriptionDataProps | MultiRollDataProps |
 * 		ButtonSaveProps | DamageGroup | DamageEntry
 * } RenderModelEntry
 */

/**
 * Union type of all fields that relate to damage
 * @typedef {DamageDataProps | CritDataProps} DamageEntry
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
	 * Renders a model by checking the type. Calls the other render functions depending on what it is
	 * @param {RenderModel} model
	 * @returns {Promise<string>}
	 */
	static async renderModel(model, settings=null) {
		if (typeof model === "string" || !model) {
			return model;
		}

		switch (model.type) {
			case "header":
				return Renderer.renderHeader(model, settings);
			case "description":
				return Renderer.renderDescription(model, settings);
			case "multiroll":
				return Renderer.renderMultiRoll(model, settings);
			case "damage":
			case "crit":
				return Renderer.renderDamage(model, settings);
			case "damage-group":
				return Renderer.renderDamageGroup(model, settings);
			case "button-save":
				return Renderer.renderSaveButton(model, settings);
			case "raw":
				return model?.html ?? model.content?.html ?? model.content;
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
			entries = entries.map(e => ({ ...e, d20Result: Utils.findD20Result(e.roll) }));
		}

		// Create roll templates
		const tooltips = await Promise.all(properties.entries.map(e => e.roll.getTooltip()));
		const bonusTooltip = await properties.bonus?.getTooltip();

		// Render final result
		return renderModuleTemplate("red-multiroll.html", {
			...properties, title, entries, tooltips, bonusTooltip
		});
	}

	/**
	 * Renders damage html data
	 * @param {DamageDataProps} properties
	 */
	static async renderDamage(properties, settings) {
		const { damageType, baseRoll, critRoll, context } = properties;
		const isVersatile = properties.damageIndex === "versatile";
		if (baseRoll?.terms.length === 0 && critRoll?.terms.length === 0) return;

		const tooltips = (await Promise.all([
			baseRoll?.getTooltip(),
			critRoll?.getTooltip()
		])).filter(t => t);

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

		// Context (damage type and roll flavors)
		const bonusContexts = Utils.getRollFlavors(baseRoll, critRoll).filter(c => c !== context);
		if (context || bonusContexts.length > 0) {
			const contextStr = [context, bonusContexts.join("/")].filter(c=>c).join(" + ");
			if (contextPlacement === titlePlacement && pushedTitle) {
				const title = labels[contextPlacement][0];
				labels[contextPlacement][0] = (title ? title + " " : "") + `(${contextStr})`;
			} else {
				labels[contextPlacement].push(contextStr);
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
			group: properties.group,
			damageRollType: properties.type,
			tooltips,
			base: Utils.processRoll(baseRoll),
			crit: Utils.processRoll(critRoll),
			crittext: critString,
			damagetop: labels[1],
			damagemid: labels[2],
			damagebottom: labels[3],
			formula: baseRoll?.formula ?? critRoll.formula,
			damageType,
			maxRoll: baseRoll ? new Roll(baseRoll.formula).evaluate({maximize:true}).total : null,
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
	 * @param {DamageGroup} properties
	 */
	static async renderDamageGroup(properties, settings) {
		const results = [];
		for (const entry of properties.entries) {
			if (["damage", "crit"].includes(entry.type) && properties.prompt) {
				continue;
			}

			// Create the template, only do so if not of type crit unless crit is revealed
			if (entry.type !== "crit" || entry.revealed) {
				results.push(this.renderModel(
					{...entry, group: properties.id },
					settings
				));
			}
		}

		if (properties.prompt) {
			const { id } = properties;
			const button = renderModuleTemplate("red-damage-button.html", { id });
			results.push(button);
		}

		const renderedResults = await Promise.all(results);
		return renderedResults.join("");
	}

	/**
	 * Renders a full card
	 * @param {CustomItemRoll} data
	 * @param {*} param1
	 */
	static async renderCard(data) {
		const templates = [];

		let previous = null;
		for (const entry of data.entries) {
			if (!entry) continue;

			// If its a new attack/damage group, add a divider
			const previousIsDamage = ["damage", "crit", "damage-group"].includes(previous?.type);
			if (previousIsDamage && ["multiroll", "button-save", "damage-group"].includes(entry.type)) {
				templates.push("<hr/>");
			}

			templates.push(await Renderer.renderModel(entry));
			previous = entry;
		}

		// Render apply active effects button if enabled
		const hasEffects = data.item?.data.effects.find(ae => !ae.transfer);
		if (window.DAE && hasEffects && data.settings.applyActiveEffects) {
			const button = await renderModuleTemplate("red-ae-button.html");
			templates.push(button);
		}

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
