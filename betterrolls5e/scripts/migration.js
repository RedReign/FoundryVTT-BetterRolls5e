import { i18n, Utils } from "./utils/index.js";

export async function migrate() {
	const lastVersion = game.settings.get("betterrolls5e", "migration")?.version;
	let numItemsUpdated = 0;

	try {
		// Migration for the crit damage change
		if (isNewerVersion("1.6.12", lastVersion)) {
			numItemsUpdated += await iterAndUpdateItems((item) => {
				const updates = {};
				const brFlags = item.data.flags.betterRolls5e;
				if (!brFlags) return;

				const critRange = brFlags.critRange?.value;
				if (critRange && !item.data.data.critical?.threshold) {
					updates["data.critical.threshold"] = Number(critRange) || null;
				}

				const critDamage = brFlags.critDamage?.value;
				if (critDamage && !item.data.data.critical?.critDamage) {
					updates["data.critical.damage"] = item.data.data.damage.parts[critDamage]?.[0];
				}

				if ("critRange" in brFlags) {
					updates["flags.betterRolls5e.-=critRange"] = null;
				}

				if ("critDamage" in brFlags) {
					updates["flags.betterRolls5e.-=critDamage"] = null;
				}

				if (!foundry.utils.isObjectEmpty(updates)) {
					return updates;
				}
			});
		}

		if (numItemsUpdated > 0) {
			ui.notifications.info(`BetterRolls migrated to version ${Utils.getVersion()}: ${numItemsUpdated} item(s) updated`);
		}

		// Update the game version, so we don't trigger another migration
		game.settings.set("betterrolls5e", "migration", {
			status: true,
			version: Utils.getVersion()
		});
	} catch (err) {
		console.error(err);
		ui.notifications.error("Failed to migrate BetterRolls 5e");
	}
}

let messageShown = false;
function showMigrationMessage() {
	if (!messageShown) {
		const version = Utils.getVersion();
		ui.notifications.info(i18n("br5e.migrating", { version }));
		messageShown = true;
	}
}

export async function iterAndUpdateItems(callback) {
	let numItemsUpdated = 0;

	// Migrate world items
	for (const item of game.items) {
		const updates = await callback(item)
		if (updates) {
			console.log(`BetterRolls5e | Migrating world ${item.name}`);
			await item.update(updates);
			numItemsUpdated += 1;
		}
	}

	// Migrate items of world actors
	for (const actor of game.actors) {
		const updates = [];
		for (const item of actor.items) {
			const update = await callback(item, actor);
			if (update) {
				console.log(`BetterRolls5e | Migrating ${item.name} on actor ${actor?.name}`);
				updates.push({ _id: item.id, ...update });
			}
		}
		if (updates.length > 0) {
			await actor.updateEmbeddedDocuments("Item", updates);
			numItemsUpdated += updates.length;
		}
	}

	for await (const scene of game.scenes.contents) {
		for await (const token of scene.tokens) {
			const actor = token.actor;
			if (actor?.isToken) {
				const updates = [];
				for (const item of actor.items) {
					const update = await callback(item, actor);
					if (update) {
						console.log(`BetterRolls5e | Migrating ${item.name} on actor ${actor?.name}`);
						updates.push({ _id: item.id, ...update });
					}
				}
				if (updates.length > 0) {
					await actor.updateEmbeddedDocuments("Item", updates);
					numItemsUpdated += updates.length;
				}
			}
		}
	}

	return numItemsUpdated;
}

export async function migrateChatMessage(message) {
	if (!game.user.isGM) return;
	const brFlags = message.data.flags.betterrolls5e;
	if (!brFlags) return false;

	let updated = false;
	const brVersion = brFlags.version ?? "1.0";

	// Migrate to 1.4 (damage entries are now grouped)
	if (isNewerVersion("1.4.0", brVersion)) {
		updated = true;
		migrateTo_1_4(brFlags);
		brFlags.version = "1.4.0";
	}

	// Migrate to 1.5 (update uuids for Foundry 0.8)
	if (isNewerVersion("1.5.0", brVersion)) {
		brFlags.version = "1.5.0";
		migrateTo_1_5(brFlags);
		brFlags.version = "1.5.0";
	}

	if (updated) {
		showMigrationMessage();
		await message.update({
			"flags.betterrolls5e": duplicate(brFlags)
		}, { diff: false });
	}

	return updated;
}

function migrateTo_1_4(brFlags) {
	let currentId = (Math.max(...brFlags.entries.map((e) => Number(e.id))) ?? 0) + 1;
	let lastAttack = null;
	let lastJunction = null;
	const newEntries = [];
	for (const entry of brFlags.entries) {
		if (entry.type === "multiroll") lastAttack = entry;
		if (["multiroll", "button-save"].includes(entry.type)) {
			lastJunction = entry;
		}

		entry.id = `${entry.id}`;
		if (entry.group) entry.group = `${entry.group}`;
		if (entry.attackId) entry.attackId = `${entry.attackId}`;
		let lastEntry = newEntries[newEntries.length - 1];
		if (["damage", "crit"].includes(entry.type)) {
			if (lastEntry?.type !== "damage-group") {
				lastEntry = {
					id: `${currentId++}`,
					type: "damage-group",
					attackId: lastAttack?.id,
					isCrit: lastAttack?.isCrit || entry?.isCrit,
					forceCrit: lastJunction?.forceCrit,
					prompt: brFlags.params.prompt[entry.group],
					entries: [],
				}

				newEntries.push(lastEntry);
			}

			entry.group = lastEntry.id;
			lastEntry.entries.push(entry);
		} else {
			newEntries.push(entry);
		}
	}
}

function migrateTo_1_5(brFlags) {
	const parts = brFlags.tokenId?.split(".");
	if (parts?.length !== 2) return;

	const [sceneId, tokenId] = parts;
	brFlags.tokenId = `Scene.${sceneId}.Token.${tokenId}`;
}
