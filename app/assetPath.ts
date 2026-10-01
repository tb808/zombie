// Next.js does not add basePath to files loaded directly from public/.
export const assetPath = (path: string) =>
  `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}${path}`;
