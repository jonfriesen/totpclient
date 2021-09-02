<script>
	import Tailwind from "./Tailwind.svelte";
	import router from "page";
	import routes from "./routes";

	// Variables
	let page;
	let params;

	// Loop around all of the routes and create a new instance of
	// router for reach one with some rudimentary checks.
	routes.forEach((route) => {
		router(
			route.path,

			// Set the params variable to the context.
			// We use this on the component initialisation
			(ctx, next) => {
				params = ctx.params;
				next();
			},

			// Check if auth is valid. If so, set the page to the component
			// otherwise redirect to login.
			() => {
				page = route.component;
			}
		);
	});

	// Set up the router to start and actively watch for changes
	router.start();
</script>

<Tailwind />

<main>
	<svelte:component this={page} {params} />
</main>
