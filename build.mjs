import * as fs from "fs";

const srcRootFolderPath = "./src";

function fetchFolderPathsToProcess() {
	const folderNames = fs.readdirSync(srcRootFolderPath);
	const filteredFolderNames = folderNames.filter(folder => folder.endsWith("rpgsage.io"));
	const folderPaths = filteredFolderNames.map(folderName => `${srcRootFolderPath}/${folderName}`);
	return folderPaths;
}

function fetchFilesToProcess() {
	const files = [];
	const folderPaths = fetchFolderPathsToProcess();
	folderPaths.forEach(folderPath => {
		const fileNames = fs.readdirSync(folderPath);
		fileNames.forEach(fileName => {
			const filePath = `${folderPath}/${fileName}`;
			const fileContents = fs.readFileSync(filePath).toString();
			files.push({ fileName, filePath, fileContents });
		});
	})
	return files;
}

function readSnippet(snippetFilePath) {
	const updatedSnippetFilePath = snippetFilePath.replace(/^\.\/snippets/, `${srcRootFolderPath}/snippets`);
	return fs.readFileSync(updatedSnippetFilePath).toString();
}

const letters = "abcdefghijklmnopqrstuvwxyz";
function addNavItem(navItems, isSub) {
	if (isSub) {
		const navItem = navItems[navItems.length - 1];
		const letter = letters[navItem.children.length];
		const childItem = { key:`${navItem.key}${letter}`, label:`` };
		navItem.children.push(childItem);
		return childItem;
	}
	const navItem = { key:`${navItems.length + 1}`, label:``, children:[] };
	navItems.push(navItem);
	return navItem;
}

const itemSnippetRegex = /<div\s+data\-item\-snippet\-url="([^"]+)"(?:\s+data\-item\-sub="([^"]+)")?(?:\s+data\-item\-nav="([^"]+)")?><\/div>/ig;
function processItemSnippets(file, navItems) {
	// <div data-item-snippet-url="./snippets/item/inviting-rpg-sage.html" data-item-sub="true" data-item-nav="true"></div>
	while (itemSnippetRegex.test(file.fileContents)) {
		file.fileContents = file.fileContents.replace(itemSnippetRegex, (_div, snippetPath, itemSub, itemNav, _index) => {
			const isSub = itemSub === "true";
			let snippetHtml = readSnippet(snippetPath);
			const hTag = isSub ? "h5" : "h4";
			const pad = isSub ? `ps-4` : ``;
			const navItem = addNavItem(navItems, isSub);
			snippetHtml = snippetHtml.replace(/^<div/i, () => `<div id="item-${navItem.key}"`);
			snippetHtml = snippetHtml.replace(/<h\d>([^<]+)<\/h\d>/i, (_tag, text) => {
				navItem.label = text;
				return `<${hTag} class="${pad}">${navItem.key}. ${text}</${hTag}>`;
			});
			return snippetHtml;
		});
	}
	if (file.fileContents.match(/data\-item\-snippet\-url/i)) {
		console.warn(`"data-item-snippet-url" found in file "${file.filePath}"!`);
	}
}

const snippetRegex = /<div\s+data\-snippet\-url="([^"]+)"><\/div>/ig;
function processSnippets(file) {
	// <div data-snippet-url="./snippets/nav/navbar-top.html"></div>
	while (snippetRegex.test(file.fileContents)) {
		file.fileContents = file.fileContents.replace(snippetRegex, (_div, snippetPath, _index) => readSnippet(snippetPath));
	}
	if (file.fileContents.match(/data-snippet-url/i)) {
		console.warn(`"data-snippet-url" found in file "${file.filePath}"!`);
	}
}

function processNavItems(file, navItems) {
	let html = "NAV HTML HERE";
	file.fileContents = file.fileContents.replace(/(<nav\s+class="nav\s+flex\-column"\s+id="navbar\-left\-items">)(<\/nav>)/i, (_, left, right) => {
		return `${left}${html}${right}`;
	});
}

function writeFile(file) {
	const distFilePath = file.filePath.replace("./src", "./dist");
	fs.writeFileSync(distFilePath, file.fileContents);
}

function processFile(file) {
	const navItems = [];
	processItemSnippets(file, navItems);
	processSnippets(file);
	processNavItems(file, navItems);
	writeFile(file);
}

function processFiles(files) {
	files.forEach(processFile);
}

processFiles(fetchFilesToProcess());
