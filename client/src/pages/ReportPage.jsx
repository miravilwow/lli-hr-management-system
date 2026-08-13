import { Card, Typography } from 'antd';

export default function ReportPage() {
  return (
    <Card>
      <Typography.Title level={4} style={{ marginTop: 0 }}>
        Employee Report
      </Typography.Title>
      <Typography.Text type="secondary">Filtered report and summary totals appear here.</Typography.Text>
    </Card>
  );
}
