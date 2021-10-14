/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import { Uri, window, Disposable } from "vscode";
import { QuickPickItem } from "vscode";
import { queryWikiFileList } from "./gql";
import * as vscode from "vscode";
/**
 * A file opener using window.createQuickPick().
 * 
 * It shows how the list of items can be dynamically updated based on
 * the user"s input in the filter field.
 */
export async function quickOpen() {
	const fileItem = await pickFile();
	return fileItem;

}

export class FileItem implements QuickPickItem {

	label: string;
	description: string;

	constructor(public base: Uri, public uri: Uri, public id: number, public wikiPath: string, public fileName: string) {
		const parentDirName = path.basename(path.dirname(wikiPath));
		const pParentDirName = path.basename(path.dirname(wikiPath.replace(parentDirName, "")));
		const ppParentDirName = path.basename(path.dirname(wikiPath.replace(parentDirName, "").replace(pParentDirName, "")));
		let label = path.basename(uri.fsPath);
		if(parentDirName != "" && parentDirName != ".") {
			label = parentDirName + "/" + label;
		}
		if(parentDirName != "" && parentDirName != ".") {
			label = pParentDirName + "/" + label;
		}
		if(parentDirName != "" && parentDirName != ".") {
			label = ppParentDirName + "/" + label;
		}
		this.label = label;
		this.description = path.dirname(path.relative(base.fsPath, uri.fsPath));
	}
}

class MessageItem implements QuickPickItem {

	label: string;
	description = "";
	detail: string;

	constructor(public base: Uri, public message: string) {
		this.label = message.replace(/\r?\n/g, " ");
		this.detail = base.fsPath;
	}
}

async function pickFile() {
	const disposables: Disposable[] = [];
	try {
		return await new Promise<FileItem | undefined>((resolve, reject) => {
			const input = window.createQuickPick<FileItem | MessageItem>();
			input.placeholder = "Type to search for files";
			disposables.push(
				input.onDidChangeValue(value => {
					if (!value) {
						input.items = [];
						return;
					}
					input.busy = true;
					console.log("pickFile value:" + value);
					queryWikiFileList(value).then((data: any) => {
						const fileList: Array<FileItem> = [];
						data.pages.search.results.forEach((element: { id: string; title: string; path:string;}) => {
							const baseFileUri = vscode.Uri.parse(`wiki:/`);
							const fileUri = vscode.Uri.parse(`wiki:/${element.path}.md`);
							fileList.push(new FileItem(baseFileUri, fileUri, Number(element.id), element.path, element.title + ".md"));
						});
						console.log("pickFile queryWikiFileList result" + data + ",length:" + fileList.length);
						input.items = fileList;
						input.busy = false;
					}, (reason: any) => {
						console.error(reason);
						vscode.window.showErrorMessage("wiki search error! network error!");
					});
				}),
				input.onDidChangeSelection(items => {
					console.log("pickFile onDidChangeSelection:");
					const item = items[0];
					if (item instanceof FileItem) {
						resolve(item);
						input.hide();
					}
				}),
				input.onDidHide(() => {
					console.log("pickFile onDidHide");
					resolve(undefined);
					input.dispose();
				})
			);
			input.show();
		});
	} finally {
		disposables.forEach(d => d.dispose());
	}
}
