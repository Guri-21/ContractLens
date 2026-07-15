export function cn(...classes: (string | undefined | null | boolean | Record<string, boolean>)[]) {
  const result: string[] = [];
  classes.forEach((c) => {
    if (!c) return;
    if (typeof c === 'string') {
      result.push(c);
    } else if (typeof c === 'object') {
      Object.entries(c).forEach(([className, enabled]) => {
        if (enabled) result.push(className);
      });
    }
  });
  return result.join(' ');
}
