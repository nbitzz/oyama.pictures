import { readdir } from "fs/promises"
import { exec } from "child_process"
import { randomInt } from "node:crypto"
import type { Serve } from "bun"
import { homedir } from "node:os"

import hostMap, { ONIMAICharacterOrFamily, characterOrFamilyArray } from "./pictures/mapping"

// get pictures

const photos: Record<ONIMAICharacterOrFamily, Record<string, { path: string, filename: string }>> = Object.fromEntries(
	await Promise.all(
		characterOrFamilyArray.map(async (member) => [
			member,
			await readdir(`${import.meta.dir}/pictures/${member}`).then(
				(files) => 
					Object.fromEntries(files
						.map(
							(file) => [
								file.match(/(.*)\..*/)?.[1].toLowerCase(),
								{
									filename: file,
									path: `${import.meta.dir}/pictures/${member}/${file}`
								}
							]
						))
			),
		])
	)
)

// some more helper functions here

const 
	isPhoto = (character: ONIMAICharacterOrFamily, target: string) => 
		target.toLowerCase() in photos[character],
	resolveFile = (character: ONIMAICharacterOrFamily, file: string) =>  {
		if (!isPhoto(character, file))
			throw new Error(`Not a photo of ${character}: ${file}`)

		return photos[character as ONIMAICharacterOrFamily][file.toLowerCase()]
	},
	// Requires viu, don't forget to install
	getTerminalRender = (filePath: string) => {
		return new Promise<string>((resolve, reject) =>
			exec(`${homedir()}/.cargo/bin/viu "${filePath}" --height 30 -t`, {env: { "COLORTERM": "truecolor" }}, (err, stdout, stderr) => {
				resolve(stdout.toString())
				console.error(stderr)
			})
		)
	}

// Bun server

Bun.serve({
	port: 1027,
	async fetch(req) {
		// Convert Host header to the respective character folder
		let character = hostMap[req.headers.get("Host") as keyof typeof hostMap]
		if (!character)
			return
	
		// Pick a photo to send
		let photo = new URL(req.url).pathname.replace(/^\//g,"")
		let characterPhotoNames = Object.keys(photos[character])

		if (!isPhoto(character, photo))
			photo =
				characterPhotoNames[randomInt(0, characterPhotoNames.length)]
	
		// Get file for photo
		let file = resolveFile(character, photo)

		// Send to peer
		let res = new Response(
			req.headers.get("User-Agent")?.includes("curl")
			? await getTerminalRender(file.path)
			: Bun.file(file.path)
		)

		res.headers.set("Content-Disposition", `inline; filename=${file.filename}`);

		return res
	}
} as Serve)
