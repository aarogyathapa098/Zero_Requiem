import { useSearchParams } from "react-router-dom";
import MissionGuideModal from "./components/MissionGuideModal";
import BattleScreen from "./screens/BattleScreen";

export default function GameMode() {
  const [searchParams] = useSearchParams();
  const hasBattleTarget = searchParams.get("characterId") !== null;

  if (hasBattleTarget) {
    return <BattleScreen />;
  }

  return <MissionGuideModal isOpen standalone />;
}
