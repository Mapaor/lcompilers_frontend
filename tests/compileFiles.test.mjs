import { test } from "node:test";
import { strict as assert } from "node:assert";
import { combineFortranFiles, hasUnsupportedDataReads } from "../src/utils/compileFiles.ts";

test("orders module dependencies before the program and excludes data files", () => {
    const files = [
        { name: "main.f90", code: "program main\n use greeter\nend program" },
        { name: "values.dat", code: "42\n" },
        { name: "greeter.f90", code: "module greeter\n use helper\nend module" },
        { name: "helper.f90", code: "module helper\nend module" },
    ];
    assert.equal(combineFortranFiles(files), [files[3].code, files[2].code, files[0].code].join("\n\n"));
});

test("compiles a lone Fortran file and ignores plain text", () => {
    assert.equal(combineFortranFiles([
        { name: "main.F90", code: "program main\nend program" },
        { name: "notes.txt", code: "not Fortran" },
    ]), "program main\nend program");
});

test("reports circular module dependencies", () => {
    assert.throws(() => combineFortranFiles([
        { name: "a.f90", code: "module a\nuse b\nend module" },
        { name: "b.f90", code: "module b\nuse a\nend module" },
    ]), /Circular module dependency/);
});

test("detects unsupported workspace data reads", () => {
    const files = [{ name: "data.txt", code: "hello" }, { name: "main.f90", code: "" }];
    assert.equal(hasUnsupportedDataReads(files, "open(unit=10, file='data.txt')"), true);
    assert.equal(hasUnsupportedDataReads(files, "print *, 'hello'"), false);
});
