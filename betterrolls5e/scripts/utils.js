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

	static getRange(item) {
		const { range } = item.data.data;
	
		if (!range?.value && !range?.units) { return null; }
	
		const standardRange = range.value || "";
		const longRange = (range.long !== 0 && range.long != range.value) ? `/${data.range.long}` : "";
		const rangeUnit = range.units ? dnd5e.distanceUnits[data.range.units] : "";
	
		return `${standardRange}${longRange} ${rangeUnit}`.trim();
	}	

	static isHalfling(actor) {
		return getProperty(actor, "data.flags.dnd5e.halflingLucky");
	}
}