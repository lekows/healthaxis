#!/usr/bin/env node
/**
 * Cria um novo usuário no Supabase Auth e popula o perfil.
 *
 * Uso:
 *   node scripts/create-user.mjs <email> <senha> <nome> <dob> <sex>
 *
 * Exemplo (Weber de Araujo Folha):
 *   node scripts/create-user.mjs weber@exemplo.com SenhaForte123 "Weber de Araujo Folha" 1979-09-22 male
 *
 * Requer SUPABASE_SERVICE_ROLE_KEY no .env.local além das variáveis padrão.
 */

import { readFileSync, existsSync } from "fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv() {
  const envPath = new URL("../.env.local", import.meta.url).pathname;
  if (!existsSync(envPath)) {
    console.error("❌ Arquivo .env.local não encontrado.");
    process.exit(1);
  }
  const lines = readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const idx = line.indexOf("=");
    if (idx > 0) {
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
      if (key) process.env[key] = val;
    }
  }
}

loadEnv();

const [, , email, password, name, dob, sex] = process.argv;

if (!email || !password || !name || !dob || !sex) {
  console.error("Uso: node scripts/create-user.mjs <email> <senha> <nome> <dob> <sex>");
  console.error('Exemplo: node scripts/create-user.mjs weber@exemplo.com Senha123 "Weber de Araujo Folha" 1979-09-22 male');
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY devem estar no .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

console.log(`\nCriando usuário: ${name} <${email}>`);

const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { name },
});

if (createErr) {
  console.error("❌ Erro ao criar usuário:", createErr.message);
  process.exit(1);
}

const userId = created.user.id;
console.log(`✅ Usuário criado: ${userId}`);

const { error: profileErr } = await admin.from("profiles").upsert({
  id: userId,
  name,
  dob,
  sex,
}, { onConflict: "id" });

if (profileErr) {
  console.error("⚠  Perfil não atualizado:", profileErr.message);
} else {
  console.log(`✅ Perfil salvo: nome="${name}", dob=${dob}, sex=${sex}`);
}

console.log(`\n✨ Pronto! Weber pode fazer login com:`);
console.log(`   Email:  ${email}`);
console.log(`   Senha:  ${password}`);
console.log(`\nApós login, ele acessa /documents e faz upload do PDF do Sabin.`);
