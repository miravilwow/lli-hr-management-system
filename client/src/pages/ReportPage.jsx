import { useCallback, useEffect, useState } from 'react';
import { DownloadOutlined } from '@ant-design/icons';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Grid,
  List,
  Pagination,
  Row,
  Select,
  Skeleton,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';

import { fetchDepartments } from '../api/employees';
import { downloadEmployeeReportCsv, fetchEmployeeReport } from '../api/reports';
import { getErrorMessage } from '../api/client';
import { formatCurrency, formatDate } from '../utils/format';
import PageHeader from '../components/PageHeader';

const { RangePicker } = DatePicker;

export default function ReportPage() {
  const { message } = App.useApp();

  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const [departments, setDepartments] = useState([]);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [filters, setFilters] = useState({
    departmentId: undefined,
    status: undefined,
    range: null,
  });

  const [pagination, setPagination] = useState({ page: 1, pageSize: 25 });

  useEffect(() => {
    fetchDepartments()
      .then(setDepartments)
      .catch((err) => message.error(getErrorMessage(err, 'Could not load departments')));
  }, [message]);

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
      setReport(await fetchEmployeeReport({ ...toQuery(), ...pagination }));
    } catch (err) {
      message.error(getErrorMessage(err, 'Could not generate the report'));
    } finally {
      setLoading(false);
    }
  }, [toQuery, pagination, message]);

  useEffect(() => {
    load();
  }, [load]);

  const updateFilter = (patch) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

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

  const summary = report?.summary;

  const stats = [
    { key: 'headcount', title: 'Headcount', value: summary?.headcount ?? 0, raw: true },
    {
      key: 'payroll',
      // Salary is a single current value with no history, so this is
      // payroll as it stands today - not a figure for any past month.
      title: 'Current Monthly Payroll',
      value: formatCurrency(summary?.totalMonthlyPayroll ?? 0),
    },
    { key: 'average', title: 'Average Salary', value: formatCurrency(summary?.averageSalary ?? 0) },
  ];

  const columns = [
    { title: 'Code', dataIndex: 'employeeCode', width: 112 },
    {
      title: 'Name',
      key: 'name',
      render: (_, row) => `${row.firstName} ${row.lastName}`,
    },
    { title: 'Department', dataIndex: 'departmentName', width: 180 },
    { title: 'Position', dataIndex: 'position', width: 180 },
    {
      title: 'Salary',
      dataIndex: 'salary',
      width: 140,
      align: 'right',
      className: 'numeric',
      render: formatCurrency,
    },
    { title: 'Hired', dataIndex: 'hireDate', width: 128, className: 'numeric', render: formatDate },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 104,
      render: (status) => <Tag color={status === 'Active' ? 'success' : 'default'}>{status}</Tag>,
    },
  ];

  const breakdownColumns = [
    { title: 'Department', dataIndex: 'departmentName' },
    { title: 'Headcount', dataIndex: 'headcount', align: 'right', width: 110, className: 'numeric' },
    {
      title: 'Monthly Payroll',
      dataIndex: 'totalMonthlyPayroll',
      align: 'right',
      width: 168,
      className: 'numeric',
      render: formatCurrency,
    },
    {
      title: 'Average',
      dataIndex: 'averageSalary',
      align: 'right',
      width: 148,
      className: 'numeric',
      render: formatCurrency,
    },
  ];

  const noResults = (
    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No employees match these filters" />
  );

  return (
    <>
      <PageHeader
        title="Employee Report"
        description="Headcount and payroll for the current workforce, filtered however you need it."
        extra={
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            loading={exporting}
            disabled={!report?.rows?.length}
            onClick={handleExport}
          >
            {isMobile ? 'CSV' : 'Export CSV'}
          </Button>
        }
      />

      <Flex vertical gap={16}>
        <Card styles={{ body: { padding: isMobile ? 14 : 20 } }}>
          <Flex gap={8} wrap className="toolbar">
            <Select
              allowClear
              placeholder="All departments"
              value={filters.departmentId}
              onChange={(value) => updateFilter({ departmentId: value })}
              options={departments.map((d) => ({
                value: d.departmentId,
                label: d.departmentName,
              }))}
              className="toolbar__select"
            />
            <Select
              allowClear
              placeholder="All statuses"
              value={filters.status}
              onChange={(value) => updateFilter({ status: value })}
              options={[
                { value: 'Active', label: 'Active' },
                { value: 'Inactive', label: 'Inactive' },
              ]}
              className="toolbar__select toolbar__select--narrow"
            />
            <RangePicker
              format="DD MMM YYYY"
              placeholder={['Hired from', 'Hired to']}
              value={filters.range}
              onChange={(range) => updateFilter({ range })}
              className="toolbar__range"
            />
          </Flex>
        </Card>

        <Row gutter={[16, 16]}>
          {stats.map((stat) => (
            <Col xs={24} sm={8} key={stat.key}>
              <Card className="stat-card" styles={{ body: { padding: 18 } }}>
                <Statistic title={stat.title} value={stat.value} loading={loading} />
              </Card>
            </Col>
          ))}
        </Row>

        <Card title="By department" styles={{ body: { padding: isMobile ? 0 : 8 } }}>
          {loading ? (
            <Skeleton active paragraph={{ rows: 4 }} style={{ padding: 16 }} />
          ) : (
            <Table
              rowKey="departmentName"
              size="small"
              columns={breakdownColumns}
              dataSource={report?.byDepartment ?? []}
              pagination={false}
              scroll={{ x: 560 }}
              locale={{ emptyText: noResults }}
            />
          )}
        </Card>

        <Card
          title="Matching employees"
          styles={{ body: { padding: isMobile ? 8 : 8 } }}
        >
          {isMobile ? (
            <>
              {loading ? (
                <Skeleton active paragraph={{ rows: 5 }} style={{ padding: 12 }} />
              ) : (
                <List
                  dataSource={report?.rows ?? []}
                  locale={{ emptyText: noResults }}
                  renderItem={(row) => (
                    <List.Item className="record">
                      <Flex vertical gap={4} style={{ width: '100%' }}>
                        <Flex justify="space-between" gap={8}>
                          <span className="record__name">
                            {row.firstName} {row.lastName}
                          </span>
                          <span className="record__salary numeric">
                            {formatCurrency(row.salary)}
                          </span>
                        </Flex>
                        <Typography.Text type="secondary" style={{ fontSize: 12.5 }}>
                          {row.departmentName} · {row.position}
                        </Typography.Text>
                      </Flex>
                    </List.Item>
                  )}
                />
              )}

              {(report?.total ?? 0) > 0 && (
                <Flex justify="center" style={{ padding: '14px 0 6px' }}>
                  <Pagination
                    simple
                    current={report?.page ?? pagination.page}
                    pageSize={report?.pageSize ?? pagination.pageSize}
                    total={report?.total ?? 0}
                    onChange={(page, pageSize) => setPagination({ page, pageSize })}
                  />
                </Flex>
              )}
            </>
          ) : (
            <Table
              rowKey="employeeCode"
              loading={loading}
              columns={columns}
              dataSource={report?.rows ?? []}
              scroll={{ x: 900 }}
              size="middle"
              locale={{ emptyText: noResults }}
              pagination={{
                current: report?.page ?? pagination.page,
                pageSize: report?.pageSize ?? pagination.pageSize,
                total: report?.total ?? 0,
                showSizeChanger: true,
                showTotal: (count, range) => `${range[0]}-${range[1]} of ${count}`,
              }}
              onChange={(next) => setPagination({ page: next.current, pageSize: next.pageSize })}
              summary={(rows) => {
                const pageTotal = rows.reduce((sum, row) => sum + Number(row.salary), 0);

                return (
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={4}>
                      {/* Explicitly the page, not the whole result - the
                          figure for everything matched is the card above. */}
                      <strong>Total for the {rows.length} rows on this page</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={4} align="right" className="numeric">
                      <strong>{formatCurrency(pageTotal)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} colSpan={2} />
                  </Table.Summary.Row>
                );
              }}
            />
          )}
        </Card>
      </Flex>
    </>
  );
}
