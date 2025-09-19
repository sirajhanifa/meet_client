import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
	plugins: [
		tailwindcss(),
	],
	define: {
		global: 'globalThis' // 👈 Fixes the "global is not defined" error
	},
	resolve: {
		alias: {
			stream: 'stream-browserify',
			crypto: 'crypto-browserify'
		}
	}
})