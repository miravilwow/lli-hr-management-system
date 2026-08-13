import { useCallback, useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Flex,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';

import { fetchDepartments } from '../api/employees';
import { downloadEmployeeReportCsv, fetchEmployeeReport } from '../api/reports';
import { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';

const { RangePicker } = DatePicker;

export default function ReportPage() {
  const { message } = App.useApp();

  const [departments, setDepartments] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    departmentId: undefined,
    status: undefined,
    range: null,
  });

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch((err) => message.error(getErrorMessage(err, 'Could not load departments')));
  }, [message]);

  // The filter state holds a dayjs range; the API takes two ISO dates.
  const toQuery = useCallback(
    () => ({
      departmentId: filters.departmentId,
      status: filters.status,
      from: filters.range?.[0]?.format('YYYY-MM-DD'),
      to: filters.range?.[1]?.format('YYYY-MM-DD'),
    }),
    [filters]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReport(await fetchEmployeeReport(toQuery()));
    } catch (err) {
      message.error(getErrorMessage(err, 'Could not generate the report'));
    } finally {
      setLoading(false);
    }
  }, [toQuery, message]);

  useEffect(() => {
    load();
  }, [load]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadEmployeeReportCsv(toQuery());
      message.success('Report exported');
    } catch (err) {
      message.error(getErrorMessage(err, 'Could not export the report'));
    } finally {
      setExporting(false);
    }
  };

  const columns = [
    { title: 'Code', dataIndex: 'employeeCode', width: 110 },
    {
      title: 'Name',
      key: 'name',
      render: (_, row) => `${row.firstName} ${row.lastName}`,
    },
    { title: 'Department', dataIndex: 'departmentName', width: 190 },
    { title: 'Position', dataIndex: 'position', width: 190 },
    {
      title: 'Salary',
      dataIndex: 'salary',
      width: 140,
      align: 'right',
      render: formatCurrency,
    },
    { title: 'Hire Date', dataIndex: 'hireDate', width: 130, render: formatDate },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : 'default'}>{status}</Tag>
      ),
    },
  ];

  const breakdownColumns = [
    { title: 'Department', dataIndex: 'departmentName' },
    { title: 'Headcount', dataIndex: 'headcount', align: 'right', width: 120 },
    {
      title: 'Monthly Payroll',
      dataIndex: 'totalMonthlyPayroll',
      align: 'right',
      width: 170,
      render: formatCurrency,
    },
    {
      title: 'Average Salary',
      dataIndex: 'averageSalary',
      align: 'right',
      width: 170,
      render: formatCurrency,
    },
  ];

  const summary = report?.summary;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            Employee Report
          </Typography.Title>
          <Button
            type="primary"
            loading={exporting}
            disabled={!report?.rows?.length}
            onClick={handleExport}
          >
            Export CSV
          </Button>
        </Flex>

        <Space wrap style={{ marginTop: 16 }}>
          <Select
            allowClear
            placeholder="All departments"
            style={{ width: 220 }}
            value={filters.departmentId}
            onChange={(value) => setFilters((p) => ({ ...p, departmentId: value }))}
            options={departments.map((d) => ({
              value: d.departmentId,
              label: d.departmentName,
            }))}
          />
          <Select
            allowClear
            placeholder="All statuses"
            style={{ width: 160 }}
            value={filters.status}
            onChange={(value) => setFilters((p) => ({ ...p, status: value }))}
            options={[
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
            ]}
          />
          <RangePicker
            format="DD MMM YYYY"
            placeholder={['Hired from', 'Hired to']}
            value={filters.range}
            onChange={(range) => setFilters((p) => ({ ...p, range }))}
          />
        </Space>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic title="Headcount" value={summary?.headcount ?? 0} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Total Monthly Payroll"
              value={formatCurrency(summary?.totalMonthlyPayroll ?? 0)}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="Average Salary"
              value={formatCurrency(summary?.averageSalary ?? 0)}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Breakdown by department">
        <Table
          rowKey="departmentName"
          size="small"
          loading={loading}
          columns={breakdownColumns}
          dataSource={report?.byDepartment ?? []}
          pagination={false}
        />
      </Card>

      <Card title="Matching employees">
        <Table
          rowKey="employeeCode"
          loading={loading}
          columns={columns}
          dataSource={report?.rows ?? []}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          summary={(rows) => {
            const total = rows.reduce((sum, row) => sum + Number(row.salary), 0);

            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={4}>
                  <strong>Total for {rows.length} shown</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={4} align="right">
                  <strong>{formatCurrency(total)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={5} colSpan={2} />
              </Table.Summary.Row>
            );
          }}
        />
      </Card>
    </Space>
  );
}
