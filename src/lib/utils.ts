/**
 * Helper to mimic Python's defaultdict plus-equal operator.
 */
export const defaultdictPlusEqual = <T>(
  mapping: Map<T, number>,
  key: T,
  value: number,
): void => {
  const curVal = mapping.get(key) ?? 0;
  mapping.set(key, curVal + value);
};

/**
 * Helper to mimic python's lstrip function
 */
export const lstrip = (str: string, chars: string): string => {
  const regex = new RegExp(`^${chars}+`);
  return str.replace(regex, '');
};
