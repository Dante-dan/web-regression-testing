import {launch, PuppeteerLaunchOptions} from 'puppeteer';
import {promiseExecutor} from './promise-executor';

const executablePath = process.env.CHROME_EXECUTABLE_PATH;

function matchDynamicUrl(path: string) {
  const regex = /^\/(\w+\/)*(\d+)$/;
  const match = path.match(regex);
  if (match) {
    const path = match[1].slice(0, -1);
    const id = match[2];
    return {
      path,
      id,
    }
  } else {
    console.log('URL does not match');
    return path;
  }
}

async function controlGroupBrowser({ urls }: { urls: string[] }, launchOptions?: PuppeteerLaunchOptions, ) {
  const browser = await launch(
    {
      headless: false,
      defaultViewport: null,
      executablePath,
      ...launchOptions,
    }
  );
  const page = await browser.newPage();
  await page.setCacheEnabled(true);

  const screenshot = urls.map((url) => {
    if (!url) {
      throw new Error('url is required');
    }
    return async () => {
      const urlObj = new URL(url);
      await page.goto(url);
      const filename = `${urlObj.hostname}${urlObj.pathname}.png`;
      await page.screenshot({path: 'google.png'});
    }
  });


  await browser.close();
}

async function experimentalGroupBrowser(launchOptions?: PuppeteerLaunchOptions) {
  const browser = await launch(
    {
      headless: false,
      defaultViewport: null,
      executablePath,
      ...launchOptions,
    }
  );
  const page = await browser.newPage();
  await page.setCacheEnabled(true);

  await page.goto('https://www.taptap.cn');
  await page.screenshot({path: 'google.png'});

  await browser.close();
}

async function run() {

}

run();
