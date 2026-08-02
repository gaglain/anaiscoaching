const ALLOWED_TAGS = new Set([
  "B", "STRONG", "I", "EM", "U", "S", "STRIKE", "BR", "P", "DIV", "SPAN",
  "UL", "OL", "LI", "A", "BLOCKQUOTE", "H1", "H2", "H3",
]);

/**
 * Sanitize HTML produced by the rich text editor (or pasted content):
 * keeps a small allowlist of formatting tags, drops everything else.
 */
export function sanitizeHtml(html: string): string {
  if (typeof document === "undefined") return html;
  const root = document.createElement("div");
  root.innerHTML = html;

  const walk = (node: Element) => {
    Array.from(node.children).forEach((child) => {
      walk(child);
      if (!ALLOWED_TAGS.has(child.tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        return;
      }
      // strip all attributes except safe links
      Array.from(child.attributes).forEach((attr) => child.removeAttribute(attr.name));
      if (child.tagName === "A") {
        const href = (child as HTMLAnchorElement).getAttribute("href") || "";
        child.removeAttribute("href");
        if (/^(https?:|mailto:|tel:)/i.test(href)) {
          child.setAttribute("href", href);
          child.setAttribute("target", "_blank");
          child.setAttribute("rel", "noopener noreferrer");
        }
      }
    });
  };

  walk(root);
  return root.innerHTML;
}

/** True when the HTML has no visible text or content. */
export function isHtmlEmpty(html: string): boolean {
  if (!html) return true;
  const text = html
    .replace(/<br\s*\/?>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length === 0;
}

/** Convert plain text (legacy templates) to simple HTML. */
export function textToHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
}
