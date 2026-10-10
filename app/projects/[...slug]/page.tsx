import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaterialView } from "@/components/MaterialView";
import { findMaterial, getMaterials } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return getMaterials()
    .filter((m) => m.section === "projects")
    .map((m) => ({ slug: m.slug.split("/") }));
}

export async function generateMetadata({
  params,
}: PageProps<"/projects/[...slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = findMaterial("projects", "", slug);
  return { title: found?.material.title, description: found?.material.summary };
}

export default async function ProjectPage({ params }: PageProps<"/projects/[...slug]">) {
  const { slug } = await params;
  const found = findMaterial("projects", "", slug);
  if (!found) notFound();
  return <MaterialView material={found.material} html={found.html} />;
}
