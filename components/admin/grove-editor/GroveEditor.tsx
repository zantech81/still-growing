"use client";

import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import { createClient } from "@/lib/supabase/client";
import EmojiPicker from "@/components/EmojiPicker";
import MuxVideoBlock, { insertMuxVideoBlock } from "./muxVideoBlock";

type Props = {
  initialValue: string; // markdown
  onChange: (markdown: string) => void;
};

export default function GroveEditor({ initialValue, onChange }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState("");
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      MuxVideoBlock,
      Image,
      Markdown,
    ],
    content: initialValue,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none prose-headings:font-display prose-headings:text-plum prose-a:text-pink-deep focus:outline-none min-h-[240px] px-3 py-2",
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getMarkdown());
    },
  });

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    e.target.value = "";

    setImageError("");
    setUploadingImage(true);

    const ext = file.name.split(".").pop() ?? "jpg";
    const path = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const supabase = createClient();
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("grove-post-images")
      .upload(path, file, { upsert: false });

    if (uploadError || !uploadData) {
      console.error("[grove-editor] Image upload error:", uploadError);
      setImageError(uploadError?.message ? `Upload failed: ${uploadError.message}` : "Upload failed. Try again.");
      setUploadingImage(false);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("grove-post-images").getPublicUrl(uploadData.path);

    editor.chain().focus().setImage({ src: publicUrl }).run();
    setUploadingImage(false);
  }

  function applyLink() {
    if (!editor) return;
    const url = linkUrl.trim();
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    } else {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    }
    setLinkUrl("");
    setLinkPanelOpen(false);
  }

  if (!editor) {
    return <div className="border border-gray-200 rounded-lg min-h-[280px] bg-white" />;
  }

  return (
    <div className="border border-gray-200 rounded-lg bg-white focus-within:border-pink-dusty transition-colors">
      <Toolbar
        editor={editor}
        onOpenLinkPanel={() => {
          setLinkUrl(editor.getAttributes("link").href ?? "");
          setLinkPanelOpen((v) => !v);
        }}
        onInsertImage={() => imageInputRef.current?.click()}
        onInsertVideo={() => insertMuxVideoBlock(editor)}
        uploadingImage={uploadingImage}
      />

      {linkPanelOpen && (
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
          <input
            type="text"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                applyLink();
              }
            }}
            placeholder="https://..."
            className="flex-1 text-sm border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-pink-dusty"
            autoFocus
          />
          <button type="button" onClick={applyLink} className="text-xs text-pink-deep hover:underline">
            Apply
          </button>
          <button
            type="button"
            onClick={() => setLinkPanelOpen(false)}
            className="text-xs text-gray-400 hover:text-ink transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {imageError && <p className="text-xs text-pink-deep px-3 pt-2">{imageError}</p>}

      <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={handleImageFileChange} />

      <EditorContent editor={editor} />
    </div>
  );
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      // Without this, the button's default mousedown behavior steals
      // focus from the editor's contentEditable BEFORE onClick runs,
      // collapsing/losing its selection -- editor.chain().focus() in the
      // click handler then refocuses at a default position rather than
      // where the selection actually was, so e.g. toggling a heading
      // silently applies to the wrong place (or nowhere visible).
      // Standard fix for any rich-text toolbar button.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm transition-colors disabled:opacity-40 ${
        active ? "bg-pink-pale text-pink-deep" : "text-gray-400 hover:text-ink hover:bg-gray-50"
      }`}
    >
      {children}
    </button>
  );
}

function Toolbar({
  editor,
  onOpenLinkPanel,
  onInsertImage,
  onInsertVideo,
  uploadingImage,
}: {
  editor: Editor;
  onOpenLinkPanel: () => void;
  onInsertImage: () => void;
  onInsertVideo: () => void;
  uploadingImage: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-100 px-2 py-1.5">
      <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
        <strong>B</strong>
      </ToolbarButton>
      <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <em>I</em>
      </ToolbarButton>
      <ToolbarButton
        label="Heading"
        active={editor.isActive("heading", { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolbarButton>
      <ToolbarButton
        label="Subheading"
        active={editor.isActive("heading", { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolbarButton>
      <ToolbarButton
        label="Bullet list"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        •&#8202;–
      </ToolbarButton>
      <ToolbarButton
        label="Numbered list"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        1.
      </ToolbarButton>
      <ToolbarButton label="Link" active={editor.isActive("link")} onClick={onOpenLinkPanel}>
        🔗
      </ToolbarButton>

      <span className="w-px h-5 bg-gray-100 mx-1" />

      <ToolbarButton label="Insert image" onClick={onInsertImage} disabled={uploadingImage}>
        {uploadingImage ? "…" : "🖼"}
      </ToolbarButton>
      <ToolbarButton label="Insert video" onClick={onInsertVideo}>
        🎬
      </ToolbarButton>
      {/* EmojiPicker's own buttons (both the toggle and each emoji option)
          don't call preventDefault on mousedown -- fine for its original
          textarea use in ReflectionActions.tsx, but here it steals focus
          from the Tiptap editor before onSelect runs, so
          editor.chain().focus() lands back at a stale selection instead
          of where the cursor actually was (reproduced: an emoji picked
          right after applying a link landed inside that link's mark
          instead of after it). Wrapping rather than editing the shared
          component -- this prevents the browser's default focus-shift
          for every mousedown in the subtree, toggle button and emoji
          options alike, without changing EmojiPicker's own behavior
          anywhere else it's used. */}
      <div onMouseDown={(e) => e.preventDefault()}>
        <EmojiPicker onSelect={(emoji) => editor.chain().focus().insertContent(emoji).run()} />
      </div>
    </div>
  );
}
