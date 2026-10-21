import { HomeOutlined } from '@ant-design/icons';
import { Menu } from 'antd';


const items = [
    {
        label: <><HomeOutlined /> LFortran</>,
        key: "1"
    }
]
function MyHeader() {
    return <Menu theme="dark" selectedKeys={["1"]} mode="horizontal" items={items} />;
}

export default MyHeader;
