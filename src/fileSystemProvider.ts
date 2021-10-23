import * as path from "path";
import * as vscode from "vscode";
import { changeWikiContent } from "./gql";

export class File implements vscode.FileStat {

    id: number
    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    data?: Uint8Array;
    dataRemote?: Uint8Array;

    constructor(name: string) {
        this.type = vscode.FileType.File;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.id = -1
    }
}

export class Directory implements vscode.FileStat {

    type: vscode.FileType;
    ctime: number;
    mtime: number;
    size: number;

    name: string;
    entries: Map<string, File | Directory>;

    constructor(name: string) {
        this.type = vscode.FileType.Directory;
        this.ctime = Date.now();
        this.mtime = Date.now();
        this.size = 0;
        this.name = name;
        this.entries = new Map();
    }
}

export type Entry = File | Directory;

export class MemFS implements vscode.FileSystemProvider {

    root = new Directory("");


    // --- manage file metadata

    constructor(public fileStatus: vscode.StatusBarItem, public activeFile: File | undefined) {

    }

    stat(uri: vscode.Uri): vscode.FileStat {
        console.log("MemFS.stat uri:" + uri);
        return this._lookup(uri, false);
    }

    readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
        const entry = this._lookupAsDirectory(uri, false);
        const result: [string, vscode.FileType][] = [];
        for (const [name, child] of entry.entries) {
            result.push([name, child.type]);
        }
        console.log("MemFS.readDirectory uri:" + uri);
        return result;
    }

    fileWalk(uri: vscode.Uri, callback: (path: string) => any) {
        if (!this.directoryExist(uri)) {
            return;
        }
        for (const [name, type] of this.readDirectory(uri)) {
            if (type == vscode.FileType.Directory) {
                this.fileWalk(vscode.Uri.parse(`wiki:${uri.path + "/" + name}`), callback)
            } else if (type == vscode.FileType.File) {
                callback(`${uri.path + "/" + name}`);
            }
        }
    }

    // --- manage file contents

    readFile(uri: vscode.Uri): Uint8Array {
        console.log("MemFS.readFile uri:" + uri);
        const data = this.lookupAsFile(uri, false).data;
        if (data) {
            return data;
        }
        throw vscode.FileSystemError.FileNotFound();
    }

    writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean, overwrite: boolean, id: number, isInit: boolean }): void {
        console.log("MemFS.writeFile uri:" + uri + ",options:" + options);
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupParentDirectory(uri);
        let entry = parent.entries.get(basename);
        if (entry instanceof Directory) {
            throw vscode.FileSystemError.FileIsADirectory(uri);
        }
        if (!entry && !options.create) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        if (entry && options.create && !options.overwrite) {
            throw vscode.FileSystemError.FileExists(uri);
        }
        if (!entry) {
            entry = new File(basename);
            parent.entries.set(basename, entry);
            this._fireSoon({ type: vscode.FileChangeType.Created, uri });
        }
        entry.mtime = Date.now();
        entry.size = content.byteLength;
        entry.data = content;
        if (options.id != undefined) {
            entry.id = options.id
            entry.dataRemote = entry.data;
        }
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri });
        this.fileStatus.show();
        this.fileStatus.text = "未保存至Wiki.js";
        if (options.isInit != true) {
            Debounced.use(() => {
                this.changeWikiContent(uri, () => {
                    this.fileStatus.text = "已保存至Wiki.js";
                });
            })()
        }
    }

    // --- manage files/folders

    rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean }): void {
        console.log("MemFS.rename oldUri:" + oldUri + ",newUri:" + newUri + ",options:" + options);
        if (!options.overwrite && this._lookup(newUri, true)) {
            throw vscode.FileSystemError.FileExists(newUri);
        }

        const entry = this._lookup(oldUri, false);
        const oldParent = this._lookupParentDirectory(oldUri);

        const newParent = this._lookupParentDirectory(newUri);
        const newName = path.posix.basename(newUri.path);

        oldParent.entries.delete(entry.name);
        entry.name = newName;
        newParent.entries.set(newName, entry);

        this._fireSoon(
            { type: vscode.FileChangeType.Deleted, uri: oldUri },
            { type: vscode.FileChangeType.Created, uri: newUri }
        );
    }

    delete(uri: vscode.Uri): void {
        console.log("MemFS.delete uri:" + uri);
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        const basename = path.posix.basename(uri.path);
        const parent = this._lookupAsDirectory(dirname, false);
        if (!parent.entries.has(basename)) {
            throw vscode.FileSystemError.FileNotFound(uri);
        }
        parent.entries.delete(basename);
        parent.mtime = Date.now();
        parent.size -= 1;
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { uri, type: vscode.FileChangeType.Deleted });
    }

    createDirectory(uri: vscode.Uri): void {
        if (this.directoryExist(uri)) {
            console.log("MemFS.createDirectory dir exist uri:" + uri);
            return
        }
        console.log("MemFS.createDirectory uri:" + uri);
        const basename = path.posix.basename(uri.path);
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        if (!this.parentDirectoryExist(uri)) {
            this.createDirectory(dirname);
        }

        const parent = this._lookupAsDirectory(dirname, false);

        const entry = new Directory(basename);
        parent.entries.set(entry.name, entry);
        parent.mtime = Date.now();
        parent.size += 1;
        this._fireSoon({ type: vscode.FileChangeType.Changed, uri: dirname }, { type: vscode.FileChangeType.Created, uri });
    }

    private parentDirectoryExist(uri: vscode.Uri): boolean {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this.directoryExist(dirname);
    }

    // --- lookup

    private _lookup(uri: vscode.Uri, silent: false): Entry;
    private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined;
    private _lookup(uri: vscode.Uri, silent: boolean): Entry | undefined {
        const parts = uri.path.split("/");
        let entry: Entry = this.root;
        for (const part of parts) {
            if (!part) {
                continue;
            }
            let child: Entry | undefined;
            if (entry instanceof Directory) {
                child = entry.entries.get(part);
            }
            if (!child) {
                if (!silent) {
                    throw vscode.FileSystemError.FileNotFound(uri);
                } else {
                    return undefined;
                }
            }
            entry = child;
        }
        return entry;
    }

    private _lookupAsDirectory(uri: vscode.Uri, silent: boolean): Directory {
        const entry = this._lookup(uri, silent);
        if (entry instanceof Directory) {
            return entry;
        }
        throw vscode.FileSystemError.FileNotADirectory(uri);
    }

    directoryExist(uri: vscode.Uri): boolean {
        const entry = this._lookup(uri, true);
        if (entry instanceof Directory) {
            return true;
        } else {
            return false;
        }
    }

    lookupAsFile(uri: vscode.Uri, silent: boolean): File {
        const entry = this._lookup(uri, silent);
        if (entry instanceof File) {
            return entry;
        }
        throw vscode.FileSystemError.FileIsADirectory(uri);
    }

    private _lookupParentDirectory(uri: vscode.Uri): Directory {
        const dirname = uri.with({ path: path.posix.dirname(uri.path) });
        return this._lookupAsDirectory(dirname, false);
    }

    // --- manage file events

    private _emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
    private _bufferedEvents: vscode.FileChangeEvent[] = [];
    private _fireSoonHandle?: NodeJS.Timer;

    readonly onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = this._emitter.event;

    watch(_resource: vscode.Uri): vscode.Disposable {
        // ignore, fires for all changes...
        return new vscode.Disposable(() => { });
    }

    private _fireSoon(...events: vscode.FileChangeEvent[]): void {
        this._bufferedEvents.push(...events);

        if (this._fireSoonHandle) {
            clearTimeout(this._fireSoonHandle);
        }

        this._fireSoonHandle = setTimeout(() => {
            this._emitter.fire(this._bufferedEvents);
            this._bufferedEvents.length = 0;
        }, 5);
    }

    private changeWikiContent(uri: vscode.Uri, changed: () => void) {
        const file = this.lookupAsFile(uri, false);
        console.log("MemFS.changeWikiContent uri:" + uri + ",file:" + file);
        if (file.id == undefined || file.id == -1) {
            console.log("MemFS.changeWikiContent file not in remote");
            return;
        }
        let content = file.data?.toString();
        if (content == undefined) {
            vscode.window.showErrorMessage("This file content is undefine, error!");
            return;
        }
        const title = file.name.replace(".md", "");
        content = content.replace(/\\/g, `\\\\`);
        content = content.replace(/\n/g, "\\n");
        changeWikiContent(file.id, content, title).then((value: any) => {
            const responseResult = value.pages.update.responseResult;
            if (!responseResult.succeeded) {
                vscode.window.showErrorMessage("Change wiki content error! " + responseResult.message);
            }
            file.dataRemote = file.data
            changed();
            console.log("MemFS.changeWikiContent update success uri:" + uri);
        }, (reason: any) => {
            console.log(reason);
            vscode.window.showErrorMessage("Failed to update wiki content, error!");
        })
    }
}

export class Debounced {

    /**
     * 
     * @param fn 要执行的函数
     * @param awit  时间
     * @param immediate 是否在触发事件后 在时间段n开始，立即执行，否则是时间段n结束，才执行
     */
    static use(fn: Function, awit: number = 2000, immediate: boolean = false) {
        let timer: NodeJS.Timeout | null
        return (...args: any) => {
            if (timer) clearInterval(timer)
            if (immediate) {
                if (!timer) fn(args[0]);
                timer = setTimeout(function () {//n 秒内 多次触发事件,重新计算.timeer 
                    timer = null;//n 秒内没有触发事件 timeer 设置为null，保证了n 秒后能重新触发事件 flag = true = !timmer  
                }, awit)
            } else {
                timer = setTimeout(() => {
                    fn(args[0])
                }, awit)
            }
        }
    }
}