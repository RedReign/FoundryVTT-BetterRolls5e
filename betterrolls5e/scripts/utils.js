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
}
