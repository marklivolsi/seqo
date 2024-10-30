/**
 * Copyright (c) 2024 Mark Livolsi
 * Derived from Clique (https://github.com/networkx/clique)
 * Copyright (c) 2013 Martin Pengelly-Phillips
 *
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license text.
 */


/**
 * Interface defining the constructor options for Collection class.
 */
interface CollectionOptions {
    /** The prefix string that appears before each index */
    head?: string;
    /** The suffix string that appears after each index */
    tail?: string;
    /** The number of digits to pad indexes to. Zero means no padding. */
    padding?: number;
    /** Array or Set of non-negative integers representing the collection's indexes */
    indexes?: number[] | Set<number>;
}

/**
 * Type for valid items that can be added to or removed from a Collection
 */
type CollectionItem = number | string | Collection;

/**
 * Type for valid input to add/remove methods
 */
type CollectionInput = CollectionItem | Array<CollectionItem> | Set<CollectionItem>;

export declare class Collection {
    head: string;
    tail: string;
    padding: number;
    readonly indexes: number[];
    readonly members: string[];
    readonly holes: Collection | null;
    readonly isContiguous: boolean;

    constructor(options?: CollectionOptions);

    add(items: CollectionInput): this;
    remove(items: CollectionInput, options?: {strict?: boolean}): this;
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
