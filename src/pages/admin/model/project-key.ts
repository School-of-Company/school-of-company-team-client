export function suggestProjectKey(name: string): string {
  const letters = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^[0-9]+/, "");
  return letters.length >= 2 ? letters.slice(0, 10) : "PROJ";
}
