import { useState } from 'react';
import {
  BarChartOutlined,
  LogoutOutlined,
  MenuOutlined,
  MoonOutlined,
  SunOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  Avatar,
  Button,
  Drawer,
  Dropdown,
  Flex,
  Grid,
  Layout,
  Menu,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';

import useAuth from '../hooks/useAuth';

const { Header, Sider, Content } = Layout;

const navItems = [
  { key: '/employees', icon: <TeamOutlined />, label: 'Employees' },
  { key: '/reports', icon: <BarChartOutlined />, label: 'Reports' },
];

function Brand({ compact }) {
  return (
    <div className="app-brand">
      <span className="app-brand__mark">HR</span>
      {!compact && <span>Employee Records</span>}
    </div>
  );
}

export default function AppLayout({ onToggleTheme, isDark }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const go = (key) => {
    navigate(key);
    setDrawerOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const navigation = (
    <Menu
      theme={isDark ? 'dark' : 'light'}
      mode="inline"
      selectedKeys={[location.pathname]}
      items={navItems}
      onClick={({ key }) => go(key)}
      style={{ borderInlineEnd: 'none' }}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {!isMobile && (
        <Sider
          className="app-sider"
          theme={isDark ? 'dark' : 'light'}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          trigger={null}
          width={224}
          collapsedWidth={72}
        >
          <Brand compact={collapsed} />
          {navigation}
        </Sider>
      )}

      <Drawer
        placement="left"
        width={244}
        open={isMobile && drawerOpen}
        onClose={() => setDrawerOpen(false)}
        closable={false}
        styles={{ body: { padding: 0 } }}
      >
        <Brand />
        {navigation}
      </Drawer>

      <Layout>
        <Header className="app-header">
          <Button
            type="text"
            aria-label="Toggle navigation"
            icon={<MenuOutlined />}
            onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed((v) => !v))}
          />

          <Flex align="center" gap={4}>
            <Tooltip title={isDark ? 'Switch to light' : 'Switch to dark'}>
              <Button
                type="text"
                aria-label="Toggle colour theme"
                icon={isDark ? <SunOutlined /> : <MoonOutlined />}
                onClick={onToggleTheme}
              />
            </Tooltip>

            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'identity',
                    disabled: true,
                    label: (
                      <div style={{ padding: '2px 0' }}>
                        <div style={{ fontWeight: 600 }}>{user?.fullName}</div>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                          {user?.username} · {user?.role}
                        </Typography.Text>
                      </div>
                    ),
                  },
                  { type: 'divider' },
                  { key: 'logout', icon: <LogoutOutlined />, label: 'Sign out', danger: true },
                ],
                onClick: ({ key }) => key === 'logout' && handleLogout(),
              }}
            >
              <Button type="text" className="app-user" aria-label="Account menu">
                <Flex align="center" gap={8}>
                  <Avatar size={26} icon={<UserOutlined />} />
                  {screens.sm && (
                    <>
                      <span className="app-user__name">{user?.fullName || user?.username}</span>
                      <Tag
                        color={user?.role === 'Admin' ? 'cyan' : 'default'}
                        style={{ marginInlineEnd: 0 }}
                      >
                        {user?.role}
                      </Tag>
                    </>
                  )}
                </Flex>
              </Button>
            </Dropdown>
          </Flex>
        </Header>

        <Content>
          <div className="app-content">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}
