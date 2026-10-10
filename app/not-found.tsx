import { OpenLink, Window } from "@/components/desktop/Window";
import { PixelIcon } from "@/components/pixel/PixelIcon";

export default function NotFound() {
  return (
    <Window id="/404/" title="Файл не найден" icon="info" variant="dialog">
      <div className="pane">
        <div className="about">
          <div className="about__hero">
            <PixelIcon name="info" size={48} />
            <p>
              <strong>Не удаётся найти этот адрес.</strong> Возможно, материал переименовали или
              перенесли в другую папку.
            </p>
          </div>
          <p>
            <OpenLink href="/cohorts/" className="btn">
              Открыть потоки
            </OpenLink>{" "}
            <OpenLink href="/topics/" className="btn">
              Открыть темы
            </OpenLink>
          </p>
        </div>
      </div>
    </Window>
  );
}
