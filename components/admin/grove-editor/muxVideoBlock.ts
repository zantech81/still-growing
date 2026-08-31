import CodeBlock from "@tiptap/extension-code-block";
import { ReactNodeViewRenderer, type Editor } from "@tiptap/react";
import MuxVideoNodeView from "./MuxVideoNodeView";

// Inline video, represented as a CodeBlock whose `language` attr marks
// its state -- "video" (unresolved, freshly inserted, no method chosen
// yet), "mux-video" (resolved, text content is a Mux playback id), or
// "youtube" (resolved, text content is a YouTube video id) -- not a
// wholly new node type. CodeBlock already has correct, built-in markdown
// parse/render (its `language` attr <-> the fenced block's info string,
// its text content <-> the fenced block's body -- see
// @tiptap/extension-code-block's own parseMarkdown/renderMarkdown), so
// extending it reuses that instead of needing custom markdown-tokenizer
// registration for a brand new node per video source. On disk a resolved
// block is plain, valid markdown -- ```mux-video\n{playbackId}\n``` or
// ```youtube\n{videoId}\n``` -- readable by any plain markdown renderer
// as an inert code block; app/grove/page.tsx adds targeted `components.pre`
// overrides to its existing <ReactMarkdown> so each case renders a real
// player/embed instead.
const MuxVideoBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MuxVideoNodeView);
  },
});

export default MuxVideoBlock;

// Always starts unresolved ("video"): MuxVideoNodeView's idle state then
// offers both methods (Mux upload / YouTube link) and rewrites this
// node's `language` attr to whichever one resolves.
export function insertMuxVideoBlock(editor: Editor) {
  editor.chain().focus().insertContent({ type: "codeBlock", attrs: { language: "video" } }).run();
}
