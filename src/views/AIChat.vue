<template>
  <div class="ai-chat-container">
    <van-nav-bar title="AI问答" fixed />
    
    <div class="chat-content">
      <div class="messages-container" ref="messagesContainer">
        <div 
          v-for="(message, index) in messages" 
          :key="index" 
          :class="['message', message.role === 'user' ? 'user-message' : 'ai-message']"
        >
          <div class="message-content">
            <div v-if="message.role === 'assistant' && message.content === ''" class="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div v-else v-html="formatMessage(message.content)"></div>
          </div>
        </div>
      </div>
      
      <div class="input-container">
        <van-field
          v-model="userInput"
          rows="1"
          autosize
          type="textarea"
          placeholder="请输入问题..."
          class="chat-input"
          :maxlength="maxPromptLength"
          @keypress.enter.prevent="sendMessage"
        />
        <van-button 
          type="primary" 
          class="send-button" 
          :disabled="isLoading || !userInput.trim()" 
          @click="sendMessage"
        >
          发送
        </van-button>
      </div>
    </div>
    
    <tab-bar />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import TabBar from '../components/TabBar.vue';
import { showToast } from 'vant';
import * as marked from 'marked';
import DOMPurify from 'dompurify';
import { streamChatMessage } from '../api/ai';
import { checkPrompt, MAX_PROMPT_LENGTH } from '../utils/promptGuard';

// 输入长度上限（与后端 4000 字上限配合，前端先收紧）
const maxPromptLength = MAX_PROMPT_LENGTH;

// 聊天消息
const messages = ref([
  { role: 'assistant', content: '你好！我是AI助手，有什么可以帮助你的吗？' }
]);
const userInput = ref('');
const messagesContainer = ref(null);
const isLoading = ref(false);

// 用于中断进行中的流式请求（离开页面时释放）
let controller = null;

// 格式化消息内容（支持Markdown）
const formatMessage = (content) => {
  if (!content) return '';
  // 使用marked解析Markdown，并用DOMPurify清理HTML
  return DOMPurify.sanitize(marked.parse(content));
};

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || isLoading.value) return;

  // 前端先拦一道提示词注入（换身份、忽略规则、套系统提示词/密钥等）
  const blockedReason = checkPrompt(userInput.value);
  if (blockedReason) {
    showToast(`不支持这类指令（${blockedReason}），换个问法试试`);
    return; // 保留输入内容，方便用户修改
  }

  // 添加用户消息
  const userMessage = userInput.value.trim();
  messages.value.push({ role: 'user', content: userMessage });
  userInput.value = '';

  // 添加AI消息占位
  messages.value.push({ role: 'assistant', content: '' });

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  isLoading.value = true;
  controller = new AbortController();

  try {
    // 排除最后一条空的 assistant 占位，最后一条为当前提问（后端要求）
    const history = messages.value
      .slice(0, -1)
      .map(msg => ({ role: msg.role, content: msg.content }));

    const answer = await streamChatMessage(
      history,
      (chunk) => {
        // 追加增量内容并保持滚动到底部
        messages.value[messages.value.length - 1].content += chunk;
        nextTick(scrollToBottom);
      },
      controller.signal,
    );

    // 没有收到任何内容
    if (!answer) {
      messages.value[messages.value.length - 1].content = '抱歉，我无法生成回复，请稍后再试。';
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      // 用户离开页面或主动中断，保留已生成内容
      return;
    }
    console.error('Error fetching AI response:', error);
    const message = error.message || '请检查网络连接后重试';
    messages.value[messages.value.length - 1].content = `发生错误：${message}`;
    showToast(message);
  } finally {
    isLoading.value = false;
    controller = null;
    await nextTick();
    scrollToBottom();
  }
};

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 监听消息变化，自动滚动
watch(messages, () => {
  nextTick(scrollToBottom);
}, { deep: true });

// 组件挂载时滚动到底部
onMounted(() => {
  scrollToBottom();
});

// 离开页面时中断流式请求，避免残留连接
onUnmounted(() => {
  controller?.abort();
});
</script>

<style scoped>
.ai-chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  padding-top: 46px;
  padding-bottom: 50px;
  box-sizing: border-box;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
}

.message {
  margin-bottom: 10px;
  max-width: 80%;
}

.user-message {
  margin-left: auto;
}

.ai-message {
  margin-right: auto;
}

.message-content {
  padding: 10px;
  border-radius: 10px;
  word-break: break-word;
}

.user-message .message-content {
  background-color: #007aff;
  color: white;
}

.ai-message .message-content {
  background-color: #f2f2f2;
  color: #333;
}

.input-container {
  display: flex;
  padding: 10px;
  border-top: 1px solid #eee;
  background-color: #fff;
}

.chat-input {
  flex: 1;
  margin-right: 10px;
}

.send-button {
  align-self: flex-end;
}

/* Markdown 样式 */
.message-content pre {
  background-color: #f8f8f8;
  padding: 10px;
  border-radius: 5px;
  overflow-x: auto;
}

.message-content code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 2px 4px;
  border-radius: 3px;
}

.message-content img {
  max-width: 100%;
}

/* 打字指示器 */
.typing-indicator {
  display: flex;
  padding: 5px;
}

.typing-indicator span {
  height: 8px;
  width: 8px;
  background-color: #999;
  border-radius: 50%;
  margin: 0 2px;
  display: inline-block;
  animation: bounce 1.5s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes bounce {
  0%, 60%, 100% {
    transform: translateY(0);
  }
  30% {
    transform: translateY(-5px);
  }
}

/* Markdown样式 */
:deep(pre) {
  background-color: #f0f0f0;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
}

:deep(code) {
  font-family: monospace;
  background-color: #f0f0f0;
  padding: 2px 4px;
  border-radius: 4px;
}

:deep(p) {
  margin: 8px 0;
}

:deep(ul), :deep(ol) {
  padding-left: 20px;
}

:deep(a) {
  color: #1989fa;
  text-decoration: none;
}
</style>