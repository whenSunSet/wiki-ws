/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { QuickPickItem, window, Disposable, QuickInputButton, QuickInput, ExtensionContext, QuickInputButtons } from 'vscode';
import * as wsutils from "./wsutils";

/**
 * A multi-step input using window.createQuickPick() and window.createInputBox().
 * 
 * This first part uses the helper class `MultiStepInput` that wraps the API for the multi-step case.
 */
export interface State {
	wikiUrl: string;
	authorizationKey: string;
	wikiIsDeployed: string;
	savedDirPathIfNotDeploy: string;
}
export async function multiStepInput() {

	async function collectInputs() {
		const state = {} as Partial<State>;
		await MultiStepInput.run(input => chooseInitWay(input, state));
		return state as State;
	}

	const title = '初始化Wiki.ws插件(Init Wiki.ws Extension)';

	async function chooseInitWay(input: MultiStepInput, state: Partial<State>) {
		state.wikiIsDeployed = await input.showInputBox({
			title,
			step: 1,
			totalSteps: 3,
			value: typeof state.wikiIsDeployed === 'string' ? state.wikiIsDeployed : '',
			prompt: '您是否已经部署了Wiki.js？请输入 yes 或者 no(Have you deployed Wiki.js? Enter yes or no)',
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		});
		return (input: MultiStepInput) => chooseInputBox(input, state);
	}

	async function chooseInputBox(input: MultiStepInput, state: Partial<State>) {
		if (state.wikiIsDeployed?.toLowerCase() == wsutils.yes) {
			state.wikiUrl = await input.showInputBox({
				title,
				step: 2,
				totalSteps: 3,
				value: typeof state.wikiUrl === 'string' ? state.wikiUrl : '',
				prompt: '请输入Wiki.js主页的链接(Please enter the link to the Wiki.js homepage)',
				validate: validateNameIsUnique,
				shouldResume: shouldResume
			});
			return (input: MultiStepInput) => inputAuthorizationKey(input, state);
		} else {
			const defaultDir = wsutils.mkdirSettingDir();
			state.savedDirPathIfNotDeploy = await input.showInputBox({
				title,
				step: 2,
				totalSteps: 2,
				value: typeof state.savedDirPathIfNotDeploy === 'string' ? state.savedDirPathIfNotDeploy : '',
				prompt: '请输入您期望部署Wiki.js的目录，默认目录是:' + defaultDir + '(Please enter the directory where you expect to deploy Wiki.js, the default directory is:' + defaultDir + ")",
				validate: validateNameIsUnique,
				shouldResume: shouldResume
			});
		}
	}

	async function inputAuthorizationKey(input: MultiStepInput, state: Partial<State>) {
		state.authorizationKey = await input.showInputBox({
			title,
			step: 3,
			totalSteps: 3,
			value: state.authorizationKey || '',
			prompt: '请输入Wiki.js的密钥,你可以从这个页面找到:https://docs.requarks.io/dev/api(Please input authorization key,you can find the authorization key in this page:https://docs.requarks.io/dev/api)',
			validate: validateNameIsUnique,
			shouldResume: shouldResume
		});
	}

	function shouldResume() {
		// Could show a notification with the option to resume.
		return new Promise<boolean>((resolve, reject) => {
			// noop
		});
	}

	async function validateNameIsUnique(name: string) {
		// ...validate...
		await new Promise(resolve => setTimeout(resolve, 1000));
		return name === 'vscode' ? 'Name not unique' : undefined;
	}

	const state = await collectInputs();
	return state;
}


// -------------------------------------------------------
// Helper code that wraps the API for the multi-step case.
// -------------------------------------------------------


class InputFlowAction {
	static back = new InputFlowAction();
	static cancel = new InputFlowAction();
	static resume = new InputFlowAction();
}

type InputStep = (input: MultiStepInput) => Thenable<InputStep | void>;

interface QuickPickParameters<T extends QuickPickItem> {
	title: string;
	step: number;
	totalSteps: number;
	items: T[];
	activeItem?: T;
	placeholder: string;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

interface InputBoxParameters {
	title: string;
	step: number;
	totalSteps: number;
	value: string;
	prompt: string;
	validate: (value: string) => Promise<string | undefined>;
	buttons?: QuickInputButton[];
	shouldResume: () => Thenable<boolean>;
}

class MultiStepInput {

	static async run<T>(start: InputStep) {
		const input = new MultiStepInput();
		return input.stepThrough(start);
	}

	private current?: QuickInput;
	private steps: InputStep[] = [];

	private async stepThrough<T>(start: InputStep) {
		let step: InputStep | void = start;
		while (step) {
			this.steps.push(step);
			if (this.current) {
				this.current.enabled = false;
				this.current.busy = true;
			}
			try {
				step = await step(this);
			} catch (err) {
				if (err === InputFlowAction.back) {
					this.steps.pop();
					step = this.steps.pop();
				} else if (err === InputFlowAction.resume) {
					step = this.steps.pop();
				} else if (err === InputFlowAction.cancel) {
					step = undefined;
				} else {
					throw err;
				}
			}
		}
		if (this.current) {
			this.current.dispose();
		}
	}

	async showQuickPick<T extends QuickPickItem, P extends QuickPickParameters<T>>({ title, step, totalSteps, items, activeItem, placeholder, buttons, shouldResume }: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<T | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = window.createQuickPick<T>();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.placeholder = placeholder;
				input.items = items;
				if (activeItem) {
					input.activeItems = [activeItem];
				}
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidChangeSelection(items => resolve(items[0])),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}

	async showInputBox<P extends InputBoxParameters>({ title, step, totalSteps, value, prompt, validate, buttons, shouldResume }: P) {
		const disposables: Disposable[] = [];
		try {
			return await new Promise<string | (P extends { buttons: (infer I)[] } ? I : never)>((resolve, reject) => {
				const input = window.createInputBox();
				input.title = title;
				input.step = step;
				input.totalSteps = totalSteps;
				input.value = value || '';
				input.prompt = prompt;
				input.buttons = [
					...(this.steps.length > 1 ? [QuickInputButtons.Back] : []),
					...(buttons || [])
				];
				let validating = validate('');
				disposables.push(
					input.onDidTriggerButton(item => {
						if (item === QuickInputButtons.Back) {
							reject(InputFlowAction.back);
						} else {
							resolve(<any>item);
						}
					}),
					input.onDidAccept(async () => {
						const value = input.value;
						input.enabled = false;
						input.busy = true;
						if (!(await validate(value))) {
							resolve(value);
						}
						input.enabled = true;
						input.busy = false;
					}),
					input.onDidChangeValue(async text => {
						const current = validate(text);
						validating = current;
						const validationMessage = await current;
						if (current === validating) {
							input.validationMessage = validationMessage;
						}
					}),
					input.onDidHide(() => {
						(async () => {
							reject(shouldResume && await shouldResume() ? InputFlowAction.resume : InputFlowAction.cancel);
						})()
							.catch(reject);
					})
				);
				if (this.current) {
					this.current.dispose();
				}
				this.current = input;
				this.current.show();
			});
		} finally {
			disposables.forEach(d => d.dispose());
		}
	}
}
