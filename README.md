# Better Rolls for 5e - A FoundryVTT Module
A module for modifying certain sheet functions on Foundry VTT Character sheets for DnD5e. It allows for quick, compounded rolls for items, ability checks saving throws, and just about any roll you might want in 5th Edition DnD.

Though initially a fork of Hooking's [Item Sheet Buttons](https://gitlab.com/hooking/foundry-vtt---item-sheet-buttons) module, it now includes several roll templates designed for Foundry's 5e sheets to increase speed of play.

Felix's [Chat Damage Buttons](https://github.com/syl3r86/chatdamagebuttons-betterrolls) module has been implemented into core Better Rolls. 

If you are feeling generous, and would like to support my work, you can do so through this [Paypal](https://www.paypal.me/RedReignDonate) link. Thank you!

## Installation
### Method 1
- Start up Foundry and click "Install Module" in the "Add-On Modules" tab.
- Search for "Better Rolls" in the pop up window.
- Click "Install" and it should appear in your modules list.
- Enjoy!

### Method 2
- Start up Foundry and click "Install Module" in the "Add-On Modules" tab.
- Paste the link: `https://raw.githubusercontent.com/RedReign/FoundryVTT-BetterRolls5e/master/betterrolls5e/module.json`
- Click "Install" and it should appear in your modules list.
- Enjoy!

### Method 3
- Download the [.zip file](https://github.com/RedReign/FoundryVTT-BetterRolls5e/raw/master/betterrolls5e.zip) in this repository.
- Extract the contents of the zip in `\resources\app\public\modules\`
- Restart Foundry.
- Enjoy!

## Implemented Features
- Custom d20 roll modes for Single, Dual, and Triple rolls. Single mode will roll double in the case of advantage and disadvantage.
- Rolls with advantage or disadvantage highlight the correct roll, indicating which roll is used.
- Improved roll outputs into chat for efficiency. Pretentiously dubbed "Better Rolls", these compounded rolls can include dual d20 rolls for attack rolls, ability checks, and saving throws, but also damage rolls and automatic critical damage calculation.


![](https://i.imgur.com/Pq5HK73.png)
![](https://i.imgur.com/6YzQWG9.png)
![](https://i.imgur.com/pME8Tsz.png)
![](https://i.imgur.com/XO2JUjB.png)
- Added sheet buttons when expanding an item's summary in the sheet, allowing the sheet to quickly output whatever is needed (Attack & damage rolls combined, attack & alternate damage, just attack, just damage...)
![](https://i.imgur.com/uFvpDPw.png)
- Clicking an item/feat/spell's icon will give a quick roll, based on the fields present in the item clicked.

![](https://i.imgur.com/2kNCHdZ.png)

Clicking with/without the Alt key:

![](https://i.imgur.com/Od15JXz.png)

- Alt Quick Rolls, which can be used by holding Alt when clicking the item's icon in the character sheet. These can be configured separately from normal Quick Rolls.
![](https://i.imgur.com/yPzgzEe.png)
- Need for clicking through prompts in order to get a single roll is removed, allowing for ease of use.
- Per-item options for showing the item's description on a quick roll.
- Per-item critical threshold.
- Supports dnd5e's additional damage rolls, which are fully configurable for appearing on Quick Rolls!

![](https://i.imgur.com/FkotJOG.png)
- Natively supports the Better NPC Sheet
![](https://i.imgur.com/qleIQsq.png)
- Configurable options for disabling better rolls, changing sheet outputs, and labels for both roll sets and damage type.
![](https://i.imgur.com/Wd0iT0E.png)
- Localization support - now comes with full Japanese and Korean translations!
![](https://cdn.discordapp.com/attachments/513918036919713802/635495803787542559/unknown.png)

- Macro support! Try dragging and dropping an item, spell, or feat from your character sheet onto the macro hotbar!
- Script macros are also intuitive enough to be entered manually.
- Try `BetterRolls.quickRoll("Shortbow");` on a creature with an item named "Shortbow", or `BetterRolls.quickRollByName("Sharon", "Shortbow");` to fire Sharon's shortbow.
![](https://i.imgur.com/fMMWz3m.gif)
- Custom damage labels. Add written context to damage rolls to convey what the damage comes from, or when it occurs.
![](https://i.imgur.com/L9NTE7G.png)
- Extended support for thrown items, consumables, ammunition, and items with otherwise limited uses.
![](https://i.imgur.com/yQpSJgb.png)

## Planned Features
- Additional macro support
- Extended prompts to configure messages on a roll-by-roll basis
- Additional hooks suppot and chat message flags for module cross-compatibility

## Known Issues
- In versions prior to 1.1.12, there exists a bug where, if used alongside tidy5e, Actor data may increase exponentially. This has since been addressed in 1.1.12. **If you are using Foundry Virtual Tabletop 0.7.0 or higher, please update to Better Rolls 1.1.12.**

## Acknowledgements
- Big thanks to Atropos for making a wonderful VTT that's worth making modules for!
- Thanks are also due to Hooking for the initial Item Sheet Buttons module, without which this project would not exist.
- Thank you, Felix#6196 for making a wonderful extension of Chat Damage Buttons reconfigured for this module.
- Thank you, Brother Sharp#6921 for providing the Japanese localization for this module.
- Thank you, KLO#1490 for providing the Korean localization for this module.
- Thank you, Cosmo Corban#4840 for providing the Spanish localization for this module.
- Thank you, Olirin#0350 for providing the French localization for this module.
- Additional thanks go to KaKaRoTo, tposney, and Giddy of the Foundry discord for advice and assistance while developing and maintaining this module.
- My gratitude extends also to all the folks of the Foundry VTT community for their endless wisdom and insight.

## License
The source code is licensed under GPL-3.0.
