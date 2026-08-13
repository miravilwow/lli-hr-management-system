import { useState } from 'react';
import { LockOutlined, SafetyOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, App, Button, Form, Input, Typography } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';
import { getErrorMessage } from '../api/client';

const HIGHLIGHTS = [
  { icon: <TeamOutlined />, text: 'Employee records with a full change history' },
  { icon: <SafetyOutlined />, text: 'Role-based access to salary information' },
  { icon: <LockOutlined />, text: 'Every edit attributed and time-stamped' },
];

export default function LoginPage() {
  const { user, login } = useAuth();
  const { message } = App.useApp();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (user) {
    return <Navigate to="/employees" replace />;
  }

  const handleSubmit = async ({ username, password }) => {
    setSubmitting(true);
    setError(null);

    try {
      const loggedIn = await login(username, password);
      message.success(`Welcome back, ${loggedIn.fullName}`);
      navigate('/employees', { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to sign in'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login">
      <aside className="login__aside">
        <div className="app-brand" style={{ padding: 0, color: '#fff' }}>
          <span className="app-brand__mark" style={{ background: 'rgba(255,255,255,0.16)' }}>
            HR
          </span>
          <span>Employee Records</span>
        </div>

        <div>
          <h1>Employee records, kept honest.</h1>
          <p>
            Every salary change records who made it, what it was before, and when — so the
            numbers in a report can always be traced back to a decision.
          </p>

          <ul className="login__points">
            {HIGHLIGHTS.map((item) => (
              <li key={item.text}>
                <span aria-hidden>{item.icon}</span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>

        <Typography.Text style={{ color: 'rgba(234,244,247,0.55)', fontSize: 12.5 }}>
          LLI Technical Assessment
        </Typography.Text>
      </aside>

      <main className="login__panel">
        <div className="login__form">
          <Typography.Title level={2} style={{ marginTop: 0, marginBottom: 4, fontSize: 26 }}>
            Sign in
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 24 }}>
            Use your account to continue.
          </Typography.Paragraph>

          {error && (
            <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
          )}

          <Form layout="vertical" onFinish={handleSubmit} requiredMark={false} size="large">
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Please enter your username' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="admin" autoFocus autoComplete="username" />
            </Form.Item>

            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
              style={{ marginBottom: 20 }}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </Form.Item>

            <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
              Sign in
            </Button>
          </Form>

          <div className="login__hint">
            <strong>Assessment accounts</strong>
            <br />
            <code>admin / admin123</code> — full access
            <br />
            <code>viewer / viewer123</code> — read only
          </div>
        </div>
      </main>
    </div>
  );
}
