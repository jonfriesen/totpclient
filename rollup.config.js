import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import { terser } from 'rollup-plugin-terser';
import injectProcessEnv from 'rollup-plugin-inject-process-env';
import sveltePreprocess from 'svelte-preprocess'
import replace from '@rollup/plugin-replace';
import css from 'rollup-plugin-css-only';

const isProduction = process.env.ENVIRONMENT === 'production';

function serve() {
	let server;
	
	function toExit() {
		if (server) server.kill(0);
	}

	return {
		writeBundle() {
			if (server) return;
			server = require('child_process').spawn('npm', ['run', 'start', '--', '--dev'], {
				stdio: ['ignore', 'inherit', 'inherit'],
				shell: true
			});

			process.on('SIGTERM', toExit);
			process.on('exit', toExit);
		}
	};
}

export default {
	input: 'src/main.js',
	output: {
		sourcemap: !isProduction,
		format: 'iife',
		name: 'app',
		file: 'public/build/bundle.js'
	},
	plugins: [
		css({ output: 'extra.css' }),
		
		svelte({
			// we'll extract any component CSS out into
			// a separate file - better for performance
			css: css => {
				css.write('public/build/bundle.css');
			},
			// run preprocessor on our style tags
			preprocess: sveltePreprocess({ postcss: true, sourceMap: !isProduction })
		}),

		replace({
			preventAssignment: true,
			'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
		}),

		// If you have external dependencies installed from
		// npm, you'll most likely need these plugins. In
		// some cases you'll need additional configuration -
		// consult the documentation for details:
		// https://github.com/rollup/plugins/tree/master/packages/commonjs
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		commonjs(),

		// Inject environment variables
		injectProcessEnv({ 
			ENVIRONMENT: 'production',
			API_URL: isProduction ? '/api/' : 'http://localhost:8080/',
		}),

		// In dev mode, call `npm run start` once
		// the bundle has been generated
		!isProduction && serve(),

		// Watch the `public` directory and refresh the
		// browser on changes when not in production
		!isProduction && livereload('public'),

		// If we're building for production (npm run build
		// instead of npm run dev), minify
		isProduction && terser()
	],
	watch: {
		clearScreen: false
	}
};