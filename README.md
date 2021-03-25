# Better Rolls for 5e - A FoundryVTT Module
A Foundry VTT module that replaces the built in rolling system for DnD5e. It allows for quick, compounded rolls for items, ability checks saving throws, and just about any roll you might want. Though initially a fork of Hooking's [Item Sheet Buttons](https://gitlab.com/hooking/foundry-vtt---item-sheet-buttons) module, it now includes several roll templates designed for Foundry's 5e sheets to increase speed of play. Felix's Chat Damage Buttons module has also been implemented into core Better Rolls. 

If you are feeling generous, and would like to support my work, you can do so through this [Paypal](https://www.paypal.me/RedReignDonate) link. Thank you!

## Incompatible Modules
- Mars (replaces the core roller, competing directly with Better Rolls. Its one or the other)
- Better NPC Sheet 5e (very out of date)

#### Partially Compatible (Special Notes)
- Midi QOL: more or less works, but make sure to enable fast forward attack in the midi options. If auto hit detection is enabled in midi, you'll need to use the query roll mode in Better Rolls to have more accurate results (dual mode / triple mode will throw it off as midi does not detect edits in better rolls).
- J2BA Animations: Only for attack rolls. If set to play on damage rolls it won't work.

## Installation
### Method 1
- Start up Foundry and click "Install Module" in the "Add-On Modules" tab.
- Search for "Better Rolls" in the pop up window.
- Click "Install" and it should appear in your modules list.
- Enjoy!

### Method 2
- Start up Foundry and click "Install Module" in the "Add-On Modules" tab.
- Paste one of the following:
  - Latest release: `https://raw.githubusercontent.com/RedReign/FoundryVTT-BetterRolls5e/master/betterrolls5e/module.json`
  - The module.json listed in any of the releases (for either an older version or an alpha version)
- Click "Install" and it should appear in your modules list.
- Enjoy!

## Implemented Features
### Multirolls and Roll Modes
Improved roll outputs into chat for efficiency. Pretentiously dubbed "Better Rolls", these compounded rolls can include dual d20 rolls for attack rolls, ability checks, and saving throws, but also damage rolls and automatic critical damage calculation.

Custom d20 roll modes includes Single, Dual, Triple, and Query Dialog rolls. Single mode will roll double in the case of advantage and disadvantage and can be edited after they're rolled into advantage or disadvantage by mousing over and clicking the [-]/[+] buttons. Rolls with advantage or disadvantage highlight the correct roll, indicating which roll is used.

Details of the roll are based on the fields present in the item clicked.

![](https://i.imgur.com/DyzMi2A.png)

### Roll Editing
Chat messages are condensed and are edited live. Attack is grouped together with damage. Single rolls can be updated to advantage or disadvantage, and damage can either be auto-rolled or prompted with a button.

![](https://user-images.githubusercontent.com/1286721/103615288-529fea80-4ef8-11eb-95cf-490e86084c5e.gif)

### Sheet Buttons
For additional control, sheet buttons are displayed in the character sheet's item summary, allowing the sheet to quickly output whatever is needed (Attack & damage rolls combined, attack & alternate damage, just attack, just damage...)

![](https://i.imgur.com/uFvpDPw.png)
![](https://i.imgur.com/2kNCHdZ.png)

### Alt Rolls and Roll Configuration
Damage rolls have an additional context field to convey what the damage comes from, or when it occurs.

![](https://i.imgur.com/L9NTE7G.png)

Rolls can also be configured in the Better Rolls item tab while editing an item. Items have two roll modes: normal and alt quick rolls. Alt Quick Rolls, can be used by holding Alt when clicking the item's icon in the character sheet.

![](https://i.imgur.com/Od15JXz.png)
![](https://i.imgur.com/yPzgzEe.png)

Extended support for thrown items, consumables, ammunition, and items with otherwise limited uses.

![](https://i.imgur.com/yQpSJgb.png)

### Additional Features
- Need for clicking through prompts in order to get a single roll is removed, allowing for ease of use.
- Per-item options for showing the item's description on a quick roll.
- Per-item critical threshold.
- Configurable options for changing sheet outputs and labels for both roll sets and damage type.
- Localization support - now comes with full Japanese and Korean translations!

![](https://i.imgur.com/Wd0iT0E.png)
![](https://cdn.discordapp.com/attachments/513918036919713802/635495803787542559/unknown.png)

### Macro Support
- Macro support! Try dragging and dropping an item, spell, or feat from your character sheet onto the macro hotbar!
- Script macros are also intuitive enough to be entered manually.
- Try `BetterRolls.quickRoll("Shortbow");` on a creature with an item named "Shortbow", or `BetterRolls.quickRollByName("Sharon", "Shortbow");` to fire Sharon's shortbow.
- Check out the samples folder for some example macros.

![](https://i.imgur.com/fMMWz3m.gif)

## Planned Features
- Additional macro support
- Extended prompts to configure messages on a roll-by-roll basis
- Additional hooks support and chat message flags for module cross-compatibility

## Known Issues
- In versions prior to 1.1.12, there exists a bug where, if used alongside tidy5e, Actor data may increase exponentially. This has since been addressed in 1.1.12. **If you are using Foundry Virtual Tabletop 0.7.0 or higher, please update to Better Rolls 1.1.12.**

## Acknowledgements
- Big thanks to Atropos for making a wonderful VTT that's worth making modules for!
- CarlosFdez (Supe on discord) is the current maintainer and has done a great deal of work cleaning up the module's code and implementing new, useful features. Thanks for all your hard work!
- Thanks are also due to Hooking for the initial Item Sheet Buttons module, without which this project would not exist.
- Thank you, Felix#6196 for making a wonderful extension of Chat Damage Buttons reconfigured for this module.
- Thank you, Brother Sharp#6921 for providing the Japanese localization for this module.
- Thank you, KLO#1490 for providing the Korean localization for this module.
- Thank you, Cosmo Corban#4840 for providing the Spanish localization for this module.
- Thank you, Innocenti#1455 for providing the Portuguese localization for this module.
- Thank you, Olirin#0350 for providing the French localization for this module.
- Thank you, Acd-Jake#9087 for providing the German localization for this module.
- Additional thanks go to KaKaRoTo, tposney, and Giddy of the Foundry discord for advice and assistance while developing and maintaining this module.
- My gratitude extends also to all the folks of the Foundry VTT community for their endless wisdom and insight.

## License
The source code is licensed under GPL-3.0.
Some icons are from Game-icons.net under CC-BY
