"use client";

import TextBox, { type SourceFile } from "../components/TextBox";
import ResultBox from "../components/ResultBox";
import LoadLFortran, { type LFortranFunctions, type NotificationCallback } from "../components/LoadLFortran";
import preinstalled_programs from "../utils/preinstalled_programs";
import { combineFortranFiles, hasUnsupportedDataReads } from "../utils/compileFiles";
import { useIsMobile } from "../components/useIsMobile";

import { useState, useEffect, useCallback, useRef } from "react";
import { Col, Row, Spin } from "antd";
import { notification } from "antd";
import { LoadingOutlined } from "@ant-design/icons";
import AnsiUp from "ansi_up";

const ansi_up = new AnsiUp();

const antIcon = (
    <LoadingOutlined
        style={{
            fontSize: 24,
        }}
        spin
    />
);

const openNotification: NotificationCallback = (message, placement) => {
    notification.info({
        title: message,
        placement: placement as "top" | "topLeft" | "topRight" | "bottom" | "bottomLeft" | "bottomRight",
    });
};

const lfortran_funcs: LFortranFunctions = {
    emit_ast_from_source: null,
    emit_asr_from_source: null,
    emit_wat_from_source: null,
    emit_wasm_from_source: null,
    emit_cpp_from_source: null,
    emit_py_from_source: null,
    compile_code: null,
    execute_code: null,
};

export default function Home() {
    const [moduleReady, setModuleReady] = useState(false);
    const [files, setFiles] = useState<SourceFile[]>([{ id: "file-0", name: "main.f90", code: "" }]);
    const [activeFileId, setActiveFileId] = useState("file-0");
    const nextFileId = useRef(1);
    const setSourceCode = useCallback((code: string) => {
        setFiles((current) => current.map((file) =>
            file.id === activeFileId ? { ...file, code } : file
        ));
    }, [activeFileId]);

    // URL and default sources always populate the initial file, even if a fetch finishes after a tab switch.
    const setInitialSourceCode = useCallback((code: string) => {
        setFiles((current) => current.map((file) =>
            file.id === "file-0" ? { ...file, code } : file
        ));
    }, []);

    const addFile = () => {
        const id = `file-${nextFileId.current++}`;
        let index = 1;
        while (files.some((file) => file.name.toLowerCase() === `untitled-${index}.f90`)) index++;
        setFiles((current) => [...current, { id, name: `untitled-${index}.f90`, code: "" }]);
        setActiveFileId(id);
        setOutput("");
    };

    const selectFile = (id: string) => {
        setActiveFileId(id);
        setOutput("");
    };

    const removeFile = (id: string) => {
        if (files.length === 1) return;
        const index = files.findIndex((file) => file.id === id);
        const remaining = files.filter((file) => file.id !== id);
        setFiles(remaining);
        if (activeFileId === id) {
            setActiveFileId(remaining[Math.min(index, remaining.length - 1)].id);
            setOutput("");
        }
    };

    const renameFile = (id: string, name: string) => {
        setFiles((current) => current.map((file) => file.id === id ? { ...file, name } : file));
    };

    const loadExample = (exampleFiles: Array<{ name: string; code: string }>) => {
        const newFiles = exampleFiles.map((file) => ({
            ...file,
            id: `file-${nextFileId.current++}`,
        }));
        const mainFile = newFiles.find((file) => file.name.toLowerCase() === "main.f90") ?? newFiles[0];
        setFiles(newFiles);
        setActiveFileId(mainFile.id);
        setOutput("");
    };

    const [activeTab, setActiveTab] = useState("STDOUT");
    const [output, setOutput] = useState("");
    const [dataFetch, setDataFetch] = useState(false);
    const isMobile = useIsMobile();
    const hasAutoRun = useRef(false);

    const myHeight = ((!isMobile) ? "calc(100vh - 170px)" : "calc(50vh - 85px)");


    const fetchData = useCallback(async () => {
        const url = window.location.search;
        const gist = "https://gist.githubusercontent.com/";
        const github = "https://raw.githubusercontent.com/";
        const urlParams = new URLSearchParams(url);

        const code = urlParams.get("code");
        if (code) {
            setInitialSourceCode(decodeURIComponent(code));
            setDataFetch(true);
        } else if (urlParams.get("github")) {
            const rawUrl = github + urlParams.get("github");
            fetch(rawUrl, {cache: "no-store"})
                .then((response) => response.text())
                .then((data) => {
                    setInitialSourceCode(data);
                    setDataFetch(true);
                    openNotification(
                        "Source Code loaded from git.",
                        "bottomRight"
                    );
                })
                .catch((error) => {
                    console.error("Error fetching data:", error);
                    openNotification("error fetching .", "bottomRight");
                });
        } else if (urlParams.get("gist")) {
            const gistUrl = gist + urlParams.get("gist") + "/raw/";
            fetch(gistUrl, {cache: "no-store"})
                .then((response) => response.text())
                .then((data) => {
                    setInitialSourceCode(data);
                    setDataFetch(true);
                    openNotification(
                        "Source Code loaded from gist.",
                        "bottomRight"
                    );
                })
                .catch((error) => {
                    console.error("Error fetching data:", error);
                    openNotification("error fetching .", "bottomRight");
                });
        } else {
            setInitialSourceCode(preinstalled_programs.basic.mandelbrot);
            setDataFetch(true);
            if(urlParams.size>0){
                openNotification("The URL contains an invalid parameter.", "bottomRight");
            }
        }
    }, [setInitialSourceCode]);

    const handleUserTabChange = useCallback(async (key: string) => {
        let sourceCode: string;
        try {
            sourceCode = combineFortranFiles(files);
        } catch (error) {
            setOutput(String(error));
            setActiveTab(key);
            return;
        }
        if (!sourceCode) {
            setOutput("No Fortran source files to compile");
            setActiveTab(key);
            return;
        }
        if (key == "STDOUT") {
            if (hasUnsupportedDataReads(files, sourceCode)) {
                setOutput("Reading workspace data files is not supported by this WASM compiler yet. The compiler filesystem and the generated program's filesystem are separate.");
                setActiveTab(key);
                return;
            }
            const start_compile = performance.now();
            const wasm_bytes_response = lfortran_funcs.compile_code!(sourceCode);
            const end_compile = performance.now();
            const duration_compile = end_compile - start_compile;
            sessionStorage.setItem("duration_compile", String(duration_compile));
            if (wasm_bytes_response) {
                const [exit_code, ...compile_result] = wasm_bytes_response.split(",");
                if (exit_code !== "0") {
                     // print compile-time error found by lfortran to output
                    setOutput(ansi_up.ansi_to_html(compile_result.join(",")) + `\nCompilation Time: ${duration_compile} ms`);
                }
                else {
                    const stdout: string[] = [];
                    await lfortran_funcs.execute_code!(
                        new Uint8Array(compile_result.map(Number)),
                        (text: string) => stdout.push(text)
                    );
                    setOutput(stdout.join(""));
                }
            }
        } else if (key == "AST") {
            const res = lfortran_funcs.emit_ast_from_source!(sourceCode);
            if (res) {
                setOutput(ansi_up.ansi_to_html(res));
            }
        } else if (key == "ASR") {
            const res = lfortran_funcs.emit_asr_from_source!(sourceCode);
            if (res) {
                setOutput(ansi_up.ansi_to_html(res));
            }
        } else if (key == "WAT") {
            const res = lfortran_funcs.emit_wat_from_source!(sourceCode);
            if (res) {
                setOutput(ansi_up.ansi_to_html(res));
            }
        } else if (key == "CPP") {
            const res = lfortran_funcs.emit_cpp_from_source!(sourceCode);
            if (res) {
                setOutput(ansi_up.ansi_to_html(res));
            }
        } else if (key == "PY") {
            setOutput("Support for PY is not yet enabled");
        } else {
            console.log("Unknown key:", key);
            setOutput("Unknown key: " + key);
        }
        setActiveTab(key);
    }, [files]);

    useEffect(() => {
        // URL-based initialization requires the hydrated browser environment.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        if (moduleReady && dataFetch && !hasAutoRun.current) {
            hasAutoRun.current = true;
            handleUserTabChange("STDOUT");
        }
    }, [moduleReady, dataFetch, handleUserTabChange]);

    return (
        <>
            <LoadLFortran
                setModuleReady={setModuleReady}
                lfortran_funcs={lfortran_funcs}
                openNotification={openNotification}
                myPrint={setOutput}
            ></LoadLFortran>

            <Row gutter={[16, 16]}>
                <Col xs={{ span: 24 }} sm={{ span: 24 }} md={{ span: 12 }}>
                    <TextBox
                        disabled={!moduleReady}
                        files={files}
                        activeFileId={activeFileId}
                        setSourceCode={setSourceCode}
                        onAddFile={addFile}
                        onSelectFile={selectFile}
                        onRemoveFile={removeFile}
                        onRenameFile={renameFile}
                        onLoadExample={loadExample}
                        activeTab={activeTab}
                        handleUserTabChange={handleUserTabChange}
                        myHeight={myHeight}
                    ></TextBox>
                </Col>
                <Col xs={{ span: 24 }} sm={{ span: 24 }} md={{ span: 12 }}>
                    {moduleReady ? (
                        <ResultBox
                            activeTab={activeTab}
                            output={output}
                            handleUserTabChange={handleUserTabChange}
                            myHeight={myHeight}
                            openNotification={openNotification}
                        ></ResultBox>
                    ) : (
                        <div style={{height: myHeight}}>
                            <Spin
                                style={{
                                    position: "relative",
                                    top: "50%",
                                    left: "50%",
                                }}
                                indicator={antIcon}
                            />
                        </div>
                    )}
                </Col>
            </Row>
        </>
    );
}
