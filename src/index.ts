import {launch, PuppeteerLaunchOptions, Page, KnownDevices, Device} from 'puppeteer';
import {screenshots} from './screenshots';
import {diffImageDirectory} from "./diff-image";

const executablePath = process.env.CHROME_EXECUTABLE_PATH;
const CONTROL_DIR = 'dist/control';
const EXPERIMENTAL_DIR = 'dist/experimental';

type BrowserOptions = {
  disableImage?: boolean;
  disableJs: boolean;
  ignoreElements?: string[];
  device?: 'iOS' | 'desktop' | 'Android' | 'iPad' | Device | keyof typeof KnownDevices;
} & PuppeteerLaunchOptions;

async function commonBeforeCallback(page: Page, options?: BrowserOptions) {
  if (options?.disableImage) {
    // 拦截所有的图片请求
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (request.resourceType() === 'image') {
        request.abort();
      } else {
        request.continue();
      }
    });
  }
  // 禁用 js
  if (options?.disableJs) {
    await page.setJavaScriptEnabled(false);
  }

  if (options?.device) {
    if (options.device === 'iOS') {
      await page.emulate(KnownDevices['iPhone 13 Pro Max']);
    } else if (options.device === 'Android') {
      await page.emulate(KnownDevices['Pixel 2 XL']);
    } else if (options.device === 'iPad') {
      await page.emulate(KnownDevices['iPad Pro 11 landscape']);
    } else if (options.device === 'desktop') {
    } else if ((options.device as keyof typeof KnownDevices) in KnownDevices) {
      await page.emulate(KnownDevices[options.device as keyof typeof KnownDevices]);
    } else {
      await page.emulate(options.device as Device);
    }
  }
}

async function commonAfterCallback(page: Page, options?: BrowserOptions) {
  // 忽略特定元素, 本质上就是将这些元素的 opacity 设置为 0
  if (options?.ignoreElements) {
    await page.addStyleTag({
      content: options.ignoreElements.map(selector => `${selector} { opacity: 0 !important; }`).join('\n')
    });
  }
}

async function controlGroupBrowser({urls}: { urls: string[] }, options?: BrowserOptions,) {
  const browser = await launch(
    {
      headless: true,
      executablePath,
      ...options,
    }
  );
  await screenshots({urls, browser}, {
    directory: CONTROL_DIR,
    pageBeforeCallback: async (page: Page) => await commonBeforeCallback(page, options),
    pageAfterCallback: async (page: Page) => await commonAfterCallback(page, options)
  });
  await browser.close();
}


async function experimentalGroupBrowser({urls}: { urls: string[] }, options?: BrowserOptions) {
  const browser = await launch(
    {
      headless: true,
      executablePath,
      ...options,
    }
  );

  await screenshots({urls, browser}, {
    directory: EXPERIMENTAL_DIR, pageBeforeCallback: async (page: Page) => {
      await commonBeforeCallback(page, options);
    }, pageAfterCallback: async (page: Page) => await commonAfterCallback(page, options)
  });
  await browser.close();
}


const options: BrowserOptions = {
  disableImage: true,
  disableJs: true,
  ignoreElements: [],
}

async function run() {
  await Promise.all([
    experimentalGroupBrowser({urls: ['https://www.google.com']}, options),
    controlGroupBrowser({urls: ['https://www.google.com']}, options),
  ]).then(() => {
    console.log('Browser Finished');
  })

  diffImageDirectory(EXPERIMENTAL_DIR, CONTROL_DIR, 'dist/diff').then((i) => {
    console.log('i', i);
    console.log('Diff Image Finished');
  })
}

run();
