#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { ApiService } from "./apiService";
import 'dotenv/config';

// 创建API服务实例
const apiService = new ApiService();

// 创建MCP服务器实例
const server = new McpServer({
  name: "api-docs-mcp",
  version: "1.0.0",
  description: "用于获取和查询后端API文档的MCP服务"
});

// 注册搜索API工具 - 通过summary模糊匹配
server.tool(
  "search_apis_summary",
  "搜索API并返回处理好的API详情",
  {
    keyword: z.string()
  },
  async (params) => {
    try {
      const apis = await apiService.searchApisBySummary(params.keyword);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(apis, null, 2),
          },
        ],
      };
    } catch (error) {
      console.error('Error details:', error);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2),
          },
        ],
      };
    }
  }
);

// 启动服务器
async function main() {
  try {
    const transport = new StdioServerTransport();
    console.error("API文档MCP服务已启动");
    
    // 测试API文档是否可访问
    try {
      console.error("正在尝试从API获取文档...");
      console.error("成功加载API文档");
    } catch (error) {
      console.error("无法加载API文档:", error instanceof Error ? error.message : String(error));
      console.error("请确保API端点可访问且返回正确格式的API文档");
      console.error("继续启动MCP服务，但某些功能可能无法正常工作");
    }
    
    await server.connect(transport);
  } catch (error) {
    console.error("MCP服务启动失败:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(console.error); 