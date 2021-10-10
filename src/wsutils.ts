// This file promisifies necessary file system functions. 
// This should be removed when VS Code updates to Node.js ^11.14 and replaced by the native fs promises.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from "path";
import * as os from "os";
import * as ini from "ini";
import { GraphQLClient, gql } from "graphql-request";

export function mkdirSettingDir(): string {
	const settingPath = os.homedir() + "/.Wiki-WS";
	if (!fs.existsSync(settingPath)) {
		fs.mkdirSync(settingPath);
	}
	return settingPath;
}

function getSettingFileName():string {
	return "setting.ini"; 
}

export function getSettingFilePath():string {
	const filePath = mkdirSettingDir() + "/" + getSettingFileName();
	return filePath;
}

export let gqlUrl = "";
export let imageUploadUrl = "";
export let authorization = "";
export let graphQLClient: any = undefined;
export let wikiUrl = "";

export function settingFileExist(): boolean {
	return fs.existsSync(getSettingFilePath());
}

export function initSetting(){
	initRequest(ini.parse(fs.readFileSync(getSettingFilePath(), 'utf-8')));
}

export function initRequest(config:any) {
	wikiUrl = config.base.wikiUrl;
	gqlUrl = config.base.wikiUrl + "/graphql";
	imageUploadUrl = config.base.wikiUrl + "/u";
	authorization = "Bearer " + config.base.authorization_key;
	graphQLClient = new GraphQLClient(gqlUrl, {
		headers: {
			authorization: authorization,
		},
	});
	console.log("config check gqlUrl:" + gqlUrl + ",imageUploadUrl:" + imageUploadUrl + ",authorization:" + authorization);
}

export function createSettingFile(url: string, authorizationKey: string) {
	const config = {
		base: {
			"wikiUrl": url,
			"authorization_key": authorizationKey,
		}
	};
	fs.writeFileSync(getSettingFilePath(), ini.stringify(config, ""));
}

function handleResult<T>(resolve: (result: T) => void, reject: (error: Error) => void, error: Error | null | undefined, result: T): void {
	if (error) {
		reject(massageError(error));
	} else {
		resolve(result);
	}
}


function massageError(error: Error & { code?: string }): Error {
	if (error.code === 'ENOENT') {
		return vscode.FileSystemError.FileNotFound();
	}

	if (error.code === 'EISDIR') {
		return vscode.FileSystemError.FileIsADirectory();
	}

	if (error.code === 'EEXIST') {
		return vscode.FileSystemError.FileExists();
	}

	if (error.code === 'EPERM' || error.code === 'EACCESS') {
		return vscode.FileSystemError.NoPermissions();
	}

	return error;
}

export function readFile(path: string): Promise<Buffer> {
	return new Promise<Buffer>((resolve, reject) => {
		fs.readFile(path, (error, buffer) => handleResult(resolve, reject, error, buffer));
	});
}

export function writeFile(path: string, content: Buffer): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.writeFile(path, content, error => handleResult(resolve, reject, error, void 0));
	});
}

export function exists(path: string): Promise<boolean> {
	return new Promise<boolean>((resolve, reject) => {
		fs.exists(path, exists => handleResult(resolve, reject, null, exists));
	});
}

export function readdir(path: string): Promise<string[]> {
	return new Promise<string[]>((resolve, reject) => {
		fs.readdir(path, (error, files) => handleResult(resolve, reject, error, files));
	});
}

export function unlink(path: string): Promise<void> {
	return new Promise<void>((resolve, reject) => {
		fs.unlink(path, error => handleResult(resolve, reject, error, void 0));
	});
}

export function walkFileSync(currentDirPath: string, callback: (path: string) => any) {
	fs.readdirSync(currentDirPath).forEach(function (name) {
		const filePath = path.join(currentDirPath, name);
		const stat = fs.statSync(filePath);
		if (stat.isFile()) {
			callback(filePath);
		} else if (stat.isDirectory()) {
			walkFileSync(filePath, callback);
		}
	});
}



/**
 * 获取某个扩展文件相对于webview需要的一种特殊路径格式
 * 形如：vscode-resource:/Users/toonces/projects/vscode-cat-coding/media/cat.gif
 * @param context 上下文
 * @param relativePath 扩展中某个文件相对于根目录的路径，如 images/test.jpg
 */
export function getExtensionFileVscodeResource(context: vscode.ExtensionContext, relativePath: string) {
	const diskPath = vscode.Uri.file(path.join(context.extensionPath, relativePath));
	return diskPath.with({ scheme: 'vscode-resource' }).toString();
}

/**
 * 从某个HTML文件读取能被Webview加载的HTML内容
 * @param {*} context 上下文
 * @param {*} templatePath 相对于插件根目录的html文件相对路径
 */
export function getWebViewContent(context: vscode.ExtensionContext, templatePath: string) {
	const resourcePath = path.join(context.extensionPath, templatePath);
	const dirPath = path.dirname(resourcePath);
	let html = fs.readFileSync(resourcePath, 'utf-8');
	// vscode不支持直接加载本地资源，需要替换成其专有路径格式，这里只是简单的将样式和JS的路径替换
	html = html.replace(/(<link.+?href="|<script.+?src="|<img.+?src=")(.+?)"/g, (m, $1, $2) => {
		return $1 + vscode.Uri.file(path.resolve(dirPath, $2)).with({ scheme: 'vscode-resource' }).toString() + '"';
	});
	return html;
}

const reRegExpChar = /"/g;
const reHasRegExpChar = RegExp(reRegExpChar.source);
/**
 * Escapes the `RegExp` special characters "\", """, "'",
 * "(", ")", "[", "]", "{", "}", and "|" in `string`.
 *
 * @param {string} [string=''] The string to escape.
 * @returns {string} Returns the escaped string.
 *
 */
export function escapeRegExp(string:string) {
  return (string && reHasRegExpChar.test(string))
    ? string.replace(reRegExpChar, '\\$&')
    : (string || '');
}
