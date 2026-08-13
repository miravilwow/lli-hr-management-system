import { useState } from 'react';
import { Alert, App, Button, Card, Form, Input, Typography } from 'antd';
import { Navigate, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { getErrorMessage } from '../api/client';

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
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f5',
        padding: 16,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 380 }}>
        <Typography.Title level={3} style={{ marginTop: 0, marginBottom: 4 }}>
          Sign in
        </Typography.Title>
        <Typography.Paragraph type="secondary">
          HR Employee Records Management System
        </Typography.Paragraph>

        {error && (
          <Alert type="error" message={error} showIcon style={{ marginBottom: 16 }} />
        )}

        <Form layout="vertical" onFinish={handleSubmit} requiredMark={false} autoComplete="off">
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Please enter your username' }]}
          >
            <Input placeholder="admin" size="large" autoFocus />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password placeholder="••••••••" size="large" />
          </Form.Item>

          <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
            Sign in
          </Button>
        </Form>
      </Card>
    </div>
  );
}
