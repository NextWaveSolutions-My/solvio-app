"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Minus,
  Link2,
  ImageIcon,
  Undo,
  Redo,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { uploadKBImage } from "@/actions/knowledge-base";

interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

export function TiptapEditor({
  value,
  onChange,
  placeholder = "Start writing...",
  className,
}: TiptapEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: "text-primary underline underline-offset-4" },
      }),
      Image.configure({ HTMLAttributes: { class: "rounded-lg max-w-full" } }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none focus:outline-none min-h-[300px] px-4 py-3 dark:prose-invert",
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Only image files are allowed (JPEG, PNG, GIF, WebP)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const result = await uploadKBImage(formData);
      if (result.success && result.data) {
        editor.chain().focus().setImage({ src: result.data.url }).run();
        toast.success("Image inserted");
      } else {
        toast.error(result.error ?? "Image upload failed");
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const tools: Array<
    | {
        icon: React.ElementType;
        label: string;
        action: () => void;
        active?: boolean;
      }
    | "divider"
  > = [
    {
      icon: Bold,
      label: "Bold",
      action: () => editor.chain().focus().toggleBold().run(),
      active: editor.isActive("bold"),
    },
    {
      icon: Italic,
      label: "Italic",
      action: () => editor.chain().focus().toggleItalic().run(),
      active: editor.isActive("italic"),
    },
    "divider",
    {
      icon: Heading1,
      label: "H1",
      action: () =>
        editor.chain().focus().toggleHeading({ level: 1 }).run(),
      active: editor.isActive("heading", { level: 1 }),
    },
    {
      icon: Heading2,
      label: "H2",
      action: () =>
        editor.chain().focus().toggleHeading({ level: 2 }).run(),
      active: editor.isActive("heading", { level: 2 }),
    },
    {
      icon: Heading3,
      label: "H3",
      action: () =>
        editor.chain().focus().toggleHeading({ level: 3 }).run(),
      active: editor.isActive("heading", { level: 3 }),
    },
    "divider",
    {
      icon: List,
      label: "Bullet List",
      action: () => editor.chain().focus().toggleBulletList().run(),
      active: editor.isActive("bulletList"),
    },
    {
      icon: ListOrdered,
      label: "Ordered List",
      action: () => editor.chain().focus().toggleOrderedList().run(),
      active: editor.isActive("orderedList"),
    },
    {
      icon: Quote,
      label: "Blockquote",
      action: () => editor.chain().focus().toggleBlockquote().run(),
      active: editor.isActive("blockquote"),
    },
    "divider",
    {
      icon: Code,
      label: "Inline Code",
      action: () => editor.chain().focus().toggleCode().run(),
      active: editor.isActive("code"),
    },
    {
      icon: Code2,
      label: "Code Block",
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      active: editor.isActive("codeBlock"),
    },
    {
      icon: Minus,
      label: "Horizontal Rule",
      action: () => editor.chain().focus().setHorizontalRule().run(),
    },
    "divider",
    { icon: Link2, label: "Link", action: addLink, active: editor.isActive("link") },
    { icon: isUploadingImage ? Loader2 : ImageIcon, label: "Image", action: () => imageInputRef.current?.click() },
    "divider",
    {
      icon: Undo,
      label: "Undo",
      action: () => editor.chain().focus().undo().run(),
    },
    {
      icon: Redo,
      label: "Redo",
      action: () => editor.chain().focus().redo().run(),
    },
  ];

  return (
    <div
      className={cn(
        "rounded-lg border border-input bg-background overflow-hidden",
        className
      )}
    >
      {/* Hidden image file input */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleImageFileChange}
        disabled={isUploadingImage}
      />

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 px-2 py-1.5">
        {tools.map((tool, i) => {
          if (tool === "divider") {
            return (
              <div key={i} className="mx-1 h-5 w-px bg-border" />
            );
          }
          const Icon = tool.icon;
          const isImageTool = tool.label === "Image";
          return (
            <Button
              key={tool.label}
              type="button"
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 w-7 p-0",
                tool.active && "bg-primary/10 text-primary",
                isImageTool && isUploadingImage && "opacity-50 cursor-not-allowed"
              )}
              onClick={tool.action}
              disabled={isImageTool && isUploadingImage}
              title={isImageTool ? "Upload image" : tool.label}
            >
              <Icon className={cn("h-3.5 w-3.5", isImageTool && isUploadingImage && "animate-spin")} />
            </Button>
          );
        })}
      </div>

      {/* Editor Content */}
      <EditorContent editor={editor} />
    </div>
  );
}
