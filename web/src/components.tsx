import React, { useEffect, useRef } from 'react';
import { Alert, Card, Modal, Typography } from 'antd';
import * as echarts from 'echarts';

export function StatCard({ title, value, suffix, hint }: { title: string; value: React.ReactNode; suffix?: string; hint?: string }) {
  return <Card className="stat-card" bordered={false}><Typography.Text type="secondary">{title}</Typography.Text><div className="stat-value">{value}<span>{suffix}</span></div>{hint && <div className="stat-hint">{hint}</div>}</Card>;
}

export function RateChart({ data }: { data: { publish: number; deliver: number; ack: number } }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = echarts.init(ref.current);
    chart.setOption({
      tooltip: { trigger: 'axis' },
      grid: { left: 45, right: 20, top: 25, bottom: 35 },
      xAxis: { type: 'category', data: ['发布', '投递/获取', '确认'] },
      yAxis: { type: 'value', name: 'msg/s' },
      series: [{ type: 'bar', data: [data.publish, data.deliver, data.ack], barMaxWidth: 56 }],
    });
    const onResize = () => chart.resize();
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.dispose(); };
  }, [data]);
  return <div ref={ref} style={{ width: '100%', height: 280 }} />;
}

export function DangerConfirm({ open, title, resource, description, onCancel, onConfirm, loading }: { open: boolean; title: string; resource: string; description?: string; onCancel: () => void; onConfirm: () => void; loading?: boolean }) {
  const [value, setValue] = React.useState('');
  useEffect(() => { if (open) setValue(''); }, [open]);
  return <Modal open={open} title={title} okText="确认执行" cancelText="取消" okButtonProps={{ danger: true, disabled: value !== resource, loading }} onOk={onConfirm} onCancel={onCancel} destroyOnClose>
    <Alert type="warning" showIcon message={description || '此操作可能不可恢复。'} style={{ marginBottom: 16 }} />
    <Typography.Paragraph>请输入资源名称 <Typography.Text code>{resource}</Typography.Text> 进行确认：</Typography.Paragraph>
    <input className="native-input" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
  </Modal>;
}

export function JsonPreview({ value }: { value: unknown }) {
  return <pre className="json-preview">{JSON.stringify(value, null, 2)}</pre>;
}
