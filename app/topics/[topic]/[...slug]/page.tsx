import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaterialView } from "@/components/MaterialView";
import { findMaterial, getMaterials } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return getMaterials()
    .filter((m) => m.section === "topics")
    .map((m) => ({ topic: m.group, slug: m.slug.split("/") }));
}

export async function generateMetadata({
  params,
}: PageProps<"/topics/[topic]/[...slug]">): Promise<Metadata> {
  const { topic, slug } = await params;
  const found = findMaterial("topics", topic, slug);
  return { title: found?.material.title, description: found?.material.summary };
}

export default async function TopicMaterialPage({
  params,
}: PageProps<"/topics/[topic]/[...slug]">) {
  const { topic, slug } = await params;
  const found = findMaterial("topics", topic, slug);
  if (!found) notFound();
  return <MaterialView material={found.material} html={found.html} />;
}
