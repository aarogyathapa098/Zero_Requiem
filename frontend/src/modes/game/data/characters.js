const char1 = new URL("../assets/images/characters/1.png", import.meta.url).href;
const char2 = new URL("../assets/images/characters/2.png", import.meta.url).href;
const char3 = new URL("../assets/images/characters/3.png", import.meta.url).href;
const char4 = new URL("../assets/images/characters/4.png", import.meta.url).href;
const char5 = new URL("../assets/images/characters/5.png", import.meta.url).href;
const char6 = new URL("../assets/images/characters/6.png", import.meta.url).href;
const sil1 = new URL("../assets/images/silhouette/1.1.png", import.meta.url).href;
const sil2 = new URL("../assets/images/silhouette/2.1.png", import.meta.url).href;
const sil3 = new URL("../assets/images/silhouette/3.1.png", import.meta.url).href;
const sil4 = new URL("../assets/images/silhouette/4.1.png", import.meta.url).href;
const sil5 = new URL("../assets/images/silhouette/5.1.png", import.meta.url).href;
const sil6 = new URL("../assets/images/silhouette/6.1.png", import.meta.url).href;
import { MISSIONS, ROAMING_ALIENS } from "./missions.js";

const SPRITES = [
  { id: 1, character: char1, silhouette: sil1 },
  { id: 2, character: char2, silhouette: sil2 },
  { id: 3, character: char3, silhouette: sil3 },
  { id: 4, character: char4, silhouette: sil4 },
  { id: 5, character: char5, silhouette: sil5 },
  { id: 6, character: char6, silhouette: sil6 },
];

const ALL_ALIEN_DEFS = [...MISSIONS, ...ROAMING_ALIENS].sort(
  (a, b) => a.characterId - b.characterId
);

export const CHARACTERS = ALL_ALIEN_DEFS.map((entry) => {
  const sprite = SPRITES.find((item) => item.id === entry.characterId) || SPRITES[0];
  return {
    id: entry.characterId,
    slot: entry.slot,
    code: entry.code,
    isMission: Boolean(entry.isMission),
    isRoaming: Boolean(entry.isRoaming),
    prevMissionId: entry.prevMissionId ?? null,
    name: entry.alienName,
    alienNumber: entry.alienNumber,
    alienTitle: entry.alienTitle,
    missionNumber: entry.missionNumber,
    missionTitle: entry.title,
    behavior: entry.alienBehavior,
    scrapName: entry.scrapName,
    scrapBattleText: entry.scrapBattleText,
    scrapOrigin: entry.scrapOrigin,
    targetObject: entry.targetObject,
    taskActionLabel: entry.taskActionLabel,
    taskDescription: entry.taskDescription,
    systemEffectLabel: entry.systemEffectLabel,
    arrivalBriefing: entry.arrivalBriefing,
    completionStory: entry.completionStory,
    locationTag: entry.locationTag,
    alienPos: entry.alienPos,
    cratePos: entry.cratePos,
    enemyLevel: entry.enemyLevel,
    enemyMaxHp: entry.enemyMaxHp,
    enemySignatureMove: entry.enemySignatureMove,
    character: sprite.character,
    silhouette: sprite.silhouette,
  };
});

export const MISSION_CHARACTERS = CHARACTERS.filter((c) => c.isMission);

export function getCharacterById(id) {
  const numericId = Number(id);
  return CHARACTERS.find((item) => item.id === numericId) || CHARACTERS[0];
}
