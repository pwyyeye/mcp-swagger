# API文档查询工具（MCP）

本项目提供了一个简单易用且功能强大的 MCP 工具，专门用于处理和查询 OpenAPI（Swagger、Knife4j）文档。通过模糊匹配 API 摘要（summary），快速定位所需接口信息，极大提升开发效率。

## 核心功能：

- **Swagger 和 Knife4j 文档支持**：完美适配 OpenAPI 3.0.1 标准，兼容 Swagger 和 Knife4j 生成的 API 文档。
- **模糊搜索**：通过 API 摘要快速模糊匹配，精准定位接口。
- **详细解析**：自动解析 API 路径、参数、请求体、响应体及 Schema 引用关系，提供完整的接口详情。
- **易于集成**：可快速配置到 Cursor MCP 环境，开箱即用。

## 项目结构

- `src/apiService.ts`: API文档处理服务，从本地文件读取API文档并提供搜索功能
- `src/index.ts`: MCP服务程序，提供与上层应用的通信接口
- `tests/apiService.test.ts`: 测试脚本，用于测试API服务的功能

## 使用方法

### 启动API文档处理服务

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

### 配置到Cursor MCP

要将此服务配置到Cursor MCP，请按照以下步骤操作：

1. 构建项目并确保服务可正常运行：

   ```bash
   # 构建项目
   npm run build
   ``` 

2. 在Cursor中配置MCP：

   - 打开Cursor
   - 进入设置（Settings），找到"MCP"部分
   - 点击"添加新工具"（Add Tool）
   - 填写以下信息：
     - 名称（Name）：API文档查询工具
     - 命令（Command）：node /path/to/your/api-docs-mcp/dist/index.js 
        示例：node D:\code\mcp\dist
     - 支持的工具（Supported Tools）：search_apis_summary


3. 验证配置：

   配置完成后，可以在Cursor中尝试使用该工具：
   
   ```
   @search_apis_summary 用户
   ```

   这将搜索摘要中包含"用户"关键词的所有API。 

### 搜索API

使用MCP客户端连接到服务后，可以使用`search_apis_summary`工具来搜索API：

```typescript
// 示例：搜索包含"用户"关键词的API
const result = await mcp.runTool("search_apis_summary", {
  keyword: "用户"
});

console.log(JSON.stringify(result, null, 2));
```

## 返回的API详情结构

```typescript
interface ApiDetail {
  // 基本信息
  path: string;        // API路径
  method: string;      // HTTP方法（GET, POST, PUT等）
  summary: string;     // API摘要
  description?: string; // API详细描述
  operationId?: string; // 操作ID
  tags?: string[];     // API标签列表
  
  // 参数信息
  parameters?: Array<{
    name: string;      // 参数名称
    in: string;        // 参数位置（path, query, header等）
    description: string; // 参数描述
    required: boolean;  // 是否必须
    schema: any;       // 参数类型描述
  }>;
  
  // 请求体信息
  requestBody?: {
    description: string; // 请求体描述
    required: boolean;   // 是否必须
    content: Record<string, { // 按内容类型分组
      schema: any;        // 请求体schema描述
    }>;
  };
  
  // 响应信息
  responses?: Record<string, { // 按状态码分组
    description: string;     // 响应描述
    content?: Record<string, { // 按内容类型分组
      schema: any;          // 响应schema描述
    }>;
  }>;
}
``` 

## 开发

### 运行测试

```bash
npm test
```

## 注意事项

- 确保输入的API文档符合OpenAPI 3.0.1规范
- 搜索仅匹配API的summary字段
- 返回的API详情包含完整的参数、请求体和响应信息 