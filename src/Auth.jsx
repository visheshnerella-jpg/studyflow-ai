
import { useState } from 'react'
import { supabase } from './lib/supabase'
import './auth.css'

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAuth(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        })
        if (error) throw error

        if (!data.session) {
          setMessage(
            'Account created! Check your email to confirm your account.'
          )
        }
      }
    } catch (error) {
      setMessage(error.message || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-glow auth-glow-one" />
      <div className="auth-glow auth-glow-two" />

      <section className="auth-layout">
        <header className="auth-brand">
          <div className="auth-brand-icon">✦</div>
          <span>StudyFlow <span className="auth-ai">AI</span></span>
        </header>

        <div className="auth-card">
          <div className="auth-icon">✧</div>

          <p className="auth-eyebrow">
            YOUR PERSONAL STUDY SPACE
          </p>

          <h1>
            {isLogin ? (
              <>Welcome <span>back.</span></>
            ) : (
              <>Your next chapter <span>starts here.</span></>
            )}
          </h1>

          <p className="auth-description">
            {isLogin
              ? 'Pick up where you left off. Your goals are waiting.'
              : 'Create your account and make every study session count.'}
          </p>

          <div className="auth-tabs">
            <button
              type="button"
              className={isLogin ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setIsLogin(true)
                setMessage('')
              }}
            >
              Sign in
            </button>

            <button
              type="button"
              className={!isLogin ? 'auth-tab active' : 'auth-tab'}
              onClick={() => {
                setIsLogin(false)
                setMessage('')
              }}
            >
              Create account
            </button>
          </div>

          <form onSubmit={handleAuth}>
            <label htmlFor="auth-email">Email address</label>
            <input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              required
            />

            {!isLogin && (
              <p className="auth-password-hint">
                Use at least 6 characters for your password.
              </p>
            )}

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading
                ? 'Please wait...'
                : isLogin
                  ? 'Sign in to StudyFlow  →'
                  : 'Create my account  →'}
            </button>

            {message && (
              <p
                className="auth-message"
                role="status"
                aria-live="polite"
              >
                {message}
              </p>
            )}
          </form>

          <div className="auth-divider">
            <span />
            <p>YOUR SPACE TO GROW</p>
            <span />
          </div>

          <p className="auth-footer">
            Small steps every day. <span>Big results over time.</span>
          </p>
        </div>

        <p className="auth-bottom">
          Made for curious minds <span>✦</span>
        </p>
      </section>
    </main>
  )
}
