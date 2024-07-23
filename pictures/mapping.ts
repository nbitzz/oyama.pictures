const hostMap = {

    // Oyama family (Mahiro, Momiji)
    // maybe matsuri.oyama.pictures next?

    "mahiro.oyama.pictures": "mahiro",
    "mihari.oyama.pictures": "mihari",
    "oyama.pictures": "oyama",

    // Hozuki family (Momiji, Kaede)

    "momiji.hozuki.pictures": "momiji",
    "kaede.hozuki.pictures": "kaede",
    "hozuki.pictures": "hozuki",

    // up next:
    // Miyo, maybe Nayuta

    "asahi.pet": "asahi"
    
} as const satisfies Record<string, string>

export const characterOrFamilySet = new Set(Object.values(hostMap))
export const characterOrFamilyArray = Array.from(characterOrFamilySet.values())
export type ONIMAICharacterOrFamily = typeof hostMap[keyof typeof hostMap]

export default hostMap