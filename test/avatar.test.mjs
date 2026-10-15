import { test } from "node:test";
import assert from "node:assert/strict";
import { avatarInitials, createAvatar, updateAvatar } from "../js/avatar.js";

// Just enough DOM for js/avatar.js: elements, classes, attributes, children,
// and an error event the test can fire.
function fakeDocument() {
  const doc = {
    createElement(tag) {
      const el = {
        nodeType: 1,
        tagName: tag.toUpperCase(),
        ownerDocument: doc,
        childNodes: [],
        attributes: {},
        dataset: {},
        listeners: {},
        className: "",
        textContent: "",
        parent: null,
        get classList() {
          const self = this;
          const list = () => self.className.split(/\s+/).filter(Boolean);
          return {
            contains: (name) => list().includes(name),
            add: (name) => { if (!list().includes(name)) self.className = [...list(), name].join(" "); },
            remove: (name) => { self.className = list().filter((item) => item !== name).join(" "); },
            toggle: (name, on) => { self.className = [...list().filter((item) => item !== name), ...(on ? [name] : [])].join(" "); },
          };
        },
        setAttribute(name, value) { this.attributes[name] = String(value); },
        getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; },
        querySelector(selector) {
          if (selector.startsWith(".")) return this.childNodes.find((node) => node.className === selector.slice(1)) || null;
          return this.childNodes.find((node) => node.tagName === selector.toUpperCase()) || null;
        },
        replaceChildren(...children) {
          for (const node of this.childNodes) node.parent = null;
          this.childNodes = children;
          for (const node of children) node.parent = this;
        },
        append(child) { child.parent = this; this.childNodes.push(child); },
        remove() {
          if (!this.parent) return;
          this.parent.childNodes = this.parent.childNodes.filter((node) => node !== this);
          this.parent = null;
        },
        addEventListener(type, handler) { this.listeners[type] = handler; },
        dispatch(type) { this.listeners[type]?.(); },
      };
      return el;
    },
  };
  return doc;
}

const img = (el) => el.childNodes.find((node) => node.tagName === "IMG");
const letters = (el) => el.childNodes.find((node) => node.className === "dk-avatar__initials").textContent;

test("initials: first letter of the first two words, ? when empty", () => {
  assert.equal(avatarInitials("Orin Vale"), "OV");
  assert.equal(avatarInitials("  grace  "), "G");
  assert.equal(avatarInitials("ada byron lovelace"), "AB");
  assert.equal(avatarInitials(""), "?");
  assert.equal(avatarInitials(undefined), "?");
});

test("no photo: initials only, decorative, sized", () => {
  const el = createAvatar({ document: fakeDocument(), name: "Orin Vale", size: "xs", className: "extra" });
  assert.equal(el.className, "dk-avatar dk-avatar--xs extra");
  assert.equal(el.getAttribute("aria-hidden"), "true");
  assert.equal(letters(el), "OV");
  assert.equal(img(el), undefined);
});

test("photo: laid over the initials with no referrer", () => {
  const el = createAvatar({ document: fakeDocument(), name: "Orin Vale", src: "https://photos.example/a/x=s64-c" });
  assert.equal(letters(el), "OV");
  const photo = img(el);
  assert.equal(photo.getAttribute("src"), "https://photos.example/a/x=s64-c");
  assert.equal(photo.getAttribute("referrerpolicy"), "no-referrer");
  assert.equal(photo.alt, "");
  assert.ok(el.classList.contains("dk-avatar--photo"));
  assert.equal(el.dataset.avatarPhoto, "shown");
});

test("a photo that fails to load is removed and the initials remain", () => {
  const el = createAvatar({ document: fakeDocument(), name: "Orin Vale", src: "https://photos.example/missing" });
  img(el).dispatch("error");
  assert.equal(img(el), undefined);
  assert.equal(letters(el), "OV");
  assert.ok(!el.classList.contains("dk-avatar--photo"));
  assert.equal(el.dataset.avatarPhoto, "failed");
});

test("re-rendering an unchanged avatar keeps its nodes and does not refetch a failed photo", () => {
  const doc = fakeDocument();
  const el = createAvatar({ document: doc, name: "Orin Vale", src: "https://photos.example/ok" });
  const [label, photo] = el.childNodes;
  updateAvatar(el, { name: "Orin Vale", src: "https://photos.example/ok" });
  assert.equal(el.childNodes[0], label);
  assert.equal(el.childNodes[1], photo);
  updateAvatar(el, { name: "Orin Vale", src: "https://photos.example/broken" });
  img(el).dispatch("error");
  updateAvatar(el, { name: "Orin Vale", src: "https://photos.example/broken" });
  assert.equal(img(el), undefined);
  assert.equal(el.childNodes[0], label);
  assert.equal(el.dataset.avatarPhoto, "failed");
});

test("only absolute https URLs become photos", () => {
  for (const src of ["http://photos.example/a", "javascript:alert(1)", "data:image/png;base64,AA", "/relative.png", "not a url"]) {
    const el = createAvatar({ document: fakeDocument(), name: "G", src });
    assert.equal(img(el), undefined, src);
  }
});

test("update re-points an existing avatar and replaces static text", () => {
  const doc = fakeDocument();
  const el = doc.createElement("span");
  el.className = "dk-avatar dk-avatar--sm";
  el.append({ nodeType: 3, textContent: "?" });
  updateAvatar(el, { name: "Grace", src: "https://photos.example/g" });
  assert.equal(el.childNodes.length, 2);
  assert.equal(letters(el), "G");
  const first = img(el);
  updateAvatar(el, { name: "Grace", src: "https://photos.example/g" });
  assert.equal(img(el), first, "same photo keeps the loaded image");
  updateAvatar(el, { name: "Orin Vale" });
  assert.equal(img(el), undefined);
  assert.equal(letters(el), "OV");
});
