let counter = 0;

export const uniqueId = (prefix: string) => `${prefix}_${counter++}`;
