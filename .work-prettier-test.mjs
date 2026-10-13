import fs from "node:fs";
import { pathToFileURL } from "node:url";
const mod = (await import(pathToFileURL("D:/repos/mirrors/metropolygonia/node_modules/prettier/index.mjs").href)).default;
console.log("prettier", mod.version);
const files = ["olbaid.js", "embed.js", "sw-embed.js", "snippets/olbaid-abdb8433e54eccc9/inline0.js", "snippets/olbaid-abdb8433e54eccc9/web/olbaid_net.js", "snippets/olbaid-abdb8433e54eccc9/web/olbaid_save.js", "embed.css"];
for (const f of files) {
  const text = fs.readFileSync(f, "utf8");
  const parser = f.endsWith(".css") ? "css" : "babel";
  try {
    const out = await mod.format(text, { parser });
    const again = await mod.format(out, { parser });
    console.log(f, "in", text.length, "out", out.length, "changed:", out !== text, "idempotent:", again === out, "lines:", out.split("\n").length);
  } catch (e) {
    console.log(f, "FORMAT ERROR:", String(e).slice(0, 200));
  }
}
// inline blocks of index.html and embed
for (const [name, path] of [["index.html","index.html"],["embed","embed"]]) {
  const buf = fs.readFileSync(path);
  let p = 0, n = 0;
  while (true) {
    const i = buf.indexOf("<script", p);
    if (i < 0) break;
    const tagEnd = buf.indexOf(">", i);
    const j = buf.indexOf("</script", tagEnd + 1);
    if (j < 0) break;
    const tag = buf.subarray(i, tagEnd + 1).toString("utf8");
    const external = /\bsrc\s*=\s*["']/i.test(tag);
    if (!external) {
      n++;
      const content = buf.subarray(tagEnd + 1, j).toString("utf8");
      try {
        const out = await mod.format(content, { parser: "babel" });
        const again = await mod.format(out, { parser: "babel" });
        console.log(`${name} inline#${n}`, "in", content.length, "out", out.length, "changed:", out !== content, "idempotent:", again === out, "lines:", out.split("\n").length);
      } catch (e) {
        console.log(`${name} inline#${n}`, "FORMAT ERROR:", String(e).slice(0, 150));
      }
    }
    p = j + 8;
  }
}
