/**
 * Messages Page
 *
 * Real-time messaging interface with conversations, messages, and presence.
 */

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-utils";
import type { SessionUser } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { MessagesClient } from "@/components/chat/messages-client";

export const metadata = {
  title: "Messages | Support App",
  description: "Real-time messaging",
};

export default async function MessagesPage() {
  const session = await getSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const userRole = (session.user as SessionUser).role || "customer";

  return (
    <Suspense fallback={<MessagesPageSkeleton />}>
      <MessagesClient
        userId={session.user.id}
        userRole={userRole}
      />
    </Suspense>
  );
}

function MessagesPageSkeleton() {
  return (
    <div className="grid grid-cols-[320px_1fr_300px] h-[calc(100vh-theme(spacing.14)-2rem)] md:h-[calc(100vh-theme(spacing.14)-3rem)] rounded-xl overflow-hidden border border-border/50">
      {/* Left sidebar skeleton */}
      <div className="border-r border-border/50 flex flex-col p-4 space-y-3">
        <Skeleton className="h-8 w-full rounded-lg" />
        <Skeleton className="h-9 w-full rounded-lg" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-7 w-16 rounded-full" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
      {/* Chat area skeleton */}
      <div className="flex flex-col">
        <div className="p-4 border-b border-border/50">
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="flex-1 p-5 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className={`h-16 ${i % 2 === 0 ? "w-3/5 ml-auto" : "w-3/4"}`} />
          ))}
        </div>
        <div className="p-4 border-t border-border/50">
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
      {/* Right panel skeleton */}
      <div className="border-l border-border/50 flex flex-col items-center p-6 space-y-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-4 mt-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-10 rounded-full" />
          ))}
        </div>
        <div className="w-full space-y-2 mt-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
