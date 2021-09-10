/// <reference path="./_deploy.d.ts" />

import { httpStatusText, lookupMimeType, Marked, tag as h } from "./deps.ts";

function genResponseArgs(
  status: number,
  init?: ResponseInit,
): [BodyInit, ResponseInit] {
  const statusText = `${httpStatusText(status)}`;
  return [`${status}: ${statusText}`, { ...(init || {}), status, statusText }];
}

const sourceDir = "docs";
const siteName = "diplodocus";

const navLinks: Array<NavLink> = [
  { path: "/about", title: "About" },
  {
    title: "Lorem",
    items: [
      { path: "/lorem/01", title: "Lorem 01" },
      { path: "/lorem/02", title: "Lorem 02" },
      { path: "/lorem/03", title: "Lorem 03" },
      { path: "/lorem/04", title: "Lorem 04" },
      { path: "/lorem/05", title: "Lorem 05" },
      { path: "/lorem/06", title: "Lorem 06" },
    ],
  },
];

type NavLink = {
  title: string;
  path?: string;
  items?: Array<NavLink>;
};

function genNavbar(links: Array<NavLink>): string {
  return h(
    "ul",
    ...links.map(({ path = "#", title, items }) =>
      items
        ? h("li", h("span", title), genNavbar(items))
        : h("li", h("a", { href: path }, title))
    ),
  );
}

function renderPage(content: string): string {
  return "<!DOCTYPE html>" +
    h(
      "html",
      h(
        "head",
        h("meta", { charset: "UTF-8" }),
        h("title", siteName),
        h("meta", {
          name: "viewport",
          content: "width=device-width,initial-scale=1.0,minimum-scale=1.0",
        }),
        h("link", {
          rel: "icon",
          // type: "image/png",
          href: "https://twemoji.maxcdn.com/v/13.1.0/72x72/1f4e6.png",
        }),
        h("link", {
          rel: "stylesheet",
          href: "https://cdn.jsdelivr.net/npm/holiday.css@0.9.8",
        }),
      ),
      h(
        "body",
        h(
          "header",
          h("h1", { id: "site-name" }, h("a", { href: "/" }, siteName)),
          h("div", "this is description"),
        ),
        h("nav", { id: "header-nav" }, genNavbar(navLinks)),
        h("main", content),
        h(
          "footer",
          "Powered by ",
          h(
            "a",
            { href: "https://github.com/kawarimidoll/deno-diplodocus" },
            "diplodocus",
          ),
        ),
      ),
    );
}

const listener = Deno.listen({ port: 8080 });
if (!Deno.env.get("DENO_DEPLOYMENT_ID")) {
  const { hostname, port } = listener.addr;
  console.log(`HTTP server listening on http://${hostname}:${port}`);
}

async function handleConn(conn: Deno.Conn) {
  const httpConn = Deno.serveHttp(conn);
  for await (const e of httpConn) {
    e.respondWith(handler(e.request));
  }
}

async function readData(filePath: string, parseMd = false): Promise<BodyInit> {
  try {
    const data = await Deno.readFile(filePath);

    if (filePath.endsWith(".md") && parseMd) {
      const { content, meta } = Marked.parse(new TextDecoder().decode(data));
      console.log({ meta });
      return renderPage(content);
    }

    return data;
  } catch (error) {
    const subject = `${error}`.split(":")[0];

    if (subject === "NotFound" && filePath.endsWith(".html")) {
      return readData(filePath.replace("html", "md"), true);
    }

    // in other cases, throw error transparency
    throw error;
  }
}

async function handler(request: Request) {
  const url = new URL(request.url);
  const { href, origin, host, hash, search } = url;
  let { pathname } = url;

  console.log({ href, origin, host, pathname, hash, search });

  if (pathname === "/") {
    pathname += "index";
  } else if (pathname.endsWith("/")) {
    return new Response(
      ...genResponseArgs(302, {
        headers: { location: pathname.slice(0, -1) },
      }),
    );
  }

  const tailPath = pathname.split("/").at(-1) || "";
  let ext = tailPath.includes(".") ? tailPath.split(".").at(-1) : "";

  if (!ext) {
    pathname += ".html";
    ext = "html";
  }

  const mimeType = lookupMimeType(ext);
  const filePath = `${sourceDir}${pathname}`;

  console.log({ pathname, ext, mimeType, filePath });

  if (!mimeType) {
    return new Response(...genResponseArgs(400));
  }

  try {
    const data = await readData(filePath);

    return new Response(data, {
      headers: { "content-type": mimeType },
    });
  } catch (error) {
    console.error(error);

    const subject = `${error}`.split(":")[0];
    if (subject === "NotFound") {
      return new Response(...genResponseArgs(404));
    }

    return new Response(...genResponseArgs(500));
  }
}

for await (const conn of listener) {
  handleConn(conn);
}
