export function promiseExecutor<T>(tasks: (() => Promise<T>)[], concurrentLimit: number = 5, retryLimit: number = 2, delay: number = 1000): Promise<T[]> {
  let activePromises = 0;
  let completedTasks = 0;
  let taskRetryAttempts = new Array(tasks.length).fill(0);
  const results: T[] = [];
  return new Promise((resolve) => {
    function runTask(index: number) {
      if (index >= tasks.length) {
        return;
      }
      if(completedTasks === tasks.length) {
        return;
      }
      if (activePromises >= concurrentLimit) {
        return;
      }
      activePromises++;
      tasks[index]()
        .then((result) => {
          results[index] = result;
          activePromises--;
          completedTasks++;
          runTask(completedTasks);
        })
        .catch((e) => {
          if (taskRetryAttempts[index] < retryLimit) {
            taskRetryAttempts[index]++;
            process.env.DEBUG && console.error(`Task ${index} failed, retrying...`);
            setTimeout(() => {
              activePromises--;
              runTask(index);
            }, delay);
          } else {
            results[index] = e;
          }
        }).finally(() => {
          if(completedTasks === tasks.length) {
            process.env.DEBUG && console.log(`All ${tasks.length} tasks completed`);
            return resolve(results);
          }
          if(completedTasks < tasks.length && activePromises === 0 && results.length === tasks.length) {
            console.error(`All tasks completed, But ${tasks.length - completedTasks} tasks failed`);
            return resolve(results);
          }
      });
      runTask(index + 1);
    }
    runTask(0);
  });
}
