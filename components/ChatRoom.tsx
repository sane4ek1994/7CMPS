"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Comments } from "@/components/Comments";
import { siteConfig } from "@/site.config";

/** Окно «Общение»: вкладки-каналы, у каждого своя ветка в GitHub Discussions. */
export function ChatRoom() {
  const channels = siteConfig.chatChannels;
  const [activeId, setActiveId] = useState<string>(channels[0].id);
  const tabsRef = useRef<HTMLDivElement>(null);
  const active = channels.find((channel) => channel.id === activeId) ?? channels[0];

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const index = channels.findIndex((channel) => channel.id === activeId);
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % channels.length;
    else if (event.key === "ArrowLeft") next = (index - 1 + channels.length) % channels.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = channels.length - 1;
    else return;
    event.preventDefault();
    setActiveId(channels[next].id);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <div className="doc-view">
      <div className="tabs" role="tablist" aria-label="Каналы" ref={tabsRef} onKeyDown={onKeyDown}>
        {channels.map((channel) => (
          <button
            key={channel.id}
            id={`chat-tab-${channel.id}`}
            type="button"
            role="tab"
            className="tab"
            aria-selected={channel.id === active.id}
            aria-controls="chat-panel"
            tabIndex={channel.id === active.id ? 0 : -1}
            onClick={() => setActiveId(channel.id)}
          >
            # {channel.title}
          </button>
        ))}
      </div>
      <div
        className="tab-panel"
        id="chat-panel"
        role="tabpanel"
        aria-labelledby={`chat-tab-${active.id}`}
        tabIndex={0}
      >
        <p className="chat-intro">{active.description}</p>
        <Comments key={active.id} term={`chat/${active.id}`} title={active.title} />
      </div>
    </div>
  );
}
