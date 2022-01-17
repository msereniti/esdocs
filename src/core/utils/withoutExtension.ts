export const withoutExtension = (filePath: string) => {
  if (!filePath.includes('.')) return filePath;

  const parts = filePath.split('.');

  return parts.slice(0, parts.length - 1).join('.');
};
