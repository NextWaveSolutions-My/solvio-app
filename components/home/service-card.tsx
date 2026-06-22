"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth-client";
import { useState } from "react";
import { Loader2, Headphones, Wrench, Download } from "lucide-react";

interface ServiceCardProps {
  title: string;
  description: string;
  iconName: "headphones" | "wrench" | "download";
  route: string;
  iconColor?: string;
  iconBgColor?: string;
}

const iconMap = {
  headphones: Headphones,
  wrench: Wrench,
  download: Download,
};

export function ServiceCard({
  title,
  description,
  iconName,
  route,
  iconColor = "text-info",
  iconBgColor = "bg-info/15",
}: ServiceCardProps) {
  const Icon = iconMap[iconName];
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleClick = () => {
    setIsNavigating(true);

    if (session?.user) {
      // User is authenticated, redirect to the form
      router.push(route);
    } else {
      // User is not authenticated, redirect to login with the intended route
      router.push(`/login?redirect=${encodeURIComponent(route)}`);
    }
  };

  return (
    <Card className="relative overflow-hidden hover:shadow-2xl hover:shadow-primary/20 hover:border-primary/30 transition-all duration-500 cursor-pointer group border-border/60 backdrop-blur-sm bg-linear-to-br from-card/95 to-card/80 hover:-translate-y-1">
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-linear-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      {/* Animated border glow effect */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-linear-to-r from-primary/20 via-primary/10 to-primary/20 blur-xl -z-10" />

      <CardHeader className="text-center pb-4 relative z-10">
        {/* Icon container with enhanced animations */}
        <div className="relative mx-auto w-fit mb-6">
          {/* Pulsing background effect */}
          <div
            className={`absolute inset-0 rounded-2xl ${iconBgColor} blur-md opacity-0 group-hover:opacity-60 transition-opacity duration-500`}
          />

          {/* Main icon container */}
          <div
            className={`relative p-5 rounded-2xl ${iconBgColor} group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 shadow-sm group-hover:shadow-lg`}
          >
            <Icon
              className={`h-10 w-10 ${iconColor} transition-transform duration-500 group-hover:scale-110`}
            />
          </div>
        </div>

        {/* Title with better typography */}
        <CardTitle className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors duration-300">
          {title}
        </CardTitle>

        {/* Description with improved readability */}
        <CardDescription className="text-base mt-2 leading-relaxed text-muted-foreground/90 group-hover:text-muted-foreground transition-colors duration-300">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="text-center pt-2 relative z-10">
        <Button
          onClick={handleClick}
          className="w-full rounded-xl py-6 font-semibold text-base shadow-md hover:shadow-xl transition-all duration-300 group-hover:scale-[1.02] active:scale-[0.98]"
          disabled={isPending || isNavigating}
        >
          {isNavigating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <span>Get {title}</span>
              <svg
                className="w-4 h-4 ml-1 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
