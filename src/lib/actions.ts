"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAIProvider } from "@/lib/ai";
import type { ItemKind } from "@/lib/types";

/** ログインユーザ ID を取得（未認証は /login へ） */
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

// ─────────────── items ───────────────

export async function createItem(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const kind = (formData.get("kind") as ItemKind) || "memo";
  const title = (formData.get("title") as string)?.trim();
  if (!title) return;
  await supabase.from("items").insert({
    user_id: userId,
    kind,
    title,
    body: (formData.get("body") as string) ?? "",
    project_id: (formData.get("project_id") as string) || null,
    status: kind === "task" ? "todo" : null,
    priority: Number(formData.get("priority") ?? 0),
    due_at: (formData.get("due_at") as string) || null,
  });
  revalidatePath("/", "layout");
}

export async function updateItem(formData: FormData) {
  const { supabase } = await requireUser();
  const id = formData.get("id") as string;
  const patch: Record<string, unknown> = {};
  for (const k of ["title", "body", "status", "due_at", "url"]) {
    if (formData.has(k)) patch[k] = (formData.get(k) as string) || null;
  }
  if (formData.has("priority")) patch.priority = Number(formData.get("priority"));
  if (formData.has("kind")) patch.kind = formData.get("kind");
  if (formData.has("project_id")) patch.project_id = (formData.get("project_id") as string) || null;
  await supabase.from("items").update(patch).eq("id", id);
  revalidatePath("/", "layout");
}

export async function toggleTask(formData: FormData) {
  const { supabase } = await requireUser();
  const id = formData.get("id") as string;
  const done = formData.get("done") === "true";
  await supabase.from("items").update({ status: done ? "todo" : "done" }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function deleteItem(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("items").delete().eq("id", formData.get("id") as string);
  revalidatePath("/", "layout");
}

/** 本文を AI 要約して保存 */
export async function summarizeItem(formData: FormData) {
  const { supabase } = await requireUser();
  const id = formData.get("id") as string;
  const { data: item } = await supabase.from("items").select("body").eq("id", id).single();
  if (!item?.body) return;
  const summary = await getAIProvider().summarize(item.body);
  await supabase.from("items").update({ ai_summary: summary }).eq("id", id);
  revalidatePath("/", "layout");
}

/** アイデアを 4 軸スコアリングして保存 */
export async function scoreIdea(formData: FormData) {
  const { supabase } = await requireUser();
  const id = formData.get("id") as string;
  const { data: item } = await supabase.from("items").select("title, body").eq("id", id).single();
  if (!item) return;
  const scores = await getAIProvider().scoreIdea({ title: item.title, body: item.body });
  await supabase.from("items").update({ scores }).eq("id", id);
  revalidatePath("/", "layout");
}

// ─────────────── projects ───────────────

export async function createProject(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  await supabase.from("projects").insert({
    user_id: userId,
    name,
    description: (formData.get("description") as string) || null,
  });
  revalidatePath("/projects");
}

// ─────────────── tree_nodes ───────────────

export async function createTreeNode(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const name = (formData.get("name") as string)?.trim();
  if (!name) return;
  await supabase.from("tree_nodes").insert({
    user_id: userId,
    name,
    parent_id: (formData.get("parent_id") as string) || null,
  });
  revalidatePath("/tree");
}

export async function moveTreeNode(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase
    .from("tree_nodes")
    .update({ parent_id: (formData.get("parent_id") as string) || null })
    .eq("id", formData.get("id") as string);
  revalidatePath("/tree");
}

export async function renameTreeNode(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase
    .from("tree_nodes")
    .update({ name: formData.get("name") as string })
    .eq("id", formData.get("id") as string);
  revalidatePath("/tree");
}

export async function deleteTreeNode(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("tree_nodes").delete().eq("id", formData.get("id") as string);
  revalidatePath("/tree");
}

// ─────────────── links (ナレッジグラフ) ───────────────

export async function createLink(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const source = formData.get("source_item_id") as string;
  const target = formData.get("target_item_id") as string;
  if (!source || !target || source === target) return;
  await supabase.from("links").insert({
    user_id: userId,
    source_item_id: source,
    target_item_id: target,
    relation: (formData.get("relation") as string) || "related",
  });
  revalidatePath("/graph");
}

export async function deleteLink(formData: FormData) {
  const { supabase } = await requireUser();
  await supabase.from("links").delete().eq("id", formData.get("id") as string);
  revalidatePath("/graph");
}

// ─────────────── timeline ───────────────

export async function createTimelineEvent(formData: FormData) {
  const { supabase, userId } = await requireUser();
  const title = (formData.get("title") as string)?.trim();
  const event_date = formData.get("event_date") as string;
  if (!title || !event_date) return;
  await supabase.from("timeline_events").insert({
    user_id: userId,
    title,
    description: (formData.get("description") as string) || null,
    event_date,
  });
  revalidatePath("/timeline");
}

// ─────────────── auth ───────────────

export async function signOut() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}
