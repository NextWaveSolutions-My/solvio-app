"use server";

import { getCollection } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { WithoutId } from "mongodb";
import {
  LandingPageContent,
  LandingPageFormData,
  DEFAULT_LANDING_CONTENT,
  RawLandingPageContent,
  normalizeLandingPageContent,
} from "@/types/landing-page";
import { ApiResponse } from "@/types";
import { requirePermissionOrThrow } from "@/lib/auth-utils";

// =============================================================================
// ADMIN ACTIONS (Protected)
// =============================================================================

// Require admin role for landing page content management
async function requireLandingManage() {
  const session = await requirePermissionOrThrow("landing.manage", {
    message: "Admin access required",
  });
  return session.user as { id: string };
}

// Get landing page content (admin)
export async function getLandingPageContent(): Promise<
  ApiResponse<LandingPageContent>
> {
  try {
    await requireLandingManage();

    const collection = await getCollection<RawLandingPageContent>("landing_page");
    let content = await collection.findOne({});

    if (!content) {
      const defaultContent: WithoutId<LandingPageContent> = {
        ...DEFAULT_LANDING_CONTENT,
        updatedAt: new Date(),
        updatedBy: "system",
      };

      const result = await collection.insertOne(defaultContent);
      content = { ...defaultContent, _id: result.insertedId };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(normalizeLandingPageContent(content))),
    };
  } catch (error) {
    console.error("Error getting landing page content:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to get content",
    };
  }
}

// Update landing page content
export async function updateLandingPageContent(
  data: LandingPageFormData
): Promise<ApiResponse<LandingPageContent>> {
  try {
    const user = await requireLandingManage();

    const collection = await getCollection<RawLandingPageContent>("landing_page");
    let content = await collection.findOne({});

    if (!content) {
      const defaultContent: WithoutId<LandingPageContent> = {
        ...DEFAULT_LANDING_CONTENT,
        updatedAt: new Date(),
        updatedBy: user.id,
      };
      await collection.insertOne(defaultContent);
      content = (await collection.findOne({}))!;
    }

    const normalizedContent = normalizeLandingPageContent(content);
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    if (data.header) {
      updateData.header = { ...normalizedContent.header, ...data.header };
    }
    if (data.hero) {
      updateData.hero = { ...normalizedContent.hero, ...data.hero };
    }
    if (data.supportPaths) {
      updateData.supportPaths = data.supportPaths;
    }
    if (data.workflowSteps) {
      updateData.workflowSteps = data.workflowSteps;
    }
    if (data.capabilities) {
      updateData.capabilities = data.capabilities;
    }
    if (data.proof) {
      updateData.proof = {
        ...normalizedContent.proof,
        ...data.proof,
      };
    }
    if (data.faq) {
      updateData.faq = data.faq;
    }
    if (data.contactCta) {
      updateData.contactCta = {
        ...normalizedContent.contactCta,
        ...data.contactCta,
      };
    }
    if (data.footer) {
      updateData.footer = {
        ...normalizedContent.footer,
        ...data.footer,
        links: {
          ...normalizedContent.footer.links,
          ...(data.footer.links ?? {}),
        },
      };
    }

    await collection.updateOne({}, { $set: updateData });

    const updatedContent = await collection.findOne({});

    // Revalidate the home page
    revalidatePath("/");

    return {
      success: true,
      data: JSON.parse(
        JSON.stringify(normalizeLandingPageContent(updatedContent)),
      ),
    };
  } catch (error) {
    console.error("Error updating landing page content:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to update content",
    };
  }
}

// Reset landing page content to defaults
export async function resetLandingPageContent(): Promise<
  ApiResponse<LandingPageContent>
> {
  try {
    const user = await requireLandingManage();

    const collection = await getCollection<RawLandingPageContent>("landing_page");

    const defaultContent: WithoutId<LandingPageContent> = {
      ...DEFAULT_LANDING_CONTENT,
      updatedAt: new Date(),
      updatedBy: user.id,
    };

    // Delete existing and insert fresh
    await collection.deleteMany({});
    const result = await collection.insertOne(defaultContent);

    const content = await collection.findOne({ _id: result.insertedId });

    // Revalidate the home page
    revalidatePath("/");

    return {
      success: true,
      data: JSON.parse(JSON.stringify(normalizeLandingPageContent(content))),
    };
  } catch (error) {
    console.error("Error resetting landing page content:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to reset content",
    };
  }
}

// =============================================================================
// PUBLIC ACTIONS (No auth required)
// =============================================================================

// Get public landing page content (for the actual landing page)
export async function getPublicLandingContent(): Promise<
  ApiResponse<LandingPageContent>
> {
  try {
    const collection = await getCollection<RawLandingPageContent>("landing_page");
    const content = await collection.findOne({});

    if (!content) {
      return {
        success: true,
        data: {
          ...DEFAULT_LANDING_CONTENT,
          updatedAt: new Date(),
          updatedBy: "system",
        } as LandingPageContent,
      };
    }

    return {
      success: true,
      data: JSON.parse(JSON.stringify(normalizeLandingPageContent(content))),
    };
  } catch (error) {
    console.error("Error getting public landing content:", error);
    return {
      success: true,
      data: {
        ...DEFAULT_LANDING_CONTENT,
        updatedAt: new Date(),
        updatedBy: "system",
      } as LandingPageContent,
    };
  }
}
