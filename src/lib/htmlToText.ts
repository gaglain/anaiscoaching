/**
 * Convertit un contenu potentiellement HTML (emails entrants) en texte lisible.
 * Supprime les balises, décode les entités et retire les citations de réponse.
 */
export function htmlToText(input: string | null | undefined): string {
  if (!input) return "";
  let text = input;

  const looksLikeHtml = /<\/?[a-z][\s\S]*>/i.test(text);

  if (looksLikeHtml) {
    // Supprime les blocs non affichables
    text = text.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, "");
    // Supprime les citations du message précédent
    text = text.replace(/<blockquote[\s\S]*?<\/blockquote>/gi, "");
    // Sauts de ligne
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n");
    // Retire les balises restantes
    text = text.replace(/<[^>]+>/g, "");
  }

  // Décodage des entités courantes
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&rsquo;": "’",
    "&lsquo;": "‘",
    "&ldquo;": "“",
    "&rdquo;": "”",
    "&eacute;": "é",
    "&egrave;": "è",
    "&agrave;": "à",
    "&ccedil;": "ç",
  };
  text = text.replace(/&[a-zA-Z#0-9]+;/g, (match) => {
    if (entities[match]) return entities[match];
    const num = match.match(/^&#(\d+);$/);
    if (num) return String.fromCharCode(Number(num[1]));
    const hex = match.match(/^&#x([0-9a-fA-F]+);$/);
    if (hex) return String.fromCharCode(parseInt(hex[1], 16));
    return match;
  });

  // Retire les citations texte type "Le ... a écrit :"
  const quoteMarkers = [
    /\n\s*Le .+ a écrit\s?:/,
    /\n\s*On .+ wrote:/,
    /\n\s*-----\s*Original Message\s*-----/i,
    /\n\s*>{1,}/,
  ];
  for (const marker of quoteMarkers) {
    const idx = text.search(marker);
    if (idx > 0) {
      text = text.substring(0, idx);
      break;
    }
  }

  return text
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
