

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

    add(item) {
        const match = this.match(item);
        if (match === null) {
            throw new Error(`Item '${item}' does not match collection expression.`);
        }
        const {index, _} = match.groups;
        this._indexes.add(Number(index));
    }

    remove(item) {
        const match = this.match(item);
        if (match === null) return;
        const {index, _} = match.groups;
        this._indexes.delete(Number(index));
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
