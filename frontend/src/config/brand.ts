import generated from "./brand.generated.json";

/** Build-time branding from client/client.toml (see scripts/sync-client.mjs). */
export type Brand = {
  productName: string;
  companyName: string;
  tagline: string;
  accent: string;
  supportEmail: string;
  supportPhone: string;
  publicSite: "marketing" | "login";
  logo: string;
};

export const BRAND = generated as Brand;
