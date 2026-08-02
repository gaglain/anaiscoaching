import { useEffect, useRef } from "react";
import { Bold, Italic, Underline, List, ListOrdered, Link2, Quote, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";
import { sanitizeHtml, textToHtml } from "@/lib/sanitizeHtml";

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  className?: string;
}

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s);

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Écrivez votre message...",
  minHeight = 140,
  className,
}: RichTextEditorProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const incoming = looksLikeHtml(value) ? value : textToHtml(value);
    if (el.innerHTML !== incoming) el.innerHTML = incoming;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const emit = () => {
    if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML));
  };

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    emit();
  };

  const addLink = () => {
    const url = window.prompt("Adresse du lien (https://...)");
    if (!url) return;
    exec("createLink", url);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const content = html ? sanitizeHtml(html) : textToHtml(text);
    document.execCommand("insertHTML", false, content);
    emit();
  };

  const buttons = [
    { icon: Bold, label: "Gras", action: () => exec("bold") },
    { icon: Italic, label: "Italique", action: () => exec("italic") },
    { icon: Underline, label: "Souligné", action: () => exec("underline") },
    { icon: List, label: "Liste à puces", action: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Liste numérotée", action: () => exec("insertOrderedList") },
    { icon: Quote, label: "Citation", action: () => exec("formatBlock", "<blockquote>") },
    { icon: Link2, label: "Insérer un lien", action: addLink },
    { icon: Eraser, label: "Effacer la mise en forme", action: () => exec("removeFormat") },
  ];

  return (
    <div className={cn("rounded-md border border-border bg-background overflow-hidden", className)}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 px-1 py-1">
        {buttons.map(({ icon: Icon, label, action }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={action}
            className="h-7 w-7 inline-flex items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        style={{ minHeight }}
        className="rich-text-editor px-3 py-2 text-sm outline-none overflow-y-auto max-h-72 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5 [&_a]:underline [&_a]:text-secondary [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground"
      />
    </div>
  );
}
