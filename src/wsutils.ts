// This file promisifies necessary file system functions. 
// This should be removed when VS Code updates to Node.js ^11.14 and replaced by the native fs promises.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from "path";
import * as os from "os";
import * as ini from "ini";
import * as child_process from "child_process";
import axios from "axios";
import * as constant from "./constant";
import { GraphQLClient } from "graphql-request";
import * as StreamZip from "node-stream-zip";
import { Readable } from 'form-data';
import * as qs from 'querystring';

export const DEFAULT_WIKI_MAIN_URL = "http://localhost:3344";
export const DEFAULT_WIKI_AUTHORIZATION = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNjM0Mjc4OTEwLCJleHAiOjE2NjU4MzY1MTAsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.Al1rfg-mtQBsWGqdSaMkCFvUDDQOrMUbZlDSRQOLHv97UYu2Fur3-4fEbv32IyMiQUKGK38tYwc5S6a7jyaZNt0DXU43QGYAsGBRfGdTdxWRXd7hcuOQ7WTTzSvI1E3oLpdTmC7rHPJ3b0Jpiqp8FqJVJsqmiMvOcCXKDCmFll3dt0sduqAEeQk9DTgH7epO_XO3FEUXled56SbDZJKlcTMDI_w-tANq5dvT7QIjdyMMS0Kfh_sSN3mlYKwxyUUwFJevzjkJcrgbJUBdqN6j90MDNNR8FWF9NK_fC1Fxsgybc4uzrpSaNsfbcp0H48GhZrKIYJ3F4bCuVmKsbGw03g";
export const WIKI_DATA_ZIP_URL = "http://101.42.99.194:5555/wiki-data-1.zip";
export const WIKI_DATA_ZIP_NAME = "wiki-data.zip";
export const WIKI_DATA_DIR_NAME = "wiki-data";
export const yes = "yes";
export const WIKI_DOCKER = "heshixi-wiki-js-default-deploy";
export const WIKI_DB_DOCKER = "heshixi-wiki-js-db-default-deploy";
export const WIKI_DOCKER_IMAGE = "requarks/wiki:2";
export const WIKI_POSTGRES_IMAGE = "postgres:11-alpine";
export const WIKI_IMPORTANT_INFO_URL = "https://wiki.heshixi.com/zh/Wiki-ws插件/重要提示";
export const WIKI_SIMPLE_INFO_URL = "https://wiki.heshixi.com/zh/Wiki-ws插件/简单提示";
export const WIKI_FAILED_INFO_URL = "https://wiki.heshixi.com/zh/Wiki-ws插件/为什么会失败";
export const WIKI_NEW_LINE = "\\n";
export const UPLOADING_TIME = 1000;
export const DELETING_TIME = 1000;
export const FETCHING_TIME = 500;
export const BATCH_DELETE_ASSET_LIMIT = 5;

export function getTempDir(): string {
	if (isWindows) {
		return os.homedir + "/Downloads";
	} else {
		return getCacheDir() + "/temp";
	}
}

export function getCacheDir(): string {
	const cacheDir = os.homedir() + "/.Wiki-WS";
	console.log("cacheDir:" + cacheDir)
	return cacheDir;
}

export function mkdirSettingDir(): string {
	const settingPathDir = getCacheDir();
	if (!fs.existsSync(settingPathDir)) {
		fs.mkdirSync(settingPathDir);
	}
	return settingPathDir;
}

export function mkdirTempDir(): string {
	const tempDir = getTempDir();
	if (!fs.existsSync(tempDir)) {
		fs.mkdirSync(tempDir);
	}
	return tempDir;
}

function getSettingFileName(): string {
	return "setting.ini";
}

function getCacheFileName(): string {
	return "cache.ini";
}

export function getSettingFilePath(): string {
	const filePath = mkdirSettingDir() + "/" + getSettingFileName();
	return filePath;
}

export function getCacheFilePath(): string {
	const filePath = mkdirSettingDir() + "/" + getCacheFileName();
	return filePath;
}

export let gqlUrl = "";
export let imageUploadUrl = "";
export let authorization = "";
export let graphQLClient: any = undefined;
export let wikiUrl = "";
export let wikiBlogUrl = "";
export let inputDockerDir = "";
export let isWindows = true;
export let initWikiWhenStartVscode = false;


export function settingFileExist(): boolean {
	const result = fs.existsSync(getSettingFilePath());
	if(!fs.existsSync(getCacheFilePath())) {
		createCacheFile(false);
	}
	return result;
}

export function initSetting() {
	initRequest(ini.parse(fs.readFileSync(getSettingFilePath(), 'utf-8')));
	initCache(ini.parse(fs.readFileSync(getCacheFilePath(), 'utf-8')));
}

function initRequest(config: any) {
	wikiUrl = config.base.wikiUrl;
	wikiBlogUrl = config.base.wikiUrl + "/zh";
	gqlUrl = config.base.wikiUrl + "/graphql";
	inputDockerDir = config.base.inputDockerDir;
	imageUploadUrl = config.base.wikiUrl + "/u";
	authorization = "Bearer " + config.base.authorization_key;
	graphQLClient = new GraphQLClient(gqlUrl, {
		headers: {
			authorization: authorization,
		},
	});

	isWindows = config.base.isWindows;
	if (isWindows != true) {
		isWindows = false;
	}

	initWikiWhenStartVscode = config.base.initWikiWhenStartVscode;
	if (initWikiWhenStartVscode != true) {
		initWikiWhenStartVscode = false;
	}
	changeSystem(isWindows);
	console.log("config check gqlUrl:" + gqlUrl + ",imageUploadUrl:" + imageUploadUrl + ",authorization:" + authorization + ",inputDockerDir:" + inputDockerDir);
}

export let openSearchWhenInit = false;
function initCache(config: any) {
	openSearchWhenInit = config.base.openSearchWhenInit;
	if (openSearchWhenInit != true) {
		openSearchWhenInit = false;
	}
	console.log("initCache openSearchWhenInit:" + openSearchWhenInit);
}

export function createSettingFile(url: string, authorizationKey: string, inputDockerDir: string, isWindows: boolean | undefined, initWikiWhenStartVscode: boolean) {
	if (isWindows == undefined || initWikiWhenStartVscode == undefined) {
		return;
	}
	const config = {
		base: {
			"wikiUrl": url,
			"authorization_key": authorizationKey,
			"inputDockerDir": inputDockerDir,
			"isWindows": isWindows,
			"initWikiWhenStartVscode": initWikiWhenStartVscode,
		}
	};
	fs.writeFileSync(getSettingFilePath(), ini.stringify(config, ""));
}

export function hasWikiWorkspace():boolean {
	let hasWikiWorkspace = false; 
	vscode.workspace.workspaceFolders?.forEach(element => {
		const workspaceRootName = element.name;
		if(workspaceRootName == "wiki") {
			hasWikiWorkspace = true;
		}
	});
	return hasWikiWorkspace;
}

export function createCacheFile(openS: boolean) {
	const config = {
		base: {
			"openSearchWhenInit": openS
		}
	};
	fs.writeFileSync(getCacheFilePath(), ini.stringify(config, ""));
	openSearchWhenInit = openS;
}

function changeSystem(isW: boolean) {
	constant.changeSystem(isW);
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
export function escapeRegExp(string: string) {
	return (string && reHasRegExpChar.test(string))
		? string.replace(reRegExpChar, '\\$&')
		: (string || '');
}

export function prepareWikiInitData(inputDirPath: string, downloadSuccess: (downloadZipPath: string) => void, unzipSuccess: (downloadDataDirPath: string) => void, error: (reason: any) => void) {
	const wikiDataZipPath = inputDirPath + "/" + WIKI_DATA_ZIP_NAME;
	const wikiDataDirPath = inputDirPath + "/" + WIKI_DATA_DIR_NAME;
	console.log("prepareWikiInitData inputDirPath:" + inputDirPath + ",wikiDataZipPath:" + wikiDataZipPath + ",wikiDataDirPath:" + wikiDataDirPath);
	downloadAndUnzipUrl(inputDirPath, WIKI_DATA_ZIP_URL, wikiDataZipPath, wikiDataDirPath, downloadSuccess, unzipSuccess, error);
}

export function deleteWikiInitDataDir(inputDirPath: string) {
	console.log("deleteWikiInitDataDir inputDirPath:" + inputDirPath);
	const wikiDataDirPath = inputDirPath + "/" + WIKI_DATA_DIR_NAME;
	fs.rmdirSync(wikiDataDirPath, { recursive: true });
}

export function deleteWikiInitDataZip(inputDirPath: string) {
	console.log("deleteWikiInitDataZip inputDirPath:" + inputDirPath);
	const wikiDataZipPath = inputDirPath + "/" + WIKI_DATA_ZIP_NAME;
	fs.unlinkSync(wikiDataZipPath);
}

export function moveWikiInitDataDirToOld(inputDirPath: string) {
	const oldWikiDir = inputDirPath + "/wiki-data-old-" + new Date().getTime(); 
    fs.renameSync(inputDirPath + "/" + WIKI_DATA_DIR_NAME, oldWikiDir);
    vscode.window.showInformationMessage("3/3老Wiki数据已经移动到(The old data has moved to):" + oldWikiDir);
}

function downloadAndUnzipUrl(downloadZipDirPath: string, downloadZipUrl: string, downloadZipPath: string, downloadDataDirPath: string,
	downloadSuccess: (downloadZipPath: string) => void, unzipSuccess: (downloadDataDirPath: string) => void, error: (reason: any) => void) {
	console.log("downloadAndUnzipUrl downloadZipDirPath:" + downloadZipDirPath + ",downloadZipUrl:" + downloadZipUrl +
		",downloadZipPath:" + downloadZipPath + ",downloadDataDirPath:" + downloadDataDirPath);
	if (fs.existsSync(downloadDataDirPath)) {
		console.log("downloadAndUnzipUrl downloadDataDirPath exist!");
		downloadSuccess(downloadZipPath);
		unzipSuccess(downloadDataDirPath);
	} else {
		if (fs.existsSync(downloadZipPath)) {
			console.log("downloadAndUnzipUrl downloadZipPath exist!");
			const zip = new StreamZip.async({ file: downloadZipPath });
			fs.mkdirSync(downloadDataDirPath);
			zip.extract(null, downloadDataDirPath).then((value) => {
				zip.close().then((value) => {
					console.log("downloadAndUnzipUrl downloadZipPath exist unzip success!");
					unzipSuccess(downloadDataDirPath);
				}, (reason: any) => {
					error(reason);
				});
			}, (reason: any) => {
				error(true);
			});
		} else {
			console.log("downloadAndUnzipUrl nothing exist!");
			downloadFile(downloadZipUrl, downloadZipDirPath, downloadZipPath.split("/").pop() as string).then((value: any) => {
				const zip = new StreamZip.async({ file: downloadZipPath });
				fs.mkdirSync(downloadDataDirPath);
				console.log("downloadAndUnzipUrl nothing exist! Download success!");
				downloadSuccess(downloadZipPath);
				zip.extract(null, downloadDataDirPath).then((value) => {
					zip.close().then((value) => {
						console.log("downloadAndUnzipUrl nothing exist! unzip success!");
						unzipSuccess(downloadDataDirPath);
					}, (reason: any) => {
						error(reason);
					});
				}, (reason: any) => {
					error(true);
				});
			}, (reason: any) => {
				error(reason);
			});
		}
	}
}

export function wikiDockerRun(initDataDirPath: string, callback: (error: any, stdout: string, stderr: string) => void) {
	child_process.exec("docker-compose -f" + initDataDirPath + "/docker-compose.yml up -d", callback);
}

export function fetchPostsqlDocker(callback: (error: any, stdout: string, stderr: string, isFinished: boolean) => void) {
	run(["pull", WIKI_POSTGRES_IMAGE], callback);
}

export function fetchWikiDocker(callback: (error: any, stdout: string, stderr: string, isFinished: boolean) => void) {
	run(["pull", WIKI_DOCKER_IMAGE], callback);
}

export function checkWikiDockerAliveAndRestart(): boolean {
	if (inputDockerDir == "" || inputDockerDir == undefined) {
		return true;
	}
	const alive = dockerAlive(WIKI_DOCKER) && dockerAlive(WIKI_DB_DOCKER);
	if (!alive) {
		vscode.window.showErrorMessage("您的Wiki.js服务已停止，正在重启(Your Wiki.js service stopped, restarting)......");
		try {
			child_process.exec("docker stop " + WIKI_DOCKER + " && " + "docker rm " + WIKI_DOCKER + " && " + "docker stop " + WIKI_DB_DOCKER + " && " + "docker rm " + WIKI_DB_DOCKER, () => {
				try {
					child_process.exec("docker-compose -f" + inputDockerDir + "/wiki-data/docker-compose.yml up -d", (error: any, stdout: string, stderr: string) => {
						if (error != null && stderr != "") {
							// do nothing
						} else {
							vscode.window.showInformationMessage("您的Wiki.js重启成功(Wiki.js service restarted)......");
						}
					});
				} catch (error) {
					console.log(error);
				}
			});
		} catch (error) {
			console.log(error);
			try {
				child_process.exec("docker-compose -f" + inputDockerDir + "/wiki-data/docker-compose.yml up -d", (error: any, stdout: string, stderr: string) => {
					if (error != null && stderr != "") {
						// do nothing
					} else {
						vscode.window.showInformationMessage("您的Wiki.js重启成功(Wiki.js service restarted)......");
					}
				});
			} catch (error) {
				console.log(error);
			}
		}
	}
	return alive;
}

function dockerAlive(dockerName: string): boolean {
	const result = child_process.execSync('docker ps --filter "name=' + dockerName + '"').toString();
	return result.indexOf(dockerName) > 0 && result.indexOf("Up") > 0;
}

function run(arg: Array<string>, callback: (error: any, stdout: string, stderr: string, isFinished: boolean) => void) {
	const run = child_process.spawn('docker', arg, {});
	run.stdout.on("data", (data) => {
		callback("", data.toString(), "", false);
	});

	run.stderr.on("data", (data) => {
		callback("", "", data.toString(), false);
	});

	run.on('exit', (code) => {
		callback("", "", "", true);
	});
}

export function clearWikiDocker(callback: (error: any, stdout: string, stderr: string) => void) {
	console.log("clearWikiDocker");
	try {
		child_process.exec("docker stop " + WIKI_DOCKER + " && " + "docker rm " + WIKI_DOCKER + " && " + "docker stop " + WIKI_DB_DOCKER + " && " + "docker rm " + WIKI_DB_DOCKER, callback);
	} catch (error) {
		console.log(error);
	}
}

// url 是图片地址，如，http://wximg.233.com/attached/image/20160815/20160815162505_0878.png
// filepath 是文件下载的本地目录
// name 是下载后的文件名
export async function downloadFile(url: string, filepath: string, name: string) {
	if (!fs.existsSync(filepath)) {
		fs.mkdirSync(filepath);
	}
	const mypath = path.resolve(filepath, name);
	if (fs.existsSync(mypath)) {
		fs.unlinkSync(mypath)
	}
	const writer = fs.createWriteStream(mypath);
	const response = await axios({
		url:encodeURI(url),
		method: "GET",
		responseType: "stream",
	});
	(response.data as Readable).pipe(writer);
	// response.data.pipe(writer);
	return new Promise((resolve, reject) => {
		writer.on("finish", resolve);
	});
}