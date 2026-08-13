import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  App,
  Button,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
} from 'antd';

import { createEmployee, updateEmployee } from '../api/employees';
import { getErrorMessage } from '../api/client';
import { formatCurrency } from '../utils/format';

/**
 * Handles both adding and editing. Passing an `employee` switches the
 * dialog into edit mode; omitting it creates a new record.
 */
export default function EmployeeFormModal({ open, employee, departments, onClose, onSaved }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const [submitting, setSubmitting] = useState(false);

  // The concurrency token for the record as currently loaded. Held in
  // state rather than read from the prop, because resolving a conflict
  // adopts a newer token without the parent re-rendering.
  const [rowVersion, setRowVersion] = useState(null);
  const [conflict, setConflict] = useState(null);

  const isEdit = Boolean(employee);

  // Load the selected record into the form, or clear it for a new one.
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
    };

    try {
      if (isEdit) {
        // The server refuses the write if the record changed since it
        // was loaded, rather than silently overwriting the other edit.
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

      // Someone else saved while this form was open. Show what the
      // record looks like now instead of only refusing the save.
      if (err?.response?.status === 409 && current) {
        setConflict(current);
        return;
      }

      message.error(getErrorMessage(err, 'Could not save the employee'));
    } finally {
      setSubmitting(false);
    }
  };

  /** Replaces the form contents with the values saved by the other user. */
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

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit ${employee.firstName} ${employee.lastName}` : 'Add employee'}
      okText="Save"
      onCancel={onClose}
      onOk={form.submit}
      confirmLoading={submitting}
      destroyOnHidden
      width={720}
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
                <strong>{formatCurrency(conflict.salary)}</strong>, status{' '}
                <strong>{conflict.status}</strong>.
              </div>
              <div>Your changes were not saved, so nothing was overwritten.</div>
              <Button size="small" style={{ marginTop: 10 }} onClick={loadCurrentValues}>
                Load the current values
              </Button>
            </>
          }
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ status: 'Active' }}
        requiredMark={false}
      >
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="employeeCode"
              label="Employee code"
              rules={[{ required: true, message: 'Employee code is required' }]}
            >
              <Input placeholder="EMP-021" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="firstName"
              label="First name"
              rules={[{ required: true, message: 'First name is required' }]}
            >
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="lastName"
              label="Last name"
              rules={[{ required: true, message: 'Last name is required' }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

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

        <Row gutter={16}>
          <Col xs={24} sm={12}>
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
          <Col xs={24} sm={12}>
            <Form.Item
              name="position"
              label="Position"
              rules={[{ required: true, message: 'Position is required' }]}
            >
              <Input />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="salary"
              label="Monthly salary"
              rules={[{ required: true, message: 'Salary is required' }]}
            >
              <InputNumber
                min={0}
                step={1000}
                style={{ width: '100%' }}
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(value) => value.replace(/,/g, '')}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="hireDate"
              label="Hire date"
              rules={[{ required: true, message: 'Hire date is required' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD MMM YYYY" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="status" label="Status">
              <Select
                options={[
                  { value: 'Active', label: 'Active' },
                  { value: 'Inactive', label: 'Inactive' },
                ]}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
}
