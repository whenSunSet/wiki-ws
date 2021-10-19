// This file promisifies necessary file system functions. 
// This should be removed when VS Code updates to Node.js ^11.14 and replaced by the native fs promises.

import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from "path";
import * as os from "os";
import * as ini from "ini";
import * as child_process from "child_process"
import axios from "axios";
import { GraphQLClient } from "graphql-request";
import * as StreamZip from "node-stream-zip"
import { Readable } from 'form-data';

export const CACHE_DIR = os.homedir() + "/.Wiki-WS";
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

export function buildImportantInfo(useInputDir:string): string {
	return "Please record the following information in case of need. In addition, the password and authentication key need to be modified as soon as possible\n"
		+ "(请将下面的信息记录下来以备不时之需。此外密码和认证密钥需要尽快进行修改。\n\n"
		+ "You can visit Wiki.js in browser(您可以在浏览器中通过这个网址访问Wiki.js): " + DEFAULT_WIKI_MAIN_URL + "\n\n"
		+ "You Account name is(您的账号是): heshixi-test@gmail.com\n\n"
		+ "You password is(您的密码是): heshixi-test\n\n"
		+ "You authorization key is(您的认证密钥是): " + DEFAULT_WIKI_AUTHORIZATION + "\n\n"
		+ "Your wiki.js data exists in this directory:" + useInputDir + ". Please take good care of it, otherwise there will be a risk of file loss\n"
		+ "您的Wiki.js数据存在于这个目录下:" + useInputDir + "，请一定保管好它，否则将会存在文件丢失的风险。\n\n"
		+ "You can manage the blog of wiki.js through this extension(您可以通过这个插件来管理Wiki.js的博客)\n\n"
		+ "It should be noted that all files in the wiki directory of vscode only exist in memory, so please upload them to wiki.js through the extension as soon as possible after creating the files to avoid file loss\n"
		+ "需要注意的是：vscode的wiki目录下所有的文件都是只存在于内存中，所以在创建了文件之后请尽快通过插件上传到 Wiki.js 中，避免文件的丢失。\n\n"
		+ "At present, the extension only supports uploading blog files with .md suffix. Other file types will be uploaded as resource files\n"
		+ "目前插件只支持上传.md后缀的博客文件，其他文件类型将会被当做资源文件上传\n\n"
		+ "I wish you a pleasant use. Please email me if you have any questions a1018998632@gmail.com\n"
		+ "祝您使用愉快，有任何问题请邮件咨询: a1018998632@gmail.com";
}

export const IMPORTANT_INFO_EASY =
	"You can manage the blog of wiki.js through this extension(您可以通过这个插件来管理Wiki.js的博客)\n\n"
	+ "It should be noted that all files in the wiki directory of vscode only exist in memory, so please upload them to wiki.js through the extension as soon as possible after creating the files to avoid file loss\n"
	+ "需要注意的是：vscode的wiki目录下所有的文件都是只存在于内存中，所以在创建了文件之后请尽快通过插件上传到 Wiki.js 中，避免文件的丢失。\n\n"
	+ "At present, the extension only supports uploading blog files with .md suffix. Other file types will be uploaded as resource files\n"
	+ "目前插件只支持上传.md后缀的博客文件，其他文件类型将会被当做资源文件上传\n\n"
	+ "I wish you a pleasant use. Please email me if you have any questions a1018998632@gmail.com\n"
	+ "祝您使用愉快，有任何问题请邮件咨询: a1018998632@gmail.com"

export const DEPLOY_FAILED_REASON = 
"Windows的处理：\n"
+ '1."error during connect: This error may indicate that the docker daemon is not running": 执行 cd "C:\\Program Files\\Docker\\Docker" 和 ./DockerCli.exe -SwitchDaemon\n' 
+ '2.网络问题导致无法拉取到镜像：请百度搜索Docker如何更换源\n'
+ '3."no matching manifest for windows/amd64 10.0.18362 in the manifest list entries"：Docker Desktop-->Setting-->daemon.json-->experimental:true\n'
+ '4."Error response from daemon: hcsshim::CreateComputeSystem"：Bios没有开启虚拟化，请百度Bios如何开启虚拟化，不同主板开启方式不同，Intel和AMD的开启方式也不同。\n\n'
+ "Mac和Linux的处理：\n"
+ '1.网络问题导致无法拉取到镜像：请百度搜索Docker如何更换源'


export function mkdirSettingDir(): string {
	const settingPathDir = CACHE_DIR;
	if (!fs.existsSync(settingPathDir)) {
		fs.mkdirSync(settingPathDir);
	}
	return settingPathDir;
}

function getSettingFileName(): string {
	return "setting.ini";
}

export function getSettingFilePath(): string {
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

export function initSetting() {
	initRequest(ini.parse(fs.readFileSync(getSettingFilePath(), 'utf-8')));
}

export function initRequest(config: any) {
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
				})
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
					})
				}, (reason: any) => {
					error(true);
				});
			}, (reason: any) => {
				error(reason);
			})
		}
	}

}

export function wikiDockerRun(initDataDirPath: string, callback: (error: any, stdout: string, stderr: string) => void) {
	child_process.exec("docker-compose -f" + initDataDirPath +  "/docker-compose.yml up -d", callback)
}

export function fetchPostsqlDocker(callback: (error: any, stdout: string, stderr: string, isFinished: boolean) => void) {
	run(["pull", WIKI_POSTGRES_IMAGE], callback);
}

export function fetchWikiDocker(callback: (error: any, stdout: string, stderr: string, isFinished: boolean) => void) {
	run(["pull", WIKI_DOCKER_IMAGE], callback);
}

function run(arg: Array<string>, callback: (error: any, stdout: string, stderr: string, isFinished: boolean) => void) {
	const run = child_process.spawn('docker', arg, {})
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
		child_process.exec("docker stop " + WIKI_DOCKER + " && " + "docker rm " + WIKI_DOCKER + " && " + "docker stop " + WIKI_DB_DOCKER + " && " + "docker rm " + WIKI_DB_DOCKER, callback)
	} catch (error) {
		console.log(error)
	}
}

// url 是图片地址，如，http://wximg.233.com/attached/image/20160815/20160815162505_0878.png
// filepath 是文件下载的本地目录
// name 是下载后的文件名
async function downloadFile(url: string, filepath: string, name: string) {
	if (!fs.existsSync(filepath)) {
		fs.mkdirSync(filepath);
	}
	const mypath = path.resolve(filepath, name);
	const writer = fs.createWriteStream(mypath);
	const response = await axios({
		url,
		method: "GET",
		responseType: "stream",
	});
	(response.data as Readable).pipe(writer)
	// response.data.pipe(writer);
	return new Promise((resolve, reject) => {
		writer.on("finish", resolve);
	});
}