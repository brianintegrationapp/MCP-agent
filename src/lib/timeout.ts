/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap with a timeout
 * @param timeoutMs Timeout duration in milliseconds
 * @param operationName Name of the operation for error messaging
 * @returns Promise that rejects with TimeoutError if the timeout is reached
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}
