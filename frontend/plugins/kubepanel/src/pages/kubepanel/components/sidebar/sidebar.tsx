import {
  DashboardOutlined,
  DatabaseOutlined,
  ReloadOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { Button, ConfigProvider, Divider, Flex, Menu, MenuProps } from 'antd';

type MenuItem = Required<MenuProps>['items'][number];

export enum SideNavItemKey {
  Overview = 'overview',
  Pod = 'pod',
  Deployment = 'deployment',
  ConfigMap = 'config-map',
  PersistentVolumeClaim = 'pvc',
  StatefulSet = 'stateful-set'
}

function getItem(
  label: React.ReactNode,
  key: React.Key,
  icon?: React.ReactNode,
  children?: MenuItem[],
  type?: 'group'
): MenuItem {
  return {
    key,
    icon,
    children,
    label,
    type
  } as MenuItem;
}

const items: MenuProps['items'] = [
  getItem('Workload', 'workload', <DashboardOutlined />, [
    getItem('Overview', SideNavItemKey.Overview),
    getItem('Pods', SideNavItemKey.Pod),
    getItem('Deployments', SideNavItemKey.Deployment),
    getItem('Stateful Sets', SideNavItemKey.StatefulSet)
  ]),
  getItem('Config', 'config', <SettingOutlined />, [
    getItem('Config Maps', SideNavItemKey.ConfigMap)
  ]),
  getItem('Storage', 'storage', <DatabaseOutlined />, [
    getItem('Persistent Volume Claims', SideNavItemKey.PersistentVolumeClaim)
  ])
];

interface Props {
  onClick?: (key: SideNavItemKey) => void;
}

const ResourceSideNav = ({ onClick = () => {} }: Props) => {
  return (
    <ConfigProvider
      theme={{
        components: {
          Menu: {
            itemSelectedBg: '#9699B41A',
            itemColor: '#485058'
          }
        },
        token: {
          fontFamily: 'PingFang SC'
        }
      }}
    >
      <Flex vertical style={{ height: '100vh', backgroundColor: '#F2F2F4' }}>
        <div className="border-b-[1px] border-color-border border-solid px-[18px] py-[12px] w-full">
          <div className="flex justify-between align-middle">
            <div className="text-[#24282C] text-[16px] font-medium p-1">KubePanel</div>
            <Button
              type="text"
              icon={<ReloadOutlined style={{ color: '#219BF4', fontSize: 'large' }} />}
            />
          </div>
        </div>
        <Menu
          style={{ backgroundColor: '#F2F2F4', borderRight: 'none' }}
          defaultSelectedKeys={['overview']}
          defaultOpenKeys={['workload']}
          mode="inline"
          items={items}
          onClick={({ key }) => onClick(key as SideNavItemKey)}
        />
      </Flex>
    </ConfigProvider>
  );
};

export default ResourceSideNav;
