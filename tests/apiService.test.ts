import { ApiService } from '../src/apiService';
import axios from 'axios';
import path from 'path';

// 定义API详情对象的接口
interface ApiDetail {
  path: string;
  method: string;
  summary: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: any[];
  requestBody?: any;
  responses?: Record<string, any>;
}

// 模拟axios模块
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiService', () => {
  // 测试searchApisBySummary方法
  describe('searchApisBySummary', () => {
    beforeEach(() => {
      // 重置所有模拟
      jest.clearAllMocks();
    });
    
    it('应该根据summary关键词查找并返回处理好的API详情', async () => {
      // 模拟API文档数据
      const mockApiDocsData = {
        openapi: '3.0.1',
        info: {
          title: '测试API文档',
          version: '1.0.0'
        },
        paths: {
          '/api/users': {
            get: {
              tags: ['用户管理'],
              summary: '获取用户列表',
              description: '获取系统中的用户列表',
              operationId: 'getUserList'
            },
            post: {
              tags: ['用户管理'],
              summary: '创建新用户',
              description: '在系统中创建新用户',
              operationId: 'createUser'
            }
          },
          '/api/products': {
            get: {
              tags: ['产品管理'],
              summary: '获取产品列表',
              description: '获取系统中的产品列表',
              operationId: 'getProductList'
            }
          }
        },
        components: {
          schemas: {}
        }
      };

      // 设置axios.get的模拟返回值
      mockedAxios.get.mockResolvedValue({ data: mockApiDocsData });

      // 创建ApiService实例
      const apiService = new ApiService();
      
      // 调用searchApisBySummary方法
      const result = await apiService.searchApisBySummary('用户');
      
      // 验证结果是API详情数组
      expect(result.length).toBe(2);
      
      // 使用类型断言确保类型安全
      const firstApi = result[0] as ApiDetail;
      const secondApi = result[1] as ApiDetail;
      
      expect(firstApi.path).toBe('/api/users');
      expect(firstApi.method).toBe('GET');
      expect(firstApi.summary).toBe('获取用户列表');
      
      expect(secondApi.path).toBe('/api/users');
      expect(secondApi.method).toBe('POST');
      expect(secondApi.summary).toBe('创建新用户');
      
      // 验证axios.get是否被正确调用
      expect(mockedAxios.get).toHaveBeenCalled();
    });

    it('应该返回空数组，当没有匹配的summary时', async () => {
      // 模拟API文档数据
      const mockApiDocsData = {
        openapi: '3.0.1',
        info: {
          title: '测试API文档',
          version: '1.0.0'
        },
        paths: {
          '/api/users': {
            get: {
              tags: ['用户管理'],
              summary: '获取用户列表'
            }
          },
          '/api/products': {
            get: {
              tags: ['产品管理'],
              summary: '获取产品列表'
            }
          }
        },
        components: {
          schemas: {}
        }
      };

      // 设置axios.get的模拟返回值
      mockedAxios.get.mockResolvedValue({ data: mockApiDocsData });

      // 创建ApiService实例
      const apiService = new ApiService();
      
      // 调用searchApisBySummary方法，使用不存在的关键词
      const result = await apiService.searchApisBySummary('不存在的关键词');
      
      // 验证结果是空数组
      expect(result).toEqual([]);
    });

    it('应该正确处理异常情况', async () => {
      // 设置axios.get抛出错误
      mockedAxios.get.mockRejectedValue(new Error('API请求失败'));
      
      // 创建ApiService实例
      const apiService = new ApiService();
      
      // 验证searchApisBySummary方法会传递错误
      await expect(apiService.searchApisBySummary('任意关键词')).rejects.toThrow();
    });
  });
});
