
/**
 * Hides the navs when clicking on something that you would expect to close the nav, such as nav links.
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

function toggleTopicsButton() {
	if (!$("#navbar-left-items").children().length) {
		$("#navbar-left-button").css("visibility", "hidden");
	}
}

/**
 * runs all the page load scripts
 */
$(async () => {
	handleDocumentClicks();
	toggleTopicsButton();
});
