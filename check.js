import axios from "axios";
import fs from "fs";
import path from "path";
import https from "https";
import pLimit from "p-limit";
import urls from "./urls.json" assert { type: "json" };
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const CONCURRENCY_LIMIT = 20;

const checkSinglePage = async (url) => {
  try {
    const res = await axios.get(url, {
      timeout: 10000,
      httpsAgent,
    });

    const html = res.data;
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : "";

    const isSoft404 = /404|page not found/i.test(pageTitle) || pageTitle === "";

    if (
      res.status === 200 &&
      typeof html === "string" &&
      html.trim().length > 0
    ) {
      if (isSoft404) {
        console.warn(`⚠️ Soft 404: ${url} - Title: "${pageTitle}"`);
        return { type: "softError", url };
      } else {
        console.log(`✅ Success: ${url}`);
        return { type: "success", url };
      }
    } else {
      console.warn(`⚠️ Empty or Invalid Content: ${url}`);
      return { type: "failure", url };
    }
  } catch (err) {
    console.error(`❌ Failed: ${url} - ${err.message}`);
    return { type: "failure", url };
  }
};

const checkPages = async (urls) => {
  const success = [];
  const failure = [];
  const softError = [];

  const limit = pLimit(CONCURRENCY_LIMIT);
  const checks = urls.map((url) => limit(() => checkSinglePage(url)));

  const results = await Promise.all(checks);

  results.forEach(({ type, url }) => {
    if (type === "success") success.push(url);
    if (type === "failure") failure.push(url);
    if (type === "softError") softError.push(url);
  });

  return { success, failure, softError };
};

// Run the checker and save results to result.json
(async () => {
  const result = await checkPages(urls);
  const outputPath = path.resolve(__dirname, "result.json");

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n📄 Result written to result.json`);
})();
