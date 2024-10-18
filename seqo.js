

const DIGITS_PATTERN = '(?P<index>(?P<padding>0*)\d+)'
const PATTERNS = {
    frames: `\\.${DIGITS_PATTERN}\\.\\D+\\d?$`,
    versions: `v${DIGITS_PATTERN}`,
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

    add(items) {
        if (!Array.isArray(items)) {
            items = [items];
        }

        const newIndexes = new Set(this._indexes);

        for (const item of items) {
            const type = typeof item;
            if (type === 'string') {
                const match = this.match(item);
                if (match === null) {
                    throw new Error(`Item '${item}' does not match collection expression.`);
                }
                const {index} = match.groups;
                newIndexes.add(Number(index));
                continue;
            }
            if (typeof item === 'number') {
                if (!Number.isInteger(item) || item < 0) {
                    throw new Error(`Invalid index: ${item}. Expected non-negative integer.`);
                }
                newIndexes.add(item);
                continue;
            }
            throw new Error(`Invalid item type: ${typeof item}. Expected string or number.`);
        }

        this._indexes = newIndexes;
    }

    remove(items) {
        if (!Array.isArray(items)) {
            items = [items];
        }
        for (const item of items) {
            if (typeof item === 'string') {
                const match = this.match(item);
                if (match !== null) {
                    const {index} = match.groups;
                    this._indexes.delete(Number(index));
                }
            } else if (typeof item === 'number') {
                if (Number.isInteger(item) && item >= 0) {
                    this._indexes.delete(item);
                }
            }
        }
    }

    isCompatible(collection) {
        return (
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

export { assemble, Collection };
