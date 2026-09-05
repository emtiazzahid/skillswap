import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	dialect: 'sqlite',
	driver: 'd1-http',
	schema: './src/lib/server/db/schema.ts',
	out: './migrations',
	strict: true,
	verbose: true
});
