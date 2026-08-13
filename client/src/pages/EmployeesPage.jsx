import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, Flex, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';

import { deleteEmployee, fetchDepartments, fetchEmployees } from '../api/employees';
import { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import useDebouncedValue from '../hooks/useDebouncedValue';
import EmployeeFormModal from '../components/EmployeeFormModal';

const INITIAL_QUERY = {
  search: '',
  departmentId: undefined,
  status: undefined,
  sortBy: undefined,
  sortOrder: undefined,
  page: 1,
  pageSize: 10,
};

// Table column key -> the sort key the API accepts. Anything not listed
// here is not sortable server-side.
const SORT_KEYS = {
  employeeCode: 'employeeCode',
  name: 'lastName',
  departmentName: 'department',
  position: 'position',
  salary: 'salary',
  hireDate: 'hireDate',
  status: 'status',
};

export default function EmployeesPage() {
  const { message } = App.useApp();

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  // What the user is typing, and the settled value the API is asked for.
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [query, setQuery] = useState(INITIAL_QUERY);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch((err) => message.error(getErrorMessage(err, 'Could not load departments')));
  }, [message]);

  // Fold the settled search term into the query, resetting to page 1 in
  // the same update so only one request is issued.
  useEffect(() => {
    setQuery((prev) =>
      prev.search === debouncedSearch ? prev : { ...prev, search: debouncedSearch, page: 1 }
    );
  }, [debouncedSearch]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchEmployees({
        search: query.search || undefined,
        departmentId: query.departmentId,
        status: query.status,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: query.page,
        pageSize: query.pageSize,
      });
      setRows(result.data);
      setTotal(result.total);
    } catch (err) {
      message.error(getErrorMessage(err, 'Could not load employees'));
    } finally {
      setLoading(false);
    }
  }, [query, message]);

  useEffect(() => {
    load();
  }, [load]);

  // A filter change invalidates the current page number.
  const updateFilter = (patch) => setQuery((prev) => ({ ...prev, ...patch, page: 1 }));

  // Paging and sorting arrive together from the table, so both are folded
  // into one state update and produce a single request.
  const handleTableChange = (pagination, _filters, sorter) => {
    const sortBy = sorter?.order ? SORT_KEYS[sorter.columnKey] : undefined;

    setQuery((prev) => ({
      ...prev,
      page: pagination.current,
      pageSize: pagination.pageSize,
      sortBy,
      sortOrder: sortBy ? (sorter.order === 'descend' ? 'desc' : 'asc') : undefined,
    }));
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (employee) => {
    setEditing(employee);
    setFormOpen(true);
  };

  const handleDelete = async (employee) => {
    try {
      await deleteEmployee(employee.employeeId);
      message.success(`${employee.firstName} ${employee.lastName} deleted`);

      // Stepping back a page avoids landing on an empty last page after
      // deleting the only row on it.
      const wasLastRowOnPage = rows.length === 1 && query.page > 1;
      if (wasLastRowOnPage) {
        setQuery((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        load();
      }
    } catch (err) {
      message.error(getErrorMessage(err, 'Could not delete the employee'));
    }
  };

  // Sorting is applied in SQL, so the column only declares that it is
  // sortable and the server decides the order.
  const sortOrderFor = (key) => {
    if (query.sortBy !== SORT_KEYS[key]) return null;
    return query.sortOrder === 'desc' ? 'descend' : 'ascend';
  };

  const columns = [
    {
      title: 'Code',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      width: 110,
      sorter: true,
      sortOrder: sortOrderFor('employeeCode'),
    },
    {
      title: 'Name',
      key: 'name',
      sorter: true,
      sortOrder: sortOrderFor('name'),
      render: (_, row) => `${row.firstName} ${row.lastName}`,
    },
    { title: 'Email', dataIndex: 'email', key: 'email', ellipsis: true },
    {
      title: 'Department',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 190,
      sorter: true,
      sortOrder: sortOrderFor('departmentName'),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 190,
      sorter: true,
      sortOrder: sortOrderFor('position'),
    },
    {
      title: 'Salary',
      dataIndex: 'salary',
      key: 'salary',
      width: 140,
      align: 'right',
      sorter: true,
      sortOrder: sortOrderFor('salary'),
      render: formatCurrency,
    },
    {
      title: 'Hire Date',
      dataIndex: 'hireDate',
      key: 'hireDate',
      width: 130,
      sorter: true,
      sortOrder: sortOrderFor('hireDate'),
      render: formatDate,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: true,
      sortOrder: sortOrderFor('status'),
      render: (status) => <Tag color={status === 'Active' ? 'green' : 'default'}>{status}</Tag>,
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, row) => (
        <Space size="small">
          <Button type="link" size="small" style={{ padding: 0 }} onClick={() => openEdit(row)}>
            Edit
          </Button>
          <Popconfirm
            title="Delete this employee?"
            description={`${row.firstName} ${row.lastName} will be permanently removed.`}
            okText="Delete"
            okButtonProps={{ danger: true }}
            cancelText="Cancel"
            onConfirm={() => handleDelete(row)}
          >
            <Button type="link" size="small" danger style={{ padding: 0 }}>
              Delete
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Flex justify="space-between" align="center" style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          Employees
        </Typography.Title>
        <Button type="primary" onClick={openCreate}>
          Add employee
        </Button>
      </Flex>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          allowClear
          placeholder="Search name, email, code or position"
          style={{ width: 320 }}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
        <Select
          allowClear
          placeholder="All departments"
          style={{ width: 220 }}
          value={query.departmentId}
          onChange={(value) => updateFilter({ departmentId: value })}
          options={departments.map((d) => ({ value: d.departmentId, label: d.departmentName }))}
        />
        <Select
          allowClear
          placeholder="All statuses"
          style={{ width: 160 }}
          value={query.status}
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
        onChange={handleTableChange}
        pagination={{
          current: query.page,
          pageSize: query.pageSize,
          total,
          showSizeChanger: true,
          showTotal: (count, range) => `${range[0]}-${range[1]} of ${count} employees`,
        }}
      />

      <EmployeeFormModal
        open={formOpen}
        employee={editing}
        departments={departments}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </Card>
  );
}
