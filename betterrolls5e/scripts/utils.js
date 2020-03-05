export class Utils {
	
	static getCharacterLevel(actor) {
		// Determine character level and available hit dice based on owned Class items
		const data = actor.data.data;
		const [level, hd] = actor.data.items.reduce((arr, item) => {
			if ( item.type === "class" ) {
				const classLevels = parseInt(item.data.levels) || 1;
				arr[0] += classLevels;
				arr[1] += classLevels - (parseInt(item.data.hitDiceUsed) || 0);
			}
			return arr;
		}, [0, 0]);
		return level;
	}
}