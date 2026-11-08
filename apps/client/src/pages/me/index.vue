<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { currentAccount, restoreAccount, logout } from '../../auth';
import { authRequest } from '../../api';
const loading = ref(true);
const busy = ref(false);
const error = ref('');
const mailMessage = ref('');
async function sendVerification() {
  if (busy.value) return;
  busy.value = true; mailMessage.value = '';
  try { await authRequest('/email/request', 'POST'); mailMessage.value = '验证邮件已发送，请查看邮箱（包括垃圾邮件）'; }
  catch (reason) { mailMessage.value = reason instanceof Error ? reason.message : '发送失败，请重试'; }
  finally { busy.value = false; }
}
async function refresh() {
  loading.value = true; error.value = '';
  try { await restoreAccount(); }
  catch { error.value = '无法确认登录状态，请检查网络后重试'; }
  finally { loading.value = false; }
}
onShow(refresh);
function login() { uni.navigateTo({ url: '/pages/auth/index?returnTo=%2Fpages%2Fme%2Findex' }); }
function home() { uni.reLaunch({ url: '/pages/discover/index' }); }
async function signOut() {
  if (busy.value) return;
  busy.value = true; error.value = '';
  try { await logout(); }
  catch { error.value = '退出失败，请重试'; }
  finally { busy.value = false; }
}
</script>
<template>
  <view class="page">
    <text class="title">我的</text>
    <text v-if="loading">正在确认登录状态…</text>
    <view v-else-if="error" role="alert"><text>{{ error }}</text><button role="button" @click="refresh">重新加载</button></view>
    <view v-else-if="currentAccount" class="card">
      <text class="nickname">{{ currentAccount.nickname }}</text>
      <text class="email">{{ currentAccount.email }}</text>
      <text class="description">{{ currentAccount.isEmailVerified ? '邮箱已验证' : '邮箱尚未验证' }}</text>
      <button v-if="!currentAccount.isEmailVerified" role="button" :disabled="busy" @click="sendVerification">发送验证邮件</button>
      <text v-if="mailMessage" aria-live="polite" class="description">{{ mailMessage }}</text>
      <text class="description">欢迎加入社区。图文发布与个人资料编辑即将开放。</text>
      <button role="button" :disabled="busy" :loading="busy" @click="signOut">退出登录</button>
    </view>
    <view v-else class="card">
      <text class="description">登录后，收藏灵感，记录生活。</text>
      <button role="button" @click="login">登录 / 注册</button>
    </view>
    <button role="button" class="home" @click="home">返回发现页</button>
  </view>
</template>
<style scoped>
.page { max-width: 600px; padding: 48rpx 40rpx; margin: 0 auto; }
.title { display: block; font-size: 48rpx; font-weight: 700; margin-bottom: 40rpx; }
.card { padding: 40rpx; background: white; border-radius: 24rpx; }
.nickname { display: block; font-size: 36rpx; font-weight: 600; }
.email { display: block; color: #666; margin-top: 16rpx; overflow-wrap: anywhere; }
.description { display: block; color: #666; font-size: 28rpx; line-height: 1.8; margin: 24rpx 0; }
button { background: #a34f3d; color: white; font-size: 28rpx; border-radius: 16rpx; }
.home { margin-top: 32rpx; background: transparent; color: #8c4536; }
</style>
