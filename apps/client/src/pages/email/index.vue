<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { emailSchema, emailTokenSchema, resetPasswordSchema } from '@lt/contracts';
import { authRequest } from '../../api';
import { currentAccount } from '../../auth';

const mode = ref<'verify' | 'reset' | 'forgot'>('forgot');
const email = ref(''); const password = ref(''); const confirmPassword = ref('');
const token = ref(''); const busy = ref(false); const message = ref(''); const done = ref(false);
onLoad(query => {
  mode.value = query?.mode === 'verify' ? 'verify' : query?.mode === 'reset' ? 'reset' : 'forgot';
  token.value = query?.token ?? '';
});
async function submit() {
  if (busy.value || done.value) return;
  message.value = '';
  const data = mode.value === 'forgot' ? emailSchema.safeParse({ email: email.value })
    : mode.value === 'verify' ? emailTokenSchema.safeParse({ token: token.value })
    : resetPasswordSchema.safeParse({ token: token.value, password: password.value });
  if (!data.success || (mode.value === 'reset' && password.value !== confirmPassword.value)) {
    message.value = mode.value === 'forgot' ? '请输入有效邮箱' : mode.value === 'verify' ? '链接无效，请重新申请' : '请检查链接和新密码（8–64 个字符），并确保两次密码一致'; return;
  }
  busy.value = true;
  try {
    await authRequest(mode.value === 'forgot' ? '/password/forgot' : mode.value === 'verify' ? '/email/verify' : '/password/reset', 'POST', data.data);
    message.value = mode.value === 'forgot' ? '如果该邮箱可用，重置邮件将发送至你的邮箱，请稍后查看。' : mode.value === 'verify' ? '邮箱验证成功' : '密码已重置，请重新登录';
    if (mode.value === 'reset') currentAccount.value = null;
    done.value = true; token.value = ''; password.value = ''; confirmPassword.value = '';
  } catch (reason) { message.value = reason instanceof Error ? reason.message : '操作失败，请稍后重试'; }
  finally { busy.value = false; }
}
function login() { uni.reLaunch({ url: '/pages/auth/index' }); }
function me() { uni.reLaunch({ url: '/pages/me/index' }); }
function retry() { done.value = false; message.value = ''; }
</script>
<template>
  <view class="page">
    <text class="title">{{ mode === 'verify' ? '验证邮箱' : mode === 'reset' ? '设置新密码' : '找回密码' }}</text>
    <text class="intro">{{ mode === 'verify' ? '点击确认，完成邮箱归属验证。' : mode === 'reset' ? '重置后所有设备都需要重新登录。' : '输入注册邮箱，我们将发送一次性重置链接。' }}</text>
    <view v-if="!done" class="form">
      <input v-if="mode === 'forgot'" v-model="email" aria-label="邮箱" class="input" placeholder="注册邮箱" :maxlength="254" :disabled="busy" />
      <template v-if="mode === 'reset'">
        <input v-model="password" aria-label="新密码" class="input" :password="true" placeholder="新密码（8–64 个字符）" :maxlength="256" :disabled="busy" />
        <input v-model="confirmPassword" aria-label="确认密码" class="input" :password="true" placeholder="再次输入新密码" :maxlength="256" :disabled="busy" />
      </template>
      <button role="button" :disabled="busy" :loading="busy" @click="submit">{{ mode === 'verify' ? '确认验证' : mode === 'reset' ? '重置密码' : '发送重置邮件' }}</button>
    </view>
    <text v-if="message" aria-live="polite" class="message">{{ message }}</text>
    <button v-if="mode === 'forgot' && done" role="button" class="secondary" @click="retry">重新申请</button>
    <button v-if="mode === 'verify'" role="button" class="secondary" @click="me">返回我的</button>
    <button v-else role="button" class="secondary" @click="login">返回登录</button>
  </view>
</template>
<style scoped>
.page { max-width: 520px; margin: 0 auto; padding: 64rpx 40rpx; }
.title { display: block; font-size: 48rpx; font-weight: 700; }
.intro, .message { display: block; font-size: 28rpx; line-height: 1.8; color: #666; margin: 28rpx 0; }
.form { background: white; padding: 32rpx; border-radius: 24rpx; }
.input { background: #f6f5f2; padding: 24rpx; height: 48rpx; border-radius: 12rpx; margin-bottom: 24rpx; font-size: 28rpx; }
button { background: #a34f3d; color: white; border-radius: 16rpx; font-size: 28rpx; }
.secondary { background: transparent; color: #8c4536; margin-top: 24rpx; }
</style>
