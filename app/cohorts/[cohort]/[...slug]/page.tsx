import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MaterialView } from "@/components/MaterialView";
import { findMaterial, getMaterials } from "@/lib/content";

export const dynamicParams = false;

export function generateStaticParams() {
  return getMaterials()
    .filter((m) => m.section === "cohorts")
    .map((m) => ({ cohort: m.group, slug: m.slug.split("/") }));
}

export async function generateMetadata({
  params,
}: PageProps<"/cohorts/[cohort]/[...slug]">): Promise<Metadata> {
  const { cohort, slug } = await params;
  const found = findMaterial("cohorts", cohort, slug);
  return { title: found?.material.title, description: found?.material.summary };
}

export default async function CohortMaterialPage({
  params,
}: PageProps<"/cohorts/[cohort]/[...slug]">) {
  const { cohort, slug } = await params;
  const found = findMaterial("cohorts", cohort, slug);
  if (!found) notFound();
  return <MaterialView material={found.material} html={found.html} />;
}
