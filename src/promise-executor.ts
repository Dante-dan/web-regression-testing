export function promiseExecutor(tasks: (() => Promise<unknown>)[], concurrentLimit: number = 5, retryLimit: number = 2, delay: number = 1000) {
  let activePromises = 0;
  let completedTasks = 0;
  let taskAttempts = new Array(tasks.length).fill(0);

  return new Promise((resolve, reject) => {
    function tryTask(i: number) {
      if (taskAttempts[i] >= retryLimit) {
        reject(new Error('Task ' + i + ' failed after ' + retryLimit + ' attempts'));
        return;
      }
      tasks[i]()
        .then(() => {
          completedTasks++;
          if (completedTasks === tasks.length) {
            resolve('All tasks completed successfully');
          } else {
            runNextTask();
          }
        })
        .catch(() => {
          setTimeout(() => tryTask(i), delay);
        });
      taskAttempts[i]++;
    }

    function runNextTask() {
      while (activePromises < concurrentLimit && completedTasks + activePromises < tasks.length) {
        for (let i = 0; i < tasks.length && activePromises < concurrentLimit; i++) {
          if (taskAttempts[i] === 0) {
            activePromises++;
            tryTask(i);
          }
        }
      }
    }

    runNextTask();
  });
}
