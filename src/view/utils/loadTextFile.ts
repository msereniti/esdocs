export const loadTextFile = async (url: string) => {
  const request = await fetch(url);

  return await request.text();
};
