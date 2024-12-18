const createDebounceManager = () => {
  const timers = new Map<string, NodeJS.Timeout>();

  const debounce = (fileId: string, callback: () => void, delay: number = 10000) => {
    // Clear existing timer for the given fileId
    if (timers.has(fileId)) {
      clearTimeout(timers.get(fileId)!);
    }

    // Set a new timer
    timers.set(
      fileId,
      setTimeout(() => {
        callback();
        timers.delete(fileId); // Remove the timer after execution
      }, delay)
    );
  };

  return {
    debounce,
  };
};

export const debounceManager = createDebounceManager();
