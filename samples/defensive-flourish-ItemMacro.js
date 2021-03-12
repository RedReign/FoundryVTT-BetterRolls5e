/**
 * Version of Defensive Flourish Macro meant to be used via the ItemMacro module.
 * Attach to any item with a damage roll.
 */

const effectImagePath = "icons/svg/combat.svg";
const actor = item?.actor;
(async () => {
    if (!item || !actor) {
    	return ui.notifications.error("This macro needs to be attached to an item on an actor using ItemMacro");
    }

    const roll = BetterRolls.rollItem(item);
    await roll.toMessage();

    if (roll.error) return;

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
})();
