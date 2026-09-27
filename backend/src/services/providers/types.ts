export type GatewayRole = 'user' | 'model';

export type GatewayMessage = {
  role: GatewayRole;
  content: string;
};

export type ProviderGenerateOptions = {
  model: string;
  systemPrompt: string;
  messages: GatewayMessage[];
  signal?: AbortSignal;
  temperature?: number;
};

export type AIProvider = {
  id: string;
  name: string;
  defaultModel: string;
  envKey: string;
  isConfigured: () => boolean;
  stream: (options: ProviderGenerateOptions) => AsyncGenerator<string>;
};
