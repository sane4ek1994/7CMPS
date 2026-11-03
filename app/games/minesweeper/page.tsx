import type { Metadata } from "next";
import { Window } from "@/components/desktop/Window";
import { Minesweeper } from "@/components/games/Minesweeper";

export const metadata: Metadata = {
  title: "Сапёр",
  description: "Классический «Сапёр»: найдите все мины на поле, не подорвавшись.",
};

export default function MinesweeperPage() {
  return (
    <Window id="/games/minesweeper/" title="Сапёр" icon="mine" variant="game">
      <Minesweeper />
    </Window>
  );
}
