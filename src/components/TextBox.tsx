"use client";

import { Button, Tabs, Dropdown, Space, Input, Modal, type MenuProps } from "antd";
import { DownOutlined, PlayCircleOutlined, EditOutlined, FileTextOutlined } from "@ant-design/icons";
import { useIsMobile } from "./useIsMobile";
import { useState, type MouseEvent } from "react";
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

type PreinstalledExample = string | Record<string, string>;

interface TextBoxProps {
    disabled: boolean;
    files: SourceFile[];
    activeFileId: string;
    setSourceCode: (code: string) => void;
    onAddFile: () => void;
    onSelectFile: (id: string) => void;
    onRemoveFile: (id: string) => void;
    onRenameFile: (id: string, name: string) => void;
    onLoadExample: (files: Array<{ name: string; code: string }>) => void;
    activeTab: string;
    handleUserTabChange: (key: string) => Promise<void>;
    myHeight: string;
}

function TextBox({ disabled, files, activeFileId, setSourceCode, onAddFile, onSelectFile, onRemoveFile, onRenameFile, onLoadExample, activeTab, handleUserTabChange, myHeight }: TextBoxProps) {
    const isMobile = useIsMobile();
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


    const menu_items: MenuProps["items"] = [];
    for (const category of Object.keys(preinstalled_programs) as Array<keyof typeof preinstalled_programs>) {
        const category_examples: NonNullable<MenuProps["items"]> = [];
        for (const example of Object.keys(preinstalled_programs[category])) {
            category_examples.push({
                key: example,
                label: example.replaceAll("_", " "),
                onClick: () => {
                    const selectedExample = preinstalled_programs[category][example as keyof (typeof preinstalled_programs)[typeof category]] as PreinstalledExample;
                    const exampleFiles = typeof selectedExample === "string"
                        ? [{ name: `${example}.f90`, code: selectedExample }]
                        : Object.entries(selectedExample).map(([name, code]) => ({ name, code }));
                    onLoadExample(exampleFiles);
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
                    aria-label="Run the active file"
                />
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
        icon: !/\.(f|for|f77|f90|f95|f03|f08)$/i.test(file.name) ? <FileTextOutlined /> : undefined,
        closable: files.length > 1,
        children: file.id === activeFileId ? (
            <div style={{ height: myHeight }}>
                <Editor key={file.id} sourceCode={file.code} setSourceCode={setSourceCode} fileName={file.name} />
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
