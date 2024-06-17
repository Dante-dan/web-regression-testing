# web-regression-testing
This is an easy-to-use web regression testing tool that you can use it to easily compare two web pages.
It is based on puppeteer, pixelmatch and Node.js

## Installation
If you have [proto](https://moonrepo.dev/docs/proto/install) installed, you can install this package by running the following command:

```bash
proto use
pnpm i
```
If you don't have [proto](https://moonrepo.dev/docs/proto/install) installed, you can install this package by running the following command:

```bash
npm i
```
You can found the versions of tools in `.prototolls` [file](./.prototools).

## Usage
You can run the following command to compare two web pages:

```bash
pnpm run dev
```
And The Diff image will be saved in `./dist/diff` folder, and the director will be named by the path of the web pages.
You can change the url of the web pages in `./src/index.ts` file.

## Q&A

> Source Image Size vs Target Image Size

Because `pixelmatch` rule, the source image and target image should have the same size. If the size of the source image and target image are different, the diff image will be blank.


