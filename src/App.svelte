<script>
	import Tailwind from "./Tailwind.svelte";
	import routes from "./routes";

	// Variables
	let page;
	let params = {};

	// Simple router - just show the home page by default
	// Since this is a single-page TOTP app, we don't need complex routing
	function updatePage() {
		const path = window.location.pathname;
		const route = routes.find(r => r.path === path) || routes.find(r => r.path === '*');
		page = route.component;
	}

	// Initialize page
	updatePage();

	// Listen for navigation changes
	window.addEventListener('popstate', updatePage);
</script>

<Tailwind />

<main>
	<svelte:component this={page} {params} />
</main>
