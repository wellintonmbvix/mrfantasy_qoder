import { join } from 'path';
import type { Config } from 'tailwindcss';

const config: Config = {
	darkMode: 'class',
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			colors: {
				primary: {
					50: '#eff6ff', // #fdf4ff
					100: '#dbeafe', // #fae8ff
					200: '#bfdbfe', // #f5d0fe
					300: '#93c5fd', // #f0abfc
					400: '#60a5fa', // #e879f9
					500: '#3b82f6', // #d946ef
					600: '#2563eb', // #c026d3
					700: '#1d4ed8', // #a21caf
					800: '#1e40af', // #86198f
					900: '#1e3a8a', // #701a75
					950: '#1e1b4b'  // #4a044e
				}
			}
		}
	},
	plugins: []
};

export default config;