declare module '@modelcontextprotocol/sdk' {
  export const z: any;
  export function createMcpServer(config: any): {
    listen: () => void;
  };
} 