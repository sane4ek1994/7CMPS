import { getCohorts, getMaterials, getTopics } from "@/lib/content";

export default function Home() {
  return (
    <main>
      <h1>DevOps Campus</h1>
      <p>
        Потоков: {getCohorts().length}, тем: {getTopics().length}, материалов:{" "}
        {getMaterials().length}
      </p>
      <ul>
        {getMaterials().map((m) => (
          <li key={m.id}>
            {m.date} {m.title} ({m.href})
          </li>
        ))}
      </ul>
    </main>
  );
}
