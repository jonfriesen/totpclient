<script>
	import router from "page";
	import routes from "./routes";

	// Include our Routes
	import Home from "./pages/Home.svelte";

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

<style global>
	@tailwind base;
	@tailwind components;
	@tailwind utilities;

	html * {
		font-family: Inter Var !important;
	}
</style>

<main>
	<svelte:component this={page} {params} />
</main>
