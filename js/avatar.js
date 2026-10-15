// Dakit avatar: a person's initials, with their photo on top when there is one.
//
// ES module, no globals:
//   import { createAvatar, updateAvatar, avatarInitials } from "dakit/dist/avatar.js";
//
//   createAvatar({ name: "Orin Vale", src, size: "xs" })   → <span class="dk-avatar dk-avatar--xs">
//   updateAvatar(element, { name, src })                   re-point an existing .dk-avatar
//
// The initials are always rendered. The photo is an <img> laid over them, so
// while it loads, when there is none, and after it fails to load, the avatar
// still reads as the person. A failed photo is removed, not left as a broken
// image. The photo is requested with no referrer: photo hosts such as Google's
// may refuse hotlinked requests that carry one, and the page URL is nobody
// else's business.
//
// The avatar is decorative (aria-hidden): the caller puts the name next to
// it or on the owning element's accessible label.

const SIZES = new Set(["xs", "sm", "lg"]);

// One person, up to two letters: the first letter of the first two words,
// uppercased; "?" for an empty name.
export function avatarInitials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((part) => [...part][0]).join("").toUpperCase();
}

// Only an absolute https URL becomes an <img>; anything else (empty, relative,
// http, data:, javascript:) leaves the initials alone.
function photoUrl(src) {
  if (!src) return "";
  try {
    const url = new URL(String(src));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

export function updateAvatar(element, { name = "", initials, src = "" } = {}) {
  const doc = element.ownerDocument;
  const letters = initials || avatarInitials(name);
  const href = photoUrl(src);
  let label = null;
  let img = null;
  for (const child of [...element.childNodes]) {
    if (child.nodeType === 1 && child.tagName === "IMG") img = child;
    else if (child.nodeType === 1 && child.classList?.contains("dk-avatar__initials")) label = child;
    else child.remove();
  }
  if (!label) {
    label = doc.createElement("span");
    label.className = "dk-avatar__initials";
    element.prepend(label);
  }
  label.textContent = letters;
  element.setAttribute("aria-hidden", "true");
  if (!href) {
    img?.remove();
    element.classList.remove("dk-avatar--photo");
    delete element.dataset.avatarPhoto;
    return element;
  }
  if (img && img.getAttribute("src") === href) return element;
  img?.remove();
  img = doc.createElement("img");
  img.alt = "";
  img.decoding = "async";
  img.setAttribute("referrerpolicy", "no-referrer");
  img.addEventListener("error", () => {
    img.remove();
    element.classList.remove("dk-avatar--photo");
    element.dataset.avatarPhoto = "failed";
  }, { once: true });
  img.setAttribute("src", href);
  element.append(img);
  element.classList.add("dk-avatar--photo");
  element.dataset.avatarPhoto = "shown";
  return element;
}

export function createAvatar({ document: doc = globalThis.document, name = "", initials, src = "", size = "", className = "" } = {}) {
  const element = doc.createElement("span");
  element.className = ["dk-avatar", SIZES.has(size) ? `dk-avatar--${size}` : "", className].filter(Boolean).join(" ");
  return updateAvatar(element, { name, initials, src });
}
