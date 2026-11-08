import { checkConnection } from '@lt/contracts';

const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
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
