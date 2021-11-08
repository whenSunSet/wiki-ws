import * as vscode from "vscode";
import { File, MemFS } from "./fileSystemProvider";
import { quickOpen, FileItem, queryWikiFileListInner } from "./quickOpen";
import { queryWikiFromId, createWikiNewFile, deleteFileFromWiki, uploadAssetToWiki, createAssetFolder, getFolderIdFromName } from "./gql";
import * as wsutils from "./wsutils";
import { multiStepInput, State } from "./multiStepInput";
import * as path from "path";
import * as fs from 'fs';
const opn = require('opn');
export function activate(context: vscode.ExtensionContext) {
    console.log("wiki extension activate");
    if (wsutils.settingFileExist()) {
        wsutils.initSetting();
    }

    const uploadedFileStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
    context.subscriptions.push(uploadedFileStatusBar);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        const editor = vscode.window.activeTextEditor;
        const uri = editor?.document.uri;
        if (uri == undefined || uri.scheme != "wiki" || !(uri.path as string).endsWith(".md")) {
            uploadedFileStatusBar.hide();
            return;
        } else {
            uploadedFileStatusBar.show();
        }
        let file: any = undefined;
        try {
            file = wikiFs.lookupAsFile(uri, false);
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage("Wiki中找不到这个文件(This file cannot be found in wiki!)");
            return;
        }
        if (file.id != -1 && file.id != undefined) {
            uploadedFileStatusBar.show();
            if (file.data.toString() != file.dataRemote.toString()) {
                uploadedFileStatusBar.text = "未保存至Wiki.js";
            } else {
                uploadedFileStatusBar.text = "已保存至Wiki.js";
            }
        } else {
            uploadedFileStatusBar.hide();
        }
    }));

    const wikiFs = new MemFS(uploadedFileStatusBar, undefined);
    context.subscriptions.push(vscode.workspace.registerFileSystemProvider("wiki", wikiFs, { isCaseSensitive: true }));

    const fileStatusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
    fileStatusBar.command = "wiki.uploadFileToWiki";
    context.subscriptions.push(fileStatusBar);
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(() => {
        wikiFs.activeFile = undefined;
        const editor = vscode.window.activeTextEditor;
        const uri = editor?.document.uri;
        if (uri == undefined || uri.scheme != "wiki" || !(uri.path as string).endsWith(".md")) {
            fileStatusBar.hide();
            openInWikiJsBar.hide();
            return;
        } else {
            fileStatusBar.show();
            openInWikiJsBar.show();
        }
        let file: any = undefined;
        try {
            file = wikiFs.lookupAsFile(uri, false);
            wikiFs.activeFile = file;
        } catch (error) {
            wikiFs.activeFile = undefined;
            console.error(error);
            vscode.window.showErrorMessage("Wiki中找不到这个文件(This file cannot be found in wiki!)");
            return;
        }
        if (file.id != -1 && file.id != undefined) {
            fileStatusBar.hide();
            openInWikiJsBar.show();
            openInWikiJsBar.text = "<<点击在Wiki.js中打开(Open in Wiki.js)>>";
        } else {
            fileStatusBar.show();
            openInWikiJsBar.hide();
            fileStatusBar.text = "<<不存在于(Not exists in)Wik.js, 点击上传(Click to upload)>>";
        }
    }));

    const openInWikiJsBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 1);
    openInWikiJsBar.command = "wiki.openInWikiJS";
    context.subscriptions.push(openInWikiJsBar);
    context.subscriptions.push(vscode.commands.registerCommand("wiki.openInWikiJS", dirUri => {
        const editor = vscode.window.activeTextEditor;
        const uri = editor?.document.uri;
        if (uri == undefined || uri.scheme != "wiki" || !(uri.path as string).endsWith(".md")) {
            return;
        }
        const url = wsutils.wikiBlogUrl + uri.path;
        opn(url);
    }));

    const initWikiStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    context.subscriptions.push(initWikiStatusBarItem);

    if (wsutils.initWikiWhenStartVscode && !wsutils.hasWikiWorkspace()) {
        initWiki(initWikiStatusBarItem, undefined);
    }

    context.subscriptions.push(vscode.commands.registerCommand("wiki.initWiki", _ => {
        initWiki(initWikiStatusBarItem, false);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.initWikiWindows", _ => {
        initWiki(initWikiStatusBarItem, true);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.clearWiki", _ => {
        const exist = wsutils.settingFileExist();
        if (!exist) {
            vscode.window.showErrorMessage("Wiki还没有初始化，不需要清理(The wiki is not initialized)!");
            return;
        }
        vscode.window.showInputBox({ placeHolder: "输入yes或者no(print yes or no)", prompt: "确认清理吗？Wiki.js将会需要重新部署。(Confirm clear)?" }).then((value: string | undefined) => {
            console.log("wiki deleteDirFileFromWiki print:" + value);
            if (value?.toLowerCase() != wsutils.yes) {
                return;
            }
            fs.unlinkSync(wsutils.getSettingFilePath());
            fs.unlinkSync(wsutils.getCacheFilePath());
            vscode.window.showInformationMessage("配置文件清理完毕(Setting file cleared)!");
            if (wsutils.inputDockerDir != "" && wsutils.inputDockerDir != undefined) {
                wsutils.moveWikiInitDataDirToOld(wsutils.inputDockerDir);
                wsutils.deleteWikiInitDataZip(wsutils.inputDockerDir);
                wsutils.clearWikiDocker((error, stdout, stderr) => {
                    vscode.window.showInformationMessage("Wiki程序清理完毕(Wiki program has been cleaned up)!");
                    vscode.workspace.updateWorkspaceFolders(0,1);
                });
            }
        });
    }));

    if (wsutils.openSearchWhenInit) {
        wsutils.createCacheFile(false);
        searchInWiki(wikiFs);
    }
    context.subscriptions.push(vscode.commands.registerCommand("wiki.searchInWiki", _ => {
        console.log("wiki searchInWiki");
        if (!checkConfigFile()) {
            return;
        }
        if (!wsutils.hasWikiWorkspace()) {
            wsutils.createCacheFile(true);
            initWiki(initWikiStatusBarItem, undefined);
            return;
        }
        searchInWiki(wikiFs);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.fetchAllFileFromWikiInDir", dirUri => {
        console.log("wiki fetchAllFileFromWikiInDir");
        if (!checkConfigFile()) {
            return;
        }
        queryWikiFileListInner(dirUri.path.replace("/", ""), (fileList: Array<FileItem>) => {
            let index = 0;
            fileList.forEach((element: FileItem) => {
                setTimeout(() => {
                    vscode.window.showInformationMessage("文件拉取完毕(Fetched):" + element.fileName);
                    queryWikiFromIdInner(element, wikiFs);
                }, index * wsutils.FETCHING_TIME);
                index = index + 1;
            });
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadFileToWiki", (uri) => {
        let fileUri = uri;
        if (fileUri == undefined) {
            const editor = vscode.window.activeTextEditor;
            fileUri = editor?.document.uri;
            if (fileUri == undefined || fileUri.scheme != "wiki") {
                return;
            }
            fileStatusBar.hide();
        }
        console.log("wiki uploadFileToWiki path:" + fileUri.path);
        if (!checkConfigFile()) {
            return;
        }
        let finalFilePath = fileUri.path;
        if (wsutils.isWindows) {
            finalFilePath = finalFilePath.slice(1);
        }
        uploadWikiNewFile(fileUri, fileUri.path, wikiFs);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.uploadFilesInDirToWiki", dirUri => {
        console.log("wiki uploadFilesInDirToWiki path:" + dirUri.path);
        if (!checkConfigFile()) {
            return;
        }
        if (dirUri.scheme == "wiki") {
            let index = 0;
            wikiFs.fileWalk(dirUri, (filePath: string) => {
                const uploadFileUri = vscode.Uri.parse(`wiki:${filePath}`);
                console.log("wiki uploadFilesInDirToWiki fileWalk rootDirPath:" + dirUri.path + ",filePath:" + filePath);
                setTimeout(() => {
                    vscode.window.showInformationMessage("文件上传中(Uploading):" + filePath);
                    uploadWikiNewFile(uploadFileUri, filePath, wikiFs);
                }, index * wsutils.UPLOADING_TIME);
                index = index + 1;
            });

        } else {
            let finalDirFilePath = dirUri.path;
            if (wsutils.isWindows) {
                finalDirFilePath = finalDirFilePath.slice(1);
            }
            let index = 0;
            wsutils.walkFileSync(finalDirFilePath, (filePath: string) => {
                console.log("wiki uploadFilesInDirToWiki walkFileSync rootDirPath:" + dirUri.path + ",filePath:" + filePath);
                let finalFilePath = filePath;
                if (wsutils.isWindows) {
                    finalFilePath = finalFilePath.replace(/\\/g, "/");
                }
                setTimeout(() => {
                    vscode.window.showInformationMessage("文件上传中(Uploading):" + filePath);
                    uploadWikiNewFile(dirUri, finalFilePath, wikiFs);
                }, index * wsutils.UPLOADING_TIME);
                index = index + 1;
            });
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.deleteFileFromWiki", (uri) => {
        if (!checkConfigFile()) {
            return;
        }
        deleteFileFromWikiInner(wikiFs, uri);
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.deleteDirFileFromWiki", (dirUri) => {
        console.log("wiki deleteDirFileFromWiki path:" + dirUri.path);
        if (!checkConfigFile()) {
            return;
        }
        vscode.window.showInputBox({ placeHolder: "输入yes或者no(print yes or no)", prompt: "确认删除吗(Confirm deletion)?" }).then((value: string | undefined) => {
            console.log("wiki deleteDirFileFromWiki print:" + value);
            if (value?.toLowerCase() != wsutils.yes) {
                return;
            }
            let index = 0;
            wikiFs.fileWalk(dirUri, (filePath: string) => {
                console.log("wiki deleteDirFileFromWiki walkFileSync rootDirPath:" + dirUri.path + ",filePath:" + filePath);
                const deleteFileUri = vscode.Uri.parse(`wiki:${filePath}`);
                setTimeout(() => {
                    vscode.window.showInformationMessage("文件删除中(Deleting):" + filePath);
                    deleteFileFromWikiInner(wikiFs, deleteFileUri);
                }, index * wsutils.DELETING_TIME);
                index = index + 1;
            });
        });
    }));

    context.subscriptions.push(vscode.commands.registerCommand("wiki.enableInitWikiWhenStartVscode", (dirUri) => {
        console.log("wiki enableInitWikiWhenStartVscode");
        if (!checkConfigFile()) {
            return;
        }
        vscode.window.showInputBox({ placeHolder: "输入yes或者no(print yes or no)", prompt: "确认启动vscode时就初始化插件吗(Confirm init extension when start vscode)?" }).then((value: string | undefined) => {
            console.log("wiki enableInitWikiWhenStartVscode print:" + value);
            if (value?.toLowerCase() != wsutils.yes) {
                return;
            }
            wsutils.createSettingFile(wsutils.wikiUrl, wsutils.authorization.replace("Bearer ", ""), wsutils.inputDockerDir, wsutils.isWindows, true);
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
                        vscode.window.showInformationMessage("目录创建失败(Directory create error):" + responseResult.message);
                    } else {
                        vscode.window.showInformationMessage("目录创建成功(Directory created successfully):" + parentDirNameRemote);
                        getFolderIdFromName(parentDirNameRemote.toLowerCase()).then((folderId: number) => {
                            if (folderId == undefined) {
                                vscode.window.showErrorMessage("目录ID获取失败(Failed to get the directory ID):" + parentDirNameRemote);
                            } else {
                                uploadAssetToWikiInner(uri.path, folderId, parentDirNameRemote);
                            }
                        }, (reason: any) => {
                            console.error(reason);
                            vscode.window.showErrorMessage("目录ID获取失败(Failed to get the directory ID):" + parentDirNameRemote);
                        });
                    }
                }, (reason: any) => {
                    console.error(reason);
                    vscode.window.showErrorMessage("目录创建失败(Failed to create directory):" + parentDirNameRemote);
                });
            } else {
                uploadAssetToWikiInner(uri.path, folderId, parentDirNameRemote);
            }
        }, (reason: any) => {
            console.error(reason);
            vscode.window.showErrorMessage("目录ID获取失败(Failed to get the directory ID):" + parentDirName);
        });
    }));


}

function searchInWiki(wikiFs: MemFS) {
    quickOpen().then((fileItem: FileItem | undefined) => {
        if (fileItem) {
            console.log("wiki searchInWiki open file:" + fileItem);
            queryWikiFromIdInner(fileItem, wikiFs);
        }
    }, (reason) => {
        console.error(reason);
        vscode.window.showErrorMessage("搜索失败(Wiki search error)!");
    });
}

function initWiki(initWikiStatusBarItem: vscode.StatusBarItem, isWindows: boolean | undefined) {
    console.log("wiki initWiki");
    if (!wsutils.settingFileExist()) {
        multiStepInput().then((state: State) => {
            console.log("wiki initWiki input finish state:" + state);
            if (state.wikiIsDeployed.toLowerCase() == wsutils.yes) {
                console.log("wiki initWiki wiki deployed!");
                initWikiCreateLocal(state.wikiUrl, state.authorizationKey, "", isWindows, false);
                opn(wsutils.WIKI_SIMPLE_INFO_URL);
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
                initWikiStatusBarItem.show();
                initWikiStatusBarItem.text = "Wiki数据下载中(Wiki data downloading)1/5......";
                wsutils.prepareWikiInitData(inputDirPath, (downloadZipPath: string) => {
                    initWikiStatusBarItem.text = "Wiki数据下载完毕, Wiki数据解压中(Wiki data downloaded, unzipping)2/5......";
                }, (downloadDataDirPath: string) => {
                    initWikiStatusBarItem.text = "Wiki数据解压完毕, 老Wiki程序清理中(Wiki data unzipped, old wiki docker clearing)3/5......";
                    wsutils.clearWikiDocker((error, stdout, stderr) => {
                        initWikiStatusBarItem.text = "老Wiki程序清理完毕(Old wiki docker cleared)3/5......";
                        wsutils.fetchWikiDocker((error, stdout, stderr, isFinished: boolean) => {
                            console.log(stdout + stderr);
                            initWikiStatusBarItem.text = "Wiki镜像一获取中, 预计需要几分钟到十几分钟(Wiki docker image one fetching)4/5......";
                            if (isFinished) {
                                initWikiStatusBarItem.text = "Wiki镜像一获取完毕(Wiki docker image one fetched)4/5......";
                                wsutils.fetchPostsqlDocker((error, stdout, stderr, isFinished: boolean) => {
                                    initWikiStatusBarItem.text = "Wiki镜像二获取中, 预计需要几分钟到十几分钟(Wiki docker image two fetching)5/5......";
                                    if (isFinished) {
                                        initWikiStatusBarItem.text = "Wiki镜像二获取完毕(Wiki docker image two fetched)5/5......";
                                        console.log(stdout + stderr);
                                        wsutils.wikiDockerRun(downloadDataDirPath, (error, stdout, stderr) => {
                                            if (error != null && stderr != "") {
                                                opn(wsutils.WIKI_FAILED_INFO_URL);
                                                vscode.window.showInformationMessage("不好意思，Wiki.js部署失败!!(Sorry, wiki.js deployment failed)");
                                                vscode.window.showInformationMessage("请检查Docker是否安装成功、网络环境是否存在问题，检查完毕之后可以重新进行 Wiki.js 的部署。(Please check whether docker is successfully installed and whether there are problems in the network environment. After checking, you can deploy wiki.js again.)");
                                                console.log(stdout + stderr);
                                            } else {
                                                vscode.window.showInformationMessage("恭喜您, Wiki.js部署成功, 请阅读 重要信息 文件(Congratulation wiki deployed, Please read ImportantInfo file)");
                                                initWikiCreateLocal(wsutils.DEFAULT_WIKI_MAIN_URL, wsutils.DEFAULT_WIKI_AUTHORIZATION, inputDirPath, isWindows, false);
                                                console.log(stdout + stderr);
                                                opn(wsutils.WIKI_IMPORTANT_INFO_URL);
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    });
                }, (reason: any) => {
                    if (reason == true) {
                        wsutils.deleteWikiInitDataDir(inputDirPath);
                        wsutils.deleteWikiInitDataZip(inputDirPath);
                    } else {
                        wsutils.deleteWikiInitDataZip(inputDirPath);
                    }
                });
            }
        }, (reason: any) => {
            console.error(reason);
            vscode.window.showErrorMessage("Wiki插件初始化失败(Failed to initialize the Wiki.ws configuration file)!");
        });
    } else {
        initWikiCreateLocal(wsutils.wikiUrl, wsutils.authorization.replace("Bearer ", ""), wsutils.inputDockerDir, isWindows, false);
    }
}

function initWikiCreateLocal(mainUrl: string, authorization: string, inputDockerDir: string, isWindows: boolean | undefined, initWikiWhenStartVscode: boolean) {
    console.log("mainUrl:" + mainUrl + ",authorization:" + authorization + ",inputDockerDir:" + inputDockerDir);
    wsutils.createSettingFile(mainUrl, authorization, inputDockerDir, isWindows, initWikiWhenStartVscode);
    wsutils.createCacheFile(wsutils.openSearchWhenInit);
    vscode.workspace.updateWorkspaceFolders(0, 0, { uri: vscode.Uri.parse("wiki:/"), name: "wiki" });
    wsutils.initSetting();
}

function uploadAssetToWikiInner(path: string, folderId: number, parentDirName: string) {
    uploadAssetToWiki(path as string, folderId, parentDirName);
}

function checkConfigFile(): boolean {
    const exist = wsutils.settingFileExist();
    if (!exist) {
        vscode.window.showErrorMessage("Wiki配置没有初始化，请调用命令(The configuration file is not initialized! Please call the):InitWiki");
        return exist;
    } else {
        return wsutils.checkWikiDockerAliveAndRestart();
    }
}

function queryWikiFromIdInner(fileItem: FileItem, memFs: MemFS) {
    queryWikiFromId(fileItem.id).then((data: any) => {
        let content = JSON.stringify(data.pages.single.content, undefined, 2);
        content = content.substring(1, content.length - 1);
        content = content.replace(wsutils.WIKI_NEW_LINE_FORMAT, wsutils.SYSTEM_NEW_LINE);
        content = content.replace(/\\"/g, `"`);
        content = content.replace(/\\\\/g, `\\`);
        let parentDir = path.posix.dirname(fileItem.wikiPath);
        if (parentDir == "." || parentDir == undefined) {
            parentDir = "";
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
        vscode.window.showErrorMessage("查找Wiki文件失败(Query wiki from id error)");
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
        vscode.window.showErrorMessage("文件不存在于Wiki中(This file cannot be found in wiki)");
        return;
    }
    console.log("wiki deleteFileFromWiki file:" + file.valueOf() + ",path:" + uri.path);
    if (!checkConfigFile()) {
        return;
    }
    deleteFileFromWiki(file.id).then((value: any) => {
        const responseResult = value.pages.delete.responseResult;
        if (!responseResult.succeeded) {
            vscode.window.showInformationMessage("文件删除失败(File delete error):" + responseResult.message);
        } else {
            vscode.window.showInformationMessage("文件删除成功(File deleted successfully):" + file.name);
        }
        memFs.delete(uri);
    }, (reason: any) => {
        console.error(reason);
        vscode.window.showErrorMessage("文件删除失败(Failed to delete a file)");
    });
}

function uploadWikiNewFile(uri: any, path: string, memFs: MemFS) {
    const scheme = uri.scheme;
    const title = path.split("/").pop()?.replace(".md", "");
    if (title?.indexOf(".") != -1) {
        vscode.window.showErrorMessage("文件名不能包含'.'等异常字符(File name could not contain '.')");
        return;
    }
    if (title?.indexOf("_") != -1) {
        vscode.window.showErrorMessage("文件名不能包含下划线等异常字符(File name could not contain '_')");
        return;
    }
    if (title?.indexOf(" ") != -1) {
        vscode.window.showErrorMessage("文件名不能包含空格等异常字符(File name could not contain space)");
        return;
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
                vscode.window.showErrorMessage("文件已存在(This file already exists in wiki):" + file.id);
            }
        } catch (error) {
            console.error(error);
            vscode.window.showErrorMessage("文件不存在与Wiki中(This file cannot be found in wiki)");
            return;
        }
        uploadWikiNewInner(title as string, path, endfix, (file as File).data?.toString() as string).then((value: any) => {
            memFs.writeFile(uri, Buffer.from(value.pages.create.page.content as string), { create: false, overwrite: true, id: value.pages.create.page.id, isInit: false });
        });
    } else {
        wsutils.readFile(path).then((buffer) => {
            let filePath = path as string;
            vscode.workspace.workspaceFolders?.forEach(element => {
                let workspaceRootPath = element.uri.path;
                if (wsutils.isWindows) {
                    workspaceRootPath = workspaceRootPath.slice(1);
                }
                if (workspaceRootPath != "/" && filePath.includes(workspaceRootPath)) {
                    const rootName = workspaceRootPath.split("/").pop();
                    filePath = rootName + filePath.replace(workspaceRootPath, "");
                }
            });

            uploadWikiNewInner(title as string, filePath, endfix, buffer.toString());
        }, (reason: any) => {
            console.error(reason);
            vscode.window.showErrorMessage("读取文件失败(Failed to read the file)");
        });
    }
}

async function uploadWikiNewInner(title: string, filePath: string, endfix: string, content: string) {
    content = content.replace(/\\/g, `\\\\`);
    content = content.replace(wsutils.SYSTEM_NEW_LINE_FORMAT, wsutils.WIKI_NEW_LINE);
    if (content == "") {
        content = "#";
    }
    filePath = filePath.replace(endfix, "");
    return createWikiNewFile(content, "", filePath, title as string).then((value: any) => {
        const responseResult = value.pages.create.responseResult;
        if (!responseResult.succeeded) {
            vscode.window.showErrorMessage("文件上传失败(Upload file error):" + responseResult.message);
        } else {
            vscode.window.showInformationMessage("文件上传成功(Upload file succeeded):" + filePath.split("/").pop());
        }
        return value;
    }, (reason: any) => {
        console.error(reason);
        vscode.window.showErrorMessage("文件上传失败(Failed to upload files)");
    });
}
