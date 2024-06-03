import {Browser, Page} from "puppeteer";
import {existsSync, mkdirSync, rmSync} from "fs";
import {join} from "path";
import {matchDynamicUrl} from "./utils";
import {promiseExecutor} from "./promise-executor";

export async function screenshots({urls, browser}: { urls: string[], browser: Browser }, options?: { directory: string, pageBeforeCallback?: (page: Page) => Promise<void>, pageAfterCallback?: (page: Page) => Promise<void> }) {
  const distDir = options?.directory || 'dist/';
  rmSync(distDir, { recursive: true, force: true });
  mkdirSync(distDir, {recursive: true});
  const screenshot = urls.map((url, index) => {
    if (!url) {
      throw new Error('url is required');
    }
    return async () => {
      const urlObj = new URL(url);
      let {path, id} = matchDynamicUrl(urlObj.pathname);
      const dir = join(distDir, urlObj.hostname, path);
      if (!existsSync(dir)) {
        mkdirSync(dir, {recursive: true});
      }
      const filename = `${dir}/${id || index}.png`;
      const page = await browser.newPage();
      await page.setCacheEnabled(true);
      await options?.pageBeforeCallback?.(page);
      await page.goto(url);
      await options?.pageAfterCallback?.(page);
      await page.screenshot({path: filename});
      await page.close();
    }
  });
  return await promiseExecutor(screenshot, 5, 2, 1000);
}
