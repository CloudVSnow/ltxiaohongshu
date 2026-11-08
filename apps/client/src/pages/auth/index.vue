<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { credentialsSchema } from '@lt/contracts';
import { authenticate, loginDestination } from '../../auth';

const mode = ref<'login' | 'register'>('login');
const email = ref('');
const password = ref('');
const busy = ref(false);
const error = ref('');
let destination = '/pages/me/index';
onLoad(query => { destination = loginDestination(query?.returnTo); });
function toggle() {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  password.value = '';
  error.value = '';
}
function forgot() { uni.navigateTo({ url: '/pages/email/index?mode=forgot' }); }
async function submit() {
  if (busy.value) return;
  error.value = '';
  const parsed = credentialsSchema.safeParse({ email: email.value, password: password.value });
  if (!parsed.success) { error.value = '请输入有效邮箱和 8–64 个字符的密码'; return; }
  busy.value = true;
  try {
    await authenticate(mode.value, parsed.data);
    password.value = '';
    uni.redirectTo({ url: destination });
  } catch (reason) { error.value = reason instanceof Error ? reason.message : '操作失败，请重试'; }
  finally { busy.value = false; }
}
</script>
<template>
  <view class="page">
    <text class="eyebrow">图文社区</text>
    <text class="title">{{ mode === 'login' ? '欢迎回来' : '从分享开始' }}</text>
    <text class="intro">{{ mode === 'login' ? '登录后，收藏灵感，记录生活。' : '创建账号，加入我们的图文社区。' }}</text>
    <view class="form">
      <text class="label">邮箱</text>
      <input v-model="email" :disabled="busy" class="input" type="text" placeholder="请输入邮箱" :maxlength="254" aria-label="邮箱" />
      <text class="label">密码</text>
      <input v-model="password" :disabled="busy" class="input" :password="true" placeholder="8–64 个字符，不会自动去除空格" :maxlength="256" aria-label="密码" @confirm="submit" />
      <text v-if="error" role="alert" class="error">{{ error }}</text>
      <button role="button" class="primary" :disabled="busy" :loading="busy" @click="submit">{{ mode === 'login' ? '登录' : '注册并登录' }}</button>
      <button role="button" class="secondary" :disabled="busy" @click="toggle">{{ mode === 'login' ? '没有账号？去注册' : '已有账号？去登录' }}</button>
      <button v-if="mode === 'login'" role="button" class="secondary" :disabled="busy" @click="forgot">忘记密码</button>
    </view>
    <text class="notice">注册后可在「我的」发送验证邮件，确认邮箱归属。</text>
  </view>
</template>
<style scoped>
.page { max-width: 520px; padding: 64rpx 40rpx; margin: 0 auto; }
.eyebrow { color: #a35d49; font-size: 28rpx; }
.title { display: block; font-size: 56rpx; font-weight: 700; margin-top: 28rpx; }
.intro { display: block; color: #666; margin: 20rpx 0 48rpx; font-size: 28rpx; }
.form { padding: 36rpx; background: white; border-radius: 24rpx; }
.label { display: block; font-size: 28rpx; margin-bottom: 16rpx; }
.input { background: #f6f5f2; border-radius: 12rpx; padding: 24rpx; height: 48rpx; margin-bottom: 32rpx; font-size: 28rpx; }
.primary { background: #a34f3d; color: white; border-radius: 16rpx; font-size: 30rpx; margin-top: 24rpx; }
.secondary { background: transparent; color: #8c4536; font-size: 28rpx; margin-top: 16rpx; }
.error { display: block; color: #b42318; font-size: 26rpx; line-height: 1.6; }
.notice { display: block; color: #666; font-size: 24rpx; line-height: 1.8; margin-top: 32rpx; }
</style>
