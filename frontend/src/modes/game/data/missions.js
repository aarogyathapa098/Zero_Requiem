import { ROVER_RECORDS } from "../../map/data/roverRecords.js";

export const MISSION_STORAGE_KEY = "zero-requiem-missions-v1";
const MAP_SAVE_KEY = "orbital-mars-expedition-v3";

let mapProgressAccessors = {
  load: () => {
    try {
      const raw = localStorage.getItem(MAP_SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  save: (data) => {
    try {
      localStorage.setItem(MAP_SAVE_KEY, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  },
};

export function registerMapProgressAccessors(load, save) {
  mapProgressAccessors = { load, save };
}

/**
 * Only Missions 1, 2, and 5 are active story missions.
 * Aliens 3, 4, and 6 are kept as wild roaming aliens at random places on the map.
 */
export const MISSIONS = [
  {
    id: 1,
    slot: 0,
    characterId: 1,
    code: "NTM-102",
    missionNumber: 1,
    stepIndex: 1,
    isMission: true,
    prevMissionId: null,
    title: "Landing Zone Repairs",
    alienNumber: "Alien 1",
    alienName: "Scavenger Dustling",
    alienTitle: "Alien 1 (Scavenger Dustling)",
    alienBehavior: "Found eating debris right next to your crashed drop pod.",
    scrapName: "Silicate Scrap",
    scrapBattleText: "Defeat Alien 1 to obtain Silicate Scrap.",
    scrapOrigin: "Recovered from Scavenger Dustling's jaws next to the crashed drop pod.",
    targetObject: "Supply Crate",
    taskActionLabel: "Fix Smashed Supply Crate",
    taskDescription:
      "Use the Silicate Scrap to fix the smashed Supply Crate and unlock your life-support HUD.",
    systemEffectLabel: "Life-Support HUD Unlocked & Online",
    arrivalBriefing:
      "Hard landing confirmed at Jezero Landing Zone. Your Supply Crate was smashed on impact and your Life-Support HUD is offline! A Scavenger Dustling is eating debris right next to your drop pod—scan and defeat it for Silicate Scrap to repair the Supply Crate.",
    completionStory:
      "Supply Crate repaired with Silicate Scrap! Your Life-Support HUD is now online. Long-range sensors detect a Regolith Ferrite chewing on the stalled wheels of the Perseverance Rover—Mission 2 begins.",
    enemyLevel: 22,
    enemyMaxHp: 80,
    enemySignatureMove: "DEBRIS GNAW",
    locationTag: "Crashed Drop Pod · Landing Zone",
    alienPos: { x: 1995, y: 1035 },
    cratePos: { x: 2065, y: 1015 },
  },
  {
    id: 2,
    slot: 1,
    characterId: 2,
    code: "SR-112",
    missionNumber: 2,
    stepIndex: 2,
    isMission: true,
    prevMissionId: 1,
    title: "The Perseverance Rover Repair",
    alienNumber: "Alien 2",
    alienName: "Regolith Ferrite",
    alienTitle: "Alien 2 (Regolith Ferrite)",
    alienBehavior: "Found chewing on the stalled wheels of the historic rover.",
    scrapName: "Ferrous Metal Scrap",
    scrapBattleText: "Defeat Alien 2 to obtain Ferrous Metal Scrap.",
    scrapOrigin: "Pried free after defeating Regolith Ferrite by the stalled rover wheels.",
    targetObject: "Perseverance Rover",
    taskActionLabel: "Fix Perseverance Rover Wires",
    taskDescription:
      "After defeating Alien 2 for Ferrous Metal Scrap, go back to the Perseverance Rover and connect each severed wire to its matching color code to bring its Power Core back online.",
    systemEffectLabel: "Perseverance Rover Wires & Power Core Online",
    arrivalBriefing:
      "Mission 2 Unlocked: Track down the Regolith Ferrite chewing on the stalled wheels of the historic rover. Defeat it for Ferrous Metal Scrap, then return to the Perseverance Rover and repair its severed wires.",
    completionStory:
      "Perseverance Rover’s wires and Power Core are back online! Its onboard logs point toward the Archive Sector where an Archive Sentinel guards a cluster of lost mission logs—Mission 5 begins.",
    enemyLevel: 25,
    enemyMaxHp: 90,
    enemySignatureMove: "FERRITE CRUNCH",
    locationTag: "Stalled Wheels · Perseverance Rover Site",
    alienPos: { x: 1565, y: 815 },
    cratePos: { x: 1475, y: 785 },
  },
  {
    id: 5,
    slot: 4,
    characterId: 5,
    code: "UP-404",
    missionNumber: 5,
    stepIndex: 3,
    isMission: true,
    prevMissionId: 2,
    title: "Scattered Reports Recovery",
    alienNumber: "Alien 5",
    alienName: "Archive Sentinel",
    alienTitle: "Alien 5 (Archive Sentinel)",
    alienBehavior: "Found guarding a cluster of lost mission logs.",
    scrapName: "Data-Decryptor Chip",
    scrapBattleText: "Defeat Alien 5 to obtain a Data-Decryptor Chip.",
    scrapOrigin: "Extracted from Archive Sentinel guarding the lost mission logs.",
    targetObject: "Classified Historical Reports",
    taskActionLabel: "Use Data-Decryptor Chip on Reports Archive",
    taskDescription:
      "Use the Data-Decryptor Chip to read and collect the classified historical reports scattered around the pixel map, revealing why previous crews went dark.",
    systemEffectLabel: "Classified Historical Reports Decrypted & Recovered",
    arrivalBriefing:
      "Mission 5 Unlocked: Locate the Archive Sentinel guarding a cluster of lost mission logs in the central basin. Defeat it for a Data-Decryptor Chip to unlock the classified historical reports revealing why previous crews went dark.",
    completionStory:
      "Data-Decryptor Chip activated! All classified historical reports have been decrypted and recovered—revealing why previous crews went dark. Your Mars surface missions are complete!",
    enemyLevel: 32,
    enemyMaxHp: 115,
    enemySignatureMove: "CIPHER PULSE",
    locationTag: "Lost Mission Logs Cluster · Archive Sector",
    alienPos: { x: 885, y: 690 },
    cratePos: { x: 830, y: 665 },
  },
];

/**
 * Non-mission aliens (3, 4, 6) kept roaming freely at random places on the Mars map.
 */
export const ROAMING_ALIENS = [
  {
    id: 3,
    slot: 2,
    characterId: 3,
    code: "SG-132",
    missionNumber: null,
    isMission: false,
    isRoaming: true,
    title: "Roaming Crater Highland Specimen",
    alienNumber: "Wild Alien",
    alienName: "Delta Strider",
    alienTitle: "Delta Strider (Roaming)",
    alienBehavior: "Roaming freely across the Martian sedimentary highlands.",
    scrapName: "Resonant Alloy Fragment",
    scrapBattleText: "Defeat Delta Strider in a wild encounter.",
    scrapOrigin: "Dropped by a wild Delta Strider.",
    targetObject: "Field Research",
    taskActionLabel: "Log Specimen",
    taskDescription: "Wild alien roaming randomly across the Martian surface.",
    systemEffectLabel: "Specimen Logged",
    arrivalBriefing: "A wild Delta Strider roaming across the Martian surface.",
    completionStory: "Wild Delta Strider encounter completed.",
    enemyLevel: 27,
    enemyMaxHp: 95,
    enemySignatureMove: "STRIDER TREMOR",
    locationTag: "Jezero Surface · Roaming",
    alienPos: { x: 1330, y: 540 },
    cratePos: { x: 1330, y: 540 },
  },
  {
    id: 4,
    slot: 3,
    characterId: 4,
    code: "AJ-911",
    missionNumber: null,
    isMission: false,
    isRoaming: true,
    title: "Roaming Vent Specimen",
    alienNumber: "Wild Alien",
    alienName: "Vents-Crawler Dustling",
    alienTitle: "Vents-Crawler Dustling (Roaming)",
    alienBehavior: "Roaming freely across thermal vents on the Martian plains.",
    scrapName: "Vent Mineral Fragment",
    scrapBattleText: "Defeat Vents-Crawler Dustling in a wild encounter.",
    scrapOrigin: "Dropped by a wild Vents-Crawler Dustling.",
    targetObject: "Field Research",
    taskActionLabel: "Log Specimen",
    taskDescription: "Wild alien roaming randomly across the Martian surface.",
    systemEffectLabel: "Specimen Logged",
    arrivalBriefing: "A wild Vents-Crawler Dustling roaming across the Martian surface.",
    completionStory: "Wild Vents-Crawler Dustling encounter completed.",
    enemyLevel: 29,
    enemyMaxHp: 105,
    enemySignatureMove: "CHOKING SPORE VENT",
    locationTag: "Jezero Surface · Roaming",
    alienPos: { x: 1680, y: 1240 },
    cratePos: { x: 1680, y: 1240 },
  },
  {
    id: 6,
    slot: 5,
    characterId: 6,
    code: "NRJ-101",
    missionNumber: null,
    isMission: false,
    isRoaming: true,
    title: "Roaming Anomaly Specimen",
    alienNumber: "Wild Alien",
    alienName: "CHRONOS Guardian",
    alienTitle: "CHRONOS Guardian (Roaming)",
    alienBehavior: "Roaming freely through the western crater basin.",
    scrapName: "Harmonic Shard",
    scrapBattleText: "Defeat CHRONOS Guardian in a wild encounter.",
    scrapOrigin: "Dropped by a wild CHRONOS Guardian.",
    targetObject: "Field Research",
    taskActionLabel: "Log Specimen",
    taskDescription: "Wild alien roaming randomly across the Martian surface.",
    systemEffectLabel: "Specimen Logged",
    arrivalBriefing: "A wild CHRONOS Guardian roaming across the Martian surface.",
    completionStory: "Wild CHRONOS Guardian encounter completed.",
    enemyLevel: 35,
    enemyMaxHp: 130,
    enemySignatureMove: "CHRONOS SINGULARITY",
    locationTag: "Jezero Surface · Roaming",
    alienPos: { x: 640, y: 1120 },
    cratePos: { x: 640, y: 1120 },
  },
];

export function isMissionUnlocked(missionOrCharId, missionProgress = loadMissionProgress()) {
  const numericId = Number(missionOrCharId);
  const mission = MISSIONS.find((m) => m.id === numericId || m.characterId === numericId);
  if (!mission) {
    // Non-mission roaming aliens (3, 4, 6) are always free to roam on the map
    return true;
  }
  if (!mission.prevMissionId) return true;
  return Boolean(missionProgress?.completedMissions?.includes(mission.prevMissionId));
}

export function getMissionByCharacterId(id) {
  const numericId = Number(id);
  return (
    MISSIONS.find((mission) => mission.characterId === numericId) ||
    ROAMING_ALIENS.find((alien) => alien.characterId === numericId) ||
    MISSIONS[0]
  );
}

export function getMissionBySlot(slot) {
  const numericSlot = Number(slot);
  return (
    MISSIONS.find((mission) => mission.slot === numericSlot) ||
    ROAMING_ALIENS.find((alien) => alien.slot === numericSlot) ||
    MISSIONS[0]
  );
}

export function defaultMissionProgress() {
  return {
    version: 2,
    defeatedAliens: [],
    obtainedScraps: [],
    completedMissions: [],
    hudUnlocked: false,
    roverPowerOnline: false,
    reportsDecrypted: false,
  };
}

function sanitizeMissionProgress(raw) {
  const base = defaultMissionProgress();
  if (!raw || typeof raw !== "object") return base;

  const validMissionIds = new Set(MISSIONS.map((m) => m.id));
  const allCharIds = new Set([1, 2, 3, 4, 5, 6]);

  if (Array.isArray(raw.defeatedAliens)) {
    base.defeatedAliens = [
      ...new Set(raw.defeatedAliens.map(Number).filter((id) => allCharIds.has(id))),
    ];
  }
  if (Array.isArray(raw.obtainedScraps)) {
    base.obtainedScraps = [
      ...new Set(raw.obtainedScraps.map(Number).filter((id) => validMissionIds.has(id))),
    ];
  }
  if (Array.isArray(raw.completedMissions)) {
    base.completedMissions = [
      ...new Set(raw.completedMissions.map(Number).filter((id) => validMissionIds.has(id))),
    ];
  }

  base.hudUnlocked = Boolean(raw.hudUnlocked || base.completedMissions.includes(1));
  base.roverPowerOnline = Boolean(raw.roverPowerOnline || base.completedMissions.includes(2));
  base.reportsDecrypted = Boolean(raw.reportsDecrypted || base.completedMissions.includes(5));

  return base;
}

export function loadMissionProgress() {
  try {
    const raw = localStorage.getItem(MISSION_STORAGE_KEY);
    if (raw) {
      return sanitizeMissionProgress(JSON.parse(raw));
    }
  } catch {
    /* ignore storage errors */
  }
  return defaultMissionProgress();
}

export function saveMissionProgress(progress) {
  const clean = sanitizeMissionProgress(progress);
  try {
    localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(clean));
  } catch {
    /* ignore storage errors */
  }
  return clean;
}

export function resetMissionProgress() {
  return saveMissionProgress(defaultMissionProgress());
}

/**
 * Returns the currently active serial mission in order (1 -> 2 -> 5),
 * or null if all 3 missions have been completed.
 */
export function getActiveSerialMission(missionProgress = loadMissionProgress()) {
  const completed = missionProgress?.completedMissions || [];
  return MISSIONS.find((m) => !completed.includes(m.id)) || null;
}

export function getMissionStage(missionId, missionProgress = loadMissionProgress(), scannedSlots = []) {
  const mission = getMissionByCharacterId(missionId);
  if (missionProgress.completedMissions.includes(mission.id)) {
    return "completed";
  }
  if (missionProgress.obtainedScraps.includes(mission.id)) {
    return "repair";
  }
  if (scannedSlots.includes(mission.slot)) {
    return "battle";
  }
  return "scan";
}

/**
 * Records that the player defeated an alien, awarding scrap if it is a story mission (1, 2, 5).
 */
export function recordAlienDefeated(characterId) {
  const entity = getMissionByCharacterId(characterId);
  const current = loadMissionProgress();

  const defeatedAliens = current.defeatedAliens.includes(entity.id)
    ? current.defeatedAliens
    : [...current.defeatedAliens, entity.id];

  const obtainedScraps =
    entity.isMission && !current.obtainedScraps.includes(entity.id)
      ? [...current.obtainedScraps, entity.id]
      : current.obtainedScraps;

  const next = saveMissionProgress({
    ...current,
    defeatedAliens,
    obtainedScraps,
  });

  try {
    const mapProgress = mapProgressAccessors.load();
    if (mapProgress) {
      const scrapId = `scrap-${entity.id}`;
      const collectedScrap =
        entity.isMission && !(mapProgress.collectedScrap || []).includes(scrapId)
          ? [...(mapProgress.collectedScrap || []), scrapId]
          : mapProgress.collectedScrap || [];

      const scannedSlots = !(mapProgress.scannedSlots || []).includes(entity.slot)
        ? [...(mapProgress.scannedSlots || []), entity.slot]
        : mapProgress.scannedSlots || [];

      mapProgressAccessors.save({
        ...mapProgress,
        scannedSlots,
        collectedScrap,
        defeated: Math.max(mapProgress.defeated || 0, defeatedAliens.length),
        research: (mapProgress.research || 0) + 20,
      });
    }
  } catch {
    /* ignore sync errors */
  }

  return next;
}

/**
 * Completes the repair/decrypt task for Mission 1, 2, or 5.
 */
export function completeMissionTask(missionId) {
  const mission = getMissionByCharacterId(missionId);
  if (!mission.isMission) return loadMissionProgress();

  const current = loadMissionProgress();

  const obtainedScraps = current.obtainedScraps.includes(mission.id)
    ? current.obtainedScraps
    : [...current.obtainedScraps, mission.id];

  const completedMissions = current.completedMissions.includes(mission.id)
    ? current.completedMissions
    : [...current.completedMissions, mission.id];

  const next = saveMissionProgress({
    ...current,
    obtainedScraps,
    completedMissions,
    hudUnlocked: current.hudUnlocked || mission.id === 1,
    roverPowerOnline: current.roverPowerOnline || mission.id === 2,
    reportsDecrypted: current.reportsDecrypted || mission.id === 5,
  });

  try {
    const mapProgress = mapProgressAccessors.load();
    if (mapProgress) {
      const updated = { ...mapProgress };

      if (mission.id === 1) {
        updated.suitPower = 100;
        updated.inventoryCounts = {
          food: (mapProgress.inventoryCounts?.food || 0) + 1,
          water: (mapProgress.inventoryCounts?.water || 0) + 1,
          oxygen: (mapProgress.inventoryCounts?.oxygen || 0) + 1,
        };
      } else if (mission.id === 2) {
        updated.roverReached = true;
        updated.research = (mapProgress.research || 0) + 40;
      } else if (mission.id === 5) {
        const allRecordIds = ROVER_RECORDS.map((r) => r.id);
        updated.collectedRecords = [
          ...new Set([...(mapProgress.collectedRecords || []), ...allRecordIds]),
        ];
        updated.beacon = true;
        updated.research = (mapProgress.research || 0) + 80;
      }

      mapProgressAccessors.save(updated);
    }
  } catch {
    /* ignore sync errors */
  }

  return next;
}
