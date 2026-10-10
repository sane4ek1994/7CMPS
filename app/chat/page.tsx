import type { Metadata } from "next";
import { Window } from "@/components/desktop/Window";
import { repoUrl } from "@/site.config";

export const metadata: Metadata = { title: "Общение" };

export default function ChatPage() {
  return (
    <Window id="/chat/" title="Общение" icon="chat" variant="dialog">
      <div className="pane">
        <div className="about">
          <p>
            Каналы для общения живут в{" "}
            <a href={`${repoUrl}/discussions`} target="_blank" rel="noopener noreferrer">
              GitHub Discussions
            </a>
            .
          </p>
        </div>
      </div>
    </Window>
  );
}
