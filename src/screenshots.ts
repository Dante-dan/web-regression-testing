import {Browser, Page} from "puppeteer";
import {existsSync, mkdirSync, rmSync} from "fs";
import {join} from "path";
import {matchDynamicUrl, sleep} from "./utils";
import {promiseExecutor} from "./promise-executor";

export async function screenshots({urls, browser}: { urls: string[], browser: Browser }, options?: {
  directory: string,
  pageBeforeCallback?: (page: Page) => Promise<void>,
  pageAfterCallback?: (page: Page) => Promise<void>
}) {
  const distDir = options?.directory || 'dist/';
  rmSync(distDir, {recursive: true, force: true});
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
      await page.goto(url, {waitUntil: 'networkidle0', timeout: 3000});
      await options?.pageAfterCallback?.(page);
      process.env.debug && console.log(`watting for Screenshot ${url}`);
      try {
        // wait page layout stable
        await sleep(300);
        await page.screenshot({path: filename, fullPage: true});
        process.env.debug && console.log(`Screenshot saved to ${filename}`);
        await page.close();
        return Promise.resolve(filename);
      } catch (e) {
        process.env.debug && console.error(`Screenshot Error: ${e}`);
        await page.close();
        return Promise.reject(url);
      }
    }
  });
  return await promiseExecutor(screenshot, 2, 5, 5000);
}
