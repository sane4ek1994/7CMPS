import type { Metadata } from "next";
import { ChatRoom } from "@/components/ChatRoom";
import { Window } from "@/components/desktop/Window";

export const metadata: Metadata = { title: "Общение" };

export default function ChatPage() {
  return (
    <Window id="/chat/" title="Общение" icon="chat" variant="document">
      <ChatRoom />
    </Window>
  );
}
