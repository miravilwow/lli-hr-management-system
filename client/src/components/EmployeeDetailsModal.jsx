import { useEffect, useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Descriptions,
  Divider,
  Flex,
  Grid,
  Modal,
  Popconfirm,
  Skeleton,
  Tag,
  Typography,
} from 'antd';

import { fetchEmployeeHistory, updateEmployee } from '../api/employees';
import { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import useAuth from '../hooks/useAuth';

/**
 * Read-only view of one employee.
 *
 * Salary and hire date live here rather than in the table: they are
 * reference figures you look up, not something you scan a list by, and
 * keeping them out of the grid is what stopped it scrolling sideways.
 */
export default function EmployeeDetailsModal({ open, employee, onClose, onEdit, onChanged }) {
  const { message } = App.useApp();
  const { isAdmin } = useAuth();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [history, setHistory] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !employee) {
      setHistory(null);
      return;
    }

    fetchEmployeeHistory(employee.employeeId)
      .then(setHistory)
      .catch(() => setHistory([]));
  }, [open, employee]);

  if (!employee) return null;

  const isActive = employee.status === 'Active';

  /**
   * Status is deliberately not a field on the edit form, so it is changed
   * here as an explicit action. The rest of the record is sent unchanged
   * alongside it, since PUT replaces the whole resource.
   */
  const toggleStatus = async () => {
    setSaving(true);

    try {
      await updateEmployee(employee.employeeId, {
        employeeCode: employee.employeeCode,
        firstName: employee.firstName,
        lastName: employee.lastName,
        email: employee.email,
        departmentId: employee.departmentId,
        position: employee.position,
        salary: Number(employee.salary),
        hireDate: employee.hireDate.slice(0, 10),
        status: isActive ? 'Inactive' : 'Active',
        rowVersion: employee.rowVersion,
      });

      message.success(isActive ? 'Marked as inactive' : 'Marked as active');
      onChanged();
      onClose();
    } catch (err) {
      message.error(getErrorMessage(err, 'Could not change the status'));
    } finally {
      setSaving(false);
    }
  };

  const lastChange = history?.find((entry) => entry.action === 'Update');
  const created = history?.find((entry) => entry.action === 'Create');

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={isMobile ? '100%' : 620}
      style={isMobile ? { top: 0, maxWidth: '100vw', margin: 0 } : undefined}
      title={
        <Flex align="center" gap={10} wrap>
          <span>
            {employee.firstName} {employee.lastName}
          </span>
          <Tag color={isActive ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
            {employee.status}
          </Tag>
        </Flex>
      }
      footer={
        <Flex justify="space-between" gap={8} wrap>
          {isAdmin ? (
            <Popconfirm
              title={isActive ? 'Mark as inactive?' : 'Mark as active?'}
              description={
                isActive
                  ? 'They will be excluded from active headcount but the record is kept.'
                  : 'They will count towards active headcount again.'
              }
              okText="Confirm"
              onConfirm={toggleStatus}
            >
              <Button loading={saving} danger={isActive}>
                {isActive ? 'Mark inactive' : 'Mark active'}
              </Button>
            </Popconfirm>
          ) : (
            <span />
          )}

          <Flex gap={8}>
            <Button onClick={onClose}>Close</Button>
            {isAdmin && (
              <Button type="primary" icon={<EditOutlined />} onClick={() => onEdit(employee)}>
                Edit
              </Button>
            )}
          </Flex>
        </Flex>
      }
    >
      <Descriptions
        column={isMobile ? 1 : 2}
        size="small"
        colon={false}
        labelStyle={{ fontSize: 11, letterSpacing: '.06em', textTransform: 'uppercase' }}
        items={[
          { key: 'code', label: 'Employee code', children: employee.employeeCode },
          { key: 'dept', label: 'Department', children: employee.departmentName },
          { key: 'position', label: 'Position', children: employee.position },
          { key: 'hired', label: 'Hire date', children: formatDate(employee.hireDate) },
          {
            key: 'email',
            label: 'Email',
            span: isMobile ? 1 : 2,
            children: <Typography.Text copyable>{employee.email}</Typography.Text>,
          },
        ]}
      />

      <Divider style={{ margin: '18px 0 14px' }} />

      <Typography.Text type="secondary" style={{ fontSize: 11, letterSpacing: '.06em' }}>
        MONTHLY SALARY
      </Typography.Text>
      <div className="numeric" style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
        {formatCurrency(employee.salary)}
      </div>

      <Divider style={{ margin: '18px 0 14px' }} />

      <Typography.Text type="secondary" style={{ fontSize: 11, letterSpacing: '.06em' }}>
        RECORD HISTORY
      </Typography.Text>

      {history === null ? (
        <Skeleton active paragraph={{ rows: 2 }} title={false} style={{ marginTop: 10 }} />
      ) : (
        <div style={{ marginTop: 8, fontSize: 13.5 }}>
          {lastChange ? (
            <div>
              Last change: <strong>{lastChange.fieldName}</strong> {lastChange.oldValue} →{' '}
              <strong>{lastChange.newValue}</strong>
              <Typography.Text type="secondary">
                {' '}
                · {lastChange.changedBy} · {formatDate(lastChange.changedAt)}
              </Typography.Text>
            </div>
          ) : (
            <Typography.Text type="secondary">No changes recorded yet.</Typography.Text>
          )}

          {created && (
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 4 }}>
              Created by {created.changedBy} on {formatDate(created.changedAt)}
            </Typography.Text>
          )}
        </div>
      )}
    </Modal>
  );
}
