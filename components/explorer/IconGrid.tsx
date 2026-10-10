import { OpenLink } from "@/components/desktop/Window";
import { PixelIcon } from "@/components/pixel/PixelIcon";

export interface GridItem {
  href: string;
  label: string;
  icon: string;
  meta?: string;
}

export function IconGrid({ items, label }: { items: GridItem[]; label: string }) {
  return (
    <ul className="icon-grid" aria-label={label}>
      {items.map((item) => (
        <li key={item.href}>
          <OpenLink href={item.href} className="icon-grid__item">
            <PixelIcon name={item.icon} size={40} />
            <span className="icon-grid__label">{item.label}</span>
            {item.meta && <span className="icon-grid__meta">{item.meta}</span>}
          </OpenLink>
        </li>
      ))}
    </ul>
  );
}
