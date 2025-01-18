/**
 * Copyright (c) 2024 Mark Livolsi
 * Derived from Clique (https://gitlab.com/4degrees/clique)
 * Copyright (c) 2013 Martin Pengelly-Phillips
 *
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license text.
 */

export declare function range(
    start?: number,
    stop?: number,
    step?: number
): Iterable<number>;

type CollectionItem = number | string | Collection;

export declare class Collection {

    static readonly patterns: Readonly<{
        digits: string;
        frames: string;
        versions: string;
    }>;

    static parse(string: string, options?: { pattern?: string }): Collection;

    static assemble(
        strings: Iterable<string>,
        options?: {
            patterns?: (RegExp | string)[];
            minItems?: number;
            caseSensitive?: boolean;
            assumePaddedWhenAmbiguous?: boolean;
        }
    ): [Collection[], string[]];

    constructor(options?: {
        head?: string;
        tail?: string;
        padding?: number;
        indexes?: Iterable<number>;
    });

    head: string;
    tail: string;
    padding: number;

    get indexes(): number[];
    get members(): string[];
    get holes(): Collection | null;
    get isContiguous(): boolean;

    add(items: CollectionItem | Array<CollectionItem> | Set<CollectionItem>): this;
    remove(items: CollectionItem | Array<CollectionItem> | Set<CollectionItem>, options?: { strict?: boolean }): this;
    separate(): Collection[];
    isCompatible(collection: Collection): boolean;
    format(pattern?: string): string;
    match(item: string): RegExpExecArray | null;

}