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
  return new Promise<[number, string, string?, string?][]>((resolve, reject) => {
    readdir(experimentalDir, { encoding: "utf-8", recursive: true }, (err, files) => {
      if (err) {
        reject(err);
        console.error(err);
        return;
      }
      const tasks = files.map(file => {
        return () => {
          return new Promise<[number,string]>((resolve) => {
            const experimentalFileStr = join(experimentalDir, file);
            const controlFileStr = join(controlDir, file);
            if (!experimentalFileStr.endsWith('.png') || !controlFileStr.endsWith('.png')) {
              // experimentalFileStr 是一个目录, 则应该在 diffDir 下新建这个目录
              if(statSync(experimentalFileStr).isDirectory()) {
                const diffFileStr = join(diffDir, file);
                mkdirSync(diffFileStr, { recursive: true });
                resolve([0, diffFileStr]);
                return;
              }
              console.error('Path is not a PNG image, skipping ' + file);
              resolve([Infinity, file]);
              return;
            }
            if(!existsSync(controlFileStr)) {
              // 对应文件不存在则应该将 experimentalDir 下的文件复制到 diffDir
              const experimental = readFileSync(experimentalFileStr);
              const diffFileStr = join(diffDir, file);
              copyFileSync(experimentalFileStr, diffFileStr);
              resolve([Infinity, diffFileStr]);
              return;
            }
            const experimental = PNG.sync.read(
              readFileSync(experimentalFileStr)
            );
            const control = PNG.sync.read(
              readFileSync(controlFileStr)
            );

            const { width, height } = experimental;
            if (control.width !== width || control.height !== height) {
              process.env.debug && console.log(`Image dimensions do not match: ${width}x${height} vs ${control.width}x${control.height}`);
              // @ts-ignore
              resolve([Infinity, '', experimentalFileStr, controlFileStr]);
              return;
            }
            const diff = new PNG({ width, height });
            process.env.debug && console.log('Comparing ' + file);
            try {
              const diffPixels = pixelmatch(
                experimental.data,
                control.data,
                diff.data,
                width,
                height,
                options
              );
              process.env.debug && console.log('Image compared: ' + file + ' with ' + diffPixels + ' different pixels');
              resolve([diffPixels,join(join(diffDir, file.replace('.png', '-diff.png')))]);
              diff.pack().pipe(
                createWriteStream(
                  join(diffDir, file.replace('.png', '-diff.png'))
                )
              );
            } catch (e) {
              console.error('Error comparing ' + file, e);
              reject(e);
            }
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
