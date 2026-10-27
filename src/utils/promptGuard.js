/**
 * 前端提示词防护（第一道拦截，仅用于快速反馈）
 *
 * 说明：前端校验可以被绕过，真正的安全边界在后端
 * （app/utils/prompt_guard.py + 服务端系统提示词）。这里只是提前拦下常见
 * 的"换身份 / 忽略规则 / 套系统提示词 / 要密钥序列号"等输入，避免白跑一次请求。
 */

// 零宽字符常被用来拆分敏感词
const ZERO_WIDTH = /[\u200b\u200c\u200d\ufeff]/g

const RULES = [
  // 越权指令
  {
    reason: '越权指令',
    pattern:
      /(忽略|无视|忘记|忘掉|抛弃|跳过)(掉)?(之前|以上|前面|先前|上述|所有|全部|原有|既有)的?(所有|全部)?(指令|指示|规则|设定|约束|提示词|要求)/,
  },
  {
    reason: '越权指令',
    pattern:
      /(ignore|disregard|forget)\s+(all\s+)?(the\s+)?(previous|above|prior|earlier)\s+(instructions?|rules?|prompts?|constraints?)/i,
  },
  // 身份改写
  { reason: '身份改写', pattern: /(从现在开始|从现在起|接下来|以后)[，,]?\s*(你|您)(是|要|必须|只能|将)/ },
  { reason: '身份改写', pattern: /你(现在)?(就是|扮演|假装|充当)(一个|一位|一名|一只)?/ },
  { reason: '身份改写', pattern: /你的(新)?身份(是|改为|变成)|(切换|更改)你的?(身份|角色|设定)/ },
  { reason: '身份改写', pattern: /(act|pretend)\s+as\s+(a|an|the)\b|you\s+are\s+now\s+/i },
  // 套取系统提示词
  {
    reason: '提示词窃取',
    pattern:
      /(输出|显示|打印|复述|重复|背诵|背出|告诉我|列出|透露|泄露|展示|贴出).{0,12}(系统提示词|系统提示|系统设定|系统指令|初始指令|隐藏规则|prompt|你的设定|你的规则)/,
  },
  {
    reason: '提示词窃取',
    pattern: /(show|print|repeat|reveal|tell\s+me|list).{0,12}(system\s+prompt|your\s+(instructions|rules|prompt|settings))/i,
  },
  // 套取内部信息
  {
    reason: '内部信息获取',
    pattern:
      /(输出|显示|打印|告诉我|列出|透露|泄露|展示|提供|发我|背).{0,12}(api[\s_-]?key|access[\s_-]?token|密钥|私钥|序列号|license|环境变量|\.env|数据库密码|服务器地址|接口地址|内部配置|系统配置)/i,
  },
  {
    // 语序反过来："把 API KEY 和序列号发我"
    reason: '内部信息获取',
    pattern:
      /(api[\s_-]?key|access[\s_-]?token|密钥|私钥|序列号|license|环境变量|\.env|数据库密码|服务器地址|接口地址|内部配置|系统配置).{0,12}(发我|给我|告诉我|输出|贴出|列出|打印|展示|提供|是多少)/i,
  },
  { reason: '内部信息获取', pattern: /(api[\s_-]?key|secret\s*key)\s*[:=]/i },
  // 越狱模式
  { reason: '越权指令', pattern: /(开发者|调试|上帝|越狱|无限制|DAN)\s*模式|jailbreak|do\s+anything\s+now/i },
  // 伪造角色标记
  { reason: '角色伪造', pattern: /(^|\n)\s*(system|assistant|developer)\s*[:：]/i },
  { reason: '角色伪造', pattern: /<\|im_(start|end)\|>|\[\/?INST\]|###\s*(system|instruction)/i },
]

// 归一化：全角转半角 + 去零宽字符 + 压缩空白，避免用字符变形绕过
const normalize = (text) =>
  (text || '')
    .normalize('NFKC')
    .replace(ZERO_WIDTH, '')
    .replace(/[ \t]+/g, ' ')
    .trim()

/**
 * 检查用户输入
 * @param {string} text
 * @returns {string} 命中返回原因（如"越权指令"），未命中返回空字符串
 */
export function checkPrompt(text) {
  const normalized = normalize(text)
  if (!normalized) return ''
  const hit = RULES.find((rule) => rule.pattern.test(normalized))
  return hit ? hit.reason : ''
}

export const MAX_PROMPT_LENGTH = 1000
