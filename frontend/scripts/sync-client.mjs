// Reads ../client/client.toml ([branding] + [business].name) and writes the frontend's build-time
// branding (src/config/brand.generated.json) and logo (public/brand/). Runs before `dev` and
// `build`, so a client deployment only edits client/client.toml and client/branding/logo.*.
// No secrets are read here: client.toml never contains any.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "smol-toml";

const here = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(here, "../../client");
const file = process.env.CLIENT_CONFIG_PATH
  ? resolve(process.env.CLIENT_CONFIG_PATH)
  : join(clientDir, "client.toml");

const defaults = {
  productName: "BILEKSA",
  companyName: "BILEKSA HVAC",
  tagline: "AI receptionist for HVAC contractors",
  accent: "#2dd4bf",
  supportEmail: "support@bileksa.com",
  supportPhone: "",
  publicSite: "marketing",
  logo: "",
};

let brand = { ...defaults };
if (existsSync(file)) {
  const data = parse(readFileSync(file, "utf8"));
  const b = data.branding ?? {};
  const accent = /^#[0-9a-fA-F]{6}$/.test(b.accent ?? "") ? b.accent : defaults.accent;
  brand = {
    productName: b.product_name || defaults.productName,
    companyName: b.company_name || data.business?.name || defaults.companyName,
    tagline: b.tagline || defaults.tagline,
    accent,
    supportEmail: b.support_email || defaults.supportEmail,
    supportPhone: b.support_phone || "",
    publicSite: b.public_site === "login" ? "login" : "marketing",
    logo: "",
  };
  if (b.logo) {
    const src = resolve(dirname(file), b.logo);
    const ext = extname(src).toLowerCase();
    if (existsSync(src) && [".svg", ".png", ".webp", ".jpg", ".jpeg"].includes(ext)) {
      mkdirSync(resolve(here, "../public/brand"), { recursive: true });
      copyFileSync(src, resolve(here, `../public/brand/logo${ext}`));
      brand.logo = `/brand/logo${ext}`;
    } else {
      console.warn(`client.toml: logo ${b.logo} not found or not an image; using the default mark`);
    }
  }
} else {
  console.warn(`${file} not found; using default BILEKSA branding`);
}
mkdirSync(resolve(here, "../src/config"), { recursive: true });
writeFileSync(
  resolve(here, "../src/config/brand.generated.json"),
  JSON.stringify(brand, null, 2) + "\n",
);
console.log(`branding: ${brand.companyName} (${brand.publicSite} site, accent ${brand.accent})`);
