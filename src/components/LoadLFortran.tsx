"use client";

import Script from "next/script";
import { useCallback, useEffect } from "react";

export type OutputCallback = (text: string) => void;
export type NotificationCallback = (message: string, placement: string) => void;

type SourceTransform = (sourceCode: string) => string | 0;
type ExecuteCode = (
    bytes: Uint8Array,
    stdoutPrint: OutputCallback,
) => Promise<void>;

export interface LFortranFunctions {
    emit_ast_from_source: SourceTransform | null;
    emit_asr_from_source: SourceTransform | null;
    emit_wat_from_source: SourceTransform | null;
    emit_wasm_from_source: SourceTransform | null;
    emit_cpp_from_source: SourceTransform | null;
    emit_py_from_source: SourceTransform | null;
    compile_code: SourceTransform | null;
    execute_code: ExecuteCode | null;
}

interface LoadLFortranProps {
    setModuleReady: (ready: boolean) => void;
    lfortran_funcs: LFortranFunctions;
    openNotification: NotificationCallback;
    myPrint: OutputCallback;
}

type EmscriptenSourceFunction = (sourceCode: string) => string;

interface EmscriptenModule {
    onRuntimeInitialized?: () => void;
    locateFile?: (filePath: string) => string;
    cwrap: (
        name: string,
        returnType: "string",
        argumentTypes: ["string"],
    ) => EmscriptenSourceFunction;
}

interface CompilerFunctions {
    emit_ast_from_source: EmscriptenSourceFunction;
    emit_asr_from_source: EmscriptenSourceFunction;
    emit_wat_from_source: EmscriptenSourceFunction;
    emit_cpp_from_source: EmscriptenSourceFunction;
    emit_py_from_source: EmscriptenSourceFunction;
    emit_wasm_from_source: EmscriptenSourceFunction;
}

declare const process: {
    env: {
        NEXT_PUBLIC_SITE_BASE_PATH?: string;
    };
};

declare global {
    var Module: EmscriptenModule | null;

    interface Window {
        Module: EmscriptenModule | null;
    }
}

function getLfortranExportedFuncs(): Promise<CompilerFunctions> {
    return new Promise((resolve, reject) => {
        const emscriptenModule = Module;
        if (!emscriptenModule) {
            reject(new Error("LFortran module is not initialized"));
            return;
        }
        emscriptenModule.onRuntimeInitialized = () => {
            resolve({
                emit_ast_from_source: emscriptenModule.cwrap("emit_ast_from_source", "string", ["string"]),
                emit_asr_from_source: emscriptenModule.cwrap("emit_asr_from_source", "string", ["string"]),
                emit_wat_from_source: emscriptenModule.cwrap("emit_wat_from_source", "string", ["string"]),
                emit_cpp_from_source: emscriptenModule.cwrap("emit_cpp_from_source", "string", ["string"]),
                emit_py_from_source: emscriptenModule.cwrap("emit_wat_from_source", "string", ["string"]),
                emit_wasm_from_source: emscriptenModule.cwrap("emit_wasm_from_source", "string", ["string"]),
            });
        };
    });
}

let memory: WebAssembly.Memory | undefined;

interface ExitCode {
    val: number;
}

function getMemory(): WebAssembly.Memory {
    if (!memory) {
        throw new Error("WebAssembly memory is not initialized");
    }
    return memory;
}

function defineImports(
    outputBuffer: string[],
    exitCode: ExitCode,
    stdoutPrint: OutputCallback,
): WebAssembly.Imports {
    const flushBuffer = (): void => {
        stdoutPrint(outputBuffer.join(""));
        outputBuffer.length = 0;
    };

    const fdWrite = (
        _fileType: number,
        iovLocation: number,
        _numberOfIovs: number,
        _returnValueMemoryLocation: number,
    ): number => {
        const wasmMemory = getMemory();
        const memoryData = new DataView(
            wasmMemory.buffer,
            iovLocation,
            Int32Array.BYTES_PER_ELEMENT * 2,
        );
        const stringLocation = memoryData.getInt32(0, true);
        const stringLength = memoryData.getInt32(4, true);
        const text = new TextDecoder("utf8").decode(
            new Uint8Array(wasmMemory.buffer, stringLocation, stringLength),
        );
        outputBuffer.push(text);
        return 0;
    };

    const procExit = (value: number): void => {
        exitCode.val = value;
    };

    const cpuTime = (_time: number): number => Date.now() / 1000;

    const showImage = (columns: number, rows: number, arrayLocation: number): void => {
        const arrayData = new DataView(
            getMemory().buffer,
            arrayLocation,
            Int32Array.BYTES_PER_ELEMENT * rows * columns,
        );
        const canvas = document.createElement("canvas");
        canvas.width = columns;
        canvas.height = rows;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Could not create a 2D canvas context");
        }
        const imageData = context.createImageData(columns, rows);
        for (let index = 0; index < imageData.data.length; index += 4) {
            imageData.data[index] = arrayData.getInt32(index, true);
            imageData.data[index + 1] = arrayData.getInt32(index, true);
            imageData.data[index + 2] = arrayData.getInt32(index, true);
            imageData.data[index + 3] = 255;
        }
        context.putImageData(imageData, 0, 0);
        outputBuffer.push(
            `<img alt="constructed image" src="${canvas.toDataURL("image/jpeg")}" height="${rows}" width="${columns}" style="aspect-ratio: 1 / 1;"/>\n`,
        );
        flushBuffer();
    };

    const showImageColor = (columns: number, rows: number, arrayLocation: number): void => {
        const arrayData = new DataView(
            getMemory().buffer,
            arrayLocation,
            Int32Array.BYTES_PER_ELEMENT * 4 * rows * columns,
        );
        const canvas = document.createElement("canvas");
        canvas.width = columns;
        canvas.height = rows;
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Could not create a 2D canvas context");
        }
        const imageData = context.createImageData(columns, rows);
        for (let index = 0; index < imageData.data.length; index++) {
            imageData.data[index] = arrayData.getInt32(4 * index, true);
        }
        context.putImageData(imageData, 0, 0);
        outputBuffer.push(
            `<img alt="constructed image" src="${canvas.toDataURL("image/jpeg")}" height="${rows}" width="${columns}" style="aspect-ratio: 1 / 1;"/>\n`,
        );
        flushBuffer();
    };

    return {
        wasi_snapshot_preview1: {
            fd_write: fdWrite,
            proc_exit: procExit,
        },
        js: {
            cpu_time: cpuTime,
            show_img: showImage,
            show_img_color: showImageColor,
        },
    };
}

function reportCompilerError(
    error: unknown,
    message: string,
    myPrint: OutputCallback,
): 0 {
    console.log(error);
    myPrint(`${String(error)}\n${message}`);
    return 0;
}

async function setupLFortranFunctions(
    lfortranFunctions: LFortranFunctions,
    myPrint: OutputCallback,
): Promise<void> {
    const compilerFunctions = await getLfortranExportedFuncs();

    lfortranFunctions.emit_ast_from_source = (sourceCode) => {
        try {
            return compilerFunctions.emit_ast_from_source(sourceCode);
        } catch (error: unknown) {
            return reportCompilerError(error, "ERROR: AST could not be generated from the code", myPrint);
        }
    };

    lfortranFunctions.emit_asr_from_source = (sourceCode) => {
        try {
            return compilerFunctions.emit_asr_from_source(sourceCode);
        } catch (error: unknown) {
            return reportCompilerError(error, "ERROR: ASR could not be generated from the code", myPrint);
        }
    };

    lfortranFunctions.emit_wat_from_source = (sourceCode) => {
        try {
            return compilerFunctions.emit_wat_from_source(sourceCode);
        } catch (error: unknown) {
            return reportCompilerError(error, "ERROR: WAT could not be generated from the code", myPrint);
        }
    };

    lfortranFunctions.emit_cpp_from_source = (sourceCode) => {
        try {
            return compilerFunctions.emit_cpp_from_source(sourceCode);
        } catch (error: unknown) {
            return reportCompilerError(error, "ERROR: CPP could not be generated from the code", myPrint);
        }
    };

    lfortranFunctions.emit_py_from_source = (sourceCode) => {
        try {
            return compilerFunctions.emit_py_from_source(sourceCode);
        } catch (error: unknown) {
            return reportCompilerError(error, "ERROR: LLVM could not be generated from the code", myPrint);
        }
    };

    lfortranFunctions.compile_code = (sourceCode) => {
        try {
            return compilerFunctions.emit_wasm_from_source(sourceCode);
        } catch (error: unknown) {
            return reportCompilerError(
                error,
                "ERROR: The code could not be compiled. Either there is a compile-time error or there is an issue at our end.",
                myPrint,
            );
        }
    };

    lfortranFunctions.execute_code = async (bytes, stdoutPrint) => {
        const exitCode: ExitCode = { val: 1 };
        const outputBuffer: string[] = [];
        const imports = defineImports(outputBuffer, exitCode, stdoutPrint);
        let startExecution = 0;
        let endExecution = 0;
        const printResults = (): void => {
            const executionDuration = endExecution - startExecution;
            const compilationDuration = sessionStorage.getItem("duration_compile");
            outputBuffer.push(`\nCompilation time: ${compilationDuration} ms`);
            outputBuffer.push(`\nExecution time: ${executionDuration} ms`);
            stdoutPrint(outputBuffer.join(""));
        };

        try {
            const instance = await WebAssembly.instantiate(bytes, imports);
            const exports = instance.exports as WebAssembly.Exports & {
                memory: WebAssembly.Memory;
                _start: () => void;
            };
            memory = exports.memory;
            startExecution = performance.now();
            exports._start();
            endExecution = performance.now();
            printResults();
        } catch (error: unknown) {
            endExecution = performance.now();
            printResults();
            if (exitCode.val === 0) {
                return;
            }
            console.log(error);
            stdoutPrint(
                `\n${String(error)}\nERROR: The code could not be executed. Either there is a runtime error or there is an issue at our end.`,
            );
        }
    };
}

const basePath = (process.env.NEXT_PUBLIC_SITE_BASE_PATH ?? "").replace(/\/$/, "");

function LoadLFortran({
    setModuleReady,
    lfortran_funcs: lfortranFunctions,
    openNotification,
    myPrint,
}: LoadLFortranProps) {
    useEffect(() => {
        window.Module = {
            locateFile: (filePath: string) => `${basePath}/${filePath}`,
        } as EmscriptenModule;
        return () => {
            window.Module = null;
        };
    }, []);

    const setupLFortran = useCallback(async (): Promise<void> => {
        await setupLFortranFunctions(lfortranFunctions, myPrint);
        setModuleReady(true);
        openNotification("LFortran Module Initialized!", "bottomRight");
        console.log("LFortran Module Initialized!");
    }, [lfortranFunctions, myPrint, openNotification, setModuleReady]);

    return (
        <div>
            <Script src={`${basePath}/lfortran.js`} onLoad={setupLFortran} />
        </div>
    );
}

export default LoadLFortran;
