interface WorkspaceFile {
    name: string;
    code: string;
}

const FORTRAN_SOURCE = /\.(f90|f95|f03|f08)$/i;

// The browser build accepts one source string. Put modules before files that USE them.
export function combineFortranFiles(files: WorkspaceFile[]): string {
    const sources = files.filter((file) => FORTRAN_SOURCE.test(file.name) && file.code.trim());
    const modules = new Map<string, number>();
    sources.forEach((file, index) => {
        for (const match of file.code.matchAll(/^\s*module\s+(?!procedure\b|function\b|subroutine\b)([a-z]\w*)/gim)) {
            modules.set(match[1].toLowerCase(), index);
        }
    });

    const ordered: WorkspaceFile[] = [];
    const visited = new Set<number>();
    const visiting = new Set<number>();
    const visit = (index: number) => {
        if (visited.has(index)) return;
        if (visiting.has(index)) throw new Error("Circular module dependency in the workspace");
        visiting.add(index);
        for (const match of sources[index].code.matchAll(/^\s*use\s*(?:,\s*(?:non_)?intrinsic\s*::|::)?\s*([a-z]\w*)/gim)) {
            const dependency = modules.get(match[1].toLowerCase());
            if (dependency !== undefined && dependency !== index) visit(dependency);
        }
        visiting.delete(index);
        visited.add(index);
        ordered.push(sources[index]);
    };

    // Visit files defining modules first, so independent modules precede the main program.
    sources.forEach((_, index) => {
        if ([...modules.values()].includes(index)) visit(index);
    });
    sources.forEach((_, index) => visit(index));
    return ordered.map((file) => file.code).join("\n\n");
}

export function hasUnsupportedDataReads(files: WorkspaceFile[], source: string): boolean {
    return files.some((file) => !FORTRAN_SOURCE.test(file.name)) && /^\s*open\s*\(/im.test(source);
}
