"use client";

import { useState } from "react";
import { subscribeToNewsletter } from "@/actions/newsletter";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface NewsletterFormProps {
  placeholder?: string;
  buttonText?: string;
  formClassName?: string;
  inputClassName?: string;
  buttonClassName?: string;
}

export function NewsletterForm({
  placeholder = "Enter your email",
  buttonText = "Subscribe",
  formClassName,
  inputClassName,
  buttonClassName,
}: NewsletterFormProps) {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await subscribeToNewsletter(email);
      if (result.success) {
        toast.success(result.message);
        setEmail("");
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={
        formClassName || "mx-auto flex w-full max-w-xl gap-3"
      }
    >
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        disabled={isLoading}
        className={
          inputClassName ||
          "flex-1 rounded-full border border-border bg-background px-6 py-4 text-foreground outline-none transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
        }
      />
      <button
        type="submit"
        disabled={isLoading}
        className={
          buttonClassName ||
          "flex min-w-[140px] items-center justify-center rounded-full bg-primary px-8 py-4 font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        }
      >
        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : buttonText}
      </button>
    </form>
  );
}
