export let SYSTEM_NEW_LINE = "\n";
export let SYSTEM_NEW_LINE_FORMAT = /\n/g;
export const WIKI_NEW_LINE_FORMAT = /\\n/g;

export function changeSystem(isW: boolean) {
	if (isW) {
		SYSTEM_NEW_LINE = "\r\n";
		SYSTEM_NEW_LINE_FORMAT = /\r\n/g;
	} else {
		SYSTEM_NEW_LINE = "\n";
		SYSTEM_NEW_LINE_FORMAT = /\n/g;
	}
	console.log("changeSystem isW:" + isW + ",NEW_LINE:" + SYSTEM_NEW_LINE + ",SYSTEM_NEW_LINE_FORMAT:" + SYSTEM_NEW_LINE_FORMAT);
}