import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { EditOutlined } from '@ant-design/icons';
import { App, Button, Flex, Grid, Modal, Popconfirm, Skeleton, Tag, Typography } from 'antd';

import { fetchEmployeeHistory, updateEmployee } from '../api/employees';
import { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import useAuth from '../hooks/useAuth';

/** A labelled value. Every field in the dialog is one of these, so they align. */
function Field({ label, children, className = '' }) {
  return (
    <div className={`detail__field ${className}`}>
      <span className="detail__label">{label}</span>
      <span className="detail__value">{children}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="detail__section">
      <div className="detail__section-title">{title}</div>
      {children}
    </div>
  );
}

function initialsOf(employee) {
  return `${employee.firstName?.[0] ?? ''}${employee.lastName?.[0] ?? ''}`.toUpperCase();
}

/** "6 years, 5 months" — reads better than making the reader subtract dates. */
function lengthOfService(hireDate) {
  const start = dayjs(hireDate);
  if (!start.isValid()) return '—';

  const now = dayjs();
  const years = now.diff(start, 'year');
  const months = now.diff(start.add(years, 'year'), 'month');

  const parts = [];
  if (years) parts.push(`${years} year${years === 1 ? '' : 's'}`);
  if (months) parts.push(`${months} month${months === 1 ? '' : 's'}`);

  return parts.length ? parts.join(', ') : 'Less than a month';
}

function describeChange(entry) {
  if (entry.action === 'Create') return 'Record created';
  if (entry.action === 'Delete') return 'Record deleted';

  return (
    <>
      <strong>{entry.fieldName}</strong>{' '}
      <span className="detail__change">{entry.oldValue || '—'}</span> →{' '}
      <span className="detail__change">{entry.newValue || '—'}</span>
    </>
  );
}

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
   * here as an explicit action. The rest of the record goes with it, since
   * PUT replaces the whole resource.
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

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={isMobile ? '100%' : 760}
      style={isMobile ? { top: 0, maxWidth: '100vw', margin: 0, paddingBottom: 0 } : { top: 40 }}
      styles={{
        body: isMobile ? { maxHeight: 'calc(100vh - 190px)', overflowY: 'auto' } : undefined,
      }}
      title={
        <Flex align="center" justify="space-between" gap={12} wrap style={{ paddingRight: 24 }}>
          <div className="detail__identity">
            <span className="detail__initials">{initialsOf(employee)}</span>
            <div style={{ minWidth: 0 }}>
              <div className="detail__name">
                {employee.firstName} {employee.lastName}
              </div>
              <div className="detail__meta">
                {employee.employeeCode} · {employee.position}
              </div>
            </div>
          </div>
          <Tag color={isActive ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
            {employee.status}
          </Tag>
        </Flex>
      }
      footer={
        <Flex justify="space-between" align="center" gap={8} wrap>
          {isAdmin ? (
            <Popconfirm
              title={isActive ? 'Mark as inactive?' : 'Mark as active?'}
              description={
                isActive
                  ? 'They will be excluded from active headcount. The record is kept.'
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
                Edit details
              </Button>
            )}
          </Flex>
        </Flex>
      }
    >
      {/* The figure people open this dialog for, given the space to be read
          at a glance rather than buried in a row of equal-weight fields. */}
      <Field label="Monthly salary">
        <span className="detail__figure">{formatCurrency(employee.salary)}</span>
      </Field>

      <Section title="Employment">
        <div className="detail__grid">
          <Field label="Department">{employee.departmentName}</Field>
          <Field label="Position">{employee.position}</Field>
          <Field label="Hire date">{formatDate(employee.hireDate)}</Field>
          <Field label="Length of service">{lengthOfService(employee.hireDate)}</Field>
        </div>
      </Section>

      <Section title="Contact">
        <div className="detail__grid detail__grid--single">
          <Field label="Email address">
            <Typography.Text copyable style={{ fontSize: 14.5, fontWeight: 500 }}>
              {employee.email}
            </Typography.Text>
          </Field>
        </div>
      </Section>

      <Section title="Record history">
        {history === null ? (
          <Skeleton active paragraph={{ rows: 2 }} title={false} />
        ) : history.length === 0 ? (
          <Typography.Text type="secondary" style={{ fontSize: 13.5 }}>
            No changes recorded. This record predates the audit trail.
          </Typography.Text>
        ) : (
          <div>
            {history.slice(0, 6).map((entry) => (
              <div className="detail__history-item" key={entry.auditId}>
                <span className="detail__history-dot" />
                <div className="detail__history-text">
                  <div>{describeChange(entry)}</div>
                  <div className="detail__history-when">
                    {entry.changedByName || entry.changedBy} · {formatDate(entry.changedAt)}
                  </div>
                </div>
              </div>
            ))}

            {history.length > 6 && (
              <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
                and {history.length - 6} earlier change
                {history.length - 6 === 1 ? '' : 's'}
              </Typography.Text>
            )}
          </div>
        )}
      </Section>
    </Modal>
  );
}
