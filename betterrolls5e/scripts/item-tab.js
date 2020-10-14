import { redUpdateFlags, i18n, isAttack, isSave } from "./betterrolls5e.js";

let activate = false;

/**
 * Adds adds the Better Rolls tab to an item's sheet. Should only be called when the sheet is rendered.
 */
export async function addBetterRollsContent(app, protoHtml, _) {
	const item = app.object;

	if (item.actor && item.actor.permission < 3) { return; }
	if (CONFIG.betterRolls5e.validItemTypes.indexOf(item.data.type) == -1) { return; }
	
	redUpdateFlags(item);

	let html = protoHtml;

	if (html[0].localName !== "div") {
		html = $(html[0].parentElement.parentElement);
	}

	// Create tab (for selection)
	const tabSelector = html.find(`form nav.sheet-navigation.tabs`);
	const betterRollsTabString = `<a class="item" data-group="primary" data-tab="betterRolls5e">${i18n("Better Rolls")}</a>`;
	tabSelector.append($(betterRollsTabString));

	const settingsContainer = html.find(`.sheet-body`),
		  betterRollsTemplateString = `modules/betterrolls5e/templates/red-item-options.html`,
		  altSecondaryEnabled = game.settings.get("betterrolls5e", "altSecondaryEnabled");

	const isConsumable = item.data.data.consume?.type || item.data.data.uses?.per || item.data.data.recharge?.value || item.data.type == "consumable";

	const betterRollsTemplate = await renderTemplate(betterRollsTemplateString, {
		DND5E: CONFIG.DND5E,
		item,
		isConsumable,
		isAttack: isAttack(item),
		isSave: isSave(item),
		flags: item.data.flags,
		damageTypes: CONFIG.betterRolls5e.combinedDamageTypes,
		altSecondaryEnabled,
		itemHasTemplate: item.hasAreaTarget
	});

	settingsContainer.append(betterRollsTemplate);

	// Tab back to better rolls if we need (after certain events it may happen)
	if (activate) {
		app._tabs[0].activate("betterRolls5e");
		activate = false;
	}

	// Add damage context input
	if (game.settings.get("betterrolls5e", "damageContextPlacement") !== "0") {
		const damageRolls = html.find(".tab.details .damage-parts .damage-part input");
		// Placeholder is either "Context" or "Label" depending on system settings
		const placeholder = game.settings.get("betterrolls5e", "contextReplacesDamage") ? "br5e.settings.label" : "br5e.settings.context";

		damageRolls.forEach((damageRoll, i) => {
			const contextField = $(`<input type="text" name="flags.betterRolls5e.quickDamage.context.${i}" value="${(item.data.flags.betterRolls5e.quickDamage.context[i] || "")}" placeholder="${i18n(placeholder)}" data-dtype="String" style="margin-left:5px;">`);

			damageRoll.after(contextField[0]);

			// Add event listener to delete context when damage is deleted
			$($($(damageRoll)[0].parentElement).find(`a.delete-damage`)).click(async _ => {
				const contextFlags = Object.values(item.data.flags.betterRolls5e.quickDamage.context);
				contextFlags.splice(i, 1);
				item.update({
					[`flags.betterRolls5e.quickDamage.context`]: contextFlags,
				});
			});
		})

		// Add context field for Other Formula field
		if (getProperty(item, "data.flags.betterRolls5e.quickOther")) {
			const otherRoll = html.find(`.tab.details .form-fields input[name="data.formula"]`);
			const otherContextField = $(`<input type="text" name="flags.betterRolls5e.quickOther.context" value="${(item.data.flags.betterRolls5e.quickOther.context || "")}" placeholder="${i18n(placeholder)}" data-dtype="String" style="margin-left:5px;">`);
			if (otherRoll[0]) { otherRoll[0].after(otherContextField[0]); }
		}
	}

	// Activate the tab if anything changes in any sub-field	
	const newSection = settingsContainer.find(".tab.item-betterRolls");
	newSection.find("input[type=text]").change((evt) => activate = true);
	newSection.find("input[type=number]").change((evt) => activate = true);
	newSection.find("input[type=checkbox]").change((evt) => activate = true);
	newSection.find("select").change((evt) => activate = true);
} 