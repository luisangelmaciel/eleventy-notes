import { notesModule } from "../notes/index.js";
import { parse } from "node-html-parser";

/**
 * Creates the collection factory of all links.
 * @param {import("@11ty/eleventy").UserConfig} eleventyConfig
 * @returns The collection function
 */
export const linksCollection = (eleventyConfig) => (collectionApi) => {
  const notes = notesModule._notesCollection(eleventyConfig)(collectionApi);

  function getNoteTitle(note) {
    return note.data.title || note.page.fileSlug;
  }

  let _parsedNotes;
  function getParsedNotes() {
    return (_parsedNotes ??= Object.fromEntries(
      notes.map((note) => {
        return [note.url, { ...note, dom: parse(note.content) }];
      })
    ));
  }

  let _links;
  function getLinks() {
    return (_links ??= Object.fromEntries(
      notes.map((note) => {
        const { dom } = getParsedNotes()[note.url];
        const links = Array.from(dom.querySelectorAll("a[href]"));
        const filteredLinks = links
          .map((link) => [
            link.attributes.href?.split("#")[0],
            link.textContent,
          ])
          .filter(([href], idx, list) => {
            return !!href && list.findIndex(([h]) => h === href) === idx;
          });
        return [note.url, filteredLinks];
      })
    ));
  }

  function readLinks(note) {
    const notesMap = getParsedNotes();
    const links = getLinks();
    const currentLinks = links[note.url];

    const outgoing = currentLinks
      .filter(([url]) => !!notesMap[url])
      .map(([url]) => ({
        url,
        title: getNoteTitle(notesMap[url]),
      }));

    const incoming = Object.keys(links)
      .filter((url) => links[url].some(([href]) => href === note.url))
      .map((url) => ({
        url,
        title: getNoteTitle(notesMap[url]),
      }));

    const external = currentLinks
      .filter(([href]) => /^https?:\/\//.test(href))
      .map(([url, title]) => ({ url, title }));

    return {
      outgoing,
      incoming,
      external,
    };
  }

  const linksPerNote = notes.map((note) => {
    let result;
    return [note.url, () => (result ??= readLinks(note))];
  });

  return Object.fromEntries(linksPerNote);
};
