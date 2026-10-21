"use client";

import { Button, Tabs, Dropdown, Space, type MenuProps } from "antd";
import { DownOutlined, PlayCircleOutlined,FullscreenOutlined,FullscreenExitOutlined} from "@ant-design/icons";
import { useIsMobile } from "./useIsMobile";
import { useState, useEffect, type Dispatch, type SetStateAction, type MouseEvent } from "react";
import preinstalled_programs from "../utils/preinstalled_programs";
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('./Editor'), {
  ssr: false
})

interface TextBoxProps {
    disabled: boolean;
    sourceCode: string;
    setSourceCode: Dispatch<SetStateAction<string>>;
    exampleName: string;
    setExampleName: Dispatch<SetStateAction<string>>;
    activeTab: string;
    handleUserTabChange: (key: string) => Promise<void>;
    myHeight: string;
}

function TextBox({ disabled, sourceCode, setSourceCode, exampleName, setExampleName, activeTab, handleUserTabChange, myHeight }: TextBoxProps) {
    const isMobile = useIsMobile(); 
    const [isFullScreen, setIsFullScreen] = useState(false);

    // Listen for fullscreen changes (Esc key, browser buttons, etc.)
    useEffect(() => {
        const handler = () => setIsFullScreen(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    const handleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    const menu_items: MenuProps["items"] = [];
    for (const category of Object.keys(preinstalled_programs) as Array<keyof typeof preinstalled_programs>) {
        const category_examples: NonNullable<MenuProps["items"]> = [];
        for (const example of Object.keys(preinstalled_programs[category])) {
            category_examples.push({
                key: example,
                label: example,
                onClick: () => {
                    setSourceCode(preinstalled_programs[category][example as keyof (typeof preinstalled_programs)[typeof category]]);
                    setExampleName(example);
                }
            });
        }

        menu_items.push({
            key: category,
            label: category,
            children: category_examples
        });
    }


    const extraOperations = {
        right: (
            <Space>
                <Button 
                    onClick={handleFullScreen} 
                    icon={isFullScreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />}
                >
                    {/* Now both text options only show on desktop, keeping mobile clean */}
                    {!isMobile && (isFullScreen ? " Exit Fullscreen" : " Fullscreen")}
                </Button>
                <Button 
                    disabled={disabled} 
                    onClick={() => handleUserTabChange(activeTab)}
                    icon={<PlayCircleOutlined />}
                > 
                    Run 
                </Button>
            </Space>
        ),
        left: (
            <Dropdown menu={{ items: menu_items }} trigger={["hover"]}>
                <a onClick={(e: MouseEvent<HTMLAnchorElement>) => e.preventDefault()}>
                    <Space style={{ marginRight: "10px" }}>
                        {!isMobile && "Examples"} <DownOutlined />
                    </Space>
                </a>
            </Dropdown>
        )
    };

    const tabItems = [
        {
            key: '1',
            label: `${exampleName}.f90`,
            children: (
                <div style={{ height: myHeight }}>
                    <Editor
                        sourceCode={sourceCode}
                        setSourceCode={setSourceCode}
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="card-container" style={{height: "100%" }}>
            <Tabs 
                tabBarExtraContent={extraOperations} 
                style={{ height: "100%" }} 
                items={tabItems} 
            />
        </div>
    );
}

export default TextBox;
