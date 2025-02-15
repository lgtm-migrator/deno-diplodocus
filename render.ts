import { tag as h } from "./deps.ts";
import { Marked } from "./marked.ts";
import { Config, NavLink, PageMeta } from "./mod.ts";
import { aTag, getH1, toTitle } from "./utils.ts";
import { PageLink } from "./mod.ts";

export function genNavbar(links: Array<NavLink>): string {
  return h(
    "ul",
    ...links.map(({ path, title, items }) => {
      path ||= "#";
      title ||= toTitle(path);

      return items
        ? h("li", h("span", title), genNavbar(items))
        : h("li", aTag({ href: path }, title));
    }),
  );
}

export function prismJs(path: string, integrity: string) {
  let tagName = "link";
  const cdnHost = "https://cdn.jsdelivr.net/npm/prismjs@1.24.1/";
  const attr: Record<string, string | boolean> = {
    crossorigin: "anonymous",
    integrity,
  };
  if (path.endsWith("css")) {
    attr.rel = "stylesheet";
    attr.href = `${cdnHost}${path}`;
  } else {
    tagName = "script";
    attr.src = `${cdnHost}${path}`;
    attr.defer = true;
  }

  return h(tagName, attr);
}

export function getPageType(pageUrl: string) {
  return /^https?:\/\/[^\/]+\/?$/.test(pageUrl) ? "website" : "article";
}

export function genToc(tocLevels: Array<number>, content: string) {
  const levels = tocLevels.join("").replace(/[^1-6]/g, "");

  if (!levels) {
    return "";
  }

  const regex = new RegExp(
    `<h([${levels}]) [^>]*id="([^"]+)"[^>]*>(.*?)<\/h[${levels}]>`,
    "g",
  );
  let minLevel = 6;

  const tocMd = (content.match(regex) || []).map((matched) => {
    const [levelStr, id] = (matched.replace(regex, "$1 $2") || "").split(" ");
    const level = Number(levelStr);
    if (level < minLevel) {
      minLevel = level;
    }
    const text = matched.replace(/<[^>]*>/g, "");
    return `${"  ".repeat(level)}- [${text}](#${id})`;
  }).map((str) => str.slice(minLevel * 2)).join("\n");

  const tocHtml = Marked.parse(tocMd).content;

  return tocHtml
    ? h(
      "details",
      { id: "table-of-contents" },
      h("summary", "Table of contents"),
      tocHtml.replace(/\n/g, ""),
    )
    : "";
}

export function genPageLink(
  page?: PageLink,
  attributes?: Record<string, string | number | boolean>,
) {
  return page ? aTag({ ...attributes, href: page.path }, page.title) : "";
}

export function processTitle(title: string, siteName: string) {
  return title && title != siteName ? title + " | " + siteName : siteName;
}

export function genHead({
  content,
  pageUrl,
  siteName,
  description,
  favicon,
  image,
  twitter,
  removeDefaultStyles = false,
  bottomHead = "",
  title = "",
}: {
  content: string;
  pageUrl: string;
  siteName: string;
  description: string;
  favicon: string;
  image: string;
  twitter: string;
  removeDefaultStyles: boolean;
  bottomHead: string;
  title?: string;
}): string {
  const viewport = "width=device-width,initial-scale=1.0,minimum-scale=1.0";
  const pageTitle = processTitle(title || getH1(content), siteName);
  const style = "#table-of-contents{margin:2rem;margin-bottom:0;}" +
    "#neighbors{display:flex;margin-bottom:1rem}" +
    "#neighbors>#prev,#neighbors>#next{display:block;width:50%}" +
    "#neighbors>#next{margin-left:auto}" +
    "#neighbors>#prev::before{content:'« '}#neighbors>#next::after{content:' »'}" +
    ".feather{width:.8rem;height:.8rem;stroke:var(--text-color);stroke-width:2;" +
    "stroke-linecap:round;stroke-linejoin:round;fill:none;" +
    "display:inline-block;margin:0 .05rem 0 .15rem;vertical-align:-.1em;}";

  return h(
    "head",
    h("meta", { charset: "UTF-8" }),
    h("title", pageTitle),
    h("meta", { name: "viewport", content: viewport }),
    h("meta", { name: "description", content: description }),
    h("link", { rel: "icon", href: favicon }),
    h("meta", { property: "og:url", content: pageUrl }),
    h("meta", { property: "og:type", content: getPageType(pageUrl) }),
    h("meta", { property: "og:title", content: pageTitle }),
    h("meta", { property: "og:description", content: description }),
    h("meta", { property: "og:site_name", content: siteName }),
    h("meta", { property: "og:image", content: image }),
    h("meta", { name: "twitter:card", content: "summary" }),
    h("meta", { name: "twitter:site", content: twitter }),
    removeDefaultStyles ? "" : h("link", {
      rel: "stylesheet",
      href: "https://cdn.jsdelivr.net/npm/holiday.css@0.9.8",
    }) + prismJs(
      "themes/prism-tomorrow.css",
      "sha256-0dkohC9ZEupqWbq0hS5cVR4QQXJ+mp6N2oJyuks6gt0=",
    ) + h("style", style),
    bottomHead,
  );
}

export function genNeighbors(
  { prev, next }: { prev?: PageLink; next?: PageLink },
) {
  return prev || next
    ? h(
      "div",
      { id: "neighbors" },
      genPageLink(prev, { id: "prev" }),
      genPageLink(next, { id: "next" }),
    )
    : "";
}

export function genBody({
  content,
  siteName,
  navLinks = [],
  removeDefaultStyles = false,
  bottomBody = "",
  tocLevels = [],
  prev,
  next,
}: {
  content: string;
  siteName: string;
  navLinks: Array<NavLink>;
  removeDefaultStyles: boolean;
  bottomBody: string;
  tocLevels: Array<number>;
  prev?: PageLink;
  next?: PageLink;
}): string {
  const href = "https://github.com/kawarimidoll/deno-diplodocus";
  return h(
    "body",
    h("header", h("h1", aTag({ href: "/" }, siteName))),
    h("nav", { id: "header-nav" }, genNavbar(navLinks)),
    genToc(tocLevels, content),
    h("main", content),
    h(
      "footer",
      genNeighbors({ prev, next }),
      h("div", "Powered by ", aTag({ href }, "Diplodocus")),
    ),
    removeDefaultStyles ? "" : prismJs(
      "components/prism-core.min.js",
      "sha256-dz05jjFU9qYuMvQQlE6iWDtNAnEsmu6uMb1vWhKdkEM=",
    ) + prismJs(
      "plugins/autoloader/prism-autoloader.min.js",
      "sha256-sttoa+EIAvFFfeeIkmPn8ypyOOb6no2sZ2NbxtBXgqU=",
    ),
    bottomBody,
  );
}

export function renderPage({
  content,
  pageMeta,
  siteMeta,
  pageUrl,
}: {
  content: string;
  pageMeta: PageMeta;
  siteMeta: Config;
  pageUrl: string;
}): string {
  const config = { content, pageUrl, ...siteMeta, ...pageMeta };

  return "<!DOCTYPE html>" +
    h("html", { lang: config.lang }, genHead(config), genBody(config));
}
