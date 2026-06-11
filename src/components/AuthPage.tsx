import { useState } from 'react'
import type { AuthPage } from '../types'
import {
  registerAccount,
  loginAccount,
  changePassword,
  hasAnyAccount,
} from '../store'

interface AuthPageProps {
  onLogin: () => void
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [page, setPage] = useState<AuthPage>(
    hasAnyAccount() ? 'login' : 'register',
  )
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (page === 'register') {
        const result = await registerAccount(username, password)
        if (result.ok) {
          onLogin()
        } else {
          setError(result.error)
        }
      } else if (page === 'login') {
        const result = await loginAccount(username, password)
        if (result.ok) {
          onLogin()
        } else {
          setError(result.error)
        }
      } else if (page === 'change-password') {
        const result = await changePassword(password, newPassword)
        if (result.ok) {
          setPage('login')
          setPassword('')
          setNewPassword('')
          setError('')
        } else {
          setError(result.error)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const switchPage = (target: AuthPage) => {
    setPage(target)
    setError('')
    setPassword('')
    setNewPassword('')
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">积分管理系统</h1>
        <p className="auth-subtitle">
          {page === 'login' && '请登录您的账号'}
          {page === 'register' && '创建一个新账号'}
          {page === 'change-password' && '修改您的密码'}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          {page !== 'change-password' && (
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="请输入用户名"
                className="auth-input"
                autoComplete="username"
                autoFocus
              />
            </div>
          )}

          <div className="form-group">
            <label>{page === 'change-password' ? '旧密码' : '密码'}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                page === 'change-password' ? '请输入旧密码' : '请输入密码'
              }
              className="auth-input"
              autoComplete={
                page === 'change-password' ? 'current-password' : 'current-password'
              }
              autoFocus={page === 'change-password'}
            />
          </div>

          {page === 'change-password' && (
            <div className="form-group">
              <label>新密码</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="请输入新密码（至少 4 个字符）"
                className="auth-input"
                autoComplete="new-password"
              />
            </div>
          )}

          {error && <p className="auth-error">{error}</p>}

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading
              ? '处理中...'
              : page === 'login'
                ? '登录'
                : page === 'register'
                  ? '注册'
                  : '修改密码'}
          </button>
        </form>

        <div className="auth-switch">
          {page === 'login' && (
            <>
              <span>
                没有账号？{' '}
                <button
                  className="auth-link"
                  onClick={() => switchPage('register')}
                >
                  立即注册
                </button>
              </span>
              <span>
                <button
                  className="auth-link"
                  onClick={() => switchPage('change-password')}
                >
                  忘记密码 / 修改密码
                </button>
              </span>
            </>
          )}
          {page === 'register' && (
            <span>
              已有账号？{' '}
              <button
                className="auth-link"
                onClick={() => switchPage('login')}
              >
                去登录
              </button>
            </span>
          )}
          {page === 'change-password' && (
            <span>
              <button
                className="auth-link"
                onClick={() => switchPage('login')}
              >
                返回登录
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
