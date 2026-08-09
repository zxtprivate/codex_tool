import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, InputNumber, Modal, Select, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, EyeOutlined, PlusOutlined, ReloadOutlined, StopOutlined } from '@ant-design/icons';
import { enc, fmt, rmq } from '../api';
import { DangerConfirm, JsonPreview } from '../components';
import type { QueueInfo } from '../types';

export default function Queues() {
  const [vhosts, setVhosts] = useState<any[]>([]); const [vhost, setVhost] = useState('/'); const [rows, setRows] = useState<QueueInfo[]>([]); const [loading, setLoading] = useState(false); const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false); const [messagesFor, setMessagesFor] = useState<QueueInfo|null>(null); const [msgs, setMsgs] = useState<any[]>([]); const [fetchCount, setFetchCount] = useState(5);
  const [danger, setDanger] = useState<{kind:'purge'|'delete'; q:QueueInfo}|null>(null); const [form] = Form.useForm();
  const loadVhosts = async () => { const v = await rmq<any[]>('GET','/api/vhosts'); setVhosts(v); if (!v.some(x=>x.name===vhost) && v[0]) setVhost(v[0].name); };
  const load = async () => { setLoading(true); try { const data = await rmq<QueueInfo[]>('GET', `/api/queues/${enc(vhost)}?page=1&page_size=500`); setRows(data); setError(''); } catch(e:any){setError(e.message)} finally {setLoading(false)} };
  useEffect(()=>{loadVhosts().catch((e)=>setError(e.message))},[]); useEffect(()=>{if(vhost) load()},[vhost]);
  const createQueue = async (values:any) => { const args:any = {}; if(values.type==='quorum') args['x-queue-type']='quorum'; await rmq('PUT',`/api/queues/${enc(vhost)}/${enc(values.name)}`,{durable: values.type==='quorum' ? true : !!values.durable, auto_delete: values.type==='quorum' ? false : !!values.auto_delete, exclusive:false, arguments:args}); message.success('队列已创建'); setCreateOpen(false); form.resetFields(); load(); };
  const getMessages = async () => { if(!messagesFor) return; const data = await rmq<any[]>('POST',`/api/queues/${enc(messagesFor.vhost)}/${enc(messagesFor.name)}/get`,{count:fetchCount,ackmode:'ack_requeue_true',encoding:'auto',truncate:50000}); setMsgs(data); };
  const doDanger = async () => { if(!danger) return; const p=`/api/queues/${enc(danger.q.vhost)}/${enc(danger.q.name)}`; if(danger.kind==='purge') await rmq('DELETE',`${p}/contents`); else await rmq('DELETE',p); message.success(danger.kind==='purge'?'队列消息已清空':'队列已删除'); setDanger(null); load(); };
  return <Space direction="vertical" size={14} style={{width:'100%'}}>
    <div className="page-head"><div><Typography.Title level={2}>队列（Queue）</Typography.Title><Typography.Text type="secondary">查看积压、消费者和消息；测试读取使用重新入队模式。</Typography.Text></div><Space><Select style={{minWidth:170}} value={vhost} options={vhosts.map(x=>({label:x.name,value:x.name}))} onChange={setVhost}/><Button icon={<ReloadOutlined/>} onClick={load}>刷新</Button><Button type="primary" icon={<PlusOutlined/>} onClick={()=>setCreateOpen(true)}>创建队列</Button></Space></div>
    {error&&<Alert type="error" message={error} showIcon/>}
    <Table rowKey={(r)=>`${r.vhost}:${r.name}`} loading={loading} dataSource={rows} scroll={{x:1100}} columns={[
      {title:'名称',dataIndex:'name',fixed:'left',width:220,render:(v,r)=><Space><Typography.Text strong>{v}</Typography.Text><Tag>{r.type||'classic'}</Tag></Space>},
      {title:'状态',dataIndex:'state',width:100,render:v=><Tag color={v==='running'?'success':'warning'}>{v||'-'}</Tag>},
      {title:'消息',dataIndex:'messages',width:100,render:fmt},{title:'Ready',dataIndex:'messages_ready',width:100,render:fmt},{title:'Unacked',dataIndex:'messages_unacknowledged',width:100,render:fmt},{title:'消费者',dataIndex:'consumers',width:100,render:fmt},
      {title:'持久化',dataIndex:'durable',width:90,render:v=>v?'是':'否'},
      {title:'操作',fixed:'right',width:250,render:(_,r)=><Space><Button size="small" icon={<EyeOutlined/>} onClick={()=>{setMessagesFor(r);setMsgs([])}}>消息</Button><Button size="small" danger icon={<StopOutlined/>} onClick={()=>setDanger({kind:'purge',q:r})}>清空</Button><Button size="small" danger icon={<DeleteOutlined/>} onClick={()=>setDanger({kind:'delete',q:r})}>删除</Button></Space>}
    ]}/>
    <Modal open={createOpen} title={`在 ${vhost} 创建队列`} okText="创建" onOk={()=>form.submit()} onCancel={()=>setCreateOpen(false)} destroyOnClose><Form form={form} layout="vertical" initialValues={{type:'classic',durable:true,auto_delete:false}} onFinish={createQueue}><Form.Item name="name" label="队列名称" rules={[{required:true}]}><Input/></Form.Item><Form.Item name="type" label="队列类型"><Select options={[{label:'Classic',value:'classic'},{label:'Quorum',value:'quorum'}]}/></Form.Item><Form.Item name="durable" label="持久化" valuePropName="checked"><Switch/></Form.Item><Form.Item name="auto_delete" label="自动删除" valuePropName="checked"><Switch/></Form.Item></Form></Modal>
    <Modal width={900} open={!!messagesFor} title={`查看消息：${messagesFor?.name||''}`} footer={null} onCancel={()=>setMessagesFor(null)}><Space style={{marginBottom:12}}><InputNumber min={1} max={100} value={fetchCount} onChange={v=>setFetchCount(v||5)}/><Button type="primary" onClick={getMessages}>读取（重新入队）</Button></Space><Alert type="info" showIcon message="读取使用 ack_requeue_true，消息会重新回到队列；适合排查，不会主动消费掉 Ready 消息。" style={{marginBottom:12}}/>{msgs.length===0?<Typography.Text type="secondary">暂无已读取消息</Typography.Text>:msgs.map((m,i)=><div key={i} style={{marginBottom:12}}><Typography.Text strong>#{i+1} · routing_key={m.routing_key||'-'} · 剩余 {m.message_count}</Typography.Text><JsonPreview value={m}/></div>)}</Modal>
    <DangerConfirm open={!!danger} title={danger?.kind==='purge'?'清空队列':'删除队列'} resource={danger?.q.name||''} description={danger?.kind==='purge'?'将删除此队列当前所有 Ready 消息，不可恢复。':'将删除队列及其当前消息和相关绑定，不可恢复。'} onCancel={()=>setDanger(null)} onConfirm={doDanger}/>
  </Space>;
}
