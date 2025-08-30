/// <reference types="vite/client" />
import { sveltekit } from '@sveltejs/kit/vite';

export default {
	plugins: [sveltekit()],
	server: {
		port: 5173,
		host: true
	}
};