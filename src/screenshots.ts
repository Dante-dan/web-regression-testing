import {Browser, Page} from "puppeteer";
import {existsSync, mkdirSync, rmSync} from "fs";
import {join, dirname, basename} from "path";
import {sleep} from "./utils";
import {promiseExecutor} from "./promise-executor";

export async function screenshots({urls, browser}: { urls: string[], browser: Browser }, options?: {
  directory: string,
  pageBeforeCallback?: (page: Page) => Promise<void>,
  pageAfterCallback?: (page: Page) => Promise<void>,
  getFilename?: (path: string, index?: number) => string,
}) {
  const distDir = options?.directory || 'dist/';
  rmSync(distDir, {recursive: true, force: true});
  mkdirSync(distDir, {recursive: true});
  const getFileNameFromUrl = options?.getFilename || ((path, index) => `${(path[path.length - 1] === '/' ? path.slice(0, -1) : path) || 'root'}/${index}`);
  const screenshot = urls.map((url, index) => {
    if (!url) {
      throw new Error('url is required');
    }
    return async () => {
      try {
        const urlObj = new URL(url);
        const filename = getFileNameFromUrl(urlObj.pathname, index) + '.png';
        const pathname = dirname(filename);
        const baseFileName = basename(filename);
        const dir = join(distDir, urlObj.hostname, ...pathname.split('/'));
        if (!existsSync(dir)) {
          mkdirSync(dir, {recursive: true});
        }
        const page = await browser.newPage();
        await page.setCacheEnabled(true);
        await options?.pageBeforeCallback?.(page);
        await page.goto(url, {waitUntil: 'networkidle0', timeout: 3000});
        await options?.pageAfterCallback?.(page);
        process.env.DEBUG && console.log(`watting for Screenshot ${url}`);
        try {
          // wait page layout stable
          await sleep(300);
          await page.screenshot({path: join(dir, baseFileName), fullPage: true});
          process.env.DEBUG && console.log(`Screenshot saved to ${join(dir, baseFileName)}`);
          await page.close();
          return Promise.resolve(filename);
        } catch (e) {
          console.error(`Screenshot Error: ${e}`);
          await page.close();
          return Promise.reject(url);
        }
      } catch (e) {
        console.error(e);
        return Promise.reject(e);
      }
    }
  });
  return await promiseExecutor(screenshot, 2, 5, 5000);
}
