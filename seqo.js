

const DIGITS_PATTERN = '(?P<index>(?P<padding>0*)\d+)'
const PATTERNS = {
    frames: `\\.${DIGITS_PATTERN}\\.\\D+\\d?$`,
    versions: `v${DIGITS_PATTERN}`,
}


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
        throw new Error("range() arguments must be integers");
    }

    if (step === 0) {
        throw new Error("range() step argument must not be zero");
    }

    if ((start < stop && step < 0) || (start > stop && step > 0)) {
        throw new Error("range() step argument incompatible with start/stop");
    }

    return {
        [Symbol.iterator]: function* () {
            let i = start;
            while ((step > 0 && i < stop) || (step < 0 && i > stop)) {
                yield i;
                i += step;
            }
        }
    };
}


class Collection {

    constructor(head, tail, padding, indexes) {
        this.head = head;
        this.tail = tail;
        this.padding = padding;
        this._indexes = new Set(indexes);
    }

    get indexes() {
        return Array.from(this._indexes).sort((a, b) => a - b);
    }

    get members() {
        return this.indexes.map(i => `${this.head}${String(i).padStart(this.padding, '0')}${this.tail}`);
    }

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
        return holes.length > 0 ? new Collection(this.head, this.tail, this.padding, holes) : null;
    }

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

    add(items) {
        if (!Array.isArray(items)) {
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
        if (!Array.isArray(items)) {
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
            return [new Collection(this.head, this.tail, this.padding, [])];
        }

        // If already contiguous, return this collection as single element
        if (this.isContiguous) {
            return [new Collection(this.head, this.tail, this.padding, this.indexes)];
        }

        const collections = [];
        const indexes = this.indexes;
        let start = indexes[0];
        let prev = start;

        // Handle single element case
        if (indexes.length === 1) {
            return [new Collection(this.head, this.tail, this.padding, [start])];
        }

        // Iterate through sorted indexes finding breaks in continuity
        for (let i = 1; i < indexes.length; i++) {
            const current = indexes[i];

            // If we find a gap, create a new collection
            if (current !== prev + 1) {
                collections.push(
                    new Collection(
                        this.head,
                        this.tail,
                        this.padding,
                        [...range(start, prev + 1)]
                    )
                );
                start = current;
            }
            prev = current;
        }

        // Add the final collection
        collections.push(
            new Collection(
                this.head,
                this.tail,
                this.padding,
                [...range(start, prev + 1)]
            )
        );

        return collections;
    }

    isCompatible(collection) {
        return (
            collection instanceof Collection &&
            collection.head === this.head &&
            collection.tail === this.tail &&
            collection.padding === this.padding
        );
    }

    format(pattern='{head}{padding}{tail} [{ranges}]') {
        const data = {
            head: this.head,
            tail: this.tail,
            padding: this.padding ? `%0${this.padding}d` : `%d`,
            holes: pattern.includes('{holes}') ? this.holes.format('{ranges}') : '',

        }
    }

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

    #expression() {
        return new RegExp(`^${this.head}(?<index>(?<padding>0*)\\d+?)${this.tail}$`);
    }


}

function assemble(strings, patterns=null, min_items=2, case_sensitive=true, assume_padded_when_ambiguous=false) {

}

export { range, assemble, Collection };
