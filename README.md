# FoundryVTT - Better Rolls for 5e
A module for modifying certain sheet functions on Foundry VTT Character sheets for D&D 5th Edition.

Though initially a fork of Hooking's [Item Sheet Buttons](https://gitlab.com/hooking/foundry-vtt---item-sheet-buttons) module, it now includes several roll templates designed for Foundry's 5e sheets to increase speed of play.

## Installation
### Method 1
- Download the [.zip file](https://github.com/RedReign/FoundryVTT-BetterRolls5e/raw/master/betterrolls5e.zip) in this repository.
- Extract the zip as a folder called `betterrolls5e` in `\resources\app\public\modules\`
- Restart Foundry.
- Enjoy!

### Method 2
- Start up Foundry and click "Install Module" in the "Add-On Modules" tab.
- Paste the link: `https://raw.githubusercontent.com/RedReign/FoundryVTT-BetterRolls5e/master/module.json`
- Click "Install" and it should appear in your modules list.
- Enjoy!

## Implemented Features
- Improved roll outputs into chat for efficiency. Dubbed "Better Rolls", these compounded rolls can include dual d20 rolls for attack rolls, ability checks, and saving throws, but also damage rolls and automatic critical damage calculation.
- Added sheet buttons when expanding an item's summary in the sheet, allowing the sheet to quickly output whatever is needed (Attack & damage rolls combined, attack & alternate damage, just attack, just damage...)
- Clicking an item/feat/spell's icon will give a quick roll, based on the fields present in the item clicked. Hold Alt while clicking to bypass this and do the default chat message.
- Need for clicking through prompts in order to get a single roll are removed.
- Natively supports the 'Sky5e' and 'Better NPC' sheets for 5e.
- Configurable options for disabling better rolls, changing sheet outputs, and labels for both roll sets and damage type.
- Currently, does not add to or tamper with actor data in any way. Disabling the mod should not affect actor data.

## Gallery
![](https://i.imgur.com/vZcoslI.png)
![](https://i.imgur.com/hBsV2NK.png)
![](https://i.imgur.com/yc6jp3C.png)
![](https://i.imgur.com/y7Hz7lY.png)
![](https://i.imgur.com/FmeNGm3.png)

## Planned Features
- Localization support
- Per-item options for buttons that have both attack and alt damage rolls combined
- Tertiary "extra damage" rolls for weapons that have alt damage rolls but also deal two types of damage (Such as using a longsword with the Paladin's Improved Divine Smite)

## Acknowledgements
- Big thanks to Atropos for making a wonderful VTT that's worth making modules for!
- Thanks are also due to Hooking for the initial Item Sheet Buttons module, without which this project would not exist.
- My gratitude extends also to all the folks of the Foundry VTT community for their endless wisdom and insight.

## License
The source code is licensed under GPL-3.0.
