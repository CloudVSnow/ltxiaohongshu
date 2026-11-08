import { checkConnection } from '@lt/contracts';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export function authRequest(path: string, method: 'GET' | 'POST' = 'GET', data?: object): Promise<unknown> {
  return new Promise((resolve, reject) => uni.request({
    url: `${baseUrl}/auth${path}`, method, data, timeout: 10000, withCredentials: true,
    success(response) {
      if (response.statusCode >= 200 && response.statusCode < 300) { resolve(response.data); return; }
      const messages: Record<number, string> = {
        400: '请输入有效邮箱和 8–64 个字符的密码', 401: '邮箱或密码错误，或登录已失效',
        403: '请求来源不受信任，请检查访问地址', 409: '该邮箱已注册，请切换登录', 429: '操作过于频繁，请稍后再试'
      };
      reject(new ApiError(response.statusCode, messages[response.statusCode] ?? '服务暂不可用，请稍后重试'));
    }, fail() { reject(new ApiError(0, '连接失败，请检查网络后重试')); }
  }));
}
export function checkApiConnection() {
  return checkConnection(path => new Promise((resolve, reject) => {
    uni.request({
      url: `${baseUrl}${path}`, timeout: 5000,
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) resolve(response.data);
        else reject(new Error('服务暂不可用'));
      },
      fail() { reject(new Error('连接失败')); }
    });
  }));
}
