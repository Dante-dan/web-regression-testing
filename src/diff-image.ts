import {
  readdir,
  readFileSync,
  createWriteStream,
  mkdirSync,
  rmdirSync,
  existsSync,
  copyFileSync,
  statSync,
  rmSync
} from 'fs';
import { join } from 'path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
import {promiseExecutor} from "./promise-executor";

export function diffImageDirectory(experimentalDir: string, controlDir: string, diffDir:string, options?: pixelmatch.PixelmatchOptions) {
  rmSync(diffDir, { recursive: true, force: true })
  mkdirSync(diffDir, { recursive: true });
  // 以文件目录为单位，对比两个目录下的所有图片
  return new Promise((resolve, reject) => {
    readdir(experimentalDir, { encoding: "utf-8", recursive: true }, (err, files) => {
      if (err) {
        reject(err);
        console.error(err);
        return;
      }
      const tasks = files.map(file => {
        return () => {
          return new Promise((resolve, reject) => {
            const experimentalFileStr = join(experimentalDir, file);
            const controlFileStr = join(controlDir, file);
            if (!experimentalFileStr.endsWith('.png') || !controlFileStr.endsWith('.png')) {
              // experimentalFileStr 是一个目录, 则应该在 diffDir 下新建这个目录
              if(statSync(experimentalFileStr).isDirectory()) {
                const diffFileStr = join(diffDir, file);
                mkdirSync(diffFileStr, { recursive: true });
                resolve(1);
                return;
              }
              console.log('Path is not a PNG image, skipping ' + file);
              resolve(1);
              return;
            }
            if(!existsSync(controlFileStr)) {
              // 不存在则应该将 experimentalDir 下的文件复制到 diffDir
              const experimental = readFileSync(experimentalFileStr);
              const diffFileStr = join(diffDir, file);
              copyFileSync(experimentalFileStr, diffFileStr);
              resolve(1);
              return;
            }
            const experimental = PNG.sync.read(
              readFileSync(experimentalFileStr)
            );
            const control = PNG.sync.read(
              readFileSync(controlFileStr)
            );
            const { width, height } = experimental;
            const diff = new PNG({ width, height });
            console.log('Comparing ' + file);
            const diffPixels = pixelmatch(
              experimental.data,
              control.data,
              diff.data,
              width,
              height,
              options
            );
            diff.pack().pipe(
              createWriteStream(
                join(diffDir, file.replace('.png', '-diff.png'))
              )
            );
            resolve(diffPixels);
          });
        };
      });
      promiseExecutor(tasks, 10, 2, 1000)
        .then((i) => {
          console.log('All images compared successfully');
          resolve(i);
        })
        .catch(err => {
          reject(err);
        });
    });
  });
}
