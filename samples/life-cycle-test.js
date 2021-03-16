/**
 * Basic Integration test that tests that a roll can be created, edited, updated, or what have you.
 * NOTE: Incomplete, was accidentally pushed. Will be updated later anyways.
 * As of the current release, when a roll is created, that's it. This will be used
 * to test that a roll can be edited using the same object for more advanced macros.
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
