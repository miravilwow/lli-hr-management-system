import { Flex, Typography } from 'antd';

export default function PageHeader({ title, description, extra }) {
  return (
    <Flex justify="space-between" align="flex-start" wrap gap={16} className="page-header">
      <div>
        <Typography.Title level={3} className="page-header__title">
          {title}
        </Typography.Title>
        {description && (
          <Typography.Text type="secondary" className="page-header__description">
            {description}
          </Typography.Text>
        )}
      </div>
      {extra && <Flex gap={8}>{extra}</Flex>}
    </Flex>
  );
}
