import { Flex, Typography } from 'antd';

/**
 * Every page opens the same way: what this screen is, one line on what
 * it is for, and its actions on the right. Consistency here is what
 * makes the app feel like one product rather than a set of screens.
 */
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
