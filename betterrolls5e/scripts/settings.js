import { i18n, Utils } from "./utils/index.js";

const getBRSetting = (setting) => game.settings.get("betterrolls5e", setting);

/**
 * Class type used to initialize and retrieve settings.
 */
class Settings {
	/**
	 * Register better rolls settings.
	 * This should only be called once, at initialization.
	 */
	init() {
		// Special non-config flag to handle migrations
		game.settings.register("betterrolls5e", "migration", {
			config: false,
			default: { status: false, version: Utils.getVersion() },
			scope: 'world',
			type: Object
		});

		game.settings.register("betterrolls5e", "d20Mode", {
			name: i18n("br5e.d20Mode.name"),
			hint: i18n("br5e.d20Mode.hint"),
			scope: "world",
			config: true,
			default: 1,
			type: Number,
			choices: {
				1: i18n("br5e.d20Mode.choices.1"),
				2: i18n("br5e.d20Mode.choices.2"),
				3: i18n("br5e.d20Mode.choices.3"),
				4: i18n("br5e.d20Mode.choices.4")
			}
		});

		/**
		 * Enables damage buttons
		 */
		game.settings.register("betterrolls5e", "damagePromptEnabled", {
			name: i18n("br5e.damagePromptEnabled.name"),
			hint: i18n("br5e.damagePromptEnabled.hint"),
			scope: "world",
			config: true,
			default: false,
			type: Boolean
		});

		/**
		 * Used to enable showing the natural die roll for a d20 roll.
		 */
		game.settings.register("betterrolls5e", "d20RollIconsEnabled", {
			name: i18n("br5e.d20RollIconsEnabled.name"),
			hint: i18n("br5e.d20RollIconsEnabled.hint"),
			scope: "world",
			config: true,
			default: true,
			type: Boolean
		});

		/**
		* Register added roll buttons
		*/
		game.settings.register("betterrolls5e", "rollButtonsEnabled", {
			name: i18n("br5e.rollButtonsEnabled.name"),
			hint: i18n("br5e.rollButtonsEnabled.hint"),
			scope: "world",
			config: true,
			default: true,
			type: Boolean
		});

		/**
		* Register better roll for icon
		*/
		game.settings.register("betterrolls5e", "imageButtonEnabled", {
			name: i18n("br5e.imageButtonEnabled.name"),
			hint: i18n("br5e.imageButtonEnabled.hint"),
			scope: "world",
			config: true,
			default: true,
			type: Boolean
		});

		game.settings.register("betterrolls5e", "altSecondaryEnabled", {
			name: i18n("br5e.altSecondaryEnabled.name"),
			hint: i18n("br5e.altSecondaryEnabled.hint"),
			scope: "world",
			config: true,
			default: true,
			type: Boolean
		});

		game.settings.register("betterrolls5e", "applyActiveEffects", {
			name: i18n("br5e.applyActiveEffects.name"),
			hint: i18n("br5e.applyActiveEffects.hint"),
			scope: "world",
			config: true,
			default: true,
			type: Boolean
		})

		/**
		* Register quick roll defaults for description
		*/
		game.settings.register("betterrolls5e", "quickDefaultDescriptionEnabled", {
			name: i18n("br5e.quickDefaultDescriptionEnabled.name"),
			hint: i18n("br5e.quickDefaultDescriptionEnabled.hint"),
			scope: "world",
			config: true,
			default: false,
			type: Boolean
		});

		game.settings.register("betterrolls5e", "defaultRollArt", {
			name: i18n("br5e.defaultRollArt.name"),
			hint: i18n("br5e.defaultRollArt.hint"),
			scope: "world",
			config: true,
			default: "actor",
			type: String,
			choices: {
				"actor": i18n("Actor"),
				"token": i18n("Token")
			}
		});

		/**
		* Register roll label options
		*/
		game.settings.register("betterrolls5e", "rollTitlePlacement", {
			name: i18n("br5e.rollTitlePlacement.name"),
			hint: i18n("br5e.rollTitlePlacement.hint"),
			scope: "world",
			config: true,
			default: "1",
			type: String,
			choices: {
				"0": i18n("br5e.damageRollPlacement.choices.0"),
				"1": i18n("br5e.damageRollPlacement.choices.1")
			}
		});

		const damagePlacementOptions = ["damageTitlePlacement", "damageContextPlacement", "damageRollPlacement"];

		damagePlacementOptions.forEach(placementOption => {
			game.settings.register("betterrolls5e", placementOption, {
				name: i18n(`br5e.${placementOption}.name`),
				hint: i18n(`br5e.${placementOption}.hint`),
				scope: "world",
				config: true,
				default: "1",
				type: String,
				choices: {
					"0": i18n("br5e.damageRollPlacement.choices.0"),
					"1": i18n("br5e.damageRollPlacement.choices.1"),
					"2": i18n("br5e.damageRollPlacement.choices.2"),
					"3": i18n("br5e.damageRollPlacement.choices.3")
				}
			});
		});

		const contextReplacementOptions = ["contextReplacesTitle", "contextReplacesDamage"];

		contextReplacementOptions.forEach(contextOption => {
			game.settings.register("betterrolls5e", contextOption, {
				name: i18n(`br5e.${contextOption}.name`),
				hint: i18n(`br5e.${contextOption}.hint`),
				scope: "world",
				config: true,
				default: false,
				type: Boolean
			});
		});

		game.settings.register("betterrolls5e", "critBehavior", {
			name: i18n("br5e.critBehavior.name"),
			hint: i18n("br5e.critBehavior.hint"),
			scope: "world",
			config: true,
			default: "1",
			type: String,
			choices: {
				"0": i18n("br5e.critBehavior.choices.0"), // No Extra Damage
				"1": i18n("br5e.critBehavior.choices.1"), // Roll Critical Damage Dice
				"2": i18n("br5e.critBehavior.choices.2"), // Roll Base Damage, Max Critical
				"3": i18n("br5e.critBehavior.choices.3"), // Max Base & Critical Damage
				"4": i18n("br5e.critBehavior.choices.4"), // Max Base Damage, Roll Critical Damage
			}
		});

		game.settings.register("betterrolls5e", "critString", {
			name: i18n("br5e.critString.name"),
			hint: i18n("br5e.critString.hint"),
			scope: "world",
			config: true,
			default: "Crit",
			type: String
		});

		game.settings.register("betterrolls5e", "chatDamageButtonsEnabled", {
			name: i18n("br5e.chatDamageButtonsEnabled.name"),
			hint: i18n("br5e.chatDamageButtonsEnabled.hint"),
			scope: "world",
			config: true,
			default: "1",
			type: String,
			choices: {
				"0": i18n("br5e.chatDamageButtonsEnabled.choices.0"),
				"1": i18n("br5e.chatDamageButtonsEnabled.choices.1"),
				"2": i18n("br5e.chatDamageButtonsEnabled.choices.2"),
			}
		});

		game.settings.register("betterrolls5e", "playRollSounds", {
			name: i18n("br5e.playRollSounds.name"),
			hint: i18n("br5e.playRollSounds.hint"),
			scope: "world",
			config: true,
			default: true,
			type: Boolean
		});

		game.settings.register("betterrolls5e", "hideDC", {
			name: i18n("br5e.hideDC.name"),
			hint: i18n("br5e.hideDC.hint"),
			scope: "world",
			config: true,
			default: "0",
			type: String,
			choices: {
				"0": i18n("br5e.hideDC.choices.0"),
				"1": i18n("br5e.hideDC.choices.1"),
				"2": i18n("br5e.hideDC.choices.2"),
			}
		});
	}

	get playRollSounds() {
		return getBRSetting("playRollSounds");
	}

	get damageRollPlacement() {
		return getBRSetting("damageRollPlacement");
	}

	get rollTitlePlacement() {
		return getBRSetting("rollTitlePlacement");
	}

	get damageTitlePlacement() {
		return getBRSetting("damageTitlePlacement");
	}

	get damageContextPlacement() {
		return getBRSetting("damageContextPlacement");
	}

	get contextReplacesTitle() {
		return getBRSetting("contextReplacesTitle");
	}

	get contextReplacesDamage() {
		return getBRSetting("contextReplacesDamage");
	}

	get critString() {
		return getBRSetting("critString");
	}

	get critBehavior() {
		return getBRSetting("critBehavior");
	}

	get quickDefaultDescriptionEnabled() {
		return getBRSetting("quickDefaultDescriptionEnabled");
	}

	get imageButtonEnabled() {
		return getBRSetting("imageButtonEnabled");
	}

	get altSecondaryEnabled() {
		return getBRSetting("altSecondaryEnabled");
	}

	get applyActiveEffects() {
		return getBRSetting("applyActiveEffects");
	}

	get d20Mode() {
		return getBRSetting("d20Mode");
	}

	get hideDC() {
		return getBRSetting("hideDC");
	}

	get chatDamageButtonsEnabled() {
		const setting = getBRSetting("chatDamageButtonsEnabled");
		return setting === "1" || (setting === "2" && game.user.isGM);
	}

	/**
	 * True if damage buttons should be disabled, false is auto rolling.
	 */
	get damagePromptEnabled() {
		return getBRSetting("damagePromptEnabled");
	}

	/**
	 * Whether the die icon should be shown for d20 multi rolls
	 */
	get d20RollIconsEnabled() {
		return getBRSetting("d20RollIconsEnabled");
	}

	get queryAdvantageEnabled() {
		return this.d20Mode === 4;
	}
}

/**
 * Class instance that can be used to both initialize and retrieve config
 */
export const BRSettings = new Settings();

/**
 * Returns a proxy that returns the given config and falls
 * back to global better roll config.
 * @param {Settings} config
 * @returns {Settings}
 */
export const getSettings = config => {
	if (!config || typeof config !== "object") {
		return BRSettings;
	}

	if (config.__isProxy) {
		return config;
	}

	const proxy = new Proxy(config, {
		get: (target, name) => {
			if (name === "__isProxy") {
				return true;
			}

			if (Reflect.has(target, name)) {
				return Reflect.get(target, name);
			}

			return Reflect.get(BRSettings, name);
		}
	});

	proxy.isWrapped = true;
	return proxy;
};
