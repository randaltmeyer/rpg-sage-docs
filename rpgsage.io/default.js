/**
 * This finds all the div.item blocks and generates the nav links to them.
 */
function createLinks() {
	const links = [];
	const children = [];
	const items = $("div.item[id]").toArray();
	items.forEach(item => {
		const id = item.id;
		const $item = $(item);
		const $h = $item.find("h1,h2,h3,h4,h5").first();
		let which = links, pushItem = true;
		if ($item.data("itemSub")) {
			which = children;
			pushItem = $item.data("itemNav");
		}else {
			pushChildren();
		}
		if (pushItem) {
			which.push(`<a class="nav-link" href="#${id}">${$h.text().trim()}</a>`);
		}
	});
	pushChildren();
	return links.join("");

	function pushChildren() {
		if (children.length) {
			links.push(`<nav class="nav flex-column">${children.join("")}</nav>`);
		}
		children.length = 0;
	}
}

/**
 * Creates then loads all the links into the right navbar
 */
function loadLinks() {
	const navbarLeftItems = $("nav#navbar-left-items");
	navbarLeftItems.append(createLinks());
	if (navbarLeftItems.children().length) {
		$("button#navbar-left-button").removeClass("d-none");
	}else {
		$("#navbar-top").css("left", "unset");
	}
	$("div.topics-spinner").remove();
}

/**
 * Hides the right nav when clicking on something that you would expect to close the nav, such as nav links.
 */
function handleDocumentClicks() {
	$(document).on("click", e => {
		const el = $(e.target);
		if (el.closest("a").is(`[href]`)) {
			$("#navbar-left").offcanvas("hide");
			$("#navbar-right").offcanvas("hide");
		}
		if (el.closest("button").is("button.breakdown-toggler")) {
			el.closest('p').next(".breakdown-togglee").toggleClass('d-none');
		}
	});
}

/** Used to store unique snippet urls for fetchSnippetHtml() */
const snippetUrls = [];

/**
 * Shared fetch of snippet/item snippet html
 */
async function fetchSnippetHtml($div) {
	// double check $div
	if (!$div?.data) {
		console.warn(`fetchSnippetHtml($div) -> $div === ${$div}`);
		return null;
	}

	// get the url
	const url = $div.data("snippetUrl") ?? $div.data("itemSnippetUrl");
	if (!url) {
		$div.replaceWith(`<div class="alert alert-danger">INVALID</div>`);
		return null;
	}

	// check for duplicates
	if (snippetUrls.includes(url)) {
		$div.replaceWith(`<div class="alert alert-danger">DUPLICATE: ${url}</div>`);
		return null;
	}

	// push for duplicate checking
	snippetUrls.push(url);

	// get the html
	let html = await $.ajax(url).catch(console.error);
	if (location.href.includes("file://") && location.href.includes("e20.")) {
		html = await $.ajax(url.replace("./", "../rpgsage.io/")).catch(console.error);
	}
	if (!html) {
		$div.replaceWith(`<div class="alert alert-danger">${url}</div>`);
		return null;
	}

	return html;
}

/**
 * Loads all the non-item snippets.
 * Uses internal findSnippets() and the while loop to allow for nested snippets
 */
async function loadSnippets() {
	let divs;
	while (findSnippets().length) {
		for (const div of divs) {
			const $div = $(div);
			const html = await fetchSnippetHtml($div);
			if (html) {
				$div.replaceWith(html);
			}
		}
	}

	/** helper to find snippets to load */
	function findSnippets() {
		return divs = $("div[data-snippet-url]").toArray();
	}
}

/**
 * Loads all the items
 * Uses internal findItemSnippets() and the while loop to allow for nested snippets
 */
async function loadItems() {
	const letters = "abcdefghijklmnopqrstuvwxyz";
	let number = 0, letterIndex = 0;

	let divs;
	while (findItemSnippets().length) {
		for (const div of divs) {
			const $div = $(div);

			// fetch and and create item
			const html = await fetchSnippetHtml($div);
			if (html) {
				// get snippet main div
				const $item = $("<div/>").append(html).children().first();

				// ensure we pass along parent/sub status
				$item.data("itemSub", $div.data("itemSub"));

				// ensure we can force sub items to navbar
				$item.data("itemNav", $div.data("itemNav"));

				// create item html and set id and letter/number
				const tag = generateTag($div.data("itemSub"));
				$item.attr("id", `item-${tag}`);
				tagItemHeader($item, tag);

				// add to page
				$div.replaceWith($item);
			}
		}
	}

	/** helper for creating number/letter tag */
	function generateTag(isSub) {
		if (isSub) {
			letterIndex++;
		}else {
			number++;
			letterIndex = -1;
		}
		return `${number}${letters[letterIndex] ?? ""}`;
	}

	/** helper for adding tag to item header */
	function tagItemHeader($item, tag) {
		const isSub = $item.data("itemSub");
		const el = isSub ? "h5" : "h4";
		const pad = isSub ? "ps-4" : "";
		const $h = $item.find("h1,h2,h3,h4,h5").first();
		const text = $h.text();
		$h.replaceWith(`<${el} class="${pad}">${tag}. ${text}</${el}>`);
	}

	/** helper to find snippets to load */
	function findItemSnippets() {
		return divs = $("div[data-item-snippet-url]").toArray();
	}
}

/**
 * runs all the page load scripts
 */
$(async () => {
	$.ajaxSetup({cache:false});
	await loadItems();
	await loadSnippets();
	loadLinks();
	handleDocumentClicks();
});
