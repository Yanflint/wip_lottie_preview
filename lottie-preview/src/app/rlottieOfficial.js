
export function openOfficialViewer({ jsonUrl, loop }) {
  try {
    const base = "https://rlottie.github.io/";
    const u = new URL(base);
    if (jsonUrl) u.searchParams.set("file", jsonUrl);
    if (typeof loop === "boolean") u.searchParams.set("loop", loop ? "1" : "0");
    const w = window.open(u.toString(), "_blank", "noopener,noreferrer");
    if (!w) location.href = u.toString();
  } catch (e) {
    location.href = "https://rlottie.github.io/";
  }
}
