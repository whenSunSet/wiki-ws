import * as vscode from "vscode";
import { MemFS } from "./fileSystemProvider";
import { quickOpen, FileItem } from "./quickOpen";
import { queryWikiFromId, createWikiNewFile, deleteFileFromWiki, uploadAssetToWiki } from "./gql";
import * as wsutils from "./wsutils";
import { multiStepInput, State } from "./multiStepInput";

export function activate(context: vscode.ExtensionContext) {
    console.log("wiki extension activate");
    if (wsutils.settingFileExist()) {
        wsutils.initSetting();
    }

    const memFs = new MemFS();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider("wiki", memFs, { isCaseSensitive: true }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.initWiki", _ => {
        console.log("wiki initWiki");
        if (!wsutils.settingFileExist()) {
            multiStepInput().then((state: State) => {
                wsutils.createSettingFile(state.wikiUrl, state.authorizationKey);
                vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse("wiki:/"), name: "wiki" });
                vscode.window.showInformationMessage("The configuration file is initialized! path in:" + wsutils.getSettingFilePath());
                wsutils.initSetting();
            }, (reason: any) => {
                console.error(reason);
                vscode.window.showErrorMessage("Failed to initialize the Wiki.ws configuration file!");
            });
        } else {
            vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse("wiki:/"), name: "wiki" });
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.resetWiki", _ => {
        if (!checkConfigFile()) {
            return;
        }
        console.log("wiki resetWiki");
        for (const [name] of memFs.readDirectory(vscode.Uri.parse("wiki:/"))) {
            memFs.delete(vscode.Uri.parse(`wiki:/${name}`));
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.searchInWiki", _ => {
        console.log("wiki searchInWiki");
        if (!checkConfigFile()) {
            return;
        }
        quickOpen().then((fileItem: FileItem | undefined) => {
            if (fileItem) {
                console.log("wiki searchInWiki open file:" + fileItem);
                queryWikiFromId(fileItem.id).then((data: any) => {
                    let content = JSON.stringify(data.pages.single.content, undefined, 2);
                    content = content.substring(1, content.length - 1);
                    content = content.replace(/\\n/g, "\n");
                    memFs.writeFile(fileItem.uri, Buffer.from(content), { create: true, overwrite: true, id: fileItem.id, isInit: true });
                    console.log("wiki searchInWiki queryWikiFromId data:" + data + ",fileItem:" + fileItem);
                    vscode.workspace.openTextDocument(fileItem.uri).then((document: vscode.TextDocument) => {
                        console.log("wiki searchInWiki queryWikiFromId openTextDocument document:" + document);
                        vscode.window.showTextDocument(document);
                    });
                }, (reason) => {
                    console.error(reason);
                    vscode.window.showErrorMessage("Query wiki from id error!");
                });
            }
        }, (reason) => {
            console.error(reason);
            vscode.window.showErrorMessage("Wiki search error!");
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadFileToWiki", (uri) => {
        console.log("wiki uploadFileToWiki path:" + uri.path);
        if (!checkConfigFile()) {
            return;
        }
        uploadWikiNewFile(uri.path);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadFilesInDirToWiki", uri => {
        console.log("wiki uploadFilesInDirToWiki path:" + uri.path);
        if (!checkConfigFile()) {
            return;
        }
        wsutils.walkFileSync(uri.path, (filePath: string) => {
            console.log("wiki uploadFilesInDirToWiki walkFileSync rootDirPath:" + uri.path + ",filePath:" + filePath);
            uploadWikiNewFile(filePath);
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.deleteFileFromWiki", (uri) => {
        let file: any = undefined;
        try {
            file = memFs.lookupAsFile(uri, false);
            if (file.id == undefined) {
                throw vscode.FileSystemError.FileIsADirectory(uri);
            }
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage("This file cannot be found in wiki!");
            return;
        }
        console.log("wiki deleteFileFromWiki file:" + file.valueOf() + ",path:" + uri.path);
        if (!checkConfigFile()) {
            return;
        }
        deleteFileFromWiki(file.id).then((value: any) => {
            console.log("wiki deleteFileFromWiki success file:" + file + ",path:" + uri.path);
            vscode.window.showInformationMessage("File Deleted Successfully:" + file.name);
            memFs.delete(uri);
        }, (reason: any) => {
            console.error(reason);
            vscode.window.showErrorMessage("Failed to delete a file!");
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadAssetToWiki", (uri) => {
        console.log("wiki uploadAssetToWiki path:" + uri.path);
        if (!checkConfigFile()) {
            return;
        }
        uploadAssetToWiki(uri.path as string).then((value: any) => {
            console.log("wiki uploadAssetToWiki success path:" + uri.path);
            vscode.window.showInformationMessage("Uploading resources successfully:" + uri.path.split("/").pop());
        }, (reason: any) => {
            console.error(reason);
            vscode.window.showErrorMessage("Failed to Delete a resource!");
        });
    }));
}

function checkConfigFile(): boolean {
    const exist = wsutils.settingFileExist();
    if (!exist) {
        vscode.window.showErrorMessage("The configuration file is not initialized! Please call the command:wiInitWiki!");
    }
    return exist;
}

function uploadWikiNewFile(path: string) {
    const title = path.split("/").pop()?.split(".")[0];
    const endfix = "." + path.split("/").pop()?.split(".").pop();
    console.log("wiki uploadWikiNewFile path:" + path + ",title:" + title + ",endfix:" + endfix);
    if (endfix != ".md") {
        console.log("Only MarkDown files can be uploaded!");
        return;
    }
    wsutils.readFile(path).then((buffer) => {
        let filePath = path as string;
        vscode.workspace.workspaceFolders?.forEach(element => {
            const workspaceRootPath = element.uri.path;
            if (workspaceRootPath != "/" && filePath.includes(workspaceRootPath)) {
                const rootName = workspaceRootPath.split("/").pop();
                filePath = rootName + filePath.replace(workspaceRootPath, "");
            }
        });

        let content = buffer.toString();
        content = content.replace(/\n/g, "\\n");
        filePath = filePath.replace(endfix, "");
        createWikiNewFile(content, "", filePath, title as string).then((value: any) => {
            vscode.window.showInformationMessage("Uploading file succeeded: " + path.split("/").pop());
        }, (reason: any) => {
            console.error(reason);
            vscode.window.showErrorMessage("Failed to upload files!");
        });
    }, (reason: any) => {
        console.error(reason);
        vscode.window.showErrorMessage("Failed to read the file!");
    });
}