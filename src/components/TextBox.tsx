"use client";

import { Button, Tabs, Dropdown, Space, Input, Modal, type MenuProps } from "antd";
import { DownOutlined, PlayCircleOutlined, FullscreenOutlined, FullscreenExitOutlined, EditOutlined } from "@ant-design/icons";
import { useIsMobile } from "./useIsMobile";
import { useState, useEffect, type MouseEvent } from "react";
import preinstalled_programs from "../utils/preinstalled_programs";
import dynamic from 'next/dynamic'
const Editor = dynamic(() => import('./Editor'), {
  ssr: false
})

export interface SourceFile {
    id: string;
    name: string;
    code: string;
}

interface TextBoxProps {
    disabled: boolean;
    files: SourceFile[];
    activeFileId: string;
    setSourceCode: (code: string) => void;
    onAddFile: () => void;
    onSelectFile: (id: string) => void;
    onRemoveFile: (id: string) => void;
    onRenameFile: (id: string, name: string) => void;
    activeTab: string;
    handleUserTabChange: (key: string) => Promise<void>;
    myHeight: string;
}

function TextBox({ disabled, files, activeFileId, setSourceCode, onAddFile, onSelectFile, onRemoveFile, onRenameFile, activeTab, handleUserTabChange, myHeight }: TextBoxProps) {
    const isMobile = useIsMobile(); 
    const [isFullScreen, setIsFullScreen] = useState(false);
    const [renaming, setRenaming] = useState(false);
    const [fileName, setFileName] = useState("");
    const activeFile = files.find((file) => file.id === activeFileId) ?? files[0];
    const normalizedName = fileName.trim();
    const nameError = !normalizedName ? "Enter a file name" :
        /[\\/]/.test(normalizedName) ? "File names cannot contain slashes" :
        files.some((file) => file.id !== activeFileId && file.name.toLowerCase() === normalizedName.toLowerCase()) ? "A file with this name already exists" : "";

    const saveName = () => {
        if (nameError) return;
        onRenameFile(activeFileId, normalizedName);
        setRenaming(false);
    };

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
                    let name = `${example}.f90`;
                    let suffix = 2;
                    while (files.some((file) => file.id !== activeFileId && file.name.toLowerCase() === name.toLowerCase())) {
                        name = `${example}-${suffix++}.f90`;
                    }
                    onRenameFile(activeFileId, name);
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
                    title="Rename active file"
                    aria-label="Rename active file"
                    onClick={() => { setFileName(activeFile.name); setRenaming(true); }}
                    icon={<EditOutlined />}
                />
                <Button 
                    disabled={disabled} 
                    onClick={() => handleUserTabChange(activeTab)}
                    icon={<PlayCircleOutlined />}
                    title="Run the active file only"
                > 
                    {isMobile ? "Run" : "Run active file"}
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

    const tabItems = files.map((file) => ({
        key: file.id,
        label: file.name,
        closable: files.length > 1,
        children: file.id === activeFileId ? (
            <div style={{ height: myHeight }}>
                <Editor key={file.id} sourceCode={file.code} setSourceCode={setSourceCode} />
            </div>
        ) : null,
    }));

    return (
        <div className="card-container" style={{height: "100%" }}>
            <Tabs
                type="editable-card"
                activeKey={activeFileId}
                onChange={onSelectFile}
                onEdit={(target, action) => {
                    if (action === "add") onAddFile();
                    else onRemoveFile(String(target));
                }}
                tabBarExtraContent={extraOperations}
                style={{ height: "100%" }}
                items={tabItems}
            />
            <Modal
                title="Rename file"
                open={renaming}
                onOk={saveName}
                okButtonProps={{ disabled: !!nameError }}
                onCancel={() => setRenaming(false)}
                destroyOnHidden
            >
                <Input
                    autoFocus
                    aria-label="File name"
                    value={fileName}
                    onChange={(event) => setFileName(event.target.value)}
                    onPressEnter={saveName}
                    status={nameError ? "error" : undefined}
                />
                {nameError && <div role="alert" style={{ color: "#cf1322" }}>{nameError}</div>}
            </Modal>
        </div>
    );
}

export default TextBox;
