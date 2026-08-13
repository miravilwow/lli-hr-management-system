import { useCallback, useEffect, useState } from 'react';
import { DeleteOutlined, EditOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Input,
  List,
  Pagination,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';

import { deleteEmployee, fetchDepartments, fetchEmployees } from '../api/employees';
import { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import useDebouncedValue from '../hooks/useDebouncedValue';
import useAuth from '../hooks/useAuth';
import EmployeeFormModal from '../components/EmployeeFormModal';
import PageHeader from '../components/PageHeader';

const INITIAL_QUERY = {
  search: '',
  departmentId: undefined,
  status: undefined,
  sortBy: undefined,
  sortOrder: undefined,
  page: 1,
  pageSize: 10,
};

// Table column key -> the sort key the API accepts.
const SORT_KEYS = {
  employeeCode: 'employeeCode',
  name: 'lastName',
  departmentName: 'department',
  position: 'position',
  salary: 'salary',
  hireDate: 'hireDate',
  status: 'status',
};

function StatusTag({ status }) {
  return <Tag color={status === 'Active' ? 'success' : 'default'}>{status}</Tag>;
}

export default function EmployeesPage() {
  const { message } = App.useApp();
  const { isAdmin } = useAuth();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState([]);

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

  const updateFilter = (patch) => setQuery((prev) => ({ ...prev, ...patch, page: 1 }));

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

      // Stepping back avoids landing on an empty last page.
      if (rows.length === 1 && query.page > 1) {
        setQuery((prev) => ({ ...prev, page: prev.page - 1 }));
      } else {
        load();
      }
    } catch (err) {
      message.error(getErrorMessage(err, 'Could not delete the employee'));
    }
  };

  const sortOrderFor = (key) => {
    if (query.sortBy !== SORT_KEYS[key]) return null;
    return query.sortOrder === 'desc' ? 'descend' : 'ascend';
  };

  const rowActions = (row) => (
    <Space size={4}>
      <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(row)}>
        Edit
      </Button>
      <Popconfirm
        title="Delete this employee?"
        description={`${row.firstName} ${row.lastName} will be removed from the active list. The record and its history are retained.`}
        okText="Delete"
        okButtonProps={{ danger: true }}
        cancelText="Cancel"
        onConfirm={() => handleDelete(row)}
      >
        <Button size="small" danger icon={<DeleteOutlined />} aria-label="Delete employee" />
      </Popconfirm>
    </Space>
  );

  const columns = [
    {
      title: 'Code',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      width: 112,
      sorter: true,
      sortOrder: sortOrderFor('employeeCode'),
    },
    {
      title: 'Name',
      key: 'name',
      sorter: true,
      sortOrder: sortOrderFor('name'),
      render: (_, row) => (
        <Flex vertical>
          <span style={{ fontWeight: 550 }}>
            {row.firstName} {row.lastName}
          </span>
          <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
            {row.email}
          </Typography.Text>
        </Flex>
      ),
    },
    {
      title: 'Department',
      dataIndex: 'departmentName',
      key: 'departmentName',
      width: 180,
      sorter: true,
      sortOrder: sortOrderFor('departmentName'),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 180,
      sorter: true,
      sortOrder: sortOrderFor('position'),
    },
    {
      title: 'Salary',
      dataIndex: 'salary',
      key: 'salary',
      width: 140,
      align: 'right',
      className: 'numeric',
      sorter: true,
      sortOrder: sortOrderFor('salary'),
      render: formatCurrency,
    },
    {
      title: 'Hired',
      dataIndex: 'hireDate',
      key: 'hireDate',
      width: 128,
      className: 'numeric',
      sorter: true,
      sortOrder: sortOrderFor('hireDate'),
      render: formatDate,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 104,
      sorter: true,
      sortOrder: sortOrderFor('status'),
      render: (status) => <StatusTag status={status} />,
    },
  ];

  if (isAdmin) {
    columns.push({
      title: '',
      key: 'actions',
      width: 108,
      fixed: 'right',
      render: (_, row) => rowActions(row),
    });
  }

  const emptyState = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        query.search || query.departmentId || query.status
          ? 'No employees match these filters'
          : 'No employees yet'
      }
    >
      {isAdmin && !query.search && (
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
          Add the first employee
        </Button>
      )}
    </Empty>
  );

  const filters = (
    <Flex gap={8} wrap className="toolbar">
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder="Search name, email, code or position"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="toolbar__search"
      />
      <Select
        allowClear
        placeholder="All departments"
        value={query.departmentId}
        onChange={(value) => updateFilter({ departmentId: value })}
        options={departments.map((d) => ({ value: d.departmentId, label: d.departmentName }))}
        className="toolbar__select"
      />
      <Select
        allowClear
        placeholder="All statuses"
        value={query.status}
        onChange={(value) => updateFilter({ status: value })}
        options={[
          { value: 'Active', label: 'Active' },
          { value: 'Inactive', label: 'Inactive' },
        ]}
        className="toolbar__select toolbar__select--narrow"
      />
    </Flex>
  );

  return (
    <>
      <PageHeader
        title="Employees"
        description="Records for everyone currently on the books, with their department, position and salary."
        extra={
          isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              Add employee
            </Button>
          )
        }
      />

      <Card styles={{ body: { padding: isMobile ? 14 : 20 } }}>
        {filters}

        {/* A seven-column grid is unusable on a phone, so below md each
            record becomes a card carrying the same information. */}
        {isMobile ? (
          <>
            {loading ? (
              <Skeleton active paragraph={{ rows: 6 }} style={{ marginTop: 16 }} />
            ) : (
              <List
                style={{ marginTop: 4 }}
                dataSource={rows}
                locale={{ emptyText: emptyState }}
                renderItem={(row) => (
                  <List.Item className="record">
                    <Flex vertical gap={8} style={{ width: '100%' }}>
                      <Flex justify="space-between" align="flex-start" gap={8}>
                        <div>
                          <div className="record__name">
                            {row.firstName} {row.lastName}
                          </div>
                          <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
                            {row.employeeCode} · {row.position}
                          </Typography.Text>
                        </div>
                        <StatusTag status={row.status} />
                      </Flex>

                      <Flex justify="space-between" align="flex-end" gap={8} wrap>
                        <Flex vertical>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            {row.departmentName}
                          </Typography.Text>
                          <span className="record__salary numeric">
                            {formatCurrency(row.salary)}
                          </span>
                        </Flex>
                        {isAdmin && rowActions(row)}
                      </Flex>
                    </Flex>
                  </List.Item>
                )}
              />
            )}

            {total > 0 && (
              <Flex justify="center" style={{ marginTop: 16 }}>
                <Pagination
                  simple
                  current={query.page}
                  pageSize={query.pageSize}
                  total={total}
                  onChange={(page, pageSize) => setQuery((prev) => ({ ...prev, page, pageSize }))}
                />
              </Flex>
            )}
          </>
        ) : (
          <Table
            rowKey="employeeId"
            loading={loading}
            columns={columns}
            dataSource={rows}
            scroll={{ x: 900 }}
            size="middle"
            onChange={handleTableChange}
            locale={{ emptyText: emptyState }}
            pagination={{
              current: query.page,
              pageSize: query.pageSize,
              total,
              showSizeChanger: true,
              showTotal: (count, range) => `${range[0]}-${range[1]} of ${count}`,
            }}
          />
        )}
      </Card>

      <EmployeeFormModal
        open={formOpen}
        employee={editing}
        departments={departments}
        onClose={() => setFormOpen(false)}
        onSaved={load}
      />
    </>
  );
}
