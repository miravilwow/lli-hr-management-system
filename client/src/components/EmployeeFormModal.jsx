import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import { App, Col, DatePicker, Form, Input, InputNumber, Modal, Row, Select } from 'antd';

import { createEmployee, updateEmployee } from '../api/employees';
import { getErrorMessage } from '../api/client';

/**
 * Handles both adding and editing. Passing an `employee` switches the
 * dialog into edit mode; omitting it creates a new record.
 */
export default function EmployeeFormModal({ open, employee, departments, onClose, onSaved }) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(employee);

  // Load the selected record into the form, or clear it for a new one.
  useEffect(() => {
    if (!open) return;

    if (employee) {
      form.setFieldsValue({
        ...employee,
        salary: Number(employee.salary),
        hireDate: dayjs(employee.hireDate),
      });
    } else {
      form.resetFields();
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
        await updateEmployee(employee.employeeId, payload);
        message.success('Employee updated');
      } else {
        await createEmployee(payload);
        message.success('Employee created');
      }
      onSaved();
      onClose();
    } catch (err) {
      message.error(getErrorMessage(err, 'Could not save the employee'));
    } finally {
      setSubmitting(false);
    }
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
