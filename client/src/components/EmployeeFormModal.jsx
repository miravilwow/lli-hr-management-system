import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  App,
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Typography,
} from 'antd';

import { createEmployee, updateEmployee } from '../api/employees';
import { getErrorMessage } from '../api/client';
import { formatCurrency } from '../utils/format';

function SectionLabel({ children }) {
  return (
    <Typography.Text
      type="secondary"
      style={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '.08em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </Typography.Text>
  );
}

/**
 * Handles both adding and editing. Passing an `employee` switches the
 * dialog into edit mode; omitting it creates a new record.
 *
 * Every field sits in the same two-column grid so the rows line up. Status
 * is deliberately absent: it is shown and changed from the details view,
 * which keeps this form to the facts about the person and their job.
 */
export default function EmployeeFormModal({ open, employee, departments, onClose, onSaved }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [submitting, setSubmitting] = useState(false);
  const [rowVersion, setRowVersion] = useState(null);
  const [conflict, setConflict] = useState(null);

  const isEdit = Boolean(employee);

  useEffect(() => {
    if (!open) return;

    setConflict(null);

    if (employee) {
      form.setFieldsValue({
        ...employee,
        salary: Number(employee.salary),
        hireDate: dayjs(employee.hireDate),
      });
      setRowVersion(employee.rowVersion);
    } else {
      form.resetFields();
      setRowVersion(null);
    }
  }, [open, employee, form]);

  const handleSubmit = async (values) => {
    setSubmitting(true);

    const payload = {
      ...values,
      hireDate: values.hireDate.format('YYYY-MM-DD'),
      // PUT replaces the whole resource, so the current status is carried
      // through. Without this an edit would silently reactivate someone.
      status: employee?.status ?? 'Active',
    };

    try {
      if (isEdit) {
        await updateEmployee(employee.employeeId, { ...payload, rowVersion });
        message.success('Employee updated');
      } else {
        await createEmployee(payload);
        message.success('Employee created');
      }

      onSaved();
      onClose();
    } catch (err) {
      const current = err?.response?.data?.details?.current;

      if (err?.response?.status === 409 && current) {
        setConflict(current);
        return;
      }

      message.error(getErrorMessage(err, 'Could not save the employee'));
    } finally {
      setSubmitting(false);
    }
  };

  const loadCurrentValues = () => {
    form.setFieldsValue({
      ...conflict,
      salary: Number(conflict.salary),
      hireDate: dayjs(conflict.hireDate),
    });

    setRowVersion(conflict.rowVersion);
    setConflict(null);
    onSaved();
  };

  const half = { xs: 24, md: 12 };

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${employee.firstName} ${employee.lastName}` : 'Add employee'}
      okText={isEdit ? 'Save changes' : 'Create employee'}
      onCancel={onClose}
      onOk={form.submit}
      confirmLoading={submitting}
      destroyOnHidden
      width={isMobile ? '100%' : 640}
      style={isMobile ? { top: 0, maxWidth: '100vw', margin: 0, paddingBottom: 0 } : undefined}
      styles={
        isMobile ? { body: { maxHeight: 'calc(100vh - 190px)', overflowY: 'auto' } } : undefined
      }
    >
      {conflict && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="This record was changed by someone else"
          description={
            <>
              <div style={{ marginBottom: 8 }}>
                It is now <strong>{conflict.position}</strong> in{' '}
                <strong>{conflict.departmentName}</strong> at{' '}
                <strong>{formatCurrency(conflict.salary)}</strong>.
              </div>
              <div>Your changes were not saved, so nothing was overwritten.</div>
              <Button size="small" style={{ marginTop: 10 }} onClick={loadCurrentValues}>
                Load the current values
              </Button>
            </>
          }
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <SectionLabel>Personal details</SectionLabel>
        <Divider style={{ margin: '8px 0 16px' }} />

        <Row gutter={16}>
          <Col {...half}>
            <Form.Item
              name="firstName"
              label="First name"
              rules={[{ required: true, message: 'First name is required' }]}
            >
              <Input placeholder="Miguel" />
            </Form.Item>
          </Col>
          <Col {...half}>
            <Form.Item
              name="lastName"
              label="Last name"
              rules={[{ required: true, message: 'Last name is required' }]}
            >
              <Input placeholder="Bautista" />
            </Form.Item>
          </Col>
          <Col {...half}>
            <Form.Item
              name="employeeCode"
              label="Employee code"
              rules={[{ required: true, message: 'Employee code is required' }]}
            >
              <Input placeholder="EMP-021" />
            </Form.Item>
          </Col>
          <Col {...half}>
            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Enter a valid email address' },
              ]}
            >
              <Input placeholder="first.last@lli.com" />
            </Form.Item>
          </Col>
        </Row>

        <SectionLabel>Employment</SectionLabel>
        <Divider style={{ margin: '8px 0 16px' }} />

        <Row gutter={16}>
          <Col {...half}>
            <Form.Item
              name="departmentId"
              label="Department"
              rules={[{ required: true, message: 'Please select a department' }]}
            >
              <Select
                placeholder="Select a department"
                options={departments.map((d) => ({
                  value: d.departmentId,
                  label: d.departmentName,
                }))}
              />
            </Form.Item>
          </Col>
          <Col {...half}>
            <Form.Item
              name="position"
              label="Position"
              rules={[{ required: true, message: 'Position is required' }]}
            >
              <Input placeholder="Software Engineer" />
            </Form.Item>
          </Col>
          <Col {...half}>
            <Form.Item
              name="salary"
              label="Monthly salary"
              rules={[{ required: true, message: 'Salary is required' }]}
            >
              <InputNumber
                min={0}
                step={1000}
                style={{ width: '100%' }}
                prefix="₱"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value.replace(/,/g, '')}
              />
            </Form.Item>
          </Col>
          <Col {...half}>
            <Form.Item
              name="hireDate"
              label="Hire date"
              rules={[{ required: true, message: 'Hire date is required' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
            </Form.Item>
          </Col>
        </Row>

        {!isEdit && (
          <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
            New employees start as Active. Status is changed from the employee's details view.
          </Typography.Text>
        )}
      </Form>
    </Modal>
  );
}
