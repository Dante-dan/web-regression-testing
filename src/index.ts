import {launch, PuppeteerLaunchOptions, Page, KnownDevices, Device} from 'puppeteer';
import { resolve } from 'path';
import {screenshots} from './screenshots';
import {diffImageDirectory} from "./diff-image";
import { PNG } from "pngjs";
import { readFileSync } from "fs";
const executablePath = process.env.CHROME_EXECUTABLE_PATH;
const CONTROL_DIR = 'dist/control';
const EXPERIMENTAL_DIR = 'dist/experimental';

type BrowserOptions = {
  disableImage?: boolean;
  disableJs: boolean;
  ignoreElements?: string[];
  device?: 'iOS' | 'desktop' | 'Android' | 'iPad' | Device | keyof typeof KnownDevices;
} & PuppeteerLaunchOptions;

// https://github.com/puppeteer/puppeteer/issues/10144#issuecomment-1971867293
const SCREENSHOT_PUPPETEER_OPTIONS: PuppeteerLaunchOptions = {
  headless: false,
  ignoreHTTPSErrors: true,
  defaultViewport: null,
  ignoreDefaultArgs: ['--enable-automation'],
  args: [
    '--disable-infobars',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-gpu=False',
    '--enable-webgl',
    '--window-size=1600,900',
    '--start-maximized',
  ],
  timeout: 5_000, // 10 seconds
  protocolTimeout: 5_000, // 20 seconds
}

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
      ...SCREENSHOT_PUPPETEER_OPTIONS,
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
      ...SCREENSHOT_PUPPETEER_OPTIONS,
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
  device: {
    userAgent: KnownDevices['Pixel 2 XL'].userAgent,
    viewport: {
      ...KnownDevices['Pixel 2 XL'].viewport,
      width: 499,
      height: 1700,
      deviceScaleFactor: 1,
    }
  }
}

async function run() {
  await Promise.all([
    experimentalGroupBrowser({urls: ['https://www.google.com']}, options),
    controlGroupBrowser({urls: ['https://www.google.com']}, options),
  ]).then(() => {
    console.log('Browser Finished');
  })

  diffImageDirectory(EXPERIMENTAL_DIR, CONTROL_DIR, 'dist/diff', { threshold: 0.5 }).then((i) => {
    console.log(`Diff All ${i.length} Image Finished`);
    const differentImage = i.filter(([diffPixels]) => diffPixels > 1);
    console.log(`Different Image Count: ${differentImage.length}`);
    console.log(`Same Image Count: ${i.length - differentImage.length}`);
    differentImage.forEach(([diffPixels, diffFile, sourceFile1, sourceFile2]) => {
      if(diffFile) {
        console.log(`Different Image: ${resolve(diffFile)} with ${diffPixels} different pixels`);
      }
      if(sourceFile1 && sourceFile2) {
        const sourceImage1 = PNG.sync.read(readFileSync(sourceFile1));
        const sourceImage2 = PNG.sync.read(readFileSync(sourceFile2));
        console.log(`Source Image Different Size: ${resolve(sourceFile1)}(${sourceImage1.width}x${sourceImage1.height}) vs ${resolve(sourceFile2)}(${sourceImage2.width}x${sourceImage2.height})`);
      }
    });
  })
}

run();
