import { readdir } from "fs/promises"
import { exec } from "child_process"
import { randomInt } from "node:crypto"
import type { Serve } from "bun"
import { basename } from "node:path"
import { homedir } from "node:os"

// define the Oyama Family
const oyamaFamily = [ "mihari", "mahiro", "oyama" /* group photos */ ] as const
type OyamaFamilyMember = (typeof oyamaFamily)[number]

// get pictures

const oyamaFamilyPhotos: Record<OyamaFamilyMember, string[]> = Object.fromEntries(
	await Promise.all(
		oyamaFamily.map(async (member) => [
			member,
			await readdir(`${import.meta.dir}/oyama_pictures/${member}`).then(
				(files) => files.map((file) => basename(file, ".png"))
			),
		])
	)
)

// some more helper functions here

const 
	isFamilyMember = (a:string): a is OyamaFamilyMember => oyamaFamily.some(e => e==a), // have to do this because .includes hates me
	isFamilyPhoto = (member: OyamaFamilyMember, target: string) => oyamaFamilyPhotos[member].includes(target),
	resolveFile = (member: OyamaFamilyMember, file: string) =>  {
		if (!isFamilyPhoto(member, file))
			throw new Error(`Not a photo of ${member}: ${file}`)

		return `${import.meta.dir}/oyama_pictures/${member}/${file}.png`
	},
	// Requires viu, don't forget to install
	getTerminalRender = (member: OyamaFamilyMember, file: string) => {
		return new Promise<string>((resolve, reject) =>
			exec(`${homedir()}/.cargo/bin/viu "${resolveFile(member, file)}" --height 30 -t`, {env: { "COLORTERM": "truecolor" }}, (err, stdout, stderr) => {
				resolve(stdout.toString())
				console.error(stderr)
			})
		)
	}

// Bun server

Bun.serve({
	port: 1027,
	async fetch(req) {
		let target = req.headers.get("Host")?.split(".")[0] ?? ""
		if (!isFamilyMember(target)) return
	
		let photo = new URL(req.url).pathname.replace(/^\//g,"")
		if (!isFamilyPhoto(target, photo)) photo = oyamaFamilyPhotos[target]
								[randomInt(0, oyamaFamilyPhotos[target].length)]
 
		let res = new Response(
			req.headers.get("User-Agent")?.includes("curl")
			? await getTerminalRender(target, photo)
			: Bun.file(resolveFile(target, photo))
		)

		res.headers.set("Content-Disposition", `inline; filename=${photo}`);

		return res
	}
} as Serve)
