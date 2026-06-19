import { ProgrammingWeeksEditor } from "./ProgrammingWeeksEditor";

interface Props {
  playerId: string;
  currentTechnicalProgrammeId?: string | null;
}

export const TechnicalScheduleTab = ({ playerId }: Props) => {
  return <ProgrammingWeeksEditor playerId={playerId} />;
};
