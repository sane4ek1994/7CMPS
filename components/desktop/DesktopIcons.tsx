import { PixelIcon } from "@/components/pixel/PixelIcon";
import { OpenLink } from "./Window";

export interface DesktopItem {
  label: string;
  href: string;
  icon: string;
}

export function DesktopIcons({ items }: { items: DesktopItem[] }) {
  return (
    <nav aria-label="Рабочий стол">
      <ul className="desktop-icons">
        {items.map((item) => (
          <li key={item.href}>
            <OpenLink href={item.href} className="desktop-icon">
              <PixelIcon name={item.icon} size={32} />
              <span className="desktop-icon__label">{item.label}</span>
            </OpenLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
