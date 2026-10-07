/**
 * Stages the adapter-node build as the Lambda zip root (.lambda/) consumed by infra/lib/web-stack.ts.
 *
 * adapter-node bundles devDependencies but leaves `dependencies` external, so those must ship in
 * node_modules. A plain `pnpm install --prod` pulls ~200 MB (the lockfile pins auto-installed peers
 * such as @sveltejs/kit → vite → rolldown), close to Lambda's 250 MB unzipped limit. Instead we
 * install a flat, symlink-free tree (node-linker=hoisted; CDK zips assets without following pnpm's
 * symlinks), trace what the server actually loads with @vercel/nft, and delete the rest.
 *
 * Prod dependencies are pure JS, so an x86 CI runner can stage the arm64 function.
 */
import { execFileSync } from 'node:child_process'
import {
	chmodSync,
	cpSync,
	existsSync,
	readdirSync,
	rmdirSync,
	rmSync,
	writeFileSync
} from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { nodeFileTrace } from '@vercel/nft'

const root = resolve(import.meta.dirname, '..')
const out = join(root, '.lambda')

if (!existsSync(join(root, 'build/index.js'))) {
	throw new Error("build/ is missing; run 'pnpm build' first")
}

rmSync(out, { recursive: true, force: true })
cpSync(join(root, 'build'), join(out, 'build'), { recursive: true })
const installFiles = ['package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.npmrc']
for (const file of installFiles) cpSync(join(root, file), join(out, file))

execFileSync(
	'pnpm',
	['install', '--prod', '--frozen-lockfile', '--ignore-scripts', '--config.node-linker=hoisted'],
	{ cwd: out, stdio: 'inherit' }
)
for (const file of installFiles) rmSync(join(out, file))
rmSync(join(out, 'node_modules/.bin'), { recursive: true, force: true })

const { fileList, warnings } = await nodeFileTrace([join(out, 'build/index.js')], { base: out })
for (const warning of warnings) {
	// Optional requires the runtime never takes (e.g. aws-crt) are expected; surface the rest.
	if (!/Cannot find module|Failed to resolve dependency/.test(warning.message)) {
		console.warn(`nft: ${warning.message}`)
	}
}

/** Deletes every untraced file under `dir`; returns true when `dir` ended up empty and was removed. */
function prune(dir: string): boolean {
	let empty = true
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name)
		if (entry.isDirectory()) {
			if (!prune(path)) empty = false
		} else if (fileList.has(relative(out, path))) {
			empty = false
		} else {
			rmSync(path)
		}
	}
	if (empty) rmdirSync(dir)
	return empty
}
prune(join(out, 'node_modules'))

// Lambda Web Adapter (attached as a layer) execs this handler, then proxies Function URL events to
// the adapter-node HTTP server on $PORT.
writeFileSync(join(out, 'run.sh'), '#!/bin/bash\nexec node build/index.js\n')
chmodSync(join(out, 'run.sh'), 0o755)

console.log(`Staged Lambda package in ${relative(root, out)}/ (${fileList.size} traced files)`)
