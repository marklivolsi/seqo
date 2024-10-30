export declare class Collection {
    head: string;
    tail: string;
    padding: number;
    readonly indexes: number[];
    readonly members: string[];
    readonly holes: Collection | null;
    readonly isContiguous: boolean;

    constructor(head: string, tail: string, padding: number, indexes: number[]);

    add(items: number | string | Collection | Array<number | string | Collection>): this;
    remove(items: number | string | Collection | Array<number | string | Collection>, options?: {strict?: boolean}): this;
    separate(): Collection[];
    isCompatible(collection: Collection): boolean;
    format(pattern?: string): string;
    match(item: string): RegExpExecArray | null;
}

export declare function range(
    start?: number,
    stop?: number,
    step?: number
): Iterable<number>;

export declare function assemble(
    strings: Iterable<string>,
    options?: {
        patterns?: (RegExp | string)[],
        minItems?: number,
        caseSensitive?: boolean,
        assumePaddedWhenAmbiguous?: boolean
    }
): [Collection[], string[]];

export declare function parseCollection(
    string: string,
    options?: {
        pattern?: string
    }
): Collection;

export declare const PATTERNS: {
    readonly digits: string;
    readonly frames: string;
    readonly versions: string;
};
