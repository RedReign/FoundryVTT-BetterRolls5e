import { i18n } from "./betterrolls5e.js";
import { DND5E as dnd5e } from "../../../systems/dnd5e/module/config.js";

export class Utils {
	static getCharacterLevel(actor) {
		// Determine character level
		const level = actor.data.items.reduce((runningTotal, item) => {
			if ( item.type === "class" ) {
				const classLevels = parseInt(item.data.levels) || 1;
				runningTotal += classLevels;
			}
			return runningTotal;
		});
		return level;
	}

	static getActivationData(item) {
		const { activation } = item.data.data;
		const activationCost = activation.cost ? activation.cost : ""

		if (activation?.type !== "" && activation?.type !== "none") {
			return `${activationCost} ${dnd5e.abilityActivationTypes[data.activation.type]}`.trim();
		}

		return null;
	}

	static getDuration(item) {
		const {duration} = item.data.data;

		if (!duration?.units) { return null; }

		return `${duration.value ? duration.value : ""} ${dnd5e.timePeriods[duration.units]}`.trim()
	}

	static getRange(item) {
		const { range } = item.data.data;
	
		if (!range?.value && !range?.units) { return null; }
	
		const standardRange = range.value || "";
		const longRange = (range.long !== 0 && range.long != range.value) ? `/${range.long}` : "";
		const rangeUnit = range.units ? dnd5e.distanceUnits[range.units] : "";
	
		return `${standardRange}${longRange} ${rangeUnit}`.trim();
	}

	static getSpellComponents(item) {
		const { vocal, somatic, material, materials } = item.data.data.components;

		let componentString = "";

		if (vocal) { componentString += i18n("br5e.chat.abrVocal"); }
		if (somatic) { componentString += i18n("br5e.chat.abrSomatic"); }
		if (material) { 
			componentString += i18n("br5e.chat.abrMaterial");

			if (materials.value) {
				const materialConsumption = materials.consumed ? i18n("br5e.chat.consumedBySpell") : ""
				componentString += ` (${materials.value}` +  ` ${materialConsumption})`;
			}
		}

		return componentString || null;
	}

	static getTarget(item) {
		const { target } = item.data.data;

		if (!target?.type) { return null; }

		const targetDistance = target?.units !== "none" ? ` (${target.value} ${dnd5e.distanceUnits[target.units]})` : "";
		
		return i18n("Target: ") + dnd5e.targetTypes[target.type] + targetDistance;
	}

	static isHalfling(actor) {
		return getProperty(actor, "data.flags.dnd5e.halflingLucky");
	}
}