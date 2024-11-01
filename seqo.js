/**
 * Copyright (c) 2024 Mark Livolsi
 * Derived from Clique (https://gitlab.com/4degrees/clique)
 * Copyright (c) 2013 Martin Pengelly-Phillips
 *
 * Licensed under the Apache License, Version 2.0
 * See LICENSE file in the project root for full license text.
 */


/**
 * Generates a sequence of integers from start (inclusive) to stop (exclusive),
 * incrementing by step. If step is not provided, it defaults to 1 if start <= stop,
 * and -1 otherwise. If only one argument is provided, it is interpreted as stop,
 * and start defaults to 0.
 *
 * @param {number} [start=0] - The starting value of the sequence (inclusive).
 *     Defaults to 0 when stop is provided. When stop is undefined, this value
 *     is interpreted as stop and start becomes 0.
 * @param {number} [stop] - The end value of the sequence (exclusive). When
 *     undefined, start is used as stop and start becomes 0.
 * @param {number} [step] - The difference between each number in the sequence.
 *     Defaults to 1 when start <= stop, and -1 when start > stop. Must not be zero.
 *
 * @returns {Iterator} An iterator yielding integers in an arithmetic sequence.
 *
 * @throws {Error} If start, stop, or step are not integers.
 * @throws {Error} If step is zero.
 * @throws {Error} If step direction is incompatible with start/stop values
 *     (e.g., positive step with start > stop).
 *
 * @example
 * // Returns [0, 1, 2, 3, 4]
 * [...range(5)]
 *
 * // Returns [2, 3, 4]
 * [...range(2, 5)]
 *
 * // Returns [0, 2, 4]
 * [...range(0, 5, 2)]
 *
 * // Returns [5, 4, 3, 2, 1]
 * [...range(5, 0, -1)]
 */
function range(start = 0, stop, step) {
    if (stop === undefined) {
        stop = start;
        start = 0;
    }

    // Set default step based on start and stop values
    if (step === undefined) {
        step = start <= stop ? 1 : -1;
    }

    // Ensure all arguments are integers
    if (!Number.isInteger(start) || !Number.isInteger(stop) || !Number.isInteger(step)) {
        throw new Error('range() arguments must be integers');
    }

    if (step === 0) {
        throw new Error('range() step argument must not be zero');
    }

    if ((start < stop && step < 0) || (start > stop && step > 0)) {
        throw new Error('range() step argument incompatible with start/stop');
    }

    return {
        *[Symbol.iterator] () {
            let i = start;
            while ((step > 0 && i < stop) || (step < 0 && i > stop)) {
                yield i;
                i += step;
            }
        }
    };
}


/**
 * A class representing a collection of items with numeric indexes and consistent formatting.
 * Collections maintain a set of unique indexes and format them with a common head, tail,
 * and padding pattern.
 */
class Collection {

    static #DIGITS_PATTERN = '(?<index>(?<padding>0*)\\d+)';

    /**
     * Predefined regex patterns for common sequence formats.
     * All patterns provide named capture groups:
     * - index: The full number including any padding
     * - padding: Any leading zeros
     * @const {Object}
     * @property {string} digits - Matches plain digit sequences (e.g., "001", "1", "0123")
     * @property {string} frames - Matches frame numbers between dots (e.g., ".001.", ".1.", ".0123.")
     * @property {string} versions - Matches version numbers with 'v' prefix (e.g., "v001", "v1", "v0123")
     */
    static patterns = Object.freeze({
        digits: Collection.#DIGITS_PATTERN,
        frames: `\\.${Collection.#DIGITS_PATTERN}\\.`,
        versions: `v${Collection.#DIGITS_PATTERN}`
    });

    /**
     * Parses a string representing a collection with numeric patterns and returns a Collection object.
     *
     * @param {string} string - The input string to parse, expected to contain head, padding, tail and ranges.
     *                         Example: "file_%02d.txt [1-5]" or "img_%03d.exr [1-10] [-4-6]"
     * @param {Object} options - Optional configuration object.
     * @param {string} [options.pattern='{head}{padding}{tail} [{ranges}]'] - The pattern template to match against.
     *                         Can contain the following placeholders:
     *                         - {head}: The prefix before the padding pattern
     *                         - {padding}: The padding pattern (e.g., %02d)
     *                         - {tail}: The suffix after the padding pattern
     *                         - {ranges}: The numeric ranges to include
     *                         - {holes}: The numeric ranges to exclude
     *
     * @returns {Collection} A Collection instance containing the parsed components and indexes.
     *
     * @throws {Error} If the string does not match the expected pattern.
     * @throws {Error} If ranges or holes are in an invalid format.
     * @throws {Error} If invalid numbers are found in ranges or holes.
     *
     * @example
     * // Basic usage with default pattern
     * const coll = parseCollection('file_%02d.txt [1-5]');
     * // coll.head === 'file_'
     * // coll.tail === '.txt'
     * // coll.padding === 2
     * // coll.indexes === [1, 2, 3, 4, 5]
     *
     * @example
     * // Using holes to exclude numbers
     * const coll = parseCollection('img_%03d.jpg [1-10] [-4-6]');
     * // Results in collection with indexes [1, 2, 3, 7, 8, 9, 10]
     *
     * @example
     * // Using custom pattern
     * const coll = parseCollection(
     *     'Sequence (prefix) padding:%03d contains 1-5',
     *     { pattern: 'Sequence ({head}) padding:{padding} contains {ranges}' }
     * );
     */
    static parse(string, {pattern = '{head}{padding}{tail} [{ranges}]'} = {}) {
        const expressions = {
            head: '(?<head>.*)',
            tail: '(?<tail>.*)',
            padding: '%(?<padding>\\d*)d',
            range: '(?<range>\\d+-\\d+)?',
            ranges: '(?<ranges>[\\d ,\\-]+)?',
            holes: '(?<holes>[\\d ,\\-]+)'
        };

        // Render pattern template with regex patterns
        let renderedPattern = Collection.#escapeRegExp(pattern);
        for (const [key, value] of Object.entries(expressions)) {
            renderedPattern = renderedPattern.replace(`\\{${key}\\}`, value);
        }

        // Create the regex with the rendered pattern
        const regex = new RegExp(renderedPattern);
        const match = string.match(regex);
        if (!match) {
            throw new Error(`String "${string}" does not match pattern "${pattern}"`);
        }
        const groups = match.groups ?? {};

        const head = groups.head ?? '';
        const tail = groups.tail ?? '';
        const padding = groups.padding ? parseInt(groups.padding, 10) : 0;

        const collection = new Collection({
            head,
            tail,
            padding,
            indexes: []
        });

        try {

            // Handle single range
            if (groups.range) {
                const indexes = Collection.#parsePart(groups.range);
                collection.add([...indexes]);
            }

            // Handle multiple comma-separated ranges
            if (groups.ranges) {
                const parts = Collection.#splitRanges(groups.ranges);
                for (const part of parts) {
                    const indexes = Collection.#parsePart(part);
                    collection.add([...indexes]);
                }
            }

            // Remove any holes
            if (groups.holes) {
                const parts = Collection.#splitRanges(groups.holes);
                for (const part of parts) {
                    const indexes = Collection.#parsePart(part);
                    collection.remove([...indexes]);
                }
            }

        } catch (error) {
            throw new Error(`Error parsing collection from string "${string}": ${error.message}`);
        }

        return collection;
    }

    static #escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    static #splitRanges(rangesStr) {
        return rangesStr
            .split(',')
            .map(part => part.trim())
            .filter(part => part.length > 0);  // Skip empty parts from "1,,2" or "1, ,2"
    }

    static #parsePart(part) {
        part = part.trim();
        if (part.includes('-')) {
            const [start, end] = Collection.#parseRange(part);
            return range(start, end + 1);
        }
        const num = parseInt(part, 10);
        if (isNaN(num)) {
            throw new Error(`Invalid number: ${part}`);
        }
        return [num];
    }

    static #parseRange(rangeStr) {
        const parts = rangeStr.trim().split('-');
        if (parts.length !== 2 || parts.some(part => part === '')) {
            throw new Error(`Invalid range format: ${rangeStr}`);
        }
        const [start, end] = parts.map(p => {
            const num = parseInt(p, 10);
            if (isNaN(num)) {
                throw new Error(`Invalid number in range: ${p}`);
            }
            return num;
        });
        return [start, end];
    }


    /**
     * Assembles items into discrete collections based on their numeric patterns.
     * @param {Iterable<string>} strings - Items to assemble into collections
     * @param {Object} [options] - Optional configuration
     * @param {(RegExp|string)[]} [options.patterns=null] - Optional patterns to limit collection possibilities
     * @param {number} [options.minItems=2] - Minimum number of items a collection must have
     * @param {boolean} [options.caseSensitive=true] - Whether to treat items as case-sensitive
     * @param {boolean} [options.assumePaddedWhenAmbiguous=false] - Whether to assume padding in ambiguous cases
     * @returns {[Collection[], string[]]} - Tuple of [collections, remainder]
     */
    static assemble(strings, {
        patterns = null,
        minItems = 2,
        caseSensitive = true,
        assumePaddedWhenAmbiguous = false
    } = {}) {

        // Early return for empty pattern list
        if (patterns && patterns.length === 0) {
            return [[], Array.from(strings)];
        }

        const { collectionMap, remainder } = Collection.#processStrings(
            strings,
            Collection.#compilePatterns(patterns, caseSensitive),
            caseSensitive,
        );

        const collections = Collection.#createCollections(collectionMap);
        const mergedCollections = Collection.#handlePaddingMerges(collections);
        const filteredCollections = Collection.#filterByMinItems(mergedCollections, minItems, remainder);

        if (assumePaddedWhenAmbiguous) {
            Collection.#handlePaddingAmbiguity(filteredCollections);
        }

        return [filteredCollections, Array.from(remainder).sort((a, b) => a - b)];
    }

    static #compilePatterns(patterns, caseSensitive) {
        const flags = caseSensitive ? 'g' : 'ig';
        if (patterns !== null) {
            return patterns.map(p => {
                if (typeof p === 'string') {
                    return new RegExp(p, flags);
                }
                if (p instanceof RegExp) {
                    return new RegExp(p.source, flags);
                }
                throw new Error(`Invalid pattern type: ${typeof p}`);
            });
        }
        return [new RegExp(Collection.#DIGITS_PATTERN, flags)];
    }

    static #processStrings(strings, compiledPatterns, caseSensitive) {
        const collectionMap = new Map();
        const remainder = new Set();

        for (const item of strings) {
            let matched = false;

            for (const pattern of compiledPatterns) {
                pattern.lastIndex = 0;  // Reset regex state
                const matches = item.matchAll(pattern);

                for (const match of matches) {
                    Collection.#processMatch(match, item, collectionMap, caseSensitive);
                    matched = true;
                }
            }

            if (!matched) {
                remainder.add(item);
            }
        }

        return { collectionMap, remainder };
    }

    static #processMatch(match, item, collectionMap, caseSensitive) {
        const { index: matchIndex, groups } = match;
        const { index, padding } = groups;

        const fullMatch = match[0];
        const numberStart = fullMatch.indexOf(index);

        const head = item.slice(0, matchIndex + numberStart);
        const tail = item.slice(matchIndex + numberStart + index.length);
        const paddingLength = padding ? index.length : 0;

        const normalizedHead = caseSensitive ? head : head.toLowerCase();
        const normalizedTail = caseSensitive ? tail : tail.toLowerCase();

        const key = `${normalizedHead}|${normalizedTail}|${paddingLength}`;

        if (!collectionMap.has(key)) {
            collectionMap.set(key, {
                head,
                tail,
                padding: paddingLength,
                indexes: new Set()
            });
        }

        collectionMap.get(key).indexes.add(parseInt(index, 10));
    }

    static #createCollections(collectionMap) {
        const collections = [];
        const unpadded = [];

        for (const { head, tail, padding, indexes } of collectionMap.values()) {
            const collection = new Collection({
                head,
                tail,
                padding,
                indexes
            });
            collections.push(collection);
            if (padding === 0) {
                unpadded.push(collection);
            }
        }

        return { collections, unpadded };
    }

    static #handlePaddingMerges({ collections, unpadded }) {
        const fullyMerged = new Set();

        for (const collection of collections) {
            if (collection.padding === 0) continue;

            for (const candidate of unpadded) {
                if (candidate.head === collection.head &&
                    candidate.tail === collection.tail) {

                    const mergeResult = Collection.#attemptMerge(collection, candidate);
                    if (mergeResult.complete) {
                        fullyMerged.add(candidate);
                    }
                }
            }
        }

        return collections.filter(c => !fullyMerged.has(c));
    }

    static #attemptMerge(target, source) {
        let mergedCount = 0;

        for (const index of source.indexes) {
            if (String(Math.abs(index)).length === target.padding) {
                target.add(index);
                mergedCount++;
            }
        }

        return { complete: mergedCount === source.indexes.length };
    }

    static #filterByMinItems(collections, minItems, remainder) {
        return collections.filter(collection => {
            if (collection._indexes.size >= minItems) {
                return true;
            }
            collection.members.forEach(i => remainder.add(i));
            return false;
        });
    }

    static #handlePaddingAmbiguity(collections) {
        for (const collection of collections) {
            const indexes = collection.indexes;
            if (!collection.padding && indexes.length > 0) {
                const firstWidth = String(indexes[0]).length;
                const lastWidth = String(indexes[indexes.length - 1]).length;
                if (firstWidth === lastWidth) {
                    collection.padding = firstWidth;
                }
            }
        }
    }

    /**
     * Creates a new Collection instance.
     *
     * @param {Object} options - Configuration options
     * @param {string} [options.head=""] - The prefix string that appears before each index
     * @param {string} [options.tail=""] - The suffix string that appears after each index
     * @param {number} [options.padding=0] - The number of digits to pad indexes to. Zero means no padding.
     * @param {number[]} [options.indexes=[]] - Array of non-negative integers representing the collection's indexes
     */
    constructor({
        head = '',
        tail = '',
        padding = 0,
        indexes = []
    } = {}) {
        this.head = head;
        this.tail = tail;
        this.padding = padding;
        this._indexes = new Set(indexes);
        this.#validate();
    }

    /**
     * Gets the sorted array of indexes in the collection.
     *
     * @returns {number[]} Array of indexes in ascending order
     */
    get indexes() {
        return Array.from(this._indexes).sort((a, b) => a - b);
    }

    /**
     * Gets the formatted string representations of all members in the collection.
     *
     * @returns {string[]} Array of formatted strings with padded indexes
     */
    get members() {
        return this.indexes.map(i => `${this.head}${String(i).padStart(this.padding, '0')}${this.tail}`);
    }

    /**
     * Gets a new Collection containing any missing indexes in the sequence.
     *
     * @returns {Collection|null} A new Collection containing missing indexes,
     *     or null if there are no holes or fewer than 2 indexes
     */
    get holes() {
        if (this._indexes.size < 2) return null;
        const indexes = this.indexes;
        const holes = [];
        const start = indexes[0];
        const end = indexes[indexes.length - 1];
        for (let i = start + 1; i < end; i++) {
            if (!this._indexes.has(i)) {
                holes.push(i);
            }
        }
        return holes.length > 0 ?
            new Collection({
                head: this.head,
                tail: this.tail,
                padding: this.padding,
                indexes: holes})
            : null;
    }

    /**
     * Checks if the collection's indexes form a contiguous sequence.
     *
     * @returns {boolean} True if indexes form a contiguous sequence or collection has 0-1 indexes
     */
    get isContiguous() {
        if (this._indexes.size <= 1) return true;
        const indexes = this.indexes;
        const start = indexes[0];
        const end = indexes[indexes.length - 1];
        for (let i = start + 1; i < end; i++) {
            if (!this._indexes.has(i)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Adds items to the collection. Items can be indexes, member strings, or compatible Collections.
     *
     * @param {(number|string|Collection|Array<number|string|Collection>)} items - Items to add
     * @returns {Collection} The collection instance for chaining
     * @throws {Error} If items are invalid or incompatible with the collection
     */
    add(items) {

        if (!Array.isArray(items) && !(items instanceof Set)) {
            items = [items];
        }

        const newIndexes = new Set(this._indexes);

        for (const item of items) {
            const type = typeof item;

            if (item instanceof Collection) {
                if (!this.isCompatible(item)) {
                    throw new Error(`${item} is not compatible with this collection.`);
                }
                item.indexes.forEach(i => newIndexes.add(i));
            }

            else if (type === 'string') {
                const match = this.match(item);
                if (match === null) {
                    throw new Error(`Item '${item}' does not match collection expression.`);
                }
                const {index} = match.groups;
                newIndexes.add(Number(index));
            }

            else if (type === 'number') {
                if (!Number.isInteger(item) || item < 0) {
                    throw new Error(`Invalid index: ${item}. Expected non-negative integer.`);
                }
                newIndexes.add(item);
            }

            else {
                throw new Error(`Invalid item type: ${type}. Expected string, number, or Collection.`);
            }

        }

        this._indexes = newIndexes;
        return this;
    }

    /**
     * Removes items from the collection. Items can be indexes, member strings, or compatible Collections.
     *
     * @param {(number|string|Collection|Array<number|string|Collection>)} items - Items to remove
     * @param {Object} options
     * @param {boolean} options.strict - If true, throws errors for invalid items. Default false.
     * @returns {Collection} The collection instance for chaining
     * @throws {Error} If strict mode is enabled and invalid items are provided
     */
    remove(items, { strict = false } = {}) {
        if (!Array.isArray(items) && !(items instanceof Set)) {
            items = [items];
        }

        for (const item of items) {
            if (item instanceof Collection) {
                if (!this.isCompatible(item)) {
                    if (strict) throw new Error(`Incompatible collection: ${item}`);
                    continue;
                }
                item.indexes.forEach(i => this._indexes.delete(i));
            }
            else if (typeof item === 'string') {
                const match = this.match(item);
                if (match === null) {
                    if (strict) throw new Error(`Invalid string format: ${item}`);
                    continue;
                }
                const {index} = match.groups;
                this._indexes.delete(Number(index));
            }
            else if (typeof item === 'number') {
                if (!Number.isInteger(item) || item < 0) {
                    if (strict) throw new Error(`Expected non-negative integer: ${item}`);
                    continue;
                }
                this._indexes.delete(item);
            }
            else if (strict) {
                throw new Error(`Invalid item type: ${typeof item}`);
            }
        }
        return this;
    }

    /**
     * Separates the collection into multiple contiguous collections.
     *
     * @returns {Collection[]} Array of Collections, each containing a contiguous sequence of indexes.
     *                        Returns array with empty Collection if this collection is empty,
     *                        or array with this collection if it's already contiguous.
     */
    separate() {
        // Handle empty collection case
        if (this._indexes.size === 0) {
            return [new Collection({
                head: this.head,
                tail: this.tail,
                padding: this.padding,
                indexes: []
            })];
        }

        // If already contiguous, return this collection as single element
        if (this.isContiguous) {
            return [new Collection({
                head: this.head,
                tail: this.tail,
                padding: this.padding,
                indexes: this._indexes
            })];
        }

        const collections = [];
        const indexes = this.indexes;
        let start = indexes[0];
        let prev = start;

        // Handle single element case
        if (indexes.length === 1) {
            return [new Collection({
                head: this.head,
                tail: this.tail,
                padding: this.padding,
                indexes: [start]
            })];
        }

        // Iterate through sorted indexes finding breaks in continuity
        for (let i = 1; i < indexes.length; i++) {
            const current = indexes[i];

            // If we find a gap, create a new collection
            if (current !== prev + 1) {
                collections.push(
                    new Collection({
                        head: this.head,
                        tail: this.tail,
                        padding: this.padding,
                        indexes: [...range(start, prev + 1)
                        ]})
                );
                start = current;
            }
            prev = current;
        }

        // Add the final collection
        collections.push(
            new Collection({
                head: this.head,
                tail: this.tail,
                padding: this.padding,
                indexes: [...range(start, prev + 1)
                ]})
        );

        return collections;
    }

    /**
     * Checks if another collection has compatible formatting with this one.
     *
     * @param {Collection} collection - The collection to check for compatibility
     * @returns {boolean} True if the collections have matching head, tail, and padding
     */
    isCompatible(collection) {
        return (
            collection instanceof Collection &&
            collection.head === this.head &&
            collection.tail === this.tail &&
            collection.padding === this.padding
        );
    }

    /**
     * Format the collection according to a pattern string.
     *
     * @param {string} pattern - Format pattern string that can include placeholders:
     *     {head} - Common leading part of the collection
     *     {tail} - Common trailing part of the collection
     *     {padding} - Padding format in %0d form
     *     {range} - Total range in form start-end
     *     {ranges} - Comma separated ranges of indexes
     *     {holes} - Comma separated ranges of missing indexes
     * @returns {string} - Formatted string representation of the collection
     */
    format(pattern = '{head}{padding}{tail} [{ranges}]') {
        // Initialize data with basic collection properties
        const data = {
            head: this.head,
            tail: this.tail,
            padding: this.padding ? `%0${this.padding}d` : '%d'
        };

        // Create case-insensitive lookup for data properties
        const dataLookup = Object.fromEntries(
            Object.entries(data).map(([key, value]) => [key.toLowerCase(), value])
        );

        // Get sorted indexes for range calculations
        const indexes = this.indexes;

        // Handle holes if requested (case-insensitive check)
        if (pattern.toLowerCase().includes('{holes}')) {
            dataLookup.holes = this.holes?.format('{ranges}') ?? '';
        }

        // Calculate range if needed for either {range} or {ranges} (case-insensitive check)
        const patternLower = pattern.toLowerCase();
        if (patternLower.includes('{range}') || patternLower.includes('{ranges}')) {
            if (indexes.length === 0) {
                dataLookup.range = '';
            } else if (indexes.length === 1) {
                dataLookup.range = `${indexes[0]}`;
            } else {
                dataLookup.range = `${indexes[0]}-${indexes[indexes.length - 1]}`;
            }
        }

        // Calculate ranges if needed (case-insensitive check)
        if (patternLower.includes('{ranges}')) {
            const separated = this.separate();
            const ranges = separated.length > 1
                ? separated.map(coll => coll.format('{range}'))
                : [dataLookup.range];
            dataLookup.ranges = ranges.filter(r => r !== '').join(', ');
        }

        // Replace all placeholders in pattern, case-insensitive
        return pattern.replace(/{(\w+)}/g, (match, key) => {
            const normalizedKey = key.toLowerCase();
            return dataLookup[normalizedKey] !== undefined ? dataLookup[normalizedKey] : match;
        });
    }

    /**
     * Attempts to match a string against the collection's pattern.
     *
     * @param {string} item - The string to match against the collection pattern
     * @returns {RegExpExecArray|null} The match result containing index and padding groups,
     *     or null if no match or padding requirements aren't met
     */
    match(item) {
        const match = this.#expression().exec(item);
        if (!match) {
            return null;
        }
        const {index, padding} = match.groups;
        if (this.padding === 0 ) {
            const isPadded = Boolean(padding);
            if (isPadded) return null;
        } else if (index.length !== this.padding) {
            return null;
        }
        return match;
    }

    /**
     * Validates Collection properties meet requirements.
     * @private
     * @throws {Error} If padding or indexes are invalid
     */
    #validate() {
        if (!Number.isInteger(this.padding) || this.padding < 0) {
            throw new Error('Padding must be a non-negative integer');
        }

        if (!(this._indexes instanceof Set)) {
            throw new Error('Indexes must be a Set');
        }

        for (const index of this._indexes) {
            if (!Number.isInteger(index) || index < 0) {
                throw new Error('All indexes must be non-negative integers');
            }
        }
    }

    /**
     * Creates a regular expression for matching collection members.
     *
     * @private
     * @returns {RegExp} Regular expression with named capture groups for index and padding
     */
    #expression() {
        return new RegExp(`^${this.head}(?<index>(?<padding>0*)\\d+?)${this.tail}$`);
    }

}


export { range, Collection };
