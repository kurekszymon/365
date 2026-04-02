// export function getMemoryUsage() {
//   const memoryUsage = process.memoryUsage();
//   return {
//     rss: memoryUsage.rss, // Resident Set Size - total memory allocated for the process
//     heapTotal: memoryUsage.heapTotal, // total size of the allocated heap
//     heapUsed: memoryUsage.heapUsed, // actual memory used during the execution
//     external: memoryUsage.external, // memory used by C++ objects bound to JavaScript objects managed by V8
//     arrayBuffers: memoryUsage.arrayBuffers, // memory allocated for ArrayBuffers and SharedArrayBuffers, including all Node.js Buffers
//   };
// }

/**
 * Check memory usage before and after executing a function, and log the difference in memory usage.
 * Useful when want to measure intermediary assignments or operations that may cause memory leaks or excessive memory usage.
 * @param {string} name
 * @param {() => Promise<void>} fn
 */
async function test(name, fn) {
  const formatMemMB = (mem) => `${(mem / 1024 / 1024).toFixed(2)} MB`;

  const startMem = process.memoryUsage().heapUsed;

  await fn();

  const endMem = process.memoryUsage().heapUsed;

  console.log(`Memory usage: ${formatMemMB(endMem - startMem)} for: ${name}`);
}

test("Benchmark", async () => {
  console.log(132);
});
