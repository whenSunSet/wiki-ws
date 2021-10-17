import * as vscode from "vscode";
import { File, MemFS } from "./fileSystemProvider";
import { quickOpen, FileItem, queryWikiFileListInner } from "./quickOpen";
import { queryWikiFromId, createWikiNewFile, deleteFileFromWiki, uploadAssetToWiki, createAssetFolder, getFolderIdFromName } from "./gql";
import * as wsutils from "./wsutils";
import { multiStepInput, State } from "./multiStepInput";
import * as path from "path";
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log("wiki extension activate");
    if (wsutils.settingFileExist()) {
        wsutils.initSetting();
    }

    const memFs = new MemFS();
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider("wiki", memFs, { isCaseSensitive: true }));

    let fileStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
    fileStatusBar.command = "wiki.uploadFileToWiki";
    context.subscriptions.push(fileStatusBar);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        let editor = vscode.window.activeTextEditor;
        const uri = editor?.document.uri;
        if (uri == undefined || uri.scheme != "wiki" || !(uri.path as string).endsWith(".md")) {
            fileStatusBar.hide();
            return
        } else {
            fileStatusBar.show()
        }
        let file: any = undefined;
        try {
            file = memFs.lookupAsFile(uri, false);
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage("This file cannot be found in wiki!");
            return;
        }
        if (file.id != -1 && file.id != undefined) {
            fileStatusBar.hide()
        } else {
            fileStatusBar.show()
            fileStatusBar.text = "<<不存在于(Not exists in)Wik.js, 点击上传(Click to upload)>>";
        }
    }))

    let initWikiStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(initWikiStatusBarItem);
    context.subscriptions.push(vscode.commands.registerCommand("wiki.initWiki", _ => {
        console.log("wiki initWiki");
        if (!wsutils.settingFileExist()) {
            multiStepInput().then((state: State) => {
                console.log("wiki initWiki input finish state:" + state);
                if (state.wikiIsDeployed.toLowerCase() == wsutils.yes) {
                    console.log("wiki initWiki wiki deployed!");
                    initWikiCreateLocal(state.wikiUrl, state.authorizationKey)
                    const importantInfoUri = vscode.Uri.parse(`wiki:/ImportantInfo重要信息`);
                    memFs.writeFile(importantInfoUri, Buffer.from(wsutils.IMPORTANT_INFO_EASY), { create: true, overwrite: true, id: -1, isInit: true });
                    vscode.workspace.openTextDocument(importantInfoUri).then((document: vscode.TextDocument) => {
                        vscode.window.showTextDocument(document);
                    });
                } else {
                    let inputDirPath = state.savedDirPathIfNotDeploy;
                    if (inputDirPath == "" || inputDirPath == undefined) {
                        inputDirPath = wsutils.mkdirSettingDir();
                    } else {
                        if (!fs.existsSync(inputDirPath)) {
                            fs.mkdirSync(inputDirPath);
                        }
                    }
                    vscode.window.showInformationMessage("Wiki.js 的部署将在后台进行，具体进度可以看右下角的状态栏(Wiki.js will be deployed in the background. See the status bar in the lower right corner for the specific progress)");
                    vscode.window.showInformationMessage("部署Wiki.js预计需要几分钟到十几分钟，请勿关闭vscode(It is estimated that deploying wiki.js will take several to more than ten minutes. Do not close vscode)");
                    initWikiStatusBarItem.show()
                    initWikiStatusBarItem.text = "Wiki data downloading(Wiki数据下载中)1/5......";
                    wsutils.prepareWikiInitData(inputDirPath, (downloadZipPath: string) => {
                        initWikiStatusBarItem.text = "Wiki data downloaded, unzipping(Wiki数据下载完毕, Wiki数据解压中)2/5......";
                    }, (downloadDataDirPath: string) => {
                        initWikiStatusBarItem.text = "Wiki data unzipped, old wiki docker clearing(Wiki数据解压完毕, 老Wiki程序清理中)3/5......";
                        wsutils.clearWikiDocker((error, stdout, stderr) => {
                            initWikiStatusBarItem.text = "Old wiki docker cleared(老Wiki程序清理完毕)3/5......";
                            wsutils.fetchWikiDocker((error, stdout, stderr, isFinished: boolean) => {
                                console.log(stdout + stderr)
                                initWikiStatusBarItem.text = "Wiki docker image one fetching(Wiki镜像一获取中, 预计需要几分钟到十几分钟)4/5......";
                                if (isFinished) {
                                    initWikiStatusBarItem.text = "Wiki docker image one fetched(Wiki镜像一获取完毕)4/5......";
                                    wsutils.fetchPostsqlDocker((error, stdout, stderr, isFinished: boolean) => {
                                        initWikiStatusBarItem.text = "Wiki docker image two fetching(Wiki镜像二获取中, 预计需要几分钟到十几分钟)5/5......";
                                        if (isFinished) {
                                            initWikiStatusBarItem.text = "Wiki docker image two fetched(Wiki镜像二获取完毕)5/5......";
                                            console.log(stdout + stderr)
                                            wsutils.wikiDockerRun(downloadDataDirPath, (error, stdout, stderr) => {
                                                if (error != null && stderr != "") {
                                                    vscode.window.showInformationMessage("不好意思，Wiki.js部署失败!!(Sorry, wiki.js deployment failed)");
                                                    vscode.window.showInformationMessage("请检查Docker是否安装成功、网络环境是否存在问题，检查完毕之后可以重新进行 Wiki.js 的部署。(Please check whether docker is successfully installed and whether there are problems in the network environment. After checking, you can deploy wiki.js again.)");
                                                    console.log(stdout + stderr)
                                                } else {
                                                    vscode.window.showInformationMessage("恭喜您, Wiki.js部署成功, 请阅读 重要信息 文件(Congratulation wiki deployed, Please read ImportantInfo file)");
                                                    initWikiCreateLocal(wsutils.DEFAULT_WIKI_MAIN_URL, wsutils.DEFAULT_WIKI_AUTHORIZATION)
                                                    console.log(stdout + stderr)
                                                    const importantInfoUri = vscode.Uri.parse(`wiki:/ImportantInfo重要信息`);
                                                    memFs.writeFile(importantInfoUri, Buffer.from(wsutils.buildImportantInfo(inputDirPath)), { create: true, overwrite: true, id: -1, isInit: true });
                                                    vscode.workspace.openTextDocument(importantInfoUri).then((document: vscode.TextDocument) => {
                                                        vscode.window.showTextDocument(document);
                                                    });
                                                }
                                            })
                                        }
                                    })
                                }
                            })
                        });
                    }, (reason: any) => {
                        if (reason == true) {
                            wsutils.deleteWikiInitDataDir(inputDirPath);
                            wsutils.deleteWikiInitDataZip(inputDirPath);
                        } else {
                            wsutils.deleteWikiInitDataZip(inputDirPath);
                        }
                    })
                }
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
        queryWikiFileListInner(dirUri.path.replace("/", ""), (fileList: Array<FileItem>) => {
            fileList.forEach((element: FileItem) => {
                queryWikiFromIdInner(element, memFs);
            });
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadFileToWiki", (uri) => {
        let fileUri = uri;
        if (fileUri == undefined) {
            let editor = vscode.window.activeTextEditor;
            fileUri = editor?.document.uri;
            if (fileUri == undefined || fileUri.scheme != "wiki") {
                return
            }
            fileStatusBar.hide();
        }
        console.log("wiki uploadFileToWiki path:" + fileUri.path);
        if (!checkConfigFile()) {
            return;
        }
        uploadWikiNewFile(fileUri, fileUri.path, memFs);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadFilesInDirToWiki", dirUri => {
        console.log("wiki uploadFilesInDirToWiki path:" + dirUri.path);
        if (!checkConfigFile()) {
            return;
        }
        if (dirUri.scheme == "wiki") {
            memFs.fileWalk(dirUri, (filePath: string) => {
                const uploadFileUri = vscode.Uri.parse(`wiki:${filePath}`);
                console.log("wiki uploadFilesInDirToWiki fileWalk rootDirPath:" + dirUri.path + ",filePath:" + filePath);
                uploadWikiNewFile(uploadFileUri, filePath, memFs);
            });

        } else {
            wsutils.walkFileSync(dirUri.path, (filePath: string) => {
                console.log("wiki uploadFilesInDirToWiki walkFileSync rootDirPath:" + dirUri.path + ",filePath:" + filePath);
                uploadWikiNewFile(dirUri, filePath, memFs);
            });
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.deleteFileFromWiki", (uri) => {
        deleteFileFromWikiInner(memFs, uri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.deleteDirFileFromWiki", (dirUri) => {
        console.log("wiki deleteDirFileFromWiki path:" + dirUri.path);
        vscode.window.showInputBox({ placeHolder: "print yes or no(输入yes或者no)", prompt: "Confirm deletion(确认删除吗)?" }).then((value: string | undefined) => {
            console.log("wiki deleteDirFileFromWiki print:" + value);
            if (value?.toLowerCase() != wsutils.yes) {
                return;
            }
            memFs.fileWalk(dirUri, (filePath: string) => {
                console.log("wiki deleteDirFileFromWiki walkFileSync rootDirPath:" + dirUri.path + ",filePath:" + filePath);
                const deleteFileUri = vscode.Uri.parse(`wiki:${filePath}`);
                deleteFileFromWikiInner(memFs, deleteFileUri);
            });
            memFs.delete(dirUri);
        });
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

function initWikiCreateLocal(mainUrl: string, authorization: string) {
    console.log("mainUrl:" + mainUrl + ",authorization:" + authorization);
    wsutils.createSettingFile(mainUrl, authorization);
    vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse("wiki:/"), name: "wiki" });
    vscode.window.showInformationMessage("The configuration file is initialized! path in:" + wsutils.getSettingFilePath());
    wsutils.initSetting();
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

function queryWikiFromIdInner(fileItem: FileItem, memFs: MemFS) {
    queryWikiFromId(fileItem.id).then((data: any) => {
        let content = JSON.stringify(data.pages.single.content, undefined, 2);
        content = content.substring(1, content.length - 1);
        content = content.replace(/\\n/g, "\n");
        content = content.replace(/\\"/g, `"`);
        content = content.replace(/\\\\/g, `\\`);
        let parentDir = path.posix.dirname(fileItem.wikiPath);
        if (parentDir == "." || parentDir == undefined) {
            parentDir = ""
        }
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
    const title = path.split("/").pop()?.replace(".md", "");
    if (title?.indexOf(".") != -1) {
        vscode.window.showErrorMessage("File name could not contain '.'(文件名不能包含'.'等异常字符)");
        return
    }
    if (title?.indexOf("_") != -1) {
        vscode.window.showErrorMessage("File name could not contain '_'(文件名不能包含下划线等异常字符)");
        return
    }
    if (title?.indexOf(" ") != -1) {
        vscode.window.showErrorMessage("File name could not contain space(文件名不能包含空格等异常字符)");
        return
    }
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
    content = content.replace(/\\/g, `\\\\`);
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
