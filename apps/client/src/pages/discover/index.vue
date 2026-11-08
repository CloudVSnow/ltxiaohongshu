<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { checkApiConnection } from '../../api';

const status = ref<'loading' | 'ready' | 'error'>('loading');
async function refresh() {
  if (status.value === 'loading' && started) return;
  started = true;
  status.value = 'loading';
  try { await checkApiConnection(); status.value = 'ready'; }
  catch { status.value = 'error'; }
}
let started = false;
function openAccount() { uni.navigateTo({ url: '/pages/me/index' }); }
onMounted(refresh);
</script>
<template>
  <view class="page">
    <text class="eyebrow">分享日常 · 发现灵感</text>
    <button role="button" class="account" @click="openAccount">我的</button>
    <text class="title">让生活里的好，
被更多人看见。</text>
    <view class="card">
      <text class="card-title">欢迎来到图文社区</text>
      <text class="description">这里将收集值得分享的日常。图文发布与浏览功能正在建设中。</text>
      <view aria-live="polite" class="connection">
        <text v-if="status === 'loading'">正在连接服务…</text>
        <text v-else-if="status === 'ready'">服务与数据库已连接</text>
        <text v-else>暂时无法连接服务，请稍后重试</text>
      </view>
      <button role="button" :disabled="status === 'loading'" class="retry" @click="refresh">重新检查连接</button>
    </view>
  </view>
</template>
<style scoped>
.page { max-width: 720px; margin: 0 auto; padding: 64rpx 40rpx; }
.account { float: right; margin-top: -40rpx; font-size: 26rpx; background: transparent; color: #8c4536; }
.eyebrow { display: block; color: #a35d49; font-size: 26rpx; letter-spacing: 3rpx; }
.title { display: block; margin: 30rpx 0 64rpx; font-size: 58rpx; line-height: 1.45; font-weight: 700; white-space: pre-line; }
.card { background: #fff; border-radius: 28rpx; padding: 40rpx; border: 1px solid #eee7df; }
.card-title { display: block; font-size: 36rpx; font-weight: 600; }
.description { display: block; color: #666; font-size: 28rpx; line-height: 1.8; margin-top: 24rpx; }
.connection { margin: 40rpx 0 24rpx; font-size: 26rpx; color: #67614e; }
.retry { background: #a34f3d; color: white; font-size: 28rpx; border-radius: 16rpx; }
.retry[disabled] { opacity: .55; }
</style>
