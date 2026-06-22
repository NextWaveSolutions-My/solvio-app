"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCollection } from "@/lib/db";
import { getSession, requireAdminOrSupport } from "@/lib/auth-utils";
import { uploadFile, isFileUploadsEnabled } from "@/lib/storage";
import type { ApiResponse, KBCategory, KBArticle, UserRole } from "@/types";
import {
  upsertKnowledgeEmbedding,
  removeKnowledgeEmbedding,
} from "@/lib/ai/knowledge-index";
import { htmlToText } from "@/lib/ai/html-to-text";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function requireAdmin() {
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  const role = ((session.user as any)?.role ?? "customer") as UserRole;
  if (role !== "admin") throw new Error("Forbidden: Admin access required");
  return session;
}

// ─── Zod Schemas ─────────────────────────────────────────────────────────────

const categorySchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  icon: z.string().max(10).optional(),
  coverImage: z.string().url().optional().or(z.literal("")),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
});

const articleSchema = z.object({
  categoryId: z.string().min(1),
  categorySlug: z.string().min(1),
  title: z.string().min(1, "Title is required").max(200),
  content: z.string().default(""),
  excerpt: z.string().max(300).optional(),
  sortOrder: z.number().int().default(0),
  isPublished: z.boolean().default(false),
});

// ─── Public Actions (no auth required) ───────────────────────────────────────

export async function getPublishedKBCategories(): Promise<
  ApiResponse<Array<KBCategory & { articleCount: number }>>
> {
  try {
    const col = await getCollection<KBCategory>("kb_categories");
    const articleCol = await getCollection<KBArticle>("kb_articles");

    const categories = await col
      .find({ isPublished: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const articleCount = await articleCol.countDocuments({
          categoryId: cat._id.toString(),
          isPublished: true,
        });
        return { ...cat, articleCount };
      })
    );

    return { success: true, data: categoriesWithCount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPublishedKBArticles(
  categorySlug: string
): Promise<ApiResponse<KBArticle[]>> {
  try {
    const col = await getCollection<KBArticle>("kb_articles");
    const articles = await col
      .find({ categorySlug, isPublished: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();
    return { success: true, data: articles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPublishedKBArticle(
  categorySlug: string,
  articleSlug: string
): Promise<ApiResponse<KBArticle>> {
  try {
    const col = await getCollection<KBArticle>("kb_articles");
    const article = await col.findOne({
      categorySlug,
      slug: articleSlug,
      isPublished: true,
    });
    if (!article) return { success: false, error: "Article not found" };
    return { success: true, data: article };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllPublishedArticlesForNav(): Promise<
  ApiResponse<KBArticle[]>
> {
  try {
    const col = await getCollection<KBArticle>("kb_articles");
    const articles = await col
      .find({ isPublished: true })
      .sort({ categorySlug: 1, sortOrder: 1, createdAt: 1 })
      .project<KBArticle>({ content: 0 })
      .toArray();
    return { success: true, data: articles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Admin Actions ────────────────────────────────────────────────────────────

export async function getAllKBCategoriesAdmin(): Promise<
  ApiResponse<Array<KBCategory & { articleCount: number }>>
> {
  try {
    await requireAdmin();
    const col = await getCollection<KBCategory>("kb_categories");
    const articleCol = await getCollection<KBArticle>("kb_articles");

    const categories = await col
      .find({})
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => {
        const articleCount = await articleCol.countDocuments({
          categoryId: cat._id.toString(),
        });
        return { ...cat, articleCount };
      })
    );

    return { success: true, data: categoriesWithCount };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getKBCategoryAdmin(
  categoryId: string
): Promise<ApiResponse<KBCategory>> {
  try {
    await requireAdmin();
    const col = await getCollection<KBCategory>("kb_categories");
    let category: KBCategory | null = null;

    if (ObjectId.isValid(categoryId)) {
      category = await col.findOne({ _id: new ObjectId(categoryId) });
    }
    if (!category) return { success: false, error: "Category not found" };
    return { success: true, data: category };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getKBArticlesAdmin(
  categoryId: string
): Promise<ApiResponse<KBArticle[]>> {
  try {
    await requireAdmin();
    const col = await getCollection<KBArticle>("kb_articles");
    const articles = await col
      .find({ categoryId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .toArray();
    return { success: true, data: articles };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getKBArticleAdmin(
  articleId: string
): Promise<ApiResponse<KBArticle>> {
  try {
    await requireAdmin();
    const col = await getCollection<KBArticle>("kb_articles");
    let article: KBArticle | null = null;
    if (ObjectId.isValid(articleId)) {
      article = await col.findOne({ _id: new ObjectId(articleId) });
    }
    if (!article) return { success: false, error: "Article not found" };
    return { success: true, data: article };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createKBCategory(
  input: z.infer<typeof categorySchema>
): Promise<ApiResponse<{ id: string }>> {
  try {
    const session = await requireAdmin();
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0]?.message };

    const { title, description, icon, coverImage, sortOrder, isPublished } =
      parsed.data;

    const col = await getCollection<KBCategory>("kb_categories");

    let slug = slugify(title);
    const existing = await col.findOne({ slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const now = new Date();
    const result = await col.insertOne({
      _id: new ObjectId(),
      title,
      slug,
      description,
      icon,
      coverImage: coverImage || undefined,
      sortOrder,
      isPublished,
      createdAt: now,
      updatedAt: now,
      createdBy: (session.user as any).id,
      updatedBy: (session.user as any).id,
    });

    revalidatePath("/docs");
    revalidatePath("/admin/knowledge-base");

    return { success: true, data: { id: result.insertedId.toString() } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateKBCategory(
  id: string,
  input: z.infer<typeof categorySchema>
): Promise<ApiResponse<void>> {
  try {
    const session = await requireAdmin();
    const parsed = categorySchema.safeParse(input);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0]?.message };

    if (!ObjectId.isValid(id))
      return { success: false, error: "Invalid category ID" };

    const col = await getCollection<KBCategory>("kb_categories");

    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...parsed.data,
          coverImage: parsed.data.coverImage || undefined,
          updatedAt: new Date(),
          updatedBy: (session.user as any).id,
        },
      }
    );

    revalidatePath("/docs");
    revalidatePath("/admin/knowledge-base");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteKBCategory(
  id: string
): Promise<ApiResponse<void>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id))
      return { success: false, error: "Invalid category ID" };

    const col = await getCollection<KBCategory>("kb_categories");
    const articleCol = await getCollection<KBArticle>("kb_articles");

    await articleCol.deleteMany({ categoryId: id });
    await col.deleteOne({ _id: new ObjectId(id) });

    revalidatePath("/docs");
    revalidatePath("/admin/knowledge-base");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createKBArticle(
  input: z.infer<typeof articleSchema>
): Promise<ApiResponse<{ id: string }>> {
  try {
    const session = await requireAdmin();
    const parsed = articleSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0]?.message };

    const { categoryId, categorySlug, title, content, excerpt, sortOrder, isPublished } =
      parsed.data;

    const col = await getCollection<KBArticle>("kb_articles");

    let slug = slugify(title);
    const existing = await col.findOne({ categorySlug, slug });
    if (existing) slug = `${slug}-${Date.now()}`;

    const now = new Date();
    const result = await col.insertOne({
      _id: new ObjectId(),
      categoryId,
      categorySlug,
      title,
      slug,
      content,
      excerpt,
      sortOrder,
      isPublished,
      createdAt: now,
      updatedAt: now,
      createdBy: (session.user as any).id,
      updatedBy: (session.user as any).id,
    });

    if (isPublished) {
      const plain = htmlToText(content ?? "");
      void upsertKnowledgeEmbedding({
        sourceType: "kb",
        sourceId: result.insertedId.toString(),
        title,
        content: excerpt ? `${excerpt}\n\n${plain}` : plain,
      });
    }

    revalidatePath("/docs");
    revalidatePath(`/admin/knowledge-base/${categoryId}`);

    return { success: true, data: { id: result.insertedId.toString() } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateKBArticle(
  id: string,
  input: z.infer<typeof articleSchema>
): Promise<ApiResponse<void>> {
  try {
    const session = await requireAdmin();
    const parsed = articleSchema.safeParse(input);
    if (!parsed.success)
      return { success: false, error: parsed.error.issues[0]?.message };

    if (!ObjectId.isValid(id))
      return { success: false, error: "Invalid article ID" };

    const col = await getCollection<KBArticle>("kb_articles");

    await col.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...parsed.data,
          updatedAt: new Date(),
          updatedBy: (session.user as any).id,
        },
      }
    );

    if (parsed.data.isPublished) {
      const plain = htmlToText(parsed.data.content ?? "");
      void upsertKnowledgeEmbedding({
        sourceType: "kb",
        sourceId: id,
        title: parsed.data.title,
        content: parsed.data.excerpt
          ? `${parsed.data.excerpt}\n\n${plain}`
          : plain,
      });
    } else {
      void removeKnowledgeEmbedding("kb", id);
    }

    revalidatePath("/docs");
    revalidatePath(`/admin/knowledge-base/${parsed.data.categoryId}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteKBArticle(id: string): Promise<ApiResponse<void>> {
  try {
    await requireAdmin();
    if (!ObjectId.isValid(id))
      return { success: false, error: "Invalid article ID" };

    const col = await getCollection<KBArticle>("kb_articles");
    await col.deleteOne({ _id: new ObjectId(id) });
    void removeKnowledgeEmbedding("kb", id);

    revalidatePath("/docs");
    revalidatePath("/admin/knowledge-base");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function uploadKBImage(
  formData: FormData
): Promise<ApiResponse<{ url: string }>> {
  try {
    if (!isFileUploadsEnabled()) {
      return { success: false, error: "File uploads are not enabled" };
    }

    const session = await requireAdminOrSupport();
    const file = formData.get("file") as File;
    if (!file) {
      return { success: false, error: "No file provided" };
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Only image files are allowed" };
    }

    const uploaded = await uploadFile({
      file,
      folder: "kb-covers",
      userId: session.user.id,
    });

    return { success: true, data: { url: uploaded.url } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
