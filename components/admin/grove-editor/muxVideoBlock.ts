import CodeBlock from "@tiptap/extension-code-block";
import { ReactNodeViewRenderer, type Editor } from "@tiptap/react";
import MuxVideoNodeView from "./MuxVideoNodeView";

// Inline video, represented as a CodeBlock whose `language` attr is
// "mux-video" and whose text content is a Mux playback id -- not a
// wholly new node type. CodeBlock already has correct, built-in markdown
// parse/render (its `language` attr <-> the fenced block's info string,
// its text content <-> the fenced block's body -- see
// @tiptap/extension-code-block's own parseMarkdown/renderMarkdown), so
// extending it reuses that instead of needing custom markdown-tokenizer
// registration for a brand new node. On disk this is plain, valid
// markdown: ```mux-video\n{playbackId}\n```, readable by any plain
// markdown renderer as an inert code block -- app/grove/page.tsx adds one
// targeted `components.code` override to its existing <ReactMarkdown> so
// that specific case renders a real <MuxPlayer> instead.
const MuxVideoBlock = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MuxVideoNodeView);
  },
});

export default MuxVideoBlock;

export function insertMuxVideoBlock(editor: Editor) {
  editor.chain().focus().insertContent({ type: "codeBlock", attrs: { language: "mux-video" } }).run();
}
