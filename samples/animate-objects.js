/*
 * Animate Object Attacks.
 * Initial version stolen from somewhere but I forgot from where
 */
const details = {
    "tiny"   : { "size": 1, "atk": 8, "dmg": "1d4 + 4" }, 
    "small"  : { "size": 1, "atk": 6, "dmg": "1d8 + 2" }, 
    "medium" : { "size": 2, "atk": 5, "dmg": "2d6 + 1" }, 
    "large"  : { "size": 4, "atk": 6, "dmg": "2d10 + 2" }, 
    "huge"   : { "size": 8, "atk": 8, "dmg": "2d12 + 4" }
};

// Use select token or some defaults if nothing is selected.
const actorData = actor || canvas.tokens.controlled[0] || game.user.character;

if (!actorData) {
    ui.notifications.warn("No actor selected");
}

const targetId = game.user.targets.ids[0];
const targetToken = canvas.tokens.get(targetId);
const targetName = targetToken?.actor.name || "Enemy";

const count = parseInt(game.brMacro?.animate_objects_count, 10) || 10;
const rollState = BetterRolls.getRollState();

const content = `
<p><em>Your animated objects attack ${targetName}!</em></p>
<p>Enter the details for the Animated Objects...</p>
<form>
<div class="form-group">
    <label for="size">Size:</label>
    <select id="size" name="size">
        <option value="tiny">Tiny</option>
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
        <option value="huge">Huge</option>
    </select>
</div>
<div class="form-group">
    <label for="count">Number of Objects:</label>
    <input id="count" name="count" type="number" min="0" value="${count}"></input>
</div>
<div class="form-group">
    <label for="size">Roll Type:</label>
    <select id="roll" name="roll">
        <option value="first">Normal</option>
        <option value="highest" ${rollState === "highest" ? "selected" : null}>Advantage</option>
        <option value="lowest" ${rollState === "lowest" ? "selected" : null}>Disadvantage</option>
    </select>
</div>
</form>
`;

const attackAction = async (html) => {
    let size = html.find("#size")[0].value;
    let count = html.find("#count")[0].value;
    let rollState = html.find("#roll")[0].value;
    const { atk, dmg } = details[size];
    
    const rollTypes = {
        "highest": "Advantage",
        "lowest": "Disadvantage"
    };
    
    let rollExpr = `1d20 + ${atk}`;
    const card = BetterRolls.rollItem(actorData);
    card.addField(["header", {img: this.data.img, title: "Animated Objects"}]);
    for (let i = 0; i < count; i++) {
        const rollTypeStr = rollState in rollTypes ? `(${rollTypes[rollState]})` : '';
        const title = `Object Attacks #${i+1} (+${atk}) ${rollTypeStr}`;
        card.addField(["attack", { formula: rollExpr, rollState, title}]);
        card.addField(["damage", { formula: dmg }]);
    }
    await card.toMessage();
    
    // Remember setting for next run
    game.brMacro = game.brMacro ?? {};
    game.brMacro.animate_objects_count = count;
};

new Dialog({
    title: "Animated Object Attacks",
    content: content,
    buttons: {
        attack: {
            icon: '<i class="fas fa-check"></i>',
            label: "Attack!",
            callback: attackAction
        },
        cancel: { label: "Cancel" }
    },
    default: "attack",
}).render(true);