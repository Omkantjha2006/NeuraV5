const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim();

export const appEnv = {
  apiUrl: apiUrl ? apiUrl.replace(/\/$/, '') : '',
  useMockData: (import.meta.env.VITE_USE_MOCK_DATA ?? 'false') === 'true',
};
