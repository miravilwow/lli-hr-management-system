import { Card, Typography } from 'antd';

export default function EmployeesPage() {
  return (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Employees
      </Typography.Title>
      <Typography.Text type="secondary">Employee records are listed here.</Typography.Text>
    </Card>
  );
}
