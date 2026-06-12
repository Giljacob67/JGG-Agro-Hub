/**
 * Gera o hash scrypt (hex) de uma senha para uso nas env vars
 * AUTH_PASSWORD_HASH_GESTAO / _COMERCIAL / _JURIDICO.
 *
 * Uso:
 *   npx tsx scripts/hash-password.ts "minha-senha-forte"
 *   AUTH_PASSWORD_SALT=meu-salt npx tsx scripts/hash-password.ts "minha-senha-forte"
 */
import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error('Uso: npx tsx scripts/hash-password.ts "<senha>"');
  process.exit(1);
}

let salt = process.env.AUTH_PASSWORD_SALT?.trim();
if (!salt) {
  salt = randomBytes(16).toString("hex");
  console.log(`AUTH_PASSWORD_SALT=${salt}`);
  console.log("(salt gerado — configure esta env var junto com o hash)");
}

const hash = scryptSync(password, salt, 32).toString("hex");
console.log(`hash: ${hash}`);
