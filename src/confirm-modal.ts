import { App, ButtonComponent, Modal, Setting, requireApiVersion } from 'obsidian';

/** `setDestructive` arrived in 1.13.0. The minimum app version is 1.5.0, so older apps keep `setWarning`. */
export function destructive(b: ButtonComponent): ButtonComponent {
	if (requireApiVersion('1.13.0')) return b.setDestructive();
	// What setWarning() does, without the deprecated call.
	b.buttonEl.addClass('mod-warning');
	return b;
}

/** Asks before a destructive action. `onConfirm` runs only on the confirm button. */
export class ConfirmModal extends Modal {
	constructor(app: App, private message: string, private confirmText: string, private onConfirm: () => void | Promise<void>) {
		super(app);
	}

	onOpen() {
		this.contentEl.createEl('p', { text: this.message });
		new Setting(this.contentEl)
			.addButton((b) => b.setButtonText('Cancel').onClick(() => this.close()))
			.addButton((b) =>
				destructive(b.setButtonText(this.confirmText)).onClick(() => {
					this.close();
					void this.onConfirm();
				}),
			);
	}

	onClose() {
		this.contentEl.empty();
	}
}
