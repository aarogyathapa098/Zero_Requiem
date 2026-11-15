import char1 from "../assets/images/characters/1.png";
import char2 from "../assets/images/characters/2.png";
import char3 from "../assets/images/characters/3.png";
import char4 from "../assets/images/characters/4.png";
import char5 from "../assets/images/characters/5.png";
import char6 from "../assets/images/characters/6.png";
import sil1 from "../assets/images/silhouette/1.1.png";
import sil2 from "../assets/images/silhouette/2.1.png";
import sil3 from "../assets/images/silhouette/3.1.png";
import sil4 from "../assets/images/silhouette/4.1.png";
import sil5 from "../assets/images/silhouette/5.1.png";
import sil6 from "../assets/images/silhouette/6.1.png";
import { MISSIONS } from "./missions.js";

const SPRITES = [
  { id: 1, character: char1, silhouette: sil1 },
  { id: 2, character: char2, silhouette: sil2 },
  { id: 3, character: char3, silhouette: sil3 },
  { id: 4, character: char4, silhouette: sil4 },
  { id: 5, character: char5, silhouette: sil5 },
  { id: 6, character: char6, silhouette: sil6 },
];

export const CHARACTERS = MISSIONS.map((mission) => {
  const sprite = SPRITES.find((item) => item.id === mission.characterId) || SPRITES[0];
  return {
    id: mission.characterId,
    slot: mission.slot,
    code: mission.code,
    name: mission.alienName,
    alienNumber: mission.alienNumber,
    alienTitle: mission.alienTitle,
    missionNumber: mission.missionNumber,
    missionTitle: mission.title,
    behavior: mission.alienBehavior,
    scrapName: mission.scrapName,
    scrapBattleText: mission.scrapBattleText,
    scrapOrigin: mission.scrapOrigin,
    targetObject: mission.targetObject,
    taskActionLabel: mission.taskActionLabel,
    taskDescription: mission.taskDescription,
    systemEffectLabel: mission.systemEffectLabel,
    arrivalBriefing: mission.arrivalBriefing,
    completionStory: mission.completionStory,
    locationTag: mission.locationTag,
    alienPos: mission.alienPos,
    cratePos: mission.cratePos,
    enemyLevel: mission.enemyLevel,
    enemyMaxHp: mission.enemyMaxHp,
    enemySignatureMove: mission.enemySignatureMove,
    character: sprite.character,
    silhouette: sprite.silhouette,
  };
});

export function getCharacterById(id) {
  const numericId = Number(id);
  return CHARACTERS.find((item) => item.id === numericId) || CHARACTERS[0];
}
