"use client";

import { useState, type MouseEvent } from "react";
import type { NotificationCallback } from "./LoadLFortran";
import { useIsMobile } from "./useIsMobile";
import { Button } from "antd";
import { CopyOutlined } from "@ant-design/icons";
import { Segmented } from "antd";

interface ResultBoxProps {
    activeTab: string;
    output: string;
    handleUserTabChange: (key: string) => Promise<void>;
    myHeight: string;
    openNotification: NotificationCallback;
}

function ResultBox({ activeTab, output, handleUserTabChange, myHeight, openNotification }: ResultBoxProps) {
    const isMobile = useIsMobile();
    const [showCopy, setShowCopy] = useState(false);
    function copyTextToClipboard(e: MouseEvent<HTMLButtonElement>) {
        e.stopPropagation(); // Prevents the click from reaching the container below
        const parser = new DOMParser();
        const doc = parser.parseFromString(output, 'text/html');
        navigator.clipboard.writeText(doc.documentElement.textContent ?? "");
        openNotification(`${activeTab} output copied`, "bottomRight");
        setShowCopy(false); // Hide the icon after the user copies the text
    }
    return (
        <div 
            className="card-container" 
            onClick={() => isMobile && setShowCopy(!showCopy)} // Only toggle if on mobile
        >
            <Segmented
                block
                style={{ margin: "6px 0px 22px 0px" }}
                options={["STDOUT", "AST", "ASR", "WAT", "CPP", "PY"]}
                value={activeTab}
                onChange={(key) => handleUserTabChange(String(key))}
            />
            <Button 
                onClick={copyTextToClipboard}  
                style={{ 
                    position: "absolute", 
                    right: "40px", 
                    top: "80px",
                    // If not mobile, always show (opacity 1). If mobile, follow state.
                    opacity: !isMobile || showCopy ? 1 : 0, 
                    pointerEvents: !isMobile || showCopy ? "auto" : "none",
                    transition: "opacity 0.2s ease-in-out"
                }}
            >
                <CopyOutlined />
            </Button>
            <pre style={{ margin: "0px", height: myHeight, overflow: "scroll", border: "1px solid black" }}>
                <div 
                    id="outputBox" 
                    style={{ minHeight: "100%", fontSize: "0.9em", padding: "10px" }} 
                    dangerouslySetInnerHTML={{ __html: output }}
                >
                </div>
            </pre>
        </div>
    );
}
export default ResultBox;
