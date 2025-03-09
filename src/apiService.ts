import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const API_DOCS_URL = process.env.API_DOCS_URL || 'http://localhost:8080/v3/api-docs/all';
const API_TIMEOUT = parseInt(process.env.API_TIMEOUT || '30000', 10);

console.log(`API文档URL: ${API_DOCS_URL}`);
console.log(`API超时时间: ${API_TIMEOUT}ms`);

/**
 * API服务类，用于获取和处理后端API文档
 */
export class ApiService {
  /**
   * 构造函数
   */
  constructor() {
    // 初始化ApiService
  }

  /**
   * 获取API文档
   * @returns API文档
   */
  private async getApiDocs() {
    try {
      const response = await axios.get(API_DOCS_URL, {
        timeout: API_TIMEOUT
      });
      return response.data;
    } catch (error) {
      console.error('获取API文档失败:', error);
      throw error;
    }
  }

  /**
   * 通过summary模糊匹配搜索API并返回处理好的API详情
   * @param keyword 关键词（用于匹配summary字段）
   * @returns 处理好的API详情列表
   */
  async searchApisBySummary(keyword: string) {
    try {
      const docs = await this.getApiDocs();
      const paths = docs.paths || {};
      const lowercaseKeyword = keyword.toLowerCase();
      const result = [];
      
      // 遍历所有API路径和方法
      for (const [path, methods] of Object.entries(paths)) {
        for (const [method, details] of Object.entries(methods as Record<string, any>)) {
          const summary = details.summary || '';
          
          // 只匹配summary字段
          if (summary.toLowerCase().includes(lowercaseKeyword)) {
            // 使用processApiDetail处理API详情
            const processedDetails = await this.processApiDetail(details);
            // 添加路径和方法信息
            result.push({
              path,
              method: method.toUpperCase(),
              ...processedDetails
            });
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('搜索API失败:', error);
      throw error;
    }
  }

  /**
   * 处理API详情，提取关键信息，解析引用
   * @param apiDetail API详情原始数据
   * @returns 优化后的API详情
   */
  private async processApiDetail(apiDetail: any) {
    try {
      const docs = await this.getApiDocs();
      const schemas = docs.components?.schemas || {};
      
      // 提取基本信息
      const result: Record<string, any> = {
        summary: apiDetail.summary || '',
        description: apiDetail.description || '',
        operationId: apiDetail.operationId || '',
        tags: apiDetail.tags || [],
      };
      
      // 处理请求参数
      if (apiDetail.parameters) {
        result.parameters = apiDetail.parameters.map((param: any) => ({
          name: param.name,
          in: param.in,
          description: param.description || '',
          required: !!param.required,
          schema: this.simplifySchema(param.schema),
        }));
      }
      
      // 处理请求体
      if (apiDetail.requestBody) {
        result.requestBody = {
          description: apiDetail.requestBody.description || '',
          required: !!apiDetail.requestBody.required,
          content: {},
        };
        
        if (apiDetail.requestBody.content) {
          for (const [contentType, content] of Object.entries(apiDetail.requestBody.content)) {
            result.requestBody.content[contentType] = {
              schema: this.extractSchemaInfo((content as any).schema, schemas),
            };
          }
        }
      }
      
      // 处理响应
      if (apiDetail.responses) {
        result.responses = {};
        
        for (const [statusCode, response] of Object.entries(apiDetail.responses)) {
          result.responses[statusCode] = {
            description: (response as any).description || '',
          };
          
          if ((response as any).content) {
            result.responses[statusCode].content = {};
            
            for (const [contentType, content] of Object.entries((response as any).content)) {
              result.responses[statusCode].content[contentType] = {
                schema: this.extractSchemaInfo((content as any).schema, schemas),
              };
            }
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error('处理API详情失败:', error);
      throw error;
    }
  }
  
  /**
   * 简化Schema对象
   * @param schema Schema对象
   * @returns 简化后的Schema对象
   */
  private simplifySchema(schema: any): any {
    if (!schema) return {};
    
    const result: Record<string, any> = {
      type: schema.type,
    };
    
    if (schema.format) result.format = schema.format;
    if (schema.description) result.description = schema.description;
    if (schema.example !== undefined) result.example = schema.example;
    if (schema.default !== undefined) result.default = schema.default;
    if (schema.enum) result.enum = schema.enum;
    
    return result;
  }
  
  /**
   * 提取Schema信息，并解析引用
   * @param schema Schema对象
   * @param schemas 所有Schema定义
   * @returns 解析后的Schema信息
   */
  private extractSchemaInfo(schema: any, schemas: Record<string, any>): any {
    if (!schema) return {};
    
    // 处理Schema引用
    if (schema.$ref) {
      const refPath = schema.$ref.split('/');
      const schemaName = refPath[refPath.length - 1];
      
      // 获取引用的Schema
      const refSchema = schemas[schemaName];
      if (!refSchema) {
        return { type: 'object', description: `引用未找到: ${schema.$ref}` };
      }
      
      // 提取Schema的基本信息
      const result: Record<string, any> = {
        type: refSchema.type || 'object',
        description: refSchema.description || `${schemaName}的数据结构`,
        properties: {},
      };
      
      // 处理通用响应对象，特别提取data字段的信息
      if (schemaName.startsWith('CommonResult')) {
        result.isCommonResult = true;
        
        if (refSchema.properties) {
          // 始终包含code和msg字段
          result.properties.code = this.simplifySchema(refSchema.properties.code);
          result.properties.msg = this.simplifySchema(refSchema.properties.msg);
          
          // 特别处理data字段，处理嵌套引用
          if (refSchema.properties.data) {
            if (refSchema.properties.data.$ref) {
              // 递归处理data字段中的引用
              result.properties.data = this.extractSchemaInfo(refSchema.properties.data, schemas);
            } else if (refSchema.properties.data.type === 'array' && refSchema.properties.data.items?.$ref) {
              // 处理数组类型的data字段
              result.properties.data = {
                type: 'array',
                items: this.extractSchemaInfo(refSchema.properties.data.items, schemas),
              };
            } else {
              // 其他类型的data字段
              result.properties.data = this.simplifySchema(refSchema.properties.data);
            }
          }
        }
      } else {
        // 处理普通Schema的属性
        if (refSchema.properties) {
          for (const [propName, propSchema] of Object.entries(refSchema.properties)) {
            // 对于每个属性，不再深度处理引用，只提取基本信息
            result.properties[propName] = {
              ...(propSchema as any),
              description: (propSchema as any).description || `${propName}字段`,
            };
            
            // 如果属性也是引用，提供引用名，但不再递归解析
            if ((propSchema as any).$ref) {
              const propRefPath = (propSchema as any).$ref.split('/');
              const propSchemaName = propRefPath[propRefPath.length - 1];
              result.properties[propName].refName = propSchemaName;
            }
          }
        }
      }
      
      // 添加必填字段信息
      if (refSchema.required) {
        result.required = refSchema.required;
      }
      
      return result;
    }
    
    // 处理数组类型
    if (schema.type === 'array' && schema.items) {
      return {
        type: 'array',
        items: this.extractSchemaInfo(schema.items, schemas),
      };
    }
    
    // 处理对象类型
    if (schema.type === 'object' && schema.properties) {
      const result: Record<string, any> = {
        type: 'object',
        properties: {},
      };
      
      for (const [propName, propSchema] of Object.entries(schema.properties)) {
        result.properties[propName] = this.simplifySchema(propSchema as any);
      }
      
      if (schema.required) {
        result.required = schema.required;
      }
      
      return result;
    }
    
    // 处理基本类型
    return this.simplifySchema(schema);
  }
} 