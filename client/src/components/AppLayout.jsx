import { DownOutlined } from '@ant-design/icons';
import { Button, Dropdown, Layout, Menu, Space, Typography } from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';

const { Header, Sider, Content } = Layout;

const navItems = [
  { key: '/employees', label: 'Employees' },
  { key: '/reports', label: 'Reports' },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" width={220}>
        <div
          style={{
            height: 56,
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            color: '#fff',
            fontWeight: 600,
            letterSpacing: 0.3,
          }}
        >
          HR Management
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={navItems}
          onClick={({ key }) => navigate(key)}
        />
      </Sider>

      <Layout>
        <Header
          style={{
            background: '#fff',
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Typography.Text strong>Employee Records Management System</Typography.Text>

          <Dropdown
            trigger={['click']}
            menu={{
              items: [{ key: 'logout', label: 'Sign out', danger: true }],
              onClick: handleLogout,
            }}
          >
            <Button type="text">
              <Space>
                {user?.fullName || user?.username}
                <DownOutlined style={{ fontSize: 10 }} />
              </Space>
            </Button>
          </Dropdown>
        </Header>

        <Content style={{ padding: 24 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
