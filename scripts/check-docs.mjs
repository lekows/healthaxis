#!/usr/bin/env node
// check:docs — valida que links markdown relativos apontam para arquivos existentes.
//
// Varre todos os *.md do repo (exceto node_modules/.git/.next) e extrai links da
// forma [texto](caminho). Falha (exit 1) se algum link relativo apontar para um
// arquivo local inexistente. Links absolutos (http/https/mailto), âncoras (#...) e
// referências em backticks do "Mapa das specs" do CLAUDE.md são ignorados de
// propósito — este script checa links markdown reais, não menções a specs futuras.

import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOT = process.cwd();
const IGNORE_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build"]);
const LINK_RE = /\[[^\]]*\]\(([^)]+)\)/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      out.push(...walk(join(dir, entry.name)));
    } else if (entry.name.endsWith(".md")) {
      out.push(join(dir, entry.name));
    }
  }
  return out;
}

function isExternal(target) {
  return (
    /^(https?:|mailto:|tel:)/i.test(target) ||
    target.startsWith("#") ||
    target.startsWith("//")
  );
}

const problems = [];

for (const file of walk(ROOT)) {
  const content = readFileSync(file, "utf8");
  let m;
  while ((m = LINK_RE.exec(content)) !== null) {
    let target = m[1].trim();
    // Remove título opcional: [txt](path "Title")
    target = target.split(/\s+/)[0];
    // Remove âncora: path#section
    const pathPart = target.split("#")[0];
    if (!pathPart || isExternal(target)) continue;

    const abs = resolve(dirname(file), pathPart);
    if (!existsSync(abs) || !statSync(abs).isFile()) {
      problems.push(`${file}: link quebrado → ${target}`);
    }
  }
}

if (problems.length > 0) {
  console.error("check:docs — links markdown quebrados encontrados:");
  for (const p of problems) console.error("  " + p);
  process.exit(1);
}

console.log("check:docs — OK, nenhum link markdown quebrado.");
