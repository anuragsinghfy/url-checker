import axios from "axios";
import fs from "fs";
import path from "path";
import https from "https";
import pLimit from "p-limit";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const CONCURRENCY_LIMIT = 20;

// STEP 1: Extract URLs from urls.txt
const rawText = fs.readFileSync(path.resolve(__dirname, "urls.txt"), "utf-8");
const matches = rawText.match(/https?:\/\/[\w.-]+(?:\.[\w\.-]+)+(?:[\/\w\.-]*)*/g) || [];
const urls = [...new Set(matches)]; // Deduplicate

fs.writeFileSync(path.resolve(__dirname, "urls.json"), JSON.stringify(urls, null, 2));
console.log(`✅ Extracted ${urls.length} unique URLs to urls.json`);

const checkSinglePage = async (url, attempt = 1) => {
  const MAX_RETRIES = 2;

  try {
    const res = await axios.get(url, {
      timeout: 30000, // 30s timeout
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
        console.warn(`⚠️ Soft 404: ${url} - Title: "\${pageTitle}"`);
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
    const isTimeout = err.code === "ECONNABORTED" || err.message.includes("timeout");

    if (isTimeout && attempt <= MAX_RETRIES) {
      console.warn(`⏱️ Timeout on \${url}, retrying (\${attempt}/\${MAX_RETRIES})...`);
      return await checkSinglePage(url, attempt + 1);
    }

    console.error(`❌ Failed: \${url} - \${err.message}`);
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

// STEP 2: Check URLs and write result
(async () => {
  const result = await checkPages(urls);
  const outputPath = path.resolve(__dirname, "result.json");
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  console.log(`\n📄 Result written to result.json`);
})();
