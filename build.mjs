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
	if (!fs.existsSync(updatedSnippetFilePath)) {
		console.error(`\t\tInvalid snippetFilePath: ${snippetFilePath}`);
		return `<div class="alert alert-danger">Invalid snippetFilePath: ${snippetFilePath}</div>`;
	}
	return fs.readFileSync(updatedSnippetFilePath).toString();
}

const letters = "abcdefghijklmnopqrstuvwxyz";
function addNavItem(navItems, itemSub, itemNav) {
	// it is only a sub if marked as one
	const sub = itemSub === "true";

	// by default we nav to main (unless data-item-nav="false") and only nav to sub if marked (when data-item-nav="true")
	const nav = sub ? itemNav === "true" : itemNav !== "false";

	// handle a sub
	if (sub) {
		const navItem = navItems[navItems.length - 1];
		const letter = letters[navItem.children.length];
		const childItem = { key:`${navItem.key}${letter}`, label:``, sub, nav };
		navItem.children.push(childItem);
		return childItem;
	}

	// handle a main
	const navItem = { key:`${navItems.length + 1}`, label:``, nav, children:[] };
	navItems.push(navItem);
	return navItem;
}

// <div data-item-snippet-url="./snippets/item/inviting-rpg-sage.html" data-item-sub="true" data-item-nav="true"></div>
const itemSnippetRegex = /<div\s+data\-item\-snippet\-url="([^"]+)"(?:\s+data\-item\-sub="([^"]+)")?(?:\s+data\-item\-nav="([^"]+)")?><\/div>/ig;
function processItemSnippets(file, navItems) {
	while (itemSnippetRegex.test(file.fileContents)) {
		file.fileContents = file.fileContents.replace(itemSnippetRegex, (_div, snippetPath, itemSub, itemNav, _index) => {
			// generate the navItem
			const navItem = addNavItem(navItems, itemSub, itemNav);

			// read html
			let snippetHtml = readSnippet(snippetPath);

			// add item id to snippet
			snippetHtml = snippetHtml.replace(/^<div/i, () => `<div id="item-${navItem.key}"`);

			// update the item header to include key (number/letter)
			snippetHtml = snippetHtml.replace(/<header>(.*?)<\/header>/i, (_tag, text) => {
				// pass label back for building nav later
				navItem.label = text;

				// return updated header
				const hTag = navItem.sub ? "h5" : "h4";
				const pad = navItem.sub ? `ps-4` : ``;
				return `<${hTag} class="${pad}">${navItem.key}. ${text}</${hTag}>`;
			});
			return snippetHtml;
		});
	}

	// just in case we mess up during dev
	if (file.fileContents.match(/data\-item\-snippet\-url/i)) {
		console.warn(`\t\t"data-item-snippet-url" found in file "${file.filePath}"!`);
	}
}

// <div data-snippet-url="./snippets/nav/navbar-top.html"></div>
const snippetRegex = /<div\s+data\-snippet\-url="([^"]+)"><\/div>/ig;
function processSnippets(file) {
	while (snippetRegex.test(file.fileContents)) {
		file.fileContents = file.fileContents.replace(snippetRegex, (_div, snippetPath, _index) => readSnippet(snippetPath));
	}
	if (file.fileContents.match(/data-snippet-url/i)) {
		console.warn(`\t\t"data-snippet-url" found in file "${file.filePath}"!`);
	}
}

function processNavItems(file, navItems) {
	if (navItems.length) {
		const html = navItems.reduce((html, navItem)=> {
			if (navItem.nav) {
				html += `<a class="nav-link" href="#item-${navItem.key}">${navItem.key}. ${navItem.label}</a>`;
				const navableChildren = navItem.children.filter(navChild => navChild.nav);
				if (navableChildren.length) {
					html += `<nav class="nav flex-column">`;
					navableChildren.forEach(navChild => {
						const label = navChild.label.replace(/<small>.*?<\/small>/ig, "").trim();
						html += `<a class="nav-link" href="#item-${navChild.key}">${navChild.key}. ${label}</a>`;
					});
					html += `</nav>`;
				}
			}
			return html;
		}, "");
		file.fileContents = file.fileContents.replace(/(<nav\s+class="nav\s+flex\-column"\s+id="navbar\-left\-items">)(<\/nav>)/i, (_, left, right) => {
			return `${left}${html}${right}`;
		});
	}else {
		file.fileContents = file.fileContents.replace(
			`>Topics</button>`,
			` style="visibility:hidden;">Topics</button>`
		);
	}
}

function removeComments(file) {
	let count = 0;
	file.fileContents = file.fileContents.replace(/<\!--(.|\n)*?-->/g, () => { count++; return ""; });
	if (count) {
		console.log(`\t\t${count} comments removed from: ${file.filePath}`);
	}
}

function now() {
	const date = new Date(),
		year = date.getFullYear(),
		month = String(date.getMonth() + 1).padStart(2, "0"),
		day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function updateDate(file) {
	const updateDateHtml = `<div class="text-center"><small>updated: ${now()}</small></div>`;
	file.fileContents = file.fileContents.replace(/<div class="alert alert-danger">UPDATE DATE<\/div>/g, updateDateHtml);
}

function writeFile(file) {
	const distFilePath = file.filePath.replace("./src", "./dist");
	fs.writeFileSync(distFilePath, file.fileContents);
	console.log(`\tSrc file created: ${distFilePath}`);
}

function processFile(file) {
	const navItems = [];
	processItemSnippets(file, navItems);
	processSnippets(file);
	processNavItems(file, navItems);
	removeComments(file);
	updateDate(file);
	writeFile(file);
}

function processFiles() {
	const files = fetchFilesToProcess();
	files.forEach(processFile);
}

function copyDefaultFiles() {
	const files = fs.readdirSync(srcRootFolderPath).filter(fileName => fileName.startsWith("default."));
	const folderPaths = fetchFolderPathsToProcess();
	folderPaths.forEach(srcFolderPath => {
		const distFolderPath = srcFolderPath.replace("./src", "./dist");
		files.forEach(fileName => {
			const srcFilePath = `${srcRootFolderPath}/${fileName}`;
			const distFilePath = `${distFolderPath}/${fileName}`;
			fs.copyFileSync(srcFilePath, distFilePath);
			console.log(`\tDist file created: ${distFilePath}`);
		});
	});
}

console.log(`Building ...`);
processFiles();
copyDefaultFiles();
console.log(`Building ... done.`);
