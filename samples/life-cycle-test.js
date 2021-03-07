/**
 * Basic Integration test that tests that a roll can be created, edited, updated, or what have you.
 */

(async () => {
	const settings = {
		damagePromptEnabled: true
	};

	const card = BetterRolls.rollItem(item, { settings });
	card.addField("header");
	card.addField("flavor");
	card.addField("description");
	card.addField("attack");
	card.addField("damage", { index: "all", versatile: true });
	card.toMessage();
})();
