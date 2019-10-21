# FoundryVTT - Better Rolls for 5e
A module for modifying certain sheet functions on Foundry VTT Character sheets for D&D 5th Edition.

Though initially a fork of Hooking's [Item Sheet Buttons](https://gitlab.com/hooking/foundry-vtt---item-sheet-buttons) module, it now includes several roll templates designed for Foundry's 5e sheets to increase speed of play.

Consider getting [Chat Damage Buttons](https://github.com/syl3r86/chatdamagebuttons-betterrolls) by Felix#6196, a fork of hooking#0492's module to add buttons to apply damage rolls to tokens. Very handy!

## Installation
### Method 1
- Download the [.zip file](https://github.com/RedReign/FoundryVTT-BetterRolls5e/raw/master/betterrolls5e.zip) in this repository.
- Extract the contents of the zip in `\resources\app\public\modules\`
- Restart Foundry.
- Enjoy!

### Method 2 (Now Works™!)
- Start up Foundry and click "Install Module" in the "Add-On Modules" tab.
- Paste the link: `https://raw.githubusercontent.com/RedReign/FoundryVTT-BetterRolls5e/master/betterrolls5e/module.json`
- Click "Install" and it should appear in your modules list.
- Enjoy!

## Implemented Features
- Improved roll outputs into chat for efficiency. Dubbed "Better Rolls", these compounded rolls can include dual d20 rolls for attack rolls, ability checks, and saving throws, but also damage rolls and automatic critical damage calculation.
![](https://i.imgur.com/Pq5HK73.png)
![](https://i.imgur.com/6YzQWG9.png)
![](https://i.imgur.com/pME8Tsz.png)
![](https://i.imgur.com/XO2JUjB.png)
- Added sheet buttons when expanding an item's summary in the sheet, allowing the sheet to quickly output whatever is needed (Attack & damage rolls combined, attack & alternate damage, just attack, just damage...)
![](https://i.imgur.com/uFvpDPw.png)
- Clicking an item/feat/spell's icon will give a quick roll, based on the fields present in the item clicked. Hold Alt while clicking to bypass this and do the default chat message.

![](https://i.imgur.com/2kNCHdZ.png)

Clicking with/without the Alt key:

![](https://i.imgur.com/Od15JXz.png)
- Need for clicking through prompts in order to get a single roll is removed, allowing for ease of use.
- ***New!*** Per-item options for showing the item's description on a quick roll.
- ***New!*** Per-item critical threshold.
- ***New!*** Per-item extra damage rolls.
![](https://i.imgur.com/FkotJOG.png)
- Extra damage rolls can be configured and added separately to both normal and alternate damage rolls, allowing greater flexibility for weapons that deal damage in multiple ways.
- Natively supports the 'Sky5e' and 'Better NPC' sheets for 5e.
![](https://i.imgur.com/qleIQsq.png)
- Configurable options for disabling better rolls, changing sheet outputs, and labels for both roll sets and damage type.
![](https://i.imgur.com/Wd0iT0E.png)
- Localization support - now comes with a full Japanese translation!
![](https://cdn.discordapp.com/attachments/513918036919713802/635495803787542559/unknown.png)


## Planned Features
- Dual roll improvements

## Acknowledgements
- Big thanks to Atropos for making a wonderful VTT that's worth making modules for!
- Thanks are also due to Hooking for the initial Item Sheet Buttons module, without which this project would not exist.
- Thank you, Felix#6196 for making a wonderful extension of Chat Damage Buttons reconfigured for this module.
- Thank you, Brother Sharp#6921 for providing the Japanese localization for this module.
- My gratitude extends also to all the folks of the Foundry VTT community for their endless wisdom and insight.

## License
The source code is licensed under GPL-3.0.
