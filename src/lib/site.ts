export const repository = 'https://github.com/ryblust/carven';
export const sourceLink = (path: string) => `${repository}/blob/main/${path}`;
export const href = (path = '') =>
  `${import.meta.env.BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
