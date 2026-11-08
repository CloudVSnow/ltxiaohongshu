<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElButton, ElCard, ElTag } from 'element-plus';
import { checkConnection } from '@lt/contracts';

const status = ref<'loading' | 'ready' | 'error'>('loading');
const baseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
async function refresh() {
  status.value = 'loading';
  try {
    await checkConnection(async path => {
      const response = await fetch(`${baseUrl}${path}`, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('服务暂不可用');
      return response.json();
    });
    status.value = 'ready';
  } catch { status.value = 'error'; }
}
onMounted(refresh);
</script>
<template>
  <main>
    <header><p>图文社区 / 管理工作台</p><h1>社区管理后台</h1></header>
    <ElCard shadow="never">
      <h2>服务连接</h2>
      <div aria-live="polite">
        <ElTag :type="status === 'ready' ? 'success' : status === 'error' ? 'danger' : 'info'">
          {{ status === 'ready' ? '服务与数据库已连接' : status === 'error' ? '暂时无法连接服务，请稍后重试' : '正在连接服务…' }}
        </ElTag>
      </div>
      <p>内容审核、举报处理和用户管理将在后续阶段接入。</p>
      <ElButton :loading="status === 'loading'" @click="refresh">重新检查连接</ElButton>
    </ElCard>
  </main>
</template>
<style>
body { margin: 0; background: #f4f6f8; color: #253043; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
main { max-width: 1040px; margin: 0 auto; padding: 48px 24px; }
header { margin-bottom: 32px; }
header p { color: #697586; font-size: 14px; }
h1 { font-size: 30px; }
h2 { margin-top: 0; font-size: 20px; }
.el-card p { color: #697586; line-height: 1.8; }
</style>
