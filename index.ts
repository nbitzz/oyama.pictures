import { readdir } from "fs/promises"
import { exec } from "child_process"
import { randomInt } from "node:crypto"

// helper functions

const shortCutEnd = (str: string, sep:string=".") => str.split(sep).slice(0, -1).join(sep)

// define the Oyama Family
const oyamaFamily = [ "mihari", "mahiro", "oyama" /* group photos */ ] as const
type OyamaFamilyMember = (typeof oyamaFamily)[number]

// get pictures

let oyamaFamilyPhotos: { [x in OyamaFamilyMember]: string[] } = await (async () => {
	let objMap = {}

	for (let familyMember of oyamaFamily) {
		objMap[familyMember] = (await readdir(`${__dirname}/oyama_pictures/${familyMember}`)).map(s => shortCutEnd(s) )
	}

	return objMap as { [x in OyamaFamilyMember]: string[] }
})()

// some more helper functions here

const isFamilyMember = (a:string): a is OyamaFamilyMember => oyamaFamily.some(e => e==a) // have to do this because .includes hates me
const isFamilyPhoto = (member: OyamaFamilyMember, target: string) => oyamaFamilyPhotos[member].includes(target)

function resolveFile(member: OyamaFamilyMember, file: string) {
	if (!isFamilyPhoto(member, file))
		throw new Error(`Not a photo of ${member}: ${file}`)

	return `${__dirname}/oyama_pictures/${member}/${file}.png`
}

// Requires viu, don't forget to install
function getTerminalRender(member: OyamaFamilyMember, file: string) {
	return new Promise((resolve, reject) =>
		exec(`~/.cargo/bin/viu "${resolveFile(member, file)}" --height 30 -t`, (err, stdout, stderr) => {
			resolve(stdout)
			console.error(stderr)
		})
	)
}

// Bun server

Bun.serve({
	port: 1027,
	async fetch(req) {
		let target = req.headers.get("Host").split(".")[0]
		if (!isFamilyMember(target)) target = oyamaFamily
							[randomInt(0,oyamaFamily.length)]
	
		let photo = new URL(req.url).pathname.replace(/^\//g,"")
		if (!isFamilyPhoto(target, photo)) photo = oyamaFamilyPhotos[target]
								[randomInt(0, oyamaFamilyPhotos[target].length)]

		let res = new Response(
			req.headers.get("User-Agent").includes("curl")
			? await getTerminalRender(target, photo)
			: Bun.file(resolveFile(target, photo))
		)

		res.headers.set("Content-Disposition", `attachment; filename=${photo}`);

		return res
	}
)
