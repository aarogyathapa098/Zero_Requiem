import { loadSavedProgress, saveSavedProgress } from "../../map/game/marsModel.js";
import { ROVER_RECORDS } from "../../map/data/roverRecords.js";

export const MISSION_STORAGE_KEY = "zero-requiem-missions-v1";

export const MISSIONS = [
  {
    id: 1,
    slot: 0,
    characterId: 1,
    code: "NTM-102",
    missionNumber: 1,
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
      "Supply Crate repaired with Silicate Scrap! Your Life-Support HUD and Holographic Field Terminal are now online. Long-range sensors detect a Regolith Ferrite chewing on stalled rover wheels to the northwest—Mission 2 begins.",
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
    title: "The Perseverance Rover Repair",
    alienNumber: "Alien 2",
    alienName: "Regolith Ferrite",
    alienTitle: "Alien 2 (Regolith Ferrite)",
    alienBehavior: "Found chewing on the stalled wheels of the historic rover.",
    scrapName: "Ferrous Metal Scrap",
    scrapBattleText: "Defeat Alien 2 to obtain Ferrous Metal Scrap.",
    scrapOrigin: "Pried free after defeating Regolith Ferrite by the stalled rover wheels.",
    targetObject: "Perseverance Rover’s Power Core",
    taskActionLabel: "Repair Perseverance Power Core",
    taskDescription:
      "Use the Ferrous Metal Scrap to fix the Perseverance Rover’s Power Core, bringing its systems back online.",
    systemEffectLabel: "Perseverance Rover Power Core Online",
    arrivalBriefing:
      "Mission 2 Unlocked: Track down the Regolith Ferrite chewing on the stalled wheels of the historic rover. Defeat it to salvage Ferrous Metal Scrap and repair the Perseverance Rover’s Power Core.",
    completionStory:
      "Perseverance Rover’s Power Core is back online! Its onboard geological logs point toward clay-rich sedimentary layers in the Crater Highlands where a Delta Strider is rummaging—Mission 3 begins.",
    enemyLevel: 25,
    enemyMaxHp: 90,
    enemySignatureMove: "FERRITE CRUNCH",
    locationTag: "Stalled Wheels · Historic Rover Site",
    alienPos: { x: 1554, y: 804 },
    cratePos: { x: 1500, y: 780 },
  },
  {
    id: 3,
    slot: 2,
    characterId: 3,
    code: "SG-132",
    missionNumber: 3,
    title: "Crater Highland Digging",
    alienNumber: "Alien 3",
    alienName: "Delta Strider",
    alienTitle: "Alien 3 (Delta Strider)",
    alienBehavior: "Found rummaging through clay-rich sedimentary layers.",
    scrapName: "Resonant Alloy Scrap",
    scrapBattleText: "Defeat Alien 3 to obtain Resonant Alloy Scrap.",
    scrapOrigin: "Salvaged from Delta Strider in the clay-rich crater highlands.",
    targetObject: "Spectro-Analyzer Crate",
    taskActionLabel: "Repair Spectro-Analyzer Crate",
    taskDescription:
      "Use the Resonant Alloy Scrap to repair the Spectro-Analyzer Crate and scan for alien biosignatures.",
    systemEffectLabel: "Spectro-Analyzer Repaired · Biosignatures Scanned",
    arrivalBriefing:
      "Mission 3 Unlocked: Venture into the Crater Highlands to confront the Delta Strider rummaging through clay-rich sedimentary layers. Defeat it for Resonant Alloy Scrap and repair the Spectro-Analyzer Crate.",
    completionStory:
      "Spectro-Analyzer Crate repaired! Biosignature sweep complete—but an urgent alarm is flashing from Base Camp! A Vents-Crawler Dustling is swarming your camp's clogged atmospheric intake and your O₂ is dropping—Mission 4 begins!",
    enemyLevel: 27,
    enemyMaxHp: 95,
    enemySignatureMove: "STRIDER TREMOR",
    locationTag: "Clay Sedimentary Layers · Crater Highlands",
    alienPos: { x: 1330, y: 540 },
    cratePos: { x: 1275, y: 515 },
  },
  {
    id: 4,
    slot: 3,
    characterId: 4,
    code: "AJ-911",
    missionNumber: 4,
    title: "Carbon Filter Restoration",
    alienNumber: "Alien 4",
    alienName: "Vents-Crawler Dustling",
    alienTitle: "Alien 4 (Vents-Crawler Dustling)",
    alienBehavior: "Found swarming around your base camp's clogged atmospheric intake.",
    scrapName: "Carbon Filter Repair Module",
    scrapBattleText:
      "Defeat Alien 4 to obtain the Carbon Filter Repair Module dropped from its equipment pack.",
    scrapOrigin: "Dropped from Vents-Crawler Dustling's tangled equipment pack.",
    targetObject: "Carbon Filter",
    taskActionLabel: "Unclog & Fix Failing Carbon Filter",
    taskDescription:
      "Use the repair module to unclog and fix the life-support system's failing Carbon Filter, restoring clean breathable oxygen to your suit.",
    systemEffectLabel: "Carbon Filter Restored · Clean Breathable O₂ at 100%",
    arrivalBriefing:
      "Mission 4 Alert: Your Base Camp's atmospheric intake is clogged! Return to Base Camp, defeat the Vents-Crawler Dustling to obtain the Carbon Filter Repair Module, and fix the failing Carbon Filter to restore your suit's oxygen.",
    completionStory:
      "Carbon Filter unclogged and restored! Clean breathable oxygen flows back into your suit at 100%. Now you can push deeper west to the Archive Sector where an Archive Sentinel guards lost crew logs—Mission 5 begins.",
    enemyLevel: 29,
    enemyMaxHp: 105,
    enemySignatureMove: "CHOKING SPORE VENT",
    locationTag: "Atmospheric Intake · Base Camp Vents",
    alienPos: { x: 2170, y: 1068 },
    cratePos: { x: 2220, y: 1045 },
  },
  {
    id: 5,
    slot: 4,
    characterId: 5,
    code: "UP-404",
    missionNumber: 5,
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
      "Data-Decryptor Chip activated! All classified historical reports have been decrypted—revealing the harmonic anomaly that silenced previous expeditions. Only the CHRONOS Guardian stands between you and the S.U.N.A. IV Quantum Relay—Mission 6 begins!",
    enemyLevel: 32,
    enemyMaxHp: 115,
    enemySignatureMove: "CIPHER PULSE",
    locationTag: "Lost Mission Logs Cluster · Archive Sector",
    alienPos: { x: 885, y: 690 },
    cratePos: { x: 830, y: 665 },
  },
  {
    id: 6,
    slot: 5,
    characterId: 6,
    code: "NRJ-101",
    missionNumber: 6,
    title: "The Final Transmission",
    alienNumber: "Alien 6",
    alienName: "CHRONOS Guardian",
    alienTitle: "Alien 6 (CHRONOS Guardian)",
    alienBehavior: "The final entity protecting the core anomaly.",
    scrapName: "Prime Harmonic Scrap",
    scrapBattleText: "Defeat Alien 6 to obtain Prime Harmonic Scrap.",
    scrapOrigin: "Harvested from the defeated CHRONOS Guardian at the core anomaly.",
    targetObject: "S.U.N.A. IV Quantum Relay Crate",
    taskActionLabel: "Fix S.U.N.A. IV Quantum Relay Crate & Broadcast",
    taskDescription:
      "Use the Prime Harmonic Scrap to fix the S.U.N.A. IV Quantum Relay Crate, broadcasting the survival data and recovered reports back to a degrading Earth, completing your secret mission.",
    systemEffectLabel: "S.U.N.A. IV Final Transmission Broadcasted to Earth",
    arrivalBriefing:
      "Final Mission (Mission 6): Approach the core anomaly at the western terminus. Defeat the CHRONOS Guardian to obtain Prime Harmonic Scrap and repair the S.U.N.A. IV Quantum Relay Crate to broadcast your survival data back to Earth!",
    completionStory:
      "S.U.N.A. IV Quantum Relay Crate repaired! A high-gain quantum beam pierces the Martian sky—broadcasting all survival telemetry and decrypted historical reports back to Earth. Your secret mission is complete!",
    enemyLevel: 35,
    enemyMaxHp: 130,
    enemySignatureMove: "CHRONOS SINGULARITY",
    locationTag: "Core Anomaly · Quantum Relay Site",
    alienPos: { x: 405, y: 1118 },
    cratePos: { x: 337, y: 1132 },
  },
];

export function getMissionByCharacterId(id) {
  const numericId = Number(id);
  return MISSIONS.find((mission) => mission.characterId === numericId) || MISSIONS[0];
}

export function getMissionBySlot(slot) {
  const numericSlot = Number(slot);
  return MISSIONS.find((mission) => mission.slot === numericSlot) || MISSIONS[0];
}

export function defaultMissionProgress() {
  return {
    version: 1,
    defeatedAliens: [],
    obtainedScraps: [],
    completedMissions: [],
    hudUnlocked: false,
    roverPowerOnline: false,
    spectroAnalyzerRepaired: false,
    carbonFilterRestored: false,
    reportsDecrypted: false,
    finalTransmissionSent: false,
  };
}

function sanitizeMissionProgress(raw) {
  const base = defaultMissionProgress();
  if (!raw || typeof raw !== "object") return base;

  const validIds = new Set(MISSIONS.map((m) => m.id));
  if (Array.isArray(raw.defeatedAliens)) {
    base.defeatedAliens = [
      ...new Set(raw.defeatedAliens.map(Number).filter((id) => validIds.has(id))),
    ];
  }
  if (Array.isArray(raw.obtainedScraps)) {
    base.obtainedScraps = [
      ...new Set(raw.obtainedScraps.map(Number).filter((id) => validIds.has(id))),
    ];
  }
  if (Array.isArray(raw.completedMissions)) {
    base.completedMissions = [
      ...new Set(raw.completedMissions.map(Number).filter((id) => validIds.has(id))),
    ];
  }

  base.hudUnlocked = Boolean(raw.hudUnlocked || base.completedMissions.includes(1));
  base.roverPowerOnline = Boolean(raw.roverPowerOnline || base.completedMissions.includes(2));
  base.spectroAnalyzerRepaired = Boolean(
    raw.spectroAnalyzerRepaired || base.completedMissions.includes(3)
  );
  base.carbonFilterRestored = Boolean(
    raw.carbonFilterRestored || base.completedMissions.includes(4)
  );
  base.reportsDecrypted = Boolean(raw.reportsDecrypted || base.completedMissions.includes(5));
  base.finalTransmissionSent = Boolean(
    raw.finalTransmissionSent || base.completedMissions.includes(6)
  );

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
 * Returns the currently active serial mission (the first mission 1..6 not yet completed),
 * or null if all 6 missions have been completed.
 */
export function getActiveSerialMission(missionProgress = loadMissionProgress()) {
  const completed = missionProgress?.completedMissions || [];
  return MISSIONS.find((m) => !completed.includes(m.id)) || null;
}

/**
 * Returns the current sub-step ('scan' | 'battle' | 'repair' | 'completed') for a mission.
 */
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
 * Records that the player defeated the alien for a given mission/characterId,
 * awarding the mission's specific Scrap / Module / Chip and syncing map progress.
 */
export function recordAlienDefeated(characterId) {
  const mission = getMissionByCharacterId(characterId);
  const current = loadMissionProgress();

  const defeatedAliens = current.defeatedAliens.includes(mission.id)
    ? current.defeatedAliens
    : [...current.defeatedAliens, mission.id];

  const obtainedScraps = current.obtainedScraps.includes(mission.id)
    ? current.obtainedScraps
    : [...current.obtainedScraps, mission.id];

  const next = saveMissionProgress({
    ...current,
    defeatedAliens,
    obtainedScraps,
  });

  // Sync with Mars map progress
  try {
    const mapProgress = loadSavedProgress();
    const scrapId = `scrap-${mission.id}`;
    const collectedScrap = mapProgress.collectedScrap.includes(scrapId)
      ? mapProgress.collectedScrap
      : [...mapProgress.collectedScrap, scrapId];

    const scannedSlots = !mapProgress.scannedSlots.includes(mission.slot)
      ? [...mapProgress.scannedSlots, mission.slot]
      : mapProgress.scannedSlots;

    saveSavedProgress({
      ...mapProgress,
      scannedSlots,
      collectedScrap,
      defeated: Math.max(mapProgress.defeated || 0, defeatedAliens.length),
      research: (mapProgress.research || 0) + 20,
    });
  } catch {
    /* ignore sync errors */
  }

  return next;
}

/**
 * Uses the obtained scrap/module/chip to repair the mission target crate/system
 * and applies its gameplay benefits to the player's suit, vitals, and map state.
 */
export function completeMissionTask(missionId) {
  const mission = getMissionByCharacterId(missionId);
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
    spectroAnalyzerRepaired: current.spectroAnalyzerRepaired || mission.id === 3,
    carbonFilterRestored: current.carbonFilterRestored || mission.id === 4,
    reportsDecrypted: current.reportsDecrypted || mission.id === 5,
    finalTransmissionSent: current.finalTransmissionSent || mission.id === 6,
  });

  // Apply mission-specific repair benefits to the Mars map & player vitals
  try {
    const mapProgress = loadSavedProgress();
    const updated = { ...mapProgress };

    if (mission.id === 1) {
      // Mission 1: Supply Crate repaired -> Unlock Life-Support HUD & boost supplies
      updated.suitPower = 100;
      updated.inventoryCounts = {
        food: (mapProgress.inventoryCounts?.food || 0) + 1,
        water: (mapProgress.inventoryCounts?.water || 0) + 1,
        oxygen: (mapProgress.inventoryCounts?.oxygen || 0) + 1,
      };
    } else if (mission.id === 2) {
      // Mission 2: Perseverance Rover's Power Core online
      updated.research = (mapProgress.research || 0) + 30;
    } else if (mission.id === 3) {
      // Mission 3: Spectro-Analyzer Crate repaired -> Max biosignature scanner range
      updated.scannerLevel = 3;
      updated.research = (mapProgress.research || 0) + 35;
    } else if (mission.id === 4) {
      // Mission 4: Carbon Filter Restoration -> Restore clean breathable oxygen to 100%
      updated.vitals = {
        ...mapProgress.vitals,
        oxygen: 100,
        health: Math.min(100, (mapProgress.vitals?.health || 80) + 25),
      };
      updated.inventoryCounts = {
        ...mapProgress.inventoryCounts,
        oxygen: (mapProgress.inventoryCounts?.oxygen || 0) + 2,
      };
    } else if (mission.id === 5) {
      // Mission 5: Data-Decryptor Chip -> Unlock classified historical reports
      const allRecordIds = ROVER_RECORDS.map((r) => r.id);
      updated.collectedRecords = [
        ...new Set([...(mapProgress.collectedRecords || []), ...allRecordIds]),
      ];
      updated.research = (mapProgress.research || 0) + 40;
    } else if (mission.id === 6) {
      // Mission 6: S.U.N.A. IV Quantum Relay Crate -> Final transmission broadcast
      updated.beacon = true;
      updated.roverReached = true;
      updated.research = (mapProgress.research || 0) + 100;
    }

    saveSavedProgress(updated);
  } catch {
    /* ignore sync errors */
  }

  return next;
}
