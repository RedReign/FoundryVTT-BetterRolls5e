/**
 * A specialized Dialog subclass for an extended prompt for Better Rolls
 * @type {Dialog}
 */
export default class ExtendedPrompt extends Dialog {
	constructor(item, dialogData={}, options={}) {
		super(dialogData, options);
		this.options.classes = ["dnd5e", "dialog"];

		/**
		 * Store a reference to the Item entity being used
		 * @type {Item5e}
		 */
		this.item = item;
	}
}
