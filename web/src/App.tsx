import { useEffect, useMemo, useState } from 'react';
import { App as AntApp, Button, ConfigProvider, Dropdown, Layout, Menu, Space, Spin, Switch, Tag, Typography, theme as antdTheme } from 'antd';
import { ApartmentOutlined, ApiOutlined, AppstoreOutlined, BranchesOutlined, CloudServerOutlined, DashboardOutlined, DatabaseOutlined, LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SafetyCertificateOutlined, SwapOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import { getSession, logout } from './api';
import Login from './Login';
import Dashboard from './pages/Dashboard';
import Queues from './pages/Queues';
import Exchanges from './pages/Exchanges';
import Bindings from './pages/Bindings';
import VHosts from './pages/VHosts';
import Users from './pages/Users';
import Connections from './pages/Connections';
import Channels from './pages/Channels';
import Consumers from './pages/Consumers';
import SystemPage from './pages/SystemPage';
import type { SessionInfo } from './types';

const { Header, Sider, Content } = Layout;
const pageMap: Record<string, any> = { dashboard: Dashboard, queues: Queues, exchanges: Exchanges, bindings: Bindings, vhosts: VHosts, users: Users, connections: Connections, channels: Channels, consumers: Consumers, system: SystemPage };

export default function App(){
 const[session,setSession]=useState<SessionInfo|null|undefined>(undefined);const[page,setPage]=useState('dashboard');const[collapsed,setCollapsed]=useState(false);const[dark,setDark]=useState(()=>localStorage.getItem('rmq-cn-theme')==='dark');
 useEffect(()=>{getSession().then(setSession).catch(()=>setSession(null));const onExpired=()=>setSession(null);window.addEventListener('rmq-session-expired',onExpired);return()=>window.removeEventListener('rmq-session-expired',onExpired)},[]);useEffect(()=>{localStorage.setItem('rmq-cn-theme',dark?'dark':'light')},[dark]);
 const items=useMemo(()=>[
  {key:'dashboard',icon:<DashboardOutlined/>,label:'总览'},
  {type:'group' as const,label:'消息拓扑',children:[{key:'queues',icon:<DatabaseOutlined/>,label:'队列'},{key:'exchanges',icon:<SwapOutlined/>,label:'交换机'},{key:'bindings',icon:<BranchesOutlined/>,label:'绑定'}]},
  {type:'group' as const,label:'访问控制',children:[{key:'vhosts',icon:<ApartmentOutlined/>,label:'虚拟主机'},{key:'users',icon:<TeamOutlined/>,label:'用户与权限'}]},
  {type:'group' as const,label:'运行状态',children:[{key:'connections',icon:<ApiOutlined/>,label:'连接'},{key:'channels',icon:<AppstoreOutlined/>,label:'通道'},{key:'consumers',icon:<UserOutlined/>,label:'消费者'},{key:'system',icon:<CloudServerOutlined/>,label:'系统与节点'}]},
 ],[]);
 if(session===undefined)return <div className="center-screen"><Spin size="large"/></div>;
 if(!session)return <ConfigProvider locale={zhCN} theme={{algorithm:dark?antdTheme.darkAlgorithm:antdTheme.defaultAlgorithm}}><AntApp><Login onSuccess={setSession}/></AntApp></ConfigProvider>;
 const Page=pageMap[page]||Dashboard;
 const doLogout=async()=>{await logout();setSession(null)};
 return <ConfigProvider locale={zhCN} theme={{algorithm:dark?antdTheme.darkAlgorithm:antdTheme.defaultAlgorithm,token:{borderRadius:10,colorPrimary:'#16a34a'}}}><AntApp><Layout className="app-layout"><Sider width={232} collapsedWidth={72} collapsed={collapsed} theme={dark?'dark':'light'} className="app-sider"><div className="side-brand"><div className="side-logo">R</div>{!collapsed&&<div><strong>RabbitMQ</strong><span>中文控制台</span></div>}</div><Menu mode="inline" selectedKeys={[page]} items={items} onClick={({key})=>setPage(key)} style={{borderInlineEnd:0}}/></Sider><Layout><Header className="app-header"><Button type="text" icon={collapsed?<MenuUnfoldOutlined/>:<MenuFoldOutlined/>} onClick={()=>setCollapsed(!collapsed)}/><div className="header-spacer"/><Space size={12}><Switch checked={dark} onChange={setDark} checkedChildren="深色" unCheckedChildren="浅色"/><Tag color="success">已连接</Tag><Dropdown menu={{items:[{key:'logout',icon:<LogoutOutlined/>,label:'退出连接',onClick:doLogout}]}}><Button type="text" icon={<SafetyCertificateOutlined/>}><span className="desktop-only">{session.connection.username}@{session.connection.host}:{session.connection.managementPort}</span></Button></Dropdown></Space></Header><Content className="app-content"><Page/></Content></Layout></Layout></AntApp></ConfigProvider>;
}
