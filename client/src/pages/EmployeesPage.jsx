import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Flex, Input, Select, Space, Table, Tag, Typography } from 'antd';

import { fetchDepartments, fetchEmployees } from '../api/employees';
import { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import EmployeeFormModal from '../components/EmployeeFormModal';

export default function EmployeesPage() {
  const { message } = App.useApp();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  const [filters, setFilters] = useState({
    search: '',
    departmentId: undefined,
    status: undefined,
  });
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch((err) => message.error(getErrorMessage(err, 'Could not load departments')));
  }, [message]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchEmployees({
        search: filters.search || undefined,
        departmentId: filters.departmentId,
        status: filters.status,
        page: pagination.page,
        pageSize: pagination.pageSize,
      });
      setRows(result.data);
      setTotal(result.total);
    } catch (err) {
      message.error(getErrorMessage(err, 'Could not load employees'));
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, message]);

  useEffect(() => {
    load();
  }, [load]);

  // Any filter change invalidates the current page number.
  const updateFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const columns = [
    { title: 'Code', dataIndex: 'employeeCode', width: 110 },
    {
      title: 'Name',
      key: 'name',
      render: (_, row) => `${row.firstName} ${row.lastName}`,
    },
    { title: 'Email', dataIndex: 'email', ellipsis: true },
    { title: 'Department', dataIndex: 'departmentName', width: 190 },
    { title: 'Position', dataIndex: 'position', width: 190 },
    {
      title: 'Salary',
      dataIndex: 'salary',
      width: 140,
      align: 'right',
      render: formatCurrency,
    },
    {
      title: 'Hire Date',
      dataIndex: 'hireDate',
      width: 130,
      render: formatDate,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : 'default'}>{status}</Tag>
      ),
    },
  ];

  return (
    <Card>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Employees
        </Typography.Title>
        <Button type="primary" onClick={() => setFormOpen(true)}>
          Add employee
        </Button>
      </Flex>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input.Search
          allowClear
          placeholder="Search name, email, code or position"
          style={{ width: 320 }}
          onSearch={(value) => updateFilter({ search: value })}
        />
        <Select
          allowClear
          placeholder="All departments"
          style={{ width: 220 }}
          value={filters.departmentId}
          onChange={(value) => updateFilter({ departmentId: value })}
          options={departments.map((d) => ({ value: d.DepartmentId, label: d.DepartmentName }))}
        />
        <Select
          allowClear
          placeholder="All statuses"
          style={{ width: 160 }}
          value={filters.status}
          onChange={(value) => updateFilter({ status: value })}
          options={[
            { value: 'Active', label: 'Active' },
            { value: 'Inactive', label: 'Inactive' },
          ]}
        />
      </Space>

      <Table
        rowKey="employeeId"
        loading={loading}
        columns={columns}
        dataSource={rows}
        scroll={{ x: 1100 }}
        pagination={{
          current: pagination.page,
          pageSize: pagination.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count, range) => `${range[0]}-${range[1]} of ${count} employees`,
          onChange: (page, pageSize) => setPagination({ page, pageSize }),
        }}
      />

      <EmployeeFormModal
        open={formOpen}
        departments={departments}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </Card>
  );
}
