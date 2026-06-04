# 网页密码保护功能实现计划

## 一、需求分析

用户希望给积分应用网页添加密码保护功能，确保只有知道密码的人才能访问应用内容。

## 二、技术方案

由于这是纯前端应用，采用以下方案：
1. 在 localStorage 中存储加密后的密码
2. 首次访问时要求设置密码或输入密码
3. 登录状态保存在 sessionStorage 中（关闭浏览器后失效）

## 三、文件修改清单

| 文件 | 修改类型 | 说明 |
|------|----------|------|
| `src/store.ts` | 修改 | 添加密码存储和验证相关函数 |
| `src/App.tsx` | 修改 | 添加登录状态管理和登录界面 |
| `src/style.css` | 修改 | 添加登录界面样式 |

## 四、实现步骤

### 步骤 1：修改 store.ts，添加密码相关函数

```typescript
// 添加密码存储键
const PASSWORD_KEY = 'jifen-app:password'

// 设置密码（使用简单加密）
export function setPassword(password: string): void {
  const encrypted = btoa(password) // Base64 编码
  localStorage.setItem(PASSWORD_KEY, encrypted)
}

// 验证密码
export function verifyPassword(password: string): boolean {
  const stored = localStorage.getItem(PASSWORD_KEY)
  if (!stored) return false
  return btoa(password) === stored
}

// 检查是否已设置密码
export function hasPassword(): boolean {
  return localStorage.getItem(PASSWORD_KEY) !== null
}

// 清除密码（移除密码保护）
export function clearPassword(): void {
  localStorage.removeItem(PASSWORD_KEY)
}
```

### 步骤 2：修改 App.tsx，添加登录逻辑

1. 添加登录状态管理
2. 创建登录界面组件
3. 在应用入口处添加密码验证

### 步骤 3：修改 style.css，添加登录界面样式

添加登录表单、密码输入框、按钮等样式

## 五、功能流程

```
用户访问页面
    │
    ▼
检查是否设置过密码？
    │
    ├─ 否 ──► 显示"设置密码"界面 ──► 设置密码后进入应用
    │
    └─ 是 ──► 显示"输入密码"界面 ──► 验证通过后进入应用
                  │
                  └─ 验证失败 ──► 提示错误，重新输入
```

## 六、安全性考虑

1. 使用 Base64 编码存储密码（简单加密，防明文泄露）
2. 登录状态存储在 sessionStorage，关闭浏览器后失效
3. 支持移除密码保护功能

## 七、依赖和风险

- 无新增依赖
- 风险：纯前端密码保护安全性有限，敏感数据建议配合后端验证

## 八、测试要点

1. 首次访问时是否显示设置密码界面
2. 设置密码后是否正确验证
3. 密码错误时是否提示错误
4. 关闭浏览器后是否需要重新登录
5. 是否可以移除密码保护