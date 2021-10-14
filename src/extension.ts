import * as vscode from "vscode";
import { File, MemFS } from "./fileSystemProvider";
import { quickOpen, FileItem, queryWikiFileListInner } from "./quickOpen";
import { queryWikiFromId, createWikiNewFile, deleteFileFromWiki, uploadAssetToWiki, createAssetFolder, getFolderIdFromName } from "./gql";
import * as wsutils from "./wsutils";
import { multiStepInput, State } from "./multiStepInput";
import * as path from "path";

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
                queryWikiFromIdInner(fileItem, memFs);
            }
        }, (reason) => {
            console.error(reason);
            vscode.window.showErrorMessage("Wiki search error!");
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.fetchAllFileFromWikiInDir", dirUri => {
        console.log("wiki fetchAllFileFromWikiInDir");
        if (!checkConfigFile()) {
            return;
        }
        queryWikiFileListInner(dirUri.path.replace("/", ""), (fileList:Array<FileItem>)=>{
            fileList.forEach((element:FileItem)=>{
                queryWikiFromIdInner(element, memFs);
            });
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadFileToWiki", (uri) => {
        console.log("wiki uploadFileToWiki path:" + uri.path);
        if (!checkConfigFile()) {
            return;
        }
        uploadWikiNewFile(uri, uri.path, memFs);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadFilesInDirToWiki", uri => {
        console.log("wiki uploadFilesInDirToWiki path:" + uri.path);
        if (!checkConfigFile()) {
            return;
        }
        wsutils.walkFileSync(uri.path, (filePath: string) => {
            console.log("wiki uploadFilesInDirToWiki walkFileSync rootDirPath:" + uri.path + ",filePath:" + filePath);
            uploadWikiNewFile(uri, filePath, memFs);
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.deleteFileFromWiki", (uri) => {
        deleteFileFromWikiInner(memFs, uri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.deleteDirFileFromWiki", (dirUri) => {
        console.log("wiki deleteDirFileFromWiki path:" + dirUri.path);
        memFs.fileWalk(dirUri, (filePath: string) => {
            console.log("wiki deleteDirFileFromWiki walkFileSync rootDirPath:" + dirUri.path + ",filePath:" + filePath);
            const deleteFileUri = vscode.Uri.parse(`wiki:${filePath}`);
            deleteFileFromWikiInner(memFs, deleteFileUri);
        });
        memFs.delete(dirUri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadAssetToWiki", (uri) => {
        console.log("wiki uploadAssetToWiki path:" + uri.path);
        if (!checkConfigFile()) {
            return;
        }
        const parentDirName = path.basename(path.dirname(uri.path));
        const parentDirNameRemote = parentDirName.replace(/ /g, "_").toLowerCase().trim();
        getFolderIdFromName(parentDirNameRemote).then((folderId: number) => {
            if (folderId == undefined) {
                createAssetFolder(parentDirNameRemote).then((value: any) => {
                    const responseResult = value.assets.createFolder.responseResult;
                    if (!responseResult.succeeded) {
                        vscode.window.showInformationMessage("Directory create error! " + responseResult.message);
                    } else {
                        vscode.window.showInformationMessage("Directory created successfully. name:" + parentDirNameRemote);
                        getFolderIdFromName(parentDirNameRemote.toLowerCase()).then((folderId: number) => {
                            if (folderId == undefined) {
                                vscode.window.showErrorMessage("Failed to get the directory ID. name:" + parentDirNameRemote);
                            } else {
                                uploadAssetToWikiInner(uri.path, folderId, parentDirNameRemote);
                            }
                        }, (reason: any) => {
                            console.error(reason);
                            vscode.window.showErrorMessage("Failed to get the directory ID. name:" + parentDirNameRemote);
                        });
                    }
                }, (reason: any) => {
                    console.error(reason);
                    vscode.window.showErrorMessage("Failed to create directory. name:" + parentDirNameRemote);
                });
            } else {
                uploadAssetToWikiInner(uri.path, folderId, parentDirNameRemote);
            }
        }, (reason: any) => {
            console.error(reason);
            vscode.window.showErrorMessage("Failed to get the directory ID. name:" + parentDirName);
        });
    }));
}

function uploadAssetToWikiInner(path: string, folderId: number, parentDirName: string) {
    uploadAssetToWiki(path as string, folderId, parentDirName);
}

function checkConfigFile(): boolean {
    const exist = wsutils.settingFileExist();
    if (!exist) {
        vscode.window.showErrorMessage("The configuration file is not initialized! Please call the command:wiInitWiki!");
    }
    return exist;
}

function queryWikiFromIdInner(fileItem: FileItem, memFs:MemFS) {
    queryWikiFromId(fileItem.id).then((data: any) => {
        let content = JSON.stringify(data.pages.single.content, undefined, 2);
        content = content.substring(1, content.length - 1);
        content = content.replace(/\\n/g, "\n");
        content = content.replace(/\\"/g, `"`);
        const parentDir = path.posix.dirname(fileItem.wikiPath);
        memFs.createDirectory(vscode.Uri.parse(`wiki:/${parentDir}`));
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

function deleteFileFromWikiInner(memFs: MemFS, uri: vscode.Uri) {
    let file: any = undefined;
    try {
        file = memFs.lookupAsFile(uri, false);
        if (file.id == -1) {
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
        const responseResult = value.pages.delete.responseResult;
        if (!responseResult.succeeded) {
            vscode.window.showInformationMessage("File delete error! " + responseResult.message);
        } else {
            vscode.window.showInformationMessage("File deleted successfully:" + file.name);
        }
        memFs.delete(uri);
    }, (reason: any) => {
        console.error(reason);
        vscode.window.showErrorMessage("Failed to delete a file!");
    });
}

function uploadWikiNewFile(uri: any, path: string, memFs: MemFS) {
    const scheme = uri.scheme;
    const title = path.split("/").pop()?.split(".")[0];
    const endfix = "." + path.split("/").pop()?.split(".").pop();
    console.log("wiki uploadWikiNewFile path:" + path + ",title:" + title + ",endfix:" + endfix);
    if (endfix != ".md") {
        console.log("Only MarkDown files can be uploaded!");
        return;
    }
    if (scheme == "wiki") {
        let file: any = undefined;
        try {
            file = memFs.lookupAsFile(uri, false);
            if (file.id != -1) {
                vscode.window.showErrorMessage("This file already exists in wiki! id is:" + file.id + ".");
            }
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage("This file cannot be found in wiki!");
            return;
        }
        uploadWikiNewInner(title as string, path, endfix, (file as File).data?.toString() as string).then((value: any) => {
            memFs.writeFile(uri, Buffer.from(value.pages.create.page.content as string), { create: false, overwrite: true, id: value.pages.create.page.id, isInit: false });
        });
    } else {
        wsutils.readFile(path).then((buffer) => {
            let filePath = path as string;
            vscode.workspace.workspaceFolders?.forEach(element => {
                const workspaceRootPath = element.uri.path;
                if (workspaceRootPath != "/" && filePath.includes(workspaceRootPath)) {
                    const rootName = workspaceRootPath.split("/").pop();
                    filePath = rootName + filePath.replace(workspaceRootPath, "");
                }
            });

            uploadWikiNewInner(title as string, filePath, endfix, buffer.toString());
        }, (reason: any) => {
            console.error(reason);
            vscode.window.showErrorMessage("Failed to read the file!");
        });
    }
}

async function uploadWikiNewInner(title: string, filePath: string, endfix: string, content: string) {
    content = content.replace(/\n/g, "\\n");
    if (content == "") {
        content = "#";
    }
    filePath = filePath.replace(endfix, "");
    return createWikiNewFile(content, "", filePath, title as string).then((value: any) => {
        const responseResult = value.pages.create.responseResult;
        if (!responseResult.succeeded) {
            vscode.window.showErrorMessage("Upload file error! " + responseResult.message);
        } else {
            vscode.window.showInformationMessage("Upload file succeeded: " + filePath.split("/").pop());
        }
        return value;
    }, (reason: any) => {
        console.error(reason);
        vscode.window.showErrorMessage("Failed to upload files!");
    });
}
