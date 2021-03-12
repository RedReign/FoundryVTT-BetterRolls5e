const effectImagePath = "icons/svg/combat.svg";
const selected = [actor] || canvas.tokens.controlled || [game.user.character];

// Requires an item called Defensive Flourish that in turn consumes Bardic Inspiration uses
(async () => {
    const actors = selected.filter(a => a);
    if (actors.length === 0) {
    	return ui.notifications.error("No actors selected");
    }

    let handled = false;
    for (const actor of actors) {
        const itemId = actor.items.find(i => i.name === 'Defensive Flourish')?.id;
        const item = actor.getOwnedItem(itemId);
        if (!item) continue;

        const roll = BetterRolls.rollItem(item);
        await roll.toMessage();

        if (roll.error) continue;

        const value = roll.entriesFlattened().find(m => m.type === 'damage')?.baseRoll.total;
        const label = "Defensive Flourish";
        const key = "data.attributes.ac.value";

        const existing = actor.effects.entries.find(e => e.data.label === label);
        if (existing) {
            existing.update({
                changes: [
                    { key, mode: 2, value, priority: 20 }
                ],
                disabled: false
            });
            console.log(existing);
        } else {
            actor.createEmbeddedEntity('ActiveEffect', {
                label,
                icon: effectImagePath ?? item.img,
                duration: { rounds: 1 },
                changes: [
                    { key, mode: 2, value, priority: 20 }
                ]
            });
        }

        handled = true;
    }

    if (!handled) {
        ui.notifications.warn("No actors with a Defensive Flourish item was selected");
    }
})();
