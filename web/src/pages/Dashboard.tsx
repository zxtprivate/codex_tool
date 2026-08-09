import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Space, Table, Tag, Typography } from 'antd';
import { rmq, fmt, rate } from '../api';
import { RateChart, StatCard } from '../components';

export default function Dashboard() {
  const [overview, setOverview] = useState<any>(null);
  const [nodes, setNodes] = useState<any[]>([]);
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const [o, n] = await Promise.all([rmq('GET', '/api/overview'), rmq<any[]>('GET', '/api/nodes')]);
      setOverview(o); setNodes(n); setError('');
    } catch (e: any) { setError(e.message); }
  };
  useEffect(() => { load(); const id = setInterval(load, 10000); return () => clearInterval(id); }, []);
  if (!overview) return <Card loading={!error}>{error && <Alert type="error" message={error} />}</Card>;
  const q = overview.queue_totals || {};
  const object = overview.object_totals || {};
  const ms = overview.message_stats || {};
  return <Space direction="vertical" size={16} style={{ width: '100%' }}>
    {error && <Alert type="error" message={error} showIcon />}
    <div><Typography.Title level={2} style={{ marginBottom: 4 }}>运行总览</Typography.Title><Typography.Text type="secondary">集群 {overview.cluster_name || '-'} · RabbitMQ {overview.rabbitmq_version || '-'}</Typography.Text></div>
    <Row gutter={[16,16]}>
      <Col xs={12} lg={6}><StatCard title="消息总数" value={fmt(q.messages)} hint={`Ready ${fmt(q.messages_ready)} / Unacked ${fmt(q.messages_unacknowledged)}`} /></Col>
      <Col xs={12} lg={6}><StatCard title="队列" value={fmt(object.queues)} hint={`消费者 ${fmt(object.consumers)}`} /></Col>
      <Col xs={12} lg={6}><StatCard title="连接" value={fmt(object.connections)} hint={`通道 ${fmt(object.channels)}`} /></Col>
      <Col xs={12} lg={6}><StatCard title="发布速率" value={rate(ms.publish_details?.rate)} hint={`投递 ${rate(ms.deliver_get_details?.rate)}`} /></Col>
    </Row>
    <Row gutter={[16,16]}>
      <Col xs={24} xl={14}><Card title="实时消息速率" bordered={false}><RateChart data={{ publish: ms.publish_details?.rate || 0, deliver: ms.deliver_get_details?.rate || 0, ack: ms.ack_details?.rate || 0 }} /></Card></Col>
      <Col xs={24} xl={10}><Card title="节点" bordered={false}><Table rowKey="name" size="small" pagination={false} dataSource={nodes} columns={[
        { title: '节点', dataIndex: 'name', ellipsis: true },
        { title: '状态', render: (_, r:any) => <Tag color={r.running ? 'success' : 'error'}>{r.running ? '运行中' : '异常'}</Tag> },
        { title: '内存', render: (_, r:any) => `${Math.round((r.mem_used||0)/1024/1024)} MB` },
        { title: '磁盘可用', render: (_, r:any) => `${((r.disk_free||0)/1024/1024/1024).toFixed(1)} GB` },
      ]} /></Card></Col>
    </Row>
  </Space>;
}
