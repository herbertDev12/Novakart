import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dir = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(dir, "..", "messages");
const locales = ["en", "es"];

function flattenKeys(obj, prefix = "") {
  return Object.entries(obj).flatMap(([key, value]) => {
    const keyPath = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return flattenKeys(value, keyPath);
    }
    return [keyPath];
  });
}

const keysByLocale = Object.fromEntries(
  locales.map((locale) => {
    const filePath = path.join(messagesDir, `${locale}.json`);
    const messages = JSON.parse(readFileSync(filePath, "utf-8"));
    return [locale, new Set(flattenKeys(messages))];
  }),
);

const [reference, ...rest] = locales;
let hasDrift = false;

for (const locale of rest) {
  const missingInLocale = [...keysByLocale[reference]].filter(
    (key) => !keysByLocale[locale].has(key),
  );
  const missingInReference = [...keysByLocale[locale]].filter(
    (key) => !keysByLocale[reference].has(key),
  );

  if (missingInLocale.length > 0) {
    hasDrift = true;
    console.error(`Missing in ${locale}.json (present in ${reference}.json):`);
    missingInLocale.forEach((key) => console.error(`  - ${key}`));
  }

  if (missingInReference.length > 0) {
    hasDrift = true;
    console.error(`Missing in ${reference}.json (present in ${locale}.json):`);
    missingInReference.forEach((key) => console.error(`  - ${key}`));
  }
}

if (hasDrift) {
  process.exit(1);
}

console.log("Message keys match across all locales.");
