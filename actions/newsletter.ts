"use server";

import { getCollection } from "@/lib/db";
import { NewsletterSubscriber } from "@/types/newsletter";
import { z } from "zod";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export async function subscribeToNewsletter(email: string) {
  try {
    const validData = emailSchema.parse({ email });
    const collection = await getCollection<NewsletterSubscriber>("newsletter_subscribers");

    const existingSubscriber = await collection.findOne({ email: validData.email });

    if (existingSubscriber) {
      if (existingSubscriber.status === "unsubscribed") {
        await collection.updateOne(
          { _id: existingSubscriber._id },
          { $set: { status: "subscribed", subscribedAt: new Date() } }
        );
        return { success: true, message: "Welcome back! You have been resubscribed." };
      }
      return { success: true, message: "You are already subscribed." };
    }

    await collection.insertOne({
      email: validData.email,
      subscribedAt: new Date(),
      status: "subscribed",
    });

    return { success: true, message: "Thank you for subscribing!" };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: error.issues[0].message };
    }
    console.error("Newsletter subscription error:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}

export async function getNewsletterSubscribers() {
  const collection = await getCollection<NewsletterSubscriber>("newsletter_subscribers");
  const subscribers = await collection.find({}).sort({ subscribedAt: -1 }).toArray();
  // Serialize ObjectId and Date for client components if needed, or return plain objects
  return subscribers.map(sub => ({
    ...sub,
    _id: sub._id?.toString(),
    subscribedAt: sub.subscribedAt.toISOString(),
  }));
}
