import { range, Collection } from "./seqo.js";



describe('range', () => {
    test('range with one argument', () => {
        expect([...range(5)]).toEqual([0, 1, 2, 3, 4]);
        expect([...range(0)]).toEqual([]);
        expect([...range(1)]).toEqual([0]);
    });

    test('range with two arguments', () => {
        expect([...range(1, 6)]).toEqual([1, 2, 3, 4, 5]);
        expect([...range(5, 5)]).toEqual([]);
        expect([...range(-3, 3)]).toEqual([-3, -2, -1, 0, 1, 2]);
    });

    test('range with two arguments (start > stop)', () => {
        expect([...range(5, 0)]).toEqual([5, 4, 3, 2, 1]);
        expect([...range(10, 5)]).toEqual([10, 9, 8, 7, 6]);
        expect([...range(3, -3)]).toEqual([3, 2, 1, 0, -1, -2]);
    });

    test('range with three arguments (positive step)', () => {
        expect([...range(0, 10, 2)]).toEqual([0, 2, 4, 6, 8]);
        expect([...range(1, 11, 3)]).toEqual([1, 4, 7, 10]);
        expect([...range(5, 5, 1)]).toEqual([]);
    });

    test('range with three arguments (negative step)', () => {
        expect([...range(5, 0, -1)]).toEqual([5, 4, 3, 2, 1]);
        expect([...range(10, 0, -2)]).toEqual([10, 8, 6, 4, 2]);
        expect([...range(5, 5, -1)]).toEqual([]);
    });

    test('range with large numbers', () => {
        expect([...range(1e6, 1e6 + 5)]).toEqual([1000000, 1000001, 1000002, 1000003, 1000004]);
        expect([...range(1e6 + 5, 1e6)]).toEqual([1000005, 1000004, 1000003, 1000002, 1000001]);
    });

    test('range is iterable', () => {
        let sum = 0;
        for (let i of range(1, 5)) {
            sum += i;
        }
        expect(sum).toBe(10);
    });

    test('range with non-integer arguments', () => {
        expect(() => [...range(1.5)]).toThrow("range() arguments must be integers");
        expect(() => [...range(0, 1.5)]).toThrow("range() arguments must be integers");
        expect(() => [...range(0, 5, 1.5)]).toThrow("range() arguments must be integers");
    });

    test('range with zero step', () => {
        expect(() => [...range(0, 1, 0)]).toThrow("range() step argument must not be zero");
    });

    test('range with incompatible step', () => {
        expect(() => [...range(0, 5, -1)]).toThrow("range() step argument incompatible with start/stop");
        expect(() => [...range(5, 0, 1)]).toThrow("range() step argument incompatible with start/stop");
    });

    test('range with edge cases', () => {
        expect([...range(0)]).toEqual([]);
        expect([...range(0, 0)]).toEqual([]);
        expect([...range(0, 0, 1)]).toEqual([]);
        expect([...range(0, 0, -1)]).toEqual([]);
    });
});


describe("Collection", () => {

    test('constructor creates a Collection instance', () => {
        const collection = new Collection('file', '.txt', 3, [1, 2, 3], ['file001.txt', 'file002.txt', 'file003.txt']);
        expect(collection).toBeInstanceOf(Collection);
        expect(collection.head).toBe('file');
        expect(collection.tail).toBe('.txt');
        expect(collection.padding).toBe(3);
        expect(collection.indexes).toEqual([1, 2, 3]);
        expect(collection.members).toEqual(['file001.txt', 'file002.txt', 'file003.txt']);
    });

});


describe('Collection.match', () => {
    test('matches a simple pattern', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2, 3], ['file_01.txt', 'file_02.txt', 'file_03.txt']);
        expect(collection.match('file_01.txt')).not.toBeNull();
        expect(collection.match('file_02.txt')).not.toBeNull();
        expect(collection.match('file_03.txt')).not.toBeNull();
    });

    test('does not match items outside the pattern', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2, 3], ['file_01.txt', 'file_02.txt', 'file_03.txt']);
        expect(collection.match('file_04.txt')).not.toBeNull();
        expect(collection.match('other_01.txt')).toBeNull();
        expect(collection.match('file_01.jpg')).toBeNull();
    });

    test('respects padding', () => {
        const collection = new Collection('img_', '.png', 3, [1, 2, 3], ['img_001.png', 'img_002.png', 'img_003.png']);
        expect(collection.match('img_001.png')).not.toBeNull();
        expect(collection.match('img_01.png')).toBeNull();
    });

    test('handles zero padding correctly', () => {
        const collection = new Collection('v', '', 0, [1, 2, 3], ['v1', 'v2', 'v3']);
        expect(collection.match('v1')).not.toBeNull();
        expect(collection.match('v01')).toBeNull();
    });

    test('matches at start and end of string', () => {
        const collection = new Collection('', '_end', 2, [1, 2, 3], ['01_end', '02_end', '03_end']);
        expect(collection.match('01_end')).not.toBeNull();
        expect(collection.match('1_end')).toBeNull();
    });

    test('handles complex patterns', () => {
        const collection = new Collection('frame_', '_v2.exr', 4, [1, 2, 3], ['frame_0001_v2.exr', 'frame_0002_v2.exr', 'frame_0003_v2.exr']);
        expect(collection.match('frame_0001_v2.exr')).not.toBeNull();
        expect(collection.match('frame_1_v2.exr')).toBeNull();
        expect(collection.match('frame_0001_v1.exr')).toBeNull();
    });

    test('returns correct match object', () => {
        const collection = new Collection('seq_', '.jpg', 3, [1, 2, 3], ['seq_001.jpg', 'seq_002.jpg', 'seq_003.jpg']);
        const match = collection.match('seq_002.jpg');
        expect(match).not.toBeNull();
        expect(match.groups.index).toBe('002');
        expect(match.groups.padding).toBe('00');
    });
});


describe('Collection.add', () => {
    let collection;

    beforeEach(() => {
        collection = new Collection('file_', '.txt', 2, [1, 2, 3]);
    });

    test('adds a single string item', () => {
        collection.add('file_04.txt');
        expect(collection.indexes).toEqual([1, 2, 3, 4]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt', 'file_03.txt', 'file_04.txt']);
    });

    test('adds a single number item', () => {
        collection.add(4);
        expect(collection.indexes).toEqual([1, 2, 3, 4]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt', 'file_03.txt', 'file_04.txt']);
    });

    test('adds multiple items as an array', () => {
        collection.add(['file_04.txt', 5, 'file_06.txt']);
        expect(collection.indexes).toEqual([1, 2, 3, 4, 5, 6]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt', 'file_03.txt', 'file_04.txt', 'file_05.txt', 'file_06.txt']);
    });

    test('merges a compatible Collection', () => {
        const otherCollection = new Collection('file_', '.txt', 2, [4, 5]);
        collection.add(otherCollection);
        expect(collection.indexes).toEqual([1, 2, 3, 4, 5]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt', 'file_03.txt', 'file_04.txt', 'file_05.txt']);
    });

    test('throws error when adding incompatible Collection', () => {
        const incompatibleCollection = new Collection('img_', '.jpg', 3, [1, 2]);
        expect(() => collection.add(incompatibleCollection)).toThrow('is not compatible with this collection');
    });

    test('throws error when adding invalid string', () => {
        expect(() => collection.add('invalid_04.txt')).toThrow('does not match collection expression');
    });

    test('throws error when adding invalid number', () => {
        expect(() => collection.add(-1)).toThrow('Invalid index: -1. Expected non-negative integer');
        expect(() => collection.add(3.5)).toThrow('Invalid index: 3.5. Expected non-negative integer');
    });

    test('throws error when adding invalid type', () => {
        expect(() => collection.add({})).toThrow('Invalid item type: object. Expected string, number, or Collection');
    });

    test('ignores duplicate items', () => {
        collection.add(['file_02.txt', 3, 'file_04.txt']);
        expect(collection.indexes).toEqual([1, 2, 3, 4]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt', 'file_03.txt', 'file_04.txt']);
    });

    test('maintains sorted order of indexes after adding', () => {
        collection.add([5, 'file_04.txt', 2]);
        expect(collection.indexes).toEqual([1, 2, 3, 4, 5]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt', 'file_03.txt', 'file_04.txt', 'file_05.txt']);
    });

    test('handles adding large number of items', () => {
        const largeArray = Array.from({length: 1000}, (_, i) => i + 4);
        collection.add(largeArray);
        expect(collection.indexes.length).toBe(1003);
        expect(collection.indexes[1002]).toBe(1003);
        expect(collection.members[1002]).toBe('file_1003.txt');
    });

    test('returns this for method chaining', () => {
        const result = collection.add('file_04.txt');
        expect(result).toBe(collection);
    });

    test('allows chaining multiple add operations', () => {
        collection.add('file_04.txt').add(5).add(['file_06.txt', 7]);
        expect(collection.indexes).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(collection.members).toEqual([
            'file_01.txt', 'file_02.txt', 'file_03.txt', 'file_04.txt',
            'file_05.txt', 'file_06.txt', 'file_07.txt'
        ]);
    });
});


describe('Collection.remove', () => {
    let collection;

    beforeEach(() => {
        collection = new Collection('file_', '.txt', 2, [1, 2, 3, 4, 5], ['file_01.txt', 'file_02.txt', 'file_03.txt', 'file_04.txt', 'file_05.txt']);
    });

    test('removes a single member string', () => {
        collection.remove('file_03.txt');
        expect(collection.indexes).toEqual([1, 2, 4, 5]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt', 'file_04.txt', 'file_05.txt']);
    });

    test('removes multiple member strings', () => {
        collection.remove(['file_02.txt', 'file_04.txt']);
        expect(collection.indexes).toEqual([1, 3, 5]);
        expect(collection.members).toEqual(['file_01.txt', 'file_03.txt', 'file_05.txt']);
    });

    test('removes a single index', () => {
        collection.remove(3);
        expect(collection.indexes).toEqual([1, 2, 4, 5]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt', 'file_04.txt', 'file_05.txt']);
    });

    test('removes multiple indexes', () => {
        collection.remove([2, 4]);
        expect(collection.indexes).toEqual([1, 3, 5]);
        expect(collection.members).toEqual(['file_01.txt', 'file_03.txt', 'file_05.txt']);
    });

    test('removes mix of member strings and indexes', () => {
        collection.remove(['file_02.txt', 4, 'file_05.txt']);
        expect(collection.indexes).toEqual([1, 3]);
        expect(collection.members).toEqual(['file_01.txt', 'file_03.txt']);
    });

    test('ignores non-existent items', () => {
        collection.remove(['file_06.txt', 6, 'file_07.txt']);
        expect(collection.indexes).toEqual([1, 2, 3, 4, 5]);
        expect(collection.members).toEqual(['file_01.txt', 'file_02.txt', 'file_03.txt', 'file_04.txt', 'file_05.txt']);
    });

    test('removes item with different padding when padding is 0', () => {
        const zeroPaddedCollection = new Collection('v', '', 0, [1, 2, 10], ['v1', 'v2', 'v10']);
        zeroPaddedCollection.remove('v10');
        expect(zeroPaddedCollection.indexes).toEqual([1, 2]);
        expect(zeroPaddedCollection.members).toEqual(['v1', 'v2']);
    });

    test('maintains sorted order of indexes after removing', () => {
        collection.remove([2, 4]);
        expect(collection.indexes).toEqual([1, 3, 5]);
        expect(collection.members).toEqual(['file_01.txt', 'file_03.txt', 'file_05.txt']);
    });

    test('handles removal of all items', () => {
        collection.remove([1, 2, 3, 4, 5]);
        expect(collection.indexes).toEqual([]);
        expect(collection.members).toEqual([]);
    });

    test('ignores invalid index (negative number)', () => {
        collection.remove(-1);
        expect(collection.indexes).toEqual([1, 2, 3, 4, 5]);
    });

    test('ignores invalid index (float)', () => {
        collection.remove(2.5);
        expect(collection.indexes).toEqual([1, 2, 3, 4, 5]);
    });

    test('ignores invalid item types', () => {
        collection.remove([{}, null, undefined, true, []]);
        expect(collection.indexes).toEqual([1, 2, 3, 4, 5]);
    });

    test('removes valid items and ignores invalid ones', () => {
        collection.remove(['file_02.txt', 'invalid_file.txt', 4, -1, 2.5, {}]);
        expect(collection.indexes).toEqual([1, 3, 5]);
        expect(collection.members).toEqual(['file_01.txt', 'file_03.txt', 'file_05.txt']);
    });
});


describe('Collection.holes', () => {
    test('returns null when there are no holes', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2, 3], ['file_01.txt', 'file_02.txt', 'file_03.txt']);
        expect(collection.holes).toBeNull();
    });

    test('correctly identifies single hole', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 3], ['file_01.txt', 'file_03.txt']);
        const holes = collection.holes;
        expect(holes).toBeInstanceOf(Collection);
        expect(holes.indexes).toEqual([2]);
    });

    test('correctly identifies multiple holes', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 4, 7], ['file_01.txt', 'file_04.txt', 'file_07.txt']);
        const holes = collection.holes;
        expect(holes.indexes).toEqual([2, 3, 5, 6]);
    });

    test('returns null when there are less than two indexes', () => {
        const collection = new Collection('file_', '.txt', 2, [1], ['file_01.txt']);
        expect(collection.holes).toBeNull();
    });

    test('handles large ranges efficiently', () => {
        const largeRange = Array.from({length: 10000}, (_, i) => i * 2 + 1);
        const collection = new Collection('file_', '.txt', 5, largeRange, largeRange.map(i => `file_${i.toString().padStart(5, '0')}.txt`));
        const holes = collection.holes;
        expect(holes.indexes.length).toBe(9999);
        expect(holes.indexes[0]).toBe(2);
        expect(holes.indexes[holes.indexes.length - 1]).toBe(19998);
    });

    test('preserves head, tail, and padding in returned collection', () => {
        const collection = new Collection('img_', '.png', 3, [1, 3, 5], ['img_001.png', 'img_003.png', 'img_005.png']);
        const holes = collection.holes;
        expect(holes.head).toBe('img_');
        expect(holes.tail).toBe('.png');
        expect(holes.padding).toBe(3);
    });

    test('returns null for collection with no gaps at the end', () => {
        const collection = new Collection('seq_', '.jpg', 2, [1, 2, 3, 5], ['seq_01.jpg', 'seq_02.jpg', 'seq_03.jpg', 'seq_05.jpg']);
        const holes = collection.holes;
        expect(holes).toBeInstanceOf(Collection);
        expect(holes.indexes).toEqual([4]);
    });
});


describe('Collection.isContiguous', () => {
    test('empty collection is contiguous', () => {
        const collection = new Collection('file_', '.txt', 2, []);
        expect(collection.isContiguous).toBe(true);
    });

    test('single element collection is contiguous', () => {
        const collection = new Collection('file_', '.txt', 2, [1]);
        expect(collection.isContiguous).toBe(true);
    });

    test('two consecutive elements are contiguous', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2]);
        expect(collection.isContiguous).toBe(true);
    });

    test('two non-consecutive elements are not contiguous', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 3]);
        expect(collection.isContiguous).toBe(false);
    });

    test('large contiguous range is contiguous', () => {
        const indexes = Array.from({length: 1000}, (_, i) => i + 1);
        const collection = new Collection('file_', '.txt', 4, indexes);
        expect(collection.isContiguous).toBe(true);
    });

    test('large range with one gap is not contiguous', () => {
        const indexes = Array.from({length: 999}, (_, i) => i + 1);
        indexes.push(1001);  // Add 1001, creating a gap at 1000
        const collection = new Collection('file_', '.txt', 4, indexes);
        expect(collection.isContiguous).toBe(false);
    });

    test('collection with multiple gaps is not contiguous', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2, 4, 6, 8]);
        expect(collection.isContiguous).toBe(false);
    });

    test('collection with gap at start relative to min is not contiguous', () => {
        const collection = new Collection('file_', '.txt', 2, [5, 6, 7, 8]);
        expect(collection.isContiguous).toBe(true);
    });

    test('collection with gap at end relative to max is not contiguous', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 2, 3, 5]);
        expect(collection.isContiguous).toBe(false);
    });

    test('reverse ordered input should still be evaluated correctly', () => {
        const collection = new Collection('file_', '.txt', 2, [5, 4, 3, 2, 1]);
        expect(collection.isContiguous).toBe(true);
    });

    test('duplicate indexes should not affect contiguity', () => {
        const collection = new Collection('file_', '.txt', 2, [1, 1, 2, 2, 3, 3]);
        expect(collection.isContiguous).toBe(true);
    });
});